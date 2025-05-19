// src/pages/Plans/PlanDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import planService from '../../services/planService';
import userService from '../../services/userService';
import reportService from '../../services/reportService';
import useAuth from '../../hooks/useAuth';
import { translateRole } from '../../utils/authUtils';
import './PlanDetailsPage.css'; // Убедись, что стили подключены и созданы

const PlanDetailsPage = () => {
    const { id: planId } = useParams();
    const { user } = useAuth(); // Текущий пользователь для проверки прав
    const navigate = useNavigate();

    const [plan, setPlan] = useState(null);
    const [creator, setCreator] = useState(null);
    const [executors, setExecutors] = useState([]);
    const [relatedReports, setRelatedReports] = useState([]);

    const [loading, setLoading] = useState(true); // Общий флаг загрузки страницы
    const [error, setError] = useState(''); // Общая ошибка загрузки

    // Единая функция для загрузки данных пользователя
    const fetchUserData = useCallback(async (userId, signal) => {
        if (!userId) return null;
        try {
            const response = await userService.getUserById(userId, signal);
            return response.data;
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error(`[PlanDetails] Failed to fetch user (ID: ${userId}):`, err);
                return { id: userId, fullName: `(Пользователь ${userId} - ошибка)` }; // Возвращаем объект с ошибкой
            }
            return null;
        }
    }, []);

    // Основной useEffect для загрузки всех данных страницы
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const loadPageData = async () => {
            setLoading(true);
            setError('');
            // Сброс всех состояний
            setPlan(null); setCreator(null); setExecutors([]); setRelatedReports([]);

            try {
                // 1. Загружаем ПЛАН
                console.log(`[PlanDetails] Fetching plan with ID: ${planId}`);
                const planResponse = await planService.getPlanById(planId, signal);
                const fetchedPlan = planResponse.data;
                if (!fetchedPlan) throw new Error(`План с ID ${planId} не найден.`);
                setPlan(fetchedPlan); // Устанавливаем план

                // Промисы для параллельной загрузки связанных данных
                const dataPromises = [];

                // 2. Подготовка к загрузке СОЗДАТЕЛЯ
                if (fetchedPlan.createdByUserId) {
                    dataPromises.push(
                        fetchUserData(fetchedPlan.createdByUserId, signal).then(data => {
                            if (!signal.aborted) setCreator(data); // Устанавливаем, если не отменено
                        })
                    );
                } else {
                    setCreator(null); // Если ID нет, создатель null
                }

                // 3. Подготовка к загрузке ИСПОЛНИТЕЛЕЙ
                if (fetchedPlan.executorUserIds && fetchedPlan.executorUserIds.length > 0) {
                    const executorPromises = fetchedPlan.executorUserIds.map(userId =>
                        fetchUserData(userId, signal)
                    );
                    dataPromises.push(
                        Promise.all(executorPromises).then(execs => {
                            if (!signal.aborted) setExecutors(execs.filter(Boolean));
                        })
                    );
                } else {
                    setExecutors([]);
                }

                // 4. Подготовка к загрузке СВЯЗАННЫХ ОТЧЕТОВ
                const numericPlanId = parseInt(planId, 10);
                dataPromises.push(
                    reportService.getAllReports(signal).then(response => {
                        if (!signal.aborted) {
                            const filtered = (response.data || []).filter(r => r.planId === numericPlanId);
                            setRelatedReports(filtered);
                        }
                    })
                );

                // Дожидаемся выполнения всех параллельных запросов
                await Promise.all(dataPromises);

            } catch (err) {
                if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                    console.error("[PlanDetails] Failed to load page data:", err);
                    setError(err.response?.data?.message || err.message || `Не удалось загрузить данные плана.`);
                    setPlan(null); // Сбрасываем план при критической ошибке
                } else { console.log("[PlanDetails] Page data load aborted."); }
            } finally {
                if (!signal.aborted) { setLoading(false); }
            }
        };

        if (planId && !isNaN(parseInt(planId, 10))) {
            loadPageData();
        } else {
            setError("Некорректный ID плана в URL.");
            setLoading(false);
        }

        return () => {
            console.log("[PlanDetails] Cleanup: Aborting fetches.");
            controller.abort();
        };
    }, [planId, fetchUserData]); // Зависим от planId и стабильной fetchUserData

    // Обработчик удаления плана
    const handleDeletePlan = async () => {
        if (!plan || !user) return;
        if (user.id !== plan.createdByUserId && user.userRole !== 'ADMIN') {
            alert("У вас нет прав на удаление этого плана."); return;
        }
        if (window.confirm(`Вы уверены, что хотите удалить план "${plan.name}"? Это действие необратимо.`)) {
            setError('');
            try {
                await planService.deletePlan(plan.id);
                navigate('/plans', { state: { message: 'План успешно удален!' } });
            } catch (err) {
                console.error("Failed to delete plan:", err);
                setError(err.response?.data?.message || err.message || 'Не удалось удалить план.');
            }
        }
    };

    // Форматирование даты
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try { return new Date(dateString.split('T')[0]).toLocaleDateString(); }
        catch { return dateString; }
    };

    // --- РЕНДЕРИНГ ---
    if (loading) return <div className="loading-container"><p>Загрузка деталей плана...</p></div>;
    if (error && !plan) return <div className="error-container"><p className="error-message">{error}</p></div>;
    if (!plan) return <div className="not-found-container"><p>План не найден.</p></div>;

    const canModify = user && (user.id === plan.createdByUserId || user.userRole === 'ADMIN');

    return (
        <div className="plan-details-container">
            <header className="plan-details-header">
                <h2>{plan.name || 'Детали плана'}</h2>
                <Link to="/plans" className="back-link">
                    ← К списку планов
                </Link>
            </header>

            {error && <p className="error-message main-error">{error}</p>}

            {canModify && (
                <div className="plan-actions top-actions">
                    <Link to={`/plans/${plan.id}/edit`} className="action-btn edit-btn">
                        Редактировать план
                    </Link>
                    <button onClick={handleDeletePlan} className="action-btn delete-btn">
                        Удалить план
                    </button>
                </div>
            )}

            <section className="plan-info-section">
                <h3>Основная информация</h3>
                <div className="plan-details-grid">
                    <div className="detail-item"><span className="detail-label">ID Плана:</span> {plan.id}</div>
                    <div className="detail-item"><span className="detail-label">Название:</span> {plan.name}</div>
                    <div className="detail-item detail-item-full"><span className="detail-label">Описание:</span> {plan.description || <i>Нет описания</i>}</div>
                    <div className="detail-item"><span className="detail-label">Целевое значение:</span> {plan.targetValue ?? '-'}</div>
                    <div className="detail-item"><span className="detail-label">Дата начала:</span> {formatDate(plan.startDate)}</div>
                    <div className="detail-item"><span className="detail-label">Дата окончания:</span> {formatDate(plan.endDate)}</div>
                    <div className="detail-item">
                        <span className="detail-label">Создатель:</span>
                        {creator ? (creator.fullName || `Пользователь ${creator.id}`) : (plan.createdByUserId ? 'Загрузка...' : 'Не указан')}
                    </div>
                    <div className="detail-item detail-item-full">
                        <span className="detail-label">Исполнители ({executors.length}):</span>
                        {executors.length > 0 ? (
                            <ul className="executors-list">
                                {executors.map(ex => (
                                    <li key={ex.id}>{ex.fullName || `Пользователь ${ex.id}`} ({translateRole(ex.userRole || 'UNKNOWN')})</li>
                                ))}
                            </ul>
                        ) : (<i>Исполнители не назначены или идет загрузка...</i>)}
                    </div>
                    <div className="detail-item"><span className="detail-label">Дата создания плана:</span> {formatDate(plan.createdAt)}</div>
                </div>
            </section>

            <section className="related-reports-section">
                <h3>Связанные квартальные отчеты ({relatedReports.length})</h3>
                {relatedReports.length > 0 ? (
                    <table className="related-reports-table">
                        <thead>
                            <tr>
                                <th>Год</th>
                                <th>Квартал</th>
                                <th>Факт. значение</th>
                                <th>Оценка</th>
                                {/* TODO: Загружать и отображать имя отчитавшегося пользователя */}
                                <th>Отчитался (ID)</th>
                                <th>Дата отчета</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relatedReports.map(reportItem => (
                                <tr key={reportItem.id}>
                                    <td>{reportItem.year}</td>
                                    <td>{reportItem.quarter}</td>
                                    <td>{reportItem.actualValue ?? '-'}</td>
                                    <td>{reportItem.analystAssessmentScore ?? <i style={{color: '#888'}}>Нет</i>}</td>
                                    <td>{reportItem.reportingUserId}</td>
                                    <td>{formatDate(reportItem.createdAt)}</td>
                                    <td><Link to={`/reports/${reportItem.id}`}>Детали отчета</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (<p>По этому плану еще не было подано отчетов.</p>)}
            </section>
        </div>
    );
};

export default PlanDetailsPage;