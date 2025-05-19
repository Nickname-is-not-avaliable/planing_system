// src/components/Layout.jsx
import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { translateRole } from '../utils/authUtils';
import './Layout.css';

import { FaCog } from 'react-icons/fa';
import { motion, useAnimation } from 'framer-motion';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const controls = useAnimation();

  useEffect(() => {
    const interval = setInterval(() => {
      controls.start({
        rotate: [0, 90, 0],
        transition: { duration: 1 },
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [controls]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <motion.header
        className="app-header"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Link to={user ? "/" : "/login"} className="logo-link">
            <span>АС Мониторинга Планов</span>
        </Link>

        <nav>
          {user && (
            <>
              <Link to="/">Главная</Link>
              <Link to="/plans">Планы</Link>
              <Link to="/reports">Отчеты</Link>
              {user.userRole === 'ADMIN' && (
                <Link to="/admin/users">Управление пользователями</Link>
              )}
            </>
          )}
        </nav>

        <div className="user-info">
          {user ? (
            <>
              <span>
                {user.fullName || user.email}
                {user.userRole && ` (${translateRole(user.userRole)})`}
              </span>
              <button onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <Link to="/login">Войти</Link>
          )}
        </div>
      </motion.header>

      <main className="main-content">
        <Outlet />
      </main>

      <motion.footer
        className="app-footer"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        © {new Date().getFullYear()} Машиностроительное предприятие
      </motion.footer>
    </div>
  );
};

export default Layout;
