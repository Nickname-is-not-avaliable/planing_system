// src/components/Layout.js
import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; // Путь из components/ до hooks/ = ../hooks/
import { translateRole } from '../utils/authUtils'; // <--- ИМПОРТ ФУНКЦИИ ПЕРЕВОДА (Путь из components/ до utils/)
import './Layout.css'; // Стили рядом

const Layout = () => {
  const { user, logout } = useAuth(); // Получаем пользователя
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Перенаправляем на логин после выхода
  };

  return (
    <div className="layout-container">
      <header className="app-header">
        {/* Логотип всегда виден, ссылка зависит от статуса входа */}
        <Link to={user ? "/" : "/login"} className="logo-link">АС Мониторинга Планов</Link>

        <nav>
          {/* Навигация только для авторизованных */}
          {user && (
            <>
              <Link to="/">Главная</Link>
              <Link to="/plans">Планы</Link>
              <Link to="/reports">Отчеты</Link>
              {/* TODO: Добавить другие ссылки и проверки ролей */}
            </>
          )}
        </nav>

        {/* Информация о пользователе или кнопка Войти */}
        <div className="user-info">
          {user ? (
            <>
              {/* Отображаем имя и ПЕРЕВЕДЕННУЮ роль, если есть */}
              <span>
                  {user.fullName || user.email}
                   {/* --- ИСПОЛЬЗУЕМ translateRole --- */}
                  {user.userRole && ` (${translateRole(user.userRole)})`}
              </span>
              <button onClick={handleLogout}>Выйти</button>
            </>
          ) : (
             // Показываем только кнопку "Войти", если не авторизован
             <Link to="/login">Войти</Link>
          )}
        </div>
      </header>
      <main className="main-content">
        <Outlet /> {/* Сюда рендерятся дочерние роуты */}
      </main>
      <footer className="app-footer">
        © {new Date().getFullYear()} Машиностроительное предприятие
      </footer>
    </div>
  );
};

export default Layout;