// src/pages/Reports/components/PlanInfoSection.js
import React from 'react';
import { Link } from 'react-router-dom';

const PlanInfoSection = ({ plan }) => {
    return (
        <div className="detail-section">
            <h3>План</h3>
            <div className="detail-item">
                <span className="detail-label">Название плана:</span>
                <span className="detail-value">
                    {plan ? (
                        <Link to={`/plans/${plan.id}`}>{plan.name}</Link>
                    ) : 'Загрузка...'}
                </span>
            </div>
            {plan && plan.targetValue !== undefined && (
                 <div className="detail-item">
                     <span className="detail-label">Цель плана:</span>
                     <span className="detail-value">{plan.targetValue ?? '-'}</span>
                 </div>
            )}
             {plan && plan.startDate && (
                 <div className="detail-item">
                     <span className="detail-label">Период плана:</span>
                     <span className="detail-value">{new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}</span>
                 </div>
            )}
        </div>
    );
};

export default PlanInfoSection;