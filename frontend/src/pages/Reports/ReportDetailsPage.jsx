// src/pages/Reports/ReportDetailsPage.js
import React from 'react';
import { useParams, Link } from 'react-router-dom';

// Импорт кастомных хуков
import useReportDetails from '../../hooks/useReportDetails';

// Импорт подкомпонентов
import ReportInfoSection from './components/ReportInfoSection';
import PlanInfoSection from './components/PlanInfoSection';
import AssessmentSection from './components/AssessmentSection';
import CommentsSection from './components/CommentsSection';
import DocumentsSection from './components/DocumentsSection';

// Основные стили страницы
import './ReportDetailsPage.css';

const ReportDetailsPage = () => {
    const { id: reportId } = useParams();

    // Получаем данные и функции из кастомного хука для деталей отчета
    // setReport нужен для обновления после оценки
    const { report, plan, reportingUser, assessingUser, loading, error, setReport } = useReportDetails(reportId);

    // Обработчик обновления отчета после оценки (передается в AssessmentSection)
    // Этот callback будет вызван из AssessmentSection после успешного PUT запроса
    const handleAssessmentUpdate = (updatedReport) => {
        setReport(updatedReport); // Обновляем отчет в состоянии этого компонента
        // Имя оценщика обновится в AssessmentSection самостоятельно
        // (или через проп assessingUser, если он обновился в useReportDetails, но мы так не делали)
    };

    // --- РЕНДЕРИНГ КОМПОНЕНТА ---

    if (loading) return <div className="loading-container"><p>Загрузка деталей отчета...</p></div>;
    // Показываем главную ошибку загрузки отчета
    if (error) return <div className="error-container"><p className="error-message">{error}</p></div>;
    // Если не грузится и не было ошибки, но отчета нет (маловероятно после рефакторинга хука)
    if (!report && !loading) return <div className="not-found-container"><p>Отчет не найден.</p></div>;
    // Если отчет еще не загрузился (на всякий случай)
    if (!report) return null; // Или можно вернуть скелетон/заглушку


    return (
        <div className="report-details-container">
            {/* Заголовок и ссылка Назад */}
            <h2>Детали отчета за {report.quarter} квартал {report.year} года</h2>
            <Link to="/reports" style={{ marginBottom: '20px', display: 'inline-block' }}>
                ← Вернуться к списку отчетов
            </Link>

            {/* Основной Grid с подкомпонентами */}
            <div className="report-details-grid">
                <ReportInfoSection report={report} reportingUser={reportingUser} />
                <PlanInfoSection plan={plan} />
                <AssessmentSection
                    assessingUser={assessingUser}
                    report={report}
                    onAssessmentUpdate={handleAssessmentUpdate} // Передаем callback
                />
            </div>

            {/* Раздел Документы */}
            <DocumentsSection reportId={reportId} />

            {/* Раздел Комментарии (использует свой хук внутри) */}
            <CommentsSection reportId={reportId} />

        </div> // report-details-container
    );
};

export default ReportDetailsPage;