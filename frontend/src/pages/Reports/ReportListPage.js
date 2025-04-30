// src/pages/Reports/ReportListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import reportService from '../../services/reportService';
import planService from '../../services/planService';
import userService from '../../services/userService';
import './ReportListPage.css';

const ReportListPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [planNames, setPlanNames] = useState({});
    const [userNames, setUserNames] = useState({});
    const [loadingRelatedData, setLoadingRelatedData] = useState(false);

    // --- Функция загрузки имен (стабильная) ---
    const fetchRelatedNames = useCallback(async (reportsData, signal) => {
        if (!reportsData || reportsData.length === 0) return;

        setLoadingRelatedData(true);

        // Собираем ID для запроса (без проверки кэша здесь, кэш проверим при обновлении state)
        const planIds = [...new Set(reportsData.map(r => r.planId).filter(Boolean))];
        const userIds = [...new Set([
            ...reportsData.map(r => r.reportingUserId).filter(Boolean),
            ...reportsData.map(r => r.assessedByUserId).filter(Boolean)
        ])];

        // Используем локальные переменные для хранения результатов перед обновлением state
        const loadedPlanNames = {};
        const loadedUserNames = {};

        const planPromises = planIds.map(id =>
            planService.getPlanById(id, signal)
                .then(res => { loadedPlanNames[id] = res.data.name; }) // Сохраняем в локальный объект
                .catch(err => {
                    if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                        console.error(`Failed to fetch plan name (ID: ${id}):`, err);
                        loadedPlanNames[id] = `(План ${id} - ошибка)`; // Сохраняем ошибку
                    }
                })
        );

        const userPromises = userIds.map(id =>
             userService.getUserById(id, signal)
                 .then(res => { loadedUserNames[id] = res.data.fullName; }) // Сохраняем в локальный объект
                 .catch(err => {
                    if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                         console.error(`Failed to fetch user name (ID: ${id}):`, err);
                         loadedUserNames[id] = `(Пользователь ${id} - ошибка)`; // Сохраняем ошибку
                     }
                 })
        );

        try {
            await Promise.all([...planPromises, ...userPromises]); // Ждем все запросы

            // Обновляем state с использованием функциональной формы,
            // сливая новые результаты с предыдущими, но не перезаписывая существующие
            if (Object.keys(loadedPlanNames).length > 0) {
                setPlanNames(prev => ({ ...prev, ...loadedPlanNames }));
            }
            if (Object.keys(loadedUserNames).length > 0) {
                setUserNames(prev => ({ ...prev, ...loadedUserNames }));
            }

        } catch (err) {
             console.error("Error processing related names batch:", err);
        } finally {
             if (!signal?.aborted) {
                setLoadingRelatedData(false);
             }
        }
    // --- УБИРАЕМ ЗАВИСИМОСТИ planNames, userNames ---
    // Теперь useCallback зависит только от внешних сервисов, которые не меняются
    }, []);

    // Основной useEffect для загрузки списка отчетов
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchReports = async () => {
            setLoading(true);
            setError('');
            // Не сбрасываем имена здесь

            try {
                const response = await reportService.getAllReports(signal);
                const reportsData = response.data || [];
                setReports(reportsData);

                if (reportsData.length > 0) {
                    // Запускаем загрузку имен для полученных отчетов
                    fetchRelatedNames(reportsData, signal); // Передаем signal
                }

            } catch (err) {
                 if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                    console.error("Failed to fetch reports:", err);
                    setError('Не удалось загрузить список отчетов. Попробуйте позже.');
                 } else {
                     console.log("Reports fetch aborted.");
                 }
            } finally {
                 if (!signal.aborted) {
                    setLoading(false);
                 }
            }
        };

        fetchReports();

        return () => controller.abort();
    // Теперь зависимость только от fetchRelatedNames, которая стабильна
    }, [fetchRelatedNames]);

    // Функции получения имен остаются без изменений
    const getPlanName = (planId) => planNames[planId] || (planId ? (loadingRelatedData ? 'Загрузка...' : `План ${planId}`) : 'N/A');
    const getUserName = (userId) => userNames[userId] || (userId ? (loadingRelatedData ? 'Загрузка...' : `Пользователь ${userId}`) : 'Не назначен');

    // --- РЕНДЕРИНГ КОМПОНЕНТА ---

    if (loading) {
        return <p>Загрузка списка отчетов...</p>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    return (
        <div className="report-list-container">
            <h2>Список квартальных отчетов</h2>

            <Link to="/reports/new">
                <button style={{ marginBottom: '15px' }}>Создать новый отчет</button>
            </Link>

            {reports.length === 0 ? (
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
                        {/* Убираем лишние пробелы/переносы строк внутри map */}
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
                                <td><Link to={`/reports/${report.id}`}>Детали</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {loadingRelatedData && <p style={{marginTop: '10px', fontStyle: 'italic', color: '#666'}}>Загрузка имен планов/пользователей...</p>}
        </div>
    );
};

export default ReportListPage;