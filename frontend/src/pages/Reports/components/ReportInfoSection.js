// src/pages/Reports/components/ReportInfoSection.js
import React from 'react';

// Вспомогательная функция форматирования даты/времени
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try { return new Date(dateTimeString).toLocaleString(); }
    catch (e) { return dateTimeString; }
};

const ReportInfoSection = ({ report, reportingUser }) => {
    if (!report) return null; // Не рендерим, если нет данных отчета

    return (
        <div className="detail-section">
            <h3>Отчет</h3>
            <div className="detail-item">
                <span className="detail-label">ID Отчета:</span>
                <span className="detail-value">{report.id}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Год:</span>
                <span className="detail-value">{report.year}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Квартал:</span>
                <span className="detail-value">{report.quarter}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Фактическое значение:</span>
                <span className="detail-value">{report.actualValue ?? '-'}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Дата создания отчета:</span>
                <span className="detail-value">{formatDateTime(report.createdAt)}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Отчитался:</span>
                <span className="detail-value">{reportingUser ? reportingUser.fullName : 'Загрузка...'}</span>
            </div>
        </div>
    );
};

export default ReportInfoSection;