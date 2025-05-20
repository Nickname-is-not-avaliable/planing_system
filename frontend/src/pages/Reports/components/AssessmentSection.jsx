// src/pages/Reports/components/AssessmentSection.js
import React, { useState, useEffect } from 'react';
import reportService from '../../../services/reportService'; // Путь: ../../../services/
import userService from '../../../services/userService';   // Путь: ../../../services/
import useAuth from '../../../hooks/useAuth';            // Путь: ../../../hooks/

// Роли, которым разрешено ставить/менять оценку
const ASSESSMENT_ALLOWED_ROLES = ['ADMIN', 'ANALYST']; 

const AssessmentSection = ({ report, assessingUser, onAssessmentUpdate }) => {
    const { user } = useAuth(); // Текущий пользователь

    const [assessmentInput, setAssessmentInput] = useState('');
    const [isAssessing, setIsAssessing] = useState(false);
    const [assessmentError, setAssessmentError] = useState('');
    const [currentAssessingUser, setCurrentAssessingUser] = useState(assessingUser);

    useEffect(() => {
        if (report?.analystAssessmentScore !== null && report?.analystAssessmentScore !== undefined) {
            setAssessmentInput(String(report.analystAssessmentScore));
        } else {
            setAssessmentInput('');
        }
        setCurrentAssessingUser(assessingUser);
    }, [report, assessingUser]);

    // Показываем заглушку, если отчет еще грузится
    if (!report) {
        return (
             <div className="detail-section detail-section-full">
                 <h3>Оценка Аналитика</h3> <p><i>Загрузка...</i></p>
             </div>
        );
    }

    const handleInputChange = (e) => { setAssessmentInput(e.target.value); };
    const fetchAssessingUser = async (userId) => {
        if (!userId) return null;
        try { return (await userService.getUserById(userId)).data; }
        catch (err) { console.error(`Err fetching user ${userId}`, err); return { id: userId, fullName: `(Ошибка)` }; }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !ASSESSMENT_ALLOWED_ROLES.includes(user.userRole)) {
             setAssessmentError('У вас недостаточно прав для оценки.'); return;
        }
        setAssessmentError(''); setIsAssessing(true);
        const score = parseInt(assessmentInput, 10);
        if (isNaN(score) || score < 1 || score > 5) { setAssessmentError('Оценка от 1 до 5.'); setIsAssessing(false); return; }

        const updatedReportData = { ...report, analystAssessmentScore: score, assessedByUserId: user.id };

        try {
            const response = await reportService.updateReport(report.id, updatedReportData);
            const newReportData = response.data;
            onAssessmentUpdate(newReportData); // Обновляем родителя
            const newUser = await fetchAssessingUser(newReportData.assessedByUserId);
            setCurrentAssessingUser(newUser); // Обновляем локально
            setAssessmentInput(String(newReportData.analystAssessmentScore));
        } catch (err) {
            console.error("Failed assessment:", err);
            const apiError = err.response?.data?.message || err.message || 'Ошибка сохранения оценки.';
            setAssessmentError(apiError);
        } finally { setIsAssessing(false); }
    };

    const isReportAssessed = report.analystAssessmentScore !== null;
    const canAssess = user && ASSESSMENT_ALLOWED_ROLES.includes(user.userRole);

    return (
        <div className="detail-section detail-section-full">
            <h3>Оценка Аналитика</h3>
            <div className="detail-item">
                <span className="detail-label">Оценил:</span>
                <span className="detail-value">
                    {report.assessedByUserId && currentAssessingUser ? currentAssessingUser.fullName : <i>Не назначен</i>}
                </span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Текущая оценка:</span>
                <span className="detail-value assessment-score">
                    {isReportAssessed ? report.analystAssessmentScore : <i style={{ color: '#888' }}>Не оценено</i>}
                </span>
            </div>

            {/* Форма оценки */}
            {canAssess && (
                <form onSubmit={handleSubmit} className="assessment-form">
                    <div className="form-group">
                        <label htmlFor="assessmentInput">
                            {isReportAssessed ? 'Изменить оценку (1-5):' : 'Поставить оценку (1-5):'}
                        </label>
                        <input type="number" id="assessmentInput" value={assessmentInput}
                            onChange={handleInputChange} min="1" max="5" required disabled={isAssessing}
                            placeholder={isReportAssessed ? 'Новая' : '1-5'}
                        />
                    </div>
                    <button type="submit" disabled={isAssessing}>
                        {isAssessing ? 'Сохранение...' : (isReportAssessed ? 'Изменить оценку' : 'Оценить')}
                    </button>
                    {assessmentError && <p className="error-message assessment-error">{assessmentError}</p>}
                </form>
            )}
            {!canAssess && (
                 <p style={{marginTop: '15px', fontStyle: 'italic', color: '#666'}}>
                     {isReportAssessed ? 'Только пользователь с правами аналитика может изменить оценку.' : 'Только пользователь с правами аналитика может поставить оценку.'}
                 </p>
            )}
        </div>
    );
};

export default AssessmentSection;