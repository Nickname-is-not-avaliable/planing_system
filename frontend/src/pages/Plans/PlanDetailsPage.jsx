// src/pages/Plans/PlanDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import planService from '../../services/planService'; // <--- ИЗМЕНЕНО ../ на ../../
import userService from '../../services/userService'; // <--- ИЗМЕНЕНО ../ на ../../
import './PlanDetailsPage.css'; // Этот импорт остается

const PlanDetailsPage = () => {
  const { id } = useParams(); // Получаем id из URL (/plans/:id)
  const [plan, setPlan] = useState(null);
  const [creator, setCreator] = useState(null); // Данные создателя
  const [executors, setExecutors] = useState([]); // Данные исполнителей
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlanDetails = async () => {
      setLoading(true);
      setError('');
      setCreator(null);
      setExecutors([]);

      try {
        // 1. Загружаем основные данные плана
        const planResponse = await planService.getPlanById(id);
        const planData = planResponse.data;
        setPlan(planData);

        // 2. Загружаем данные создателя (если есть createdById)
        // Используем заглушку '1' если planData.createdById нет (на всякий случай)
        // Но в твоем PlanDto он вроде есть всегда
        const creatorId = planData.createdById || 1; // Или просто planData.createdById
        if (creatorId) {
          try {
            const creatorResponse = await userService.getUserById(creatorId);
            setCreator(creatorResponse.data);
          } catch (userErr) {
            console.error(`Failed to fetch creator (ID: ${creatorId}):`, userErr);
            setCreator({ id: creatorId, fullName: `Не удалось загрузить (ID: ${creatorId})` }); // Показываем ID если не загрузилось имя
          }
        } else {
            setCreator({ fullName: "Не указан" }); // Если ID создателя нет в данных плана
        }


        // 3. Загружаем данные исполнителей (если есть executorUserIds)
        if (planData.executorUserIds && planData.executorUserIds.length > 0) {
          // Promise.all позволяет выполнить все запросы параллельно
          const executorPromises = planData.executorUserIds.map(userId =>
            userService.getUserById(userId)
              .then(res => res.data) // Возвращаем данные пользователя
              .catch(err => {
                console.error(`Failed to fetch executor (ID: ${userId}):`, err);
                return { id: userId, fullName: `Не удалось загрузить (ID: ${userId})` }; // Заглушка при ошибке
              })
          );
          const executorData = await Promise.all(executorPromises);
          setExecutors(executorData);
        }

      } catch (err) {
        console.error("Failed to fetch plan details:", err);
        setError(`Не удалось загрузить данные плана (ID: ${id}). Возможно, план не найден.`);
        setPlan(null); // Сбрасываем план при ошибке
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, [id]); // Перезагружаем данные при смене id в URL

  // Отображение состояния загрузки
  if (loading) {
    return <p>Загрузка деталей плана...</p>;
  }

  // Отображение ошибки
  if (error) {
    return <p className="error-message">{error}</p>;
  }

  // Отображение, если план не найден (но не было ошибки сети)
  if (!plan) {
    return <p>План с номером {id} не найден.</p>;
  }

  // Форматирование дат для вывода
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      // Проверяем, содержит ли строка время (из PlanDto createdAt)
      if (dateString.includes('T')) {
        return new Date(dateString).toLocaleString(); // Дата и время
      } else {
        // Преобразуем YYYY-MM-DD в объект Date, учитывая UTC
        const [year, month, day] = dateString.split('-');
        // new Date(year, monthIndex, day) может дать неверную дату из-за часового пояса
        // Используем UTC для корректного отображения даты как есть
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toLocaleDateString(); // Только дата
      }
    } catch (e) {
        console.error("Date formatting error:", e);
        return dateString; // Возвращаем как есть, если ошибка
    }
  };

  // Рендеринг деталей плана
  return (
    <div className="plan-details-container">
      <h2>Детали плана: {plan.name}</h2>
       <Link to="/plans" style={{ marginBottom: '20px', display: 'inline-block' }}>
          ← Вернуться к списку планов
       </Link>

      <div className="plan-details-grid">
        <div className="detail-item">
          <span className="detail-label">Номер плана:</span>
          <span className="detail-value">{plan.id}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Название:</span>
          <span className="detail-value">{plan.name}</span>
        </div>
        <div className="detail-item detail-item-full"> {/* Занимает всю ширину */}
          <span className="detail-label">Описание:</span>
          <span className="detail-value">{plan.description || <i>Нет описания</i>}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Целевое значение:</span>
          <span className="detail-value">{plan.targetValue ?? '-'}</span> {/* Используем ?? для обработки null/undefined */}
        </div>
        <div className="detail-item">
          <span className="detail-label">Дата начала:</span>
          <span className="detail-value">{formatDate(plan.startDate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Дата окончания:</span>
          <span className="detail-value">{formatDate(plan.endDate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Создатель:</span>
          <span className="detail-value">
             {creator ? creator.fullName : 'Загрузка...'}
          </span>
        </div>
         <div className="detail-item">
          <span className="detail-label">Дата создания:</span>
          <span className="detail-value">{formatDate(plan.createdAt)}</span>
        </div>
        <div className="detail-item detail-item-full">
          <span className="detail-label">Исполнители:</span>
           {executors.length > 0 ? (
             <ul className="executors-list">
             {executors.map(ex => (
             <li key={ex.id}>
                {ex?.fullName && !ex.fullName.startsWith('(Ошибка') ? ex.fullName : 'Неизвестный исполнитель'}
                {ex?.email ? ` (${ex.email})` : ''}
              </li>
             ))}
             </ul>
           ) : (
             <span className="detail-value"><i>Нет назначенных исполнителей</i></span>
           )}
        </div>

        {/* TODO: Здесь можно добавить раздел для связанных отчетов или документов */}
         {/* <div className="related-items-section">
             <h3>Связанные отчеты/документы</h3>
             <p>...</p>
         </div> */}

      </div>
       {/* TODO: Добавить кнопки редактирования/удаления (с проверкой роли позже) */}
       <div className="plan-actions">
           {/* <button>Редактировать</button> */}
           {/* <button style={{backgroundColor: '#dc3545'}}>Удалить</button> */}
       </div>
    </div>
  );
};

export default PlanDetailsPage;