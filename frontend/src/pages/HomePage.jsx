// src/pages/HomePage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './HomePage.css';
import { translateRole } from '../utils/authUtils';
import { FaClipboardList, FaChartBar, FaInfoCircle } from 'react-icons/fa';
import RoleModal from '../components/RoleModal'; // Не забудь создать этот файл

const HomePage = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayName = user?.fullName || user?.email || 'Гость';
  const displayRole = translateRole(user?.userRole);

  return (
    <div className="home-page-container">
      {/* Приветствие */}
      <div className="welcome-header">
        <h1>Добро пожаловать, {displayName}!</h1>
        <p>Вы вошли в систему как <strong>{displayRole}</strong>.</p>
      </div>

      {/* Описание */}
      <div className="system-overview">
        <p>
          Автоматизированная Система Мониторинга Планов (АСМП) предназначена для
          эффективного управления рабочими планами, отслеживания их выполнения через
          квартальные отчеты и анализа результатов деятельности.
        </p>
      </div>

      {/* Карточки */}
      <div className="dashboard-grid">
        {(user?.userRole === 'ADMIN' || user?.userRole === 'ANALYST' || user?.userRole === 'MANAGER') && (
          <Link to="/plans" className="dashboard-card plans-card">
            <div className="card-icon">
              <FaClipboardList size={40} />
            </div>
            <h3>Управление Планами</h3>
            <p>Просмотр, создание и редактирование планов работ.</p>
          </Link>
        )}

        <Link to="/reports" className="dashboard-card reports-card">
          <div className="card-icon">
            <FaChartBar size={40} />
          </div>
          <h3>Квартальные Отчеты</h3>
          <p>Просмотр, создание и оценка отчетов о выполнении планов.</p>
        </Link>
      </div>

      {/* Инструкция */}
      <div className="next-steps">
        <p>Используйте навигационную панель сверху или карточки быстрого доступа для перехода к нужным разделам.</p>
      </div>

      {/* Кнопка инфо */}
      <button className="info-button" onClick={() => setIsModalOpen(true)} aria-label="Информация о ролях">
        <FaInfoCircle size={24} color="#4a4a4a" />
      </button>

      {/* Модальное окно */}
      <RoleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default HomePage;
