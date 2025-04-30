// src/hooks/useReportDetails.js
import { useState, useEffect, useCallback } from 'react';
import reportService from '../services/reportService';
import planService from '../services/planService';
import userService from '../services/userService';

// Вспомогательная функция для загрузки пользователя (без установки state напрямую)
const fetchUser = async (userId, signal) => {
    if (!userId) return null;
    try {
        const response = await userService.getUserById(userId, signal);
        return response.data;
    } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            console.error(`Failed to fetch user (ID: ${userId}):`, err);
            return { id: userId, fullName: `(Ошибка загрузки)` }; // Возвращаем объект ошибки
        }
        return null; // Возвращаем null при отмене
    }
};

function useReportDetails(reportId) {
    const [report, setReport] = useState(null);
    const [plan, setPlan] = useState(null);
    const [reportingUser, setReportingUser] = useState(null);
    const [assessingUser, setAssessingUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDetails = useCallback(async (signal) => {
        setLoading(true);
        setError('');
        // Сброс состояний
        setReport(null); setPlan(null); setReportingUser(null); setAssessingUser(null);

        try {
            // 1. Загружаем отчет
            const reportResponse = await reportService.getReportById(reportId, signal);
            const reportData = reportResponse.data;
            setReport(reportData); // Устанавливаем отчет сразу

            // 2. Параллельно грузим план и пользователей
            const planPromise = planService.getPlanById(reportData.planId, signal)
                .then(res => setPlan(res.data))
                .catch(err => {
                    if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                         console.error(`Failed to fetch plan (ID: ${reportData?.planId}):`, err);
                         setPlan({ id: reportData?.planId, name: `(Ошибка загрузки)` });
                    }
                 });

            const reportingUserPromise = fetchUser(reportData.reportingUserId, signal).then(setReportingUser);
            const assessingUserPromise = fetchUser(reportData.assessedByUserId, signal).then(setAssessingUser);

            // Ждем только план и пользователей (отчет уже установлен)
            await Promise.all([planPromise, reportingUserPromise, assessingUserPromise]);

        } catch (err) {
             if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch report details:", err);
                if (err.response?.status === 404) {
                     setError(`Отчет с ID ${reportId} не найден.`);
                 } else {
                     setError('Не удалось загрузить данные отчета.');
                 }
             } else {
                 console.log("Report details fetch aborted.");
             }
        } finally {
             if (!signal.aborted) {
                setLoading(false);
             }
        }
    }, [reportId]); // Зависимость только от reportId

    useEffect(() => {
        const controller = new AbortController();
        fetchDetails(controller.signal);
        return () => controller.abort(); // Отмена при размонтировании/перезапуске
    }, [fetchDetails]); // Запускаем при изменении fetchDetails (т.е. reportId)

    // Возвращаем данные и состояния для использования в компоненте
    return { report, plan, reportingUser, assessingUser, loading, error, setReport }; // Возвращаем setReport для обновления после оценки
}

export default useReportDetails;