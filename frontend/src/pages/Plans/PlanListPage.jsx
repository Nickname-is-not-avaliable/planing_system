// src/pages/Plans/PlanListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import planService from '../../services/planService'; // <--- ИЗМЕНЕНО ../ на ../../
import useAuth from '../../hooks/useAuth';         // <--- ИЗМЕНЕНО ../ на ../../
// import './PlanListPage.css'; // Если есть такой файл, импорт остается ./

const PlanListPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Получаем текущего пользователя

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await planService.getAllPlans();
        setPlans(response.data); // Предполагаем, что API возвращает массив планов в data
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setError('Не удалось загрузить планы. Попробуйте позже.');
        // Можно проверять статус ошибки (err.response.status)
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []); // Пустой массив зависимостей - выполнить один раз при монтировании

  if (loading) {
    return <p>Загрузка планов...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Список планов</h2>
      {/* Кнопка создания плана, видна только ADMIN и ANALYST */}
      {(user?.role === 'ADMIN' || user?.role === 'ANALYST') && (
          <Link to="/plans/new"> {/* Нужен будет роут и страница для создания */}
              <button style={{ marginBottom: '15px' }}>Создать новый план</button>
          </Link>
      )}

      {plans.length === 0 ? (
        <p>Планов пока нет.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Название</th>
              <th>Целевое значение</th>
              <th>Дата начала</th>
              <th>Дата окончания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.id}</td>
                <td>{plan.name}</td>
                <td>{plan.targetValue}</td>
                <td>{plan.startDate ? new Date(plan.startDate).toLocaleDateString() : '-'}</td>
                <td>{plan.endDate ? new Date(plan.endDate).toLocaleDateString() : '-'}</td>
                <td>
                  <Link to={`/plans/${plan.id}`}> {/* Нужен роут и страница деталей */}
                     Детали
                  </Link>
                  {/* Сюда можно добавить кнопки редактирования/удаления с проверкой роли */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PlanListPage;