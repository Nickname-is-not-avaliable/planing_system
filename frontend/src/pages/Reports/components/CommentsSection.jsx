// src/pages/Reports/components/CommentsSection.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // <--- ДОБАВЛЕН ИМПОРТ LINK
import useReportComments from '../../../hooks/useReportComments'; // Путь: ../../../hooks/
import useAuth from '../../../hooks/useAuth';                 // Путь: ../../../hooks/

// Вспомогательная функция форматирования даты/времени
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try { return new Date(dateTimeString).toLocaleString(); }
    catch (e) { return dateTimeString; }
};

const CommentsSection = ({ reportId }) => {
    const { user } = useAuth(); // Получаем текущего пользователя
    // Получаем все необходимое из хука
    const {
        comments,
        commentAuthors,
        loadingComments,
        commentError,
        isProcessing, // Общий флаг для добавления/удаления
        addComment,
        deleteComment
    } = useReportComments(reportId);

    const [newCommentText, setNewCommentText] = useState('');
    // Локальное состояние только для индикации *какой именно* коммент удаляется
    const [deletingCommentId, setDeletingCommentId] = useState(null);

    const handleNewCommentChange = (e) => {
        setNewCommentText(e.target.value);
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user || !user.id) {
             // Можно показать ошибку или просто ничего не делать
             console.error("User not logged in, cannot post comment.");
             return;
        }
        // Передаем user.id в addComment
        const success = await addComment(newCommentText, user.id);
        if (success) {
            setNewCommentText(''); // Очищаем поле только при успехе
        }
        // Ошибка будет установлена в commentError внутри хука
    };

    const handleDelete = async (commentId) => {
        // Проверяем, залогинен ли пользователь ПЕРЕД подтверждением
        if (!user || !user.id) {
             alert("Необходимо войти в систему для удаления комментариев.");
             return;
         }
         // TODO: Добавить проверку прав (comment.userId === user.id || user.role === 'ADMIN')

        if (isProcessing) return; // Не удаляем, если уже идет другое действие
        if (window.confirm("Вы уверены, что хотите удалить этот комментарий?")) {
             setDeletingCommentId(commentId); // Устанавливаем ID для индикации
             await deleteComment(commentId); // Вызываем функцию из хука
             setDeletingCommentId(null); // Сбрасываем индикацию после завершения
        }
    };

    const canCommentOrDelete = user && user.id; // Базовая проверка авторизации

    return (
        <div className="comments-section">
            <h3>Комментарии ({comments.length})</h3>
            {/* Показываем общую ошибку комментариев из хука */}
            {commentError && <p className="error-message comment-error">{commentError}</p>}

            {/* Форма добавления комментария */}
            {canCommentOrDelete ? ( // Показываем форму только авторизованному
                <form onSubmit={handleCommentSubmit} className="comment-form">
                     <div className="form-group">
                        <label htmlFor="newCommentText">Добавить комментарий:</label>
                        <textarea id="newCommentText" rows="3"
                            value={newCommentText} onChange={handleNewCommentChange}
                            placeholder="Введите ваш комментарий..."
                            // Блокируем, если идет ЛЮБАЯ операция (добавление/удаление)
                            disabled={isProcessing}
                            required
                        ></textarea>
                    </div>
                    <button type="submit" disabled={isProcessing || !newCommentText.trim()}>
                        {/* Индикация на кнопке (только если идет добавление) */}
                        {isProcessing && !deletingCommentId ? 'Отправка...' : 'Отправить'}
                    </button>
                </form>
            ) : ( // Сообщение для неавторизованных
                 <p style={{ marginTop: '15px', fontStyle: 'italic', color: '#666' }}>
                     Пожалуйста, <Link to="/login">войдите</Link>, чтобы оставить комментарий.
                 </p>
            )}


            {/* Список комментариев */}
            <div className="comments-list">
                {loadingComments ? (
                    <p>Загрузка комментариев...</p>
                ) : comments.length > 0 ? (
                    comments
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map(comment => (
                        <div key={comment.id} className={`comment-item ${deletingCommentId === comment.id ? 'deleting' : ''}`}>
                            <div className="comment-content">
                                <p className="comment-meta">
                                    <strong className="comment-author">
                                         {commentAuthors[comment.userId]?.fullName || '(Неизвестный автор)'}
                                    </strong>
                                    <span className="comment-date">
                                        {formatDateTime(comment.createdAt)}
                                    </span>
                                </p>
                                <p className="comment-text">{comment.text}</p>
                            </div>
                            {/* Показываем кнопку удаления только авторизованным */}
                            {canCommentOrDelete && (
                                <div className="comment-actions">
                                    {/* TODO: Проверка прав (comment.userId === user.id || user.role === 'ADMIN') */}
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="delete-comment-btn"
                                        // Блокируем, если идет ЛЮБАЯ операция
                                        disabled={isProcessing}
                                        title="Удалить комментарий"
                                    >
                                    {/* Индикация удаления */}
                                    {deletingCommentId === comment.id ? 'Удаление...' : '×'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    // Показываем "нет комментариев" только если не было ошибки загрузки
                    !commentError && <p>Комментариев пока нет.</p>
                )}
            </div>
        </div>
    );
};

export default CommentsSection;