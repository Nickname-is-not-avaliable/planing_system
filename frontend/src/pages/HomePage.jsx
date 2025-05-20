// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { translateRole } from '../utils/authUtils'; // Убедись, что путь корректен
import './HomePage.css'; // Стили для HomePage
// Иконки для новых карточек
import {
    FaClipboardList, FaChartBar, FaTasks, FaUsersCog, FaChartPie
} from 'react-icons/fa';

const HomePage = () => {
  const { user } = useAuth(); // Получаем текущего пользователя

  const displayName = user?.fullName || user?.email || 'Гость';
  const displayRole = translateRole(user?.userRole);

  // Определяем видимость карточек в зависимости от роли
  const canManagePlans = user && (user.userRole === 'ADMIN' || user.userRole === 'ANALYST' || user.userRole === 'MANAGER');
  const canViewReports = user; // Предполагаем, что все авторизованные могут видеть список отчетов (но действия внутри ограничены)
  const canViewAnalytics = user && (user.userRole === 'ADMIN' || user.userRole === 'ANALYST' || user.userRole === 'MANAGER');
  const canManageUsers = user && user.userRole === 'ADMIN';

  return (
    <div className="home-page-container">
      {/* Секция приветствия */}
      <div className="welcome-header">
        <h1>Добро пожаловать, {displayName}!</h1>
        <p>Вы вошли в систему как <strong>{displayRole}</strong>.</p>
      </div>

      {/* Краткое описание системы */}
      <div className="system-overview">
        <p>
          Автоматизированная Система Мониторинга Планов (АСМП) предназначена для
          эффективного управления рабочими планами, отслеживания их выполнения через
          квартальные отчеты и анализа результатов деятельности.
        </p>
      </div>

      {/* Сетка с карточками быстрого доступа */}
      <div className="dashboard-grid">
        {/* Карточка Планов */}
        {canManagePlans && (
           <Link to="/plans" className="dashboard-card plans-card">
             <div className="card-icon">
               <FaClipboardList size={36} /> {/* Уменьшил размер иконок для гармонии */}
             </div>
             <h3>Управление Планами</h3>
             <p>Просмотр, создание и редактирование планов работ, назначение исполнителей.</p>
           </Link>
        )}

        {/* Карточка Отчетов */}
         {canViewReports && (
             <Link to="/reports" className="dashboard-card reports-card">
               <div className="card-icon">
                 <FaChartBar size={36} />
               </div>
               <h3>Квартальные Отчеты</h3>
               <p>Просмотр, создание и оценка отчетов о выполнении планов.</p>
             </Link>
         )}

        {/* --- НОВАЯ КАРТОЧКА: АНАЛИТИКА --- */}
        {canViewAnalytics && (
            <Link to="/analytics" className="dashboard-card analytics-card">
                <div className="card-icon">
                    <FaChartPie size={36} />
                </div>
                <h3>Аналитика</h3>
                <p>Просмотр статистических данных и графиков по планам и отчетам.</p>
            </Link>
        )}
        {/* --- КОНЕЦ НОВОЙ КАРТОЧКИ --- */}

        {/* --- НОВАЯ КАРТОЧКА: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ --- */}
        {canManageUsers && (
            <Link to="/admin/users" className="dashboard-card users-card">
                <div className="card-icon">
                    <FaUsersCog size={36} />
                </div>
                <h3>Управление Пользователями</h3>
                <p>Администрирование учетных записей и ролей пользователей системы.</p>
            </Link>
        )}
        {/* --- КОНЕЦ НОВОЙ КАРТОЧКИ --- */}

         {/* Пример другой карточки (задачи) - можно оставить или убрать */}
         {/*
         {user && ( // Показываем, если пользователь вошел (любой)
             <div className="dashboard-card tasks-card">
                 <div className="card-icon">
                 <FaTasks size={36} />
                 </div>
                 <h3>Мои Задачи</h3>
                 <p>Список ваших текущих задач и отчетов, требующих внимания.</p>
             </div>
         )}
         */}
      </div>

      {/* Дополнительные инструкции или информация */}
      <div className="next-steps">
        <p>Используйте навигационную панель сверху или карточки быстрого доступа для перехода к нужным разделам.</p>
      </div>
    </div>
  );
};

export default HomePage;