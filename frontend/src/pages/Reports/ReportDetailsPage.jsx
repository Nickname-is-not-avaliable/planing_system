// src/pages/Reports/ReportDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import reportService from '../../services/reportService';
import planService from '../../services/planService';
import userService from '../../services/userService';
import useAuth from '../../hooks/useAuth';
import { translateRole } from '../../utils/authUtils'; // Для отображения роли
import ReportInfoSection from './components/ReportInfoSection';
import PlanInfoSection from './components/PlanInfoSection';
import AssessmentSection from './components/AssessmentSection';
import CommentsSection from './components/CommentsSection';
import DocumentsSection from './components/DocumentsSection';
import './ReportDetailsPage.css'; // Убедись, что стили подключены

const ReportDetailsPage = () => {
    const { id: reportId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [plan, setPlan] = useState(null);
    const [reportingUser, setReportingUser] = useState(null);
    const [assessingUser, setAssessingUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Единая функция для загрузки данных пользователя ---
    const fetchUserData = useCallback(async (userId, signal) => {
        if (!userId) return null;
        try {
            const response = await userService.getUserById(userId, signal);
            return response.data;
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error(`[ReportDetails] Failed to fetch user (ID: ${userId}):`, err);
                return { id: userId, fullName: `(Пользователь ${userId} - ошибка)` };
            }
            return null;
        }
    }, []);

    // --- Основной useEffect для загрузки всех данных ---
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const loadPageData = async () => {
            setLoading(true);
            setError('');
            setReport(null); setPlan(null); setReportingUser(null); setAssessingUser(null);

            try {
                // 1. Загружаем отчет
                const reportResponse = await reportService.getReportById(reportId, signal);
                const fetchedReport = reportResponse.data;
                if (!fetchedReport) throw new Error(`Отчет с ID ${reportId} не найден.`);
                setReport(fetchedReport);

                // Промисы для параллельной загрузки связанных данных
                const dataPromises = [];

                // 2. План
                if (fetchedReport.planId) {
                    dataPromises.push(
                        planService.getPlanById(fetchedReport.planId, signal)
                            .then(res => { if (!signal.aborted) setPlan(res.data); })
                            .catch(err => {
                                if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED')
                                    console.error(`Error fetching plan ${fetchedReport.planId}`, err);
                            })
                    );
                } else { setPlan(null); }

                // 3. Отчитавшийся пользователь
                if (fetchedReport.reportingUserId) {
                    dataPromises.push(
                        fetchUserData(fetchedReport.reportingUserId, signal)
                            .then(data => { if (!signal.aborted) setReportingUser(data); })
                    );
                } else { setReportingUser(null); }

                // 4. Оценивший пользователь
                if (fetchedReport.assessedByUserId) {
                    dataPromises.push(
                        fetchUserData(fetchedReport.assessedByUserId, signal)
                            .then(data => { if (!signal.aborted) setAssessingUser(data); })
                    );
                } else { setAssessingUser(null); }

                await Promise.all(dataPromises);

            } catch (err) {
                if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                    console.error("[ReportDetails] Failed to load page data:", err);
                    setError(err.response?.data?.message || err.message || `Не удалось загрузить данные отчета.`);
                    setReport(null);
                } else { console.log("[ReportDetails] Page data load aborted."); }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        if (reportId && !isNaN(parseInt(reportId, 10))) {
            loadPageData();
        } else {
            setError("Некорректный ID отчета в URL."); setLoading(false);
        }
        return () => controller.abort();
    }, [reportId, fetchUserData]); // Зависимости

    // Обработчик обновления отчета после оценки (передается в AssessmentSection)
    const handleAssessmentUpdate = (updatedReport) => {
        setReport(updatedReport); // Обновляем данные отчета
        // Перезагружаем имя оценившего пользователя, т.к. assessedByUserId мог измениться
        if (updatedReport.assessedByUserId) {
            const controller = new AbortController(); // Новый сигнал для этого запроса
            fetchUserData(updatedReport.assessedByUserId, controller.signal).then(setAssessingUser);
        } else {
            setAssessingUser(null);
        }
    };

    // Обработчик удаления отчета
    const handleDeleteReport = async () => {
        if (!report || !user || user.userRole !== 'ADMIN') {
            alert("У вас нет прав на удаление этого отчета.");
            return;
        }
        if (window.confirm(`Вы уверены, что хотите удалить отчет №${report.id} за ${report.quarter} квартал ${report.year} года?`)) {
            setError('');
            try {
                await reportService.deleteReport(report.id);
                navigate('/reports', { state: { message: 'Отчет успешно удален!' } });
            } catch (err) {
                console.error(`Failed to delete report ${report.id}:`, err);
                const apiError = err.response?.data?.message || err.message || 'Не удалось удалить отчет.';
                setError(apiError); // Отображаем ошибку на текущей странице
            }
        }
    };

    if (loading) return <div className="loading-container"><p>Загрузка деталей отчета...</p></div>;
    if (error && !report) return <div className="error-container"><p className="error-message">{error}</p></div>;
    if (!report) return <div className="not-found-container"><p>Отчет не найден.</p></div>;

    // Только админ может удалять отчет
    const canAdminDelete = user && user.userRole === 'ADMIN';

    return (
        <div className="report-details-container">
            <header className="report-details-header">
                <h2>Детали отчета за {report.quarter} квартал {report.year} года</h2>
                <Link to="/reports" className="back-link">
                    ← Вернуться к списку отчетов
                </Link>
            </header>

            {/* Показываем основную ошибку, если она есть */}
            {error && <p className="error-message main-error">{error}</p>}

            {/* Кнопка удаления отчета для Админа */}
            {canAdminDelete && (
                <div className="report-actions top-actions">
                    <button onClick={handleDeleteReport} className="action-btn delete-btn" title="Удалить этот отчет">
                        Удалить отчет
                    </button>
                </div>
            )}

            <div className="report-details-grid">
                <ReportInfoSection report={report} reportingUser={reportingUser} />
                <PlanInfoSection plan={plan} /> {/* Передаем загруженный план */}
                <AssessmentSection
                    report={report}
                    assessingUser={assessingUser} // Передаем загруженного оценщика
                    onAssessmentUpdate={handleAssessmentUpdate}
                />
            </div>

            <DocumentsSection reportId={reportId} />
            <CommentsSection reportId={reportId} />
        </div>
    );
};

export default ReportDetailsPage;