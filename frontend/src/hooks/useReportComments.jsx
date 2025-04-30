// src/hooks/useReportComments.js
import { useState, useEffect, useCallback } from 'react';
import commentService from '../services/commentService'; // Путь: ../services/
import userService from '../services/userService';     // Путь: ../services/

// Хук для управления комментариями к отчету
function useReportComments(reportId) {
    // Состояния
    const [comments, setComments] = useState([]);
    const [commentAuthors, setCommentAuthors] = useState({}); // Кэш { userId: userData }
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentError, setCommentError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // Общий флаг для post/delete

    // --- Загрузка авторов ---
    const fetchCommentAuthors = useCallback(async (commentsData, signal) => {
        const authorIdsToFetch = [
            ...new Set(commentsData.map(c => c.userId).filter(id => id != null && !commentAuthors[id]))
        ];
        if (authorIdsToFetch.length === 0) return;

        const authorsData = {};
        const authorPromises = authorIdsToFetch.map(async (authorId) => {
            try {
                const response = await userService.getUserById(authorId, signal);
                authorsData[authorId] = response.data;
            } catch (err) {
                if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                    console.error(`Failed to fetch comment author (ID: ${authorId}):`, err);
                    authorsData[authorId] = { id: authorId, fullName: `(Неизвестный автор)` };
                }
            }
        });
        await Promise.all(authorPromises);
        if (Object.keys(authorsData).length > 0) {
            // Используем функциональное обновление для слияния
            setCommentAuthors(prev => ({ ...prev, ...authorsData }));
        }
    }, [commentAuthors]); // Зависит от кэша commentAuthors

    // --- Перезагрузка комментариев ---
    const reloadComments = useCallback(async (signal) => {
        setLoadingComments(true);
        // Не сбрасываем commentError здесь, чтобы видеть ошибки отправки/удаления
        // setCommentError('');
        try {
            const response = await commentService.getCommentsForReport(reportId, signal);
            const commentsData = response.data || [];
            setComments(commentsData);
             // Сбрасываем ошибку только при успешной загрузке
             setCommentError('');
            // Загружаем авторов для полученных комментов
            if (commentsData.length > 0) {
                await fetchCommentAuthors(commentsData, signal);
            }
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to reload comments:", err);
                setCommentError('Не удалось обновить список комментариев.');
            } else {
                 console.log("Comments fetch aborted during reload.");
            }
        } finally {
             if (!signal?.aborted) {
                setLoadingComments(false);
             }
        }
    }, [reportId, fetchCommentAuthors]); // Зависит от reportId и стабильной fetchCommentAuthors

    // --- Загрузка при монтировании/смене reportId ---
    useEffect(() => {
        const controller = new AbortController();
        reloadComments(controller.signal); // Вызываем перезагрузку
        // Функция очистки для отмены при размонтировании
        return () => controller.abort();
    }, [reloadComments]); // Зависит только от стабильной reloadComments

    // --- Добавление комментария ---
    const addComment = useCallback(async (text, userId) => {
        if (!userId) {
             setCommentError("Ошибка: Не удалось определить пользователя для добавления комментария.");
             return false;
        }
        if (!text.trim()) {
            setCommentError("Комментарий не может быть пустым.");
            return false;
        }
        setCommentError(''); // Сбрасываем предыдущие ошибки
        setIsProcessing(true); // Устанавливаем флаг обработки
        const commentData = { reportId: parseInt(reportId, 10), userId: userId, text: text.trim() };
        try {
            await commentService.createComment(commentData);
            await reloadComments(); // Перезагружаем список после добавления
            // isProcessing сбросится внутри reloadComments? Нет, reloadComments не меняет isProcessing
            setIsProcessing(false); // Сбрасываем флаг здесь
            return true; // Успех
        } catch (err) {
            console.error("Failed to post comment:", err);
            const apiError = err.response?.data?.message || err.message || 'Не удалось отправить комментарий.';
            setCommentError(apiError);
            setIsProcessing(false); // Сбрасываем флаг при ошибке
            return false; // Неудача
        }
    }, [reportId, reloadComments]); // Зависит от reportId и reloadComments

    // --- Удаление комментария ---
    const deleteComment = useCallback(async (commentId) => {
        setCommentError(''); // Сбрасываем предыдущие ошибки
        setIsProcessing(true); // Устанавливаем флаг обработки
        try {
            await commentService.deleteComment(commentId);
            await reloadComments(); // Перезагружаем список
            setIsProcessing(false); // Сбрасываем флаг
        } catch (err) {
            console.error(`Failed to delete comment (ID: ${commentId}):`, err);
            const apiError = err.response?.data?.message || err.message || 'Не удалось удалить комментарий.';
            setCommentError(apiError);
            setIsProcessing(false); // Сбрасываем флаг при ошибке
        }
    }, [reloadComments]); // Зависит от reloadComments

    // Возвращаем данные и функции для управления комментариями
    return {
        comments,
        commentAuthors,
        loadingComments,
        commentError,
        isProcessing, // Общий флаг для добавления/удаления
        addComment,
        deleteComment
    };
}

export default useReportComments;