// src/pages/Reports/ReportListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import reportService from '../../services/reportService';
import planService from '../../services/planService';
import userService from '../../services/userService';
import useAuth from '../../hooks/useAuth'; // Для проверки роли
import './ReportListPage.css'; // Убедись, что стили созданы и подключены

const ReportListPage = () => {
    const { user } = useAuth(); // Получаем текущего пользователя для проверки роли
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Состояния для хранения имен (кэш)
    const [planNames, setPlanNames] = useState({}); // { planId: 'Plan Name' }
    const [userNames, setUserNames] = useState({}); // { userId: 'User Name' }
    const [loadingRelatedData, setLoadingRelatedData] = useState(false); // Флаг загрузки доп. имен

    // Функция для загрузки имен планов и пользователей
    const fetchRelatedNames = useCallback(async (reportsData, signal) => {
        if (!reportsData || reportsData.length === 0) return;
        setLoadingRelatedData(true);

        const planIdsToFetch = [...new Set(reportsData.map(r => r.planId).filter(id => Boolean(id) && !planNames[id]))];
        const userIdsToFetch = [...new Set([
            ...reportsData.map(r => r.reportingUserId).filter(id => Boolean(id) && !userNames[id]),
            ...reportsData.map(r => r.assessedByUserId).filter(id => Boolean(id) && !userNames[id])
        ])];

        const loadedPlanNames = {};
        const loadedUserNames = {};

        const planPromises = planIdsToFetch.map(id =>
            planService.getPlanById(id, signal)
                .then(res => { loadedPlanNames[id] = res.data.name; })
                .catch(err => {
                    if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                        console.error(`Failed to fetch plan name (ID: ${id}):`, err);
                        loadedPlanNames[id] = `(План ${id} - ошибка)`;
                    }
                })
        );

        const userPromises = userIdsToFetch.map(id =>
             userService.getUserById(id, signal)
                 .then(res => { loadedUserNames[id] = res.data.fullName; })
                 .catch(err => {
                    if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                         console.error(`Failed to fetch user name (ID: ${id}):`, err);
                         loadedUserNames[id] = `(Пользователь ${id} - ошибка)`;
                     }
                 })
        );

        try {
            await Promise.all([...planPromises, ...userPromises]);
            if (Object.keys(loadedPlanNames).length > 0) {
                setPlanNames(prev => ({ ...prev, ...loadedPlanNames }));
            }
            if (Object.keys(loadedUserNames).length > 0) {
                setUserNames(prev => ({ ...prev, ...loadedUserNames }));
            }
        } catch (err) { console.error("Error processing related names batch:", err); }
        finally { if (!signal?.aborted) setLoadingRelatedData(false); }
    }, [planNames, userNames]); // Зависимости от кэшей, чтобы не перезапрашивать то, что есть

    // Функция для загрузки списка отчетов
    const fetchReports = useCallback(async (signal) => {
        setLoading(true);
        setError('');
        try {
            const response = await reportService.getAllReports(signal);
            const reportsData = response.data || [];
            setReports(reportsData);
            if (reportsData.length > 0) {
                fetchRelatedNames(reportsData, signal); // Загружаем связанные имена
            }
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch reports:", err);
                setError('Не удалось загрузить список отчетов. Попробуйте позже.');
            } else { console.log("Reports list fetch aborted."); }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [fetchRelatedNames]); // Зависимость от стабильной fetchRelatedNames

    // Загрузка отчетов при монтировании
    useEffect(() => {
        const controller = new AbortController();
        fetchReports(controller.signal);
        return () => controller.abort();
    }, [fetchReports]);

    // Обработчик удаления отчета
    const handleDeleteReport = async (reportId, reportDetails) => {
        if (window.confirm(`Вы уверены, что хотите удалить ${reportDetails}? Это действие необратимо.`)) {
            setError('');
            // Можно добавить локальный флаг isDeleting для конкретной строки, если нужно
            try {
                await reportService.deleteReport(reportId);
                // Перезагружаем список отчетов после удаления
                const controller = new AbortController();
                await fetchReports(controller.signal); // Используем новый сигнал для перезагрузки
                // TODO: Уведомление об успехе (например, toast)
            } catch (err) {
                console.error(`Failed to delete report ${reportId}:`, err);
                const apiError = err.response?.data?.message || err.message || 'Не удалось удалить отчет.';
                setError(apiError); // Показываем ошибку над таблицей
            }
        }
    };

    // Функции для получения имен из кэша
    const getPlanName = (planId) => planNames[planId] || (planId ? (loadingRelatedData ? '...' : `План ${planId}`) : 'N/A');
    const getUserName = (userId) => userNames[userId] || (userId ? (loadingRelatedData ? '...' : `Пользователь ${userId}`) : 'Не назначен');

    if (loading && reports.length === 0) return <p>Загрузка отчетов...</p>;

    return (
        <div className="report-list-container">
            <h2>Список квартальных отчетов</h2>
            {error && <p className="error-message main-error">{error}</p>}

            <Link to="/reports/new">
                <button className="action-btn create-btn" style={{ marginBottom: '15px' }}>Создать новый отчет</button>
            </Link>

            {reports.length === 0 && !loading ? (
                <p>Отчетов пока нет.</p>
            ) : (
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Номер Отчета</th>
                            <th>План</th>
                            <th>Год</th>
                            <th>Квартал</th>
                            <th>Факт. значение</th>
                            <th>Отчитался</th>
                            <th>Оценил</th>
                            <th>Оценка</th>
                            <th>Дата создания</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id}>
                                <td>{report.id}</td>
                                <td>{getPlanName(report.planId)}</td>
                                <td>{report.year}</td>
                                <td>{report.quarter}</td>
                                <td>{report.actualValue ?? '-'}</td>
                                <td>{getUserName(report.reportingUserId)}</td>
                                <td>{getUserName(report.assessedByUserId)}</td>
                                <td>{report.analystAssessmentScore ?? '-'}</td>
                                <td>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}</td>
                                <td className="actions-cell">
                                    <Link to={`/reports/${report.id}`} className="action-link">Детали</Link>
                                    {/* Кнопка удаления видна только Админу */}
                                    {user && user.userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => handleDeleteReport(report.id, `отчет №${report.id} (План: ${getPlanName(report.planId)})`)}
                                            className="action-btn delete-btn list-delete-btn"
                                            title="Удалить отчет"
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {loadingRelatedData && reports.length > 0 && <p className="loading-names-indicator">Загрузка дополнительной информации...</p>}
        </div>
    );
};

export default ReportListPage;