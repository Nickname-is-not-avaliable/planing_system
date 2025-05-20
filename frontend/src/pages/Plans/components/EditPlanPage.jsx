// src/pages/Plans/components/EditPlanPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import planService from '../../../services/planService';
import userService from '../../../services/userService';
import useAuth from '../../../hooks/useAuth';
import { translateRole } from '../../../utils/authUtils';
import './EditPlanPage.css'; 

const EditPlanPage = () => {
    const { id: planId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [planData, setPlanData] = useState({
        name: '',
        description: '',
        targetValue: '',
        startDate: '',
        endDate: '',
        executorUserIds: [],
    });
    const [originalPlanCreatorId, setOriginalPlanCreatorId] = useState(null);
    const [originalPlanName, setOriginalPlanName] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (currentLoggedInUser, signal) => {
        setLoading(true);
        setError('');
        try {
            console.log(`[EditPlanPage] Fetching plan ID: ${planId}. Current user for permission:`, currentLoggedInUser);
            const [planResponse, usersResponse] = await Promise.all([
                planService.getPlanById(planId, signal),
                userService.getAllUsers(signal)
            ]);

            const fetchedPlan = planResponse.data;
            if (!fetchedPlan) { throw new Error("План не найден."); }
            console.log("[EditPlanPage] Fetched plan data:", fetchedPlan);

            if (!currentLoggedInUser || (currentLoggedInUser.id !== fetchedPlan.createdByUserId && currentLoggedInUser.userRole !== 'ADMIN')) {
                setError('У вас нет прав для редактирования этого плана.');
                setOriginalPlanName(fetchedPlan.name || `ID ${planId}`);
                setLoading(false);
                return;
            }

            setOriginalPlanCreatorId(fetchedPlan.createdByUserId);
            setOriginalPlanName(fetchedPlan.name || '');
            setPlanData({
                name: fetchedPlan.name || '',
                description: fetchedPlan.description || '',
                targetValue: fetchedPlan.targetValue !== null && fetchedPlan.targetValue !== undefined ? String(fetchedPlan.targetValue) : '',
                startDate: fetchedPlan.startDate ? fetchedPlan.startDate.split('T')[0] : '',
                endDate: fetchedPlan.endDate ? fetchedPlan.endDate.split('T')[0] : '',
                executorUserIds: fetchedPlan.executorUserIds || [],
            });

            const executors = (usersResponse.data || []).filter(
                u => u.userRole === 'EXECUTOR' || u.userRole === 'USER'
            );
            setAllUsers(executors);

        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("[EditPlanPage] Failed to fetch plan data or users:", err);
                setError(err.response?.data?.message || err.message || 'Не удалось загрузить данные для редактирования.');
            } else { console.log("[EditPlanPage] Data fetch aborted."); }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        if (authLoading) {
            console.log("[EditPlanPage] Auth context is loading, waiting...");
            setLoading(true);
            return;
        }
        if (!user && !authLoading) {
            setError("Для редактирования плана необходимо войти в систему.");
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        if (user) {
            fetchData(user, controller.signal);
        }
        return () => controller.abort();
    }, [authLoading, user, fetchData]);

    // --- РАСКОММЕНТИРОВАНЫ И ПРОВЕРЕНЫ ОБРАБОТЧИКИ ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setPlanData(prev => ({ ...prev, [name]: value }));
    };

    const handleExecutorsChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
        setPlanData(prev => ({ ...prev, executorUserIds: selectedIds }));
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЙ ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (originalPlanCreatorId === null || originalPlanCreatorId === undefined) {
            setError("Критическая ошибка: ID создателя плана не определен. Обновление невозможно.");
            console.error("Submit aborted: originalPlanCreatorId is null or undefined.");
            return;
        }
        if (!user || (user.id !== originalPlanCreatorId && user.userRole !== 'ADMIN')) {
             setError('У вас нет прав для сохранения изменений этого плана.');
             return;
        }

        // Валидация (пример)
        if (!planData.name.trim() || planData.name.length < 3) { setError("Название плана должно быть не менее 3 символов."); return; }
        if (planData.executorUserIds.length === 0) { setError("Выберите хотя бы одного исполнителя."); return; }
        if (!planData.startDate || !planData.endDate) { setError("Укажите даты начала и окончания плана."); return; }
        if (new Date(planData.startDate) > new Date(planData.endDate)) { setError("Дата начала не может быть позже даты окончания."); return; }

        setSaving(true);
        // Используем createdByUserId, так как PlanDto его содержит, и это ID создателя
        // А DTO для обновления на бэкенде (CreatePlanDto) ожидает поле createdById
        // Это нужно согласовать. Пока предполагаем, что бэкенд для PUT /api/plans/{id}
        // ожидает CreatePlanDto, где поле называется createdById.
        const dataToUpdate = {
            name: planData.name.trim(),
            description: planData.description.trim(),
            targetValue: planData.targetValue !== '' ? parseFloat(planData.targetValue) : 0,
            startDate: planData.startDate,
            endDate: planData.endDate,
            executorUserIds: planData.executorUserIds,
            // Поле в CreatePlanDto на бэкенде называется createdById (по нашему предположению)
            createdById: originalPlanCreatorId,
        };

        try {
            await planService.updatePlan(planId, dataToUpdate);
            navigate(`/plans/${planId}`, { state: { message: 'План успешно обновлен!' } });
        } catch (err) {
            console.error("Failed to update plan:", err);
            const apiError = err.response?.data?.message || err.message || 'Не удалось обновить план.';
            setError(apiError);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) return <p>Загрузка данных для редактирования плана...</p>;
    if (error) {
        return (
            <div className="edit-plan-container">
                <h2>Редактирование плана {originalPlanName && `: ${originalPlanName}`}</h2>
                <p className="error-message">{error}</p>
                <Link to={`/plans/${planId}`}>Вернуться к деталям плана</Link><br />
                <Link to="/plans">Вернуться к списку планов</Link>
            </div>
        );
    }
    if (!originalPlanCreatorId && !loading) {
        return <div className="edit-plan-container"><p>Не удалось загрузить данные плана для редактирования.</p></div>;
    }

    return (
        <div className="edit-plan-container">
            <h2>Редактирование плана: {originalPlanName || `ID ${planId}`}</h2>
            <form onSubmit={handleSubmit} className="edit-plan-form">
                 <div className="form-group">
                    <label htmlFor="name">Название плана*:</label>
                    <input type="text" id="name" name="name" value={planData.name} onChange={handleChange} required minLength="3" disabled={saving} />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Описание:</label>
                    <textarea id="description" name="description" value={planData.description} onChange={handleChange} rows="3" disabled={saving}></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="targetValue">Целевое значение:</label>
                    <input type="number" id="targetValue" name="targetValue" value={planData.targetValue} onChange={handleChange} step="any" disabled={saving} />
                </div>
                <div className="form-group form-row">
                    <div className="form-group-half">
                        <label htmlFor="startDate">Дата начала*:</label>
                        <input type="date" id="startDate" name="startDate" value={planData.startDate} onChange={handleChange} required disabled={saving} />
                    </div>
                    <div className="form-group-half">
                        <label htmlFor="endDate">Дата окончания*:</label>
                        <input type="date" id="endDate" name="endDate" value={planData.endDate} onChange={handleChange} required disabled={saving} />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="executorUserIds">Исполнители*:</label>
                    {allUsers.length > 0 ? (
                        <select id="executorUserIds" name="executorUserIds" multiple value={planData.executorUserIds.map(String)} onChange={handleExecutorsChange} required disabled={saving} size="5">
                            {allUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.fullName} ({u.email}) - {translateRole(u.userRole)}</option>
                            ))}
                        </select>
                    ) : (<p>Нет доступных исполнителей (роль EXECUTOR/USER).</p>)}
                    <small>Выберите одного или нескольких (Ctrl/Cmd + клик).</small>
                </div>
                <div className="form-actions">
                    <button type="submit" disabled={saving}>
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <Link to={`/plans/${planId}`} className="cancel-link">Отмена</Link>
                </div>
            </form>
        </div>
    );
};

export default EditPlanPage;