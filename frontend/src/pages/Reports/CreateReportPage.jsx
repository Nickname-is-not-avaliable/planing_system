// src/pages/Reports/CreateReportPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import reportService from '../../services/reportService'; // Путь: ../../services/
import planService from '../../services/planService';     // Путь: ../../services/
import useAuth from '../../hooks/useAuth';                 // Путь: ../../hooks/
import './CreateReportPage.css'; // Путь: ./ (стили лежат рядом или создай их)

const CreateReportPage = () => {
    const { user, loading: authLoading } = useAuth(); // Получаем пользователя и статус загрузки auth
    const navigate = useNavigate();

    // Состояние формы
    const [formData, setFormData] = useState({
        planId: '',
        year: new Date().getFullYear(),
        quarter: '',
        actualValue: '',
    });
    // Состояние для списка планов пользователя
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true); // Флаг загрузки планов
    // Состояние для отправки формы
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [error, setError] = useState(''); // Общая ошибка формы или загрузки

    // Функция загрузки планов, доступных пользователю
    const fetchUserPlans = useCallback(async (userId, signal) => {
        setLoadingPlans(true);
        setError(''); // Сброс ошибки перед загрузкой
        try {
            const response = await planService.getAllPlans(signal);
            if (!Array.isArray(response.data)) { throw new Error("API plans response is not an array"); }

            // Фильтруем планы по ID пользователя
            const userPlans = response.data.filter(plan =>
                 plan.executorUserIds && Array.isArray(plan.executorUserIds) &&
                 plan.executorUserIds.map(String).includes(String(userId))
            );

            setAvailablePlans(userPlans);
            if (userPlans.length === 0 && !signal?.aborted) {
                setError('Для вас нет назначенных планов, по которым можно отчитаться.');
            }
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch user plans:", err);
                setError('Не удалось загрузить список планов.');
                setAvailablePlans([]); // Очищаем на случай ошибки
            } else { console.log("User plans fetch aborted."); }
        } finally {
             if (!signal?.aborted) { setLoadingPlans(false); }
        }
    }, []); // Нет зависимостей от state

    // useEffect для загрузки планов при изменении пользователя
    useEffect(() => {
        if (authLoading) return; // Ждем загрузки пользователя

        const controller = new AbortController();
        if (user?.id) { // Загружаем, только если есть ID пользователя
            fetchUserPlans(user.id, controller.signal);
        } else {
            // Если пользователя нет, сбрасываем состояние
            setLoadingPlans(false);
            setAvailablePlans([]);
        }
        // Функция очистки для отмены запроса
        return () => controller.abort();
    }, [user?.id, authLoading, fetchUserPlans]); // Зависим от ID пользователя и fetchUserPlans

    // Обработчик изменений полей формы
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    // Обработчик отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Сброс предыдущих ошибок

        // Проверка авторизации
        if (!user?.id) { setError('Необходимо войти в систему для создания отчета.'); return; }
        // Проверка доступности планов
        if (loadingPlans || availablePlans.length === 0) { setError('Планы еще не загружены или недоступны.'); return; }

        setLoadingSubmit(true);

        // Валидация полей
        if (!formData.planId) { setError('Выберите план.'); setLoadingSubmit(false); return; }
        if (!formData.year || isNaN(parseInt(formData.year, 10)) || formData.year < 2000) { setError('Введите корректный год.'); setLoadingSubmit(false); return; }
        if (!formData.quarter) { setError('Выберите квартал.'); setLoadingSubmit(false); return; }
        if (formData.actualValue === '' || isNaN(parseFloat(formData.actualValue))) { setError('Введите корректное фактическое значение.'); setLoadingSubmit(false); return; }

        // Подготовка данных для отправки
        const reportDataToSend = {
            planId: parseInt(formData.planId, 10),
            reportingUserId: user.id, // Используем ID текущего пользователя
            year: parseInt(formData.year, 10),
            quarter: parseInt(formData.quarter, 10),
            actualValue: parseFloat(formData.actualValue),
        };

        try {
            await reportService.createReport(reportDataToSend);
            navigate('/reports', { state: { message: 'Отчет успешно создан!' } }); // Переход с сообщением
        } catch (err) {
            console.error("Failed to create report:", err);
            const apiError = err.response?.data?.message || err.message || 'Не удалось создать отчет.';
            setError(apiError);
        } finally {
            setLoadingSubmit(false);
        }
    };

    // Рендеринг при загрузке auth или если нет пользователя
    if (authLoading) return <p>Проверка пользователя...</p>;
    if (!user) {
       return (
           <div className="create-report-container">
               <h2>Создание квартального отчета</h2>
               <p className="error-message">Пожалуйста, <Link to="/login">войдите в систему</Link>, чтобы создать отчет.</p>
           </div>
       );
    }

    // Основной рендеринг формы
    return (
        <div className="create-report-container">
            <h2>Создание квартального отчета</h2>
            <Link to="/reports" style={{ marginBottom: '20px', display: 'inline-block' }}>
                ← Вернуться к списку отчетов
            </Link>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit} className="create-report-form">
                {/* Выбор Плана */}
                <div className="form-group">
                    <label htmlFor="planId">План*:</label>
                    {loadingPlans ? ( <p>Загрузка планов...</p> )
                    : availablePlans.length > 0 ? (
                        <select id="planId" name="planId" value={formData.planId}
                            onChange={handleChange} required disabled={loadingSubmit}>
                            <option value="" disabled>-- Выберите план --</option>
                            {availablePlans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name} (ID: {plan.id})</option>
                            ))}
                        </select>
                    ) : (
                        // Показываем сообщение об отсутствии планов, только если не было ошибки загрузки
                        !error && <p>Нет доступных планов для отчетности.</p>
                    )}
                </div>

                {/* Год и Квартал */}
                <div className="form-row">
                    <div className="form-group form-group-half">
                        <label htmlFor="year">Год*:</label>
                        <input type="number" id="year" name="year" value={formData.year}
                            onChange={handleChange} required min="2000" max="2099"
                            disabled={loadingSubmit} placeholder="ГГГГ"
                        />
                    </div>
                    <div className="form-group form-group-half">
                         <label htmlFor="quarter">Квартал*:</label>
                         <select id="quarter" name="quarter" value={formData.quarter}
                            onChange={handleChange} required disabled={loadingSubmit}>
                            <option value="" disabled>-- Выберите --</option>
                            <option value="1">1 квартал</option> <option value="2">2 квартал</option>
                            <option value="3">3 квартал</option> <option value="4">4 квартал</option>
                         </select>
                    </div>
                </div>

                {/* Фактическое значение */}
                <div className="form-group">
                    <label htmlFor="actualValue">Фактическое значение*:</label>
                    <input type="number" id="actualValue" name="actualValue" value={formData.actualValue}
                        onChange={handleChange} required step="any"
                        disabled={loadingSubmit} placeholder="Введите числовое значение"
                    />
                </div>

                {/* Кнопка отправки */}
                <button type="submit"
                   disabled={loadingSubmit || loadingPlans || availablePlans.length === 0}>
                    {loadingSubmit ? 'Создание...' : 'Создать отчет'}
                </button>
            </form>
        </div>
    );
};

export default CreateReportPage;