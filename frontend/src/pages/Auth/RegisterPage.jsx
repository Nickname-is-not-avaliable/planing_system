// src/pages/Auth/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService'; // Добавим функцию регистрации сюда
import './RegisterPage.css'; // Создадим файл стилей

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userRole: 'EXECUTOR', 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, password, confirmPassword, fullName, userRole } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // --- Валидация ---
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    if (password.length < 3) { // Согласно CreateUserDto (хотя это очень мало)
        setError('Пароль должен содержать не менее 3 символов.');
        return;
    }
    if (email.length < 3) { // Согласно CreateUserDto
        setError('Email должен содержать не менее 3 символов.');
        return;
    }
     if (!fullName.trim()) { // Простая проверка на пустое имя
        setError('Пожалуйста, укажите полное имя.');
        return;
    }
    // --- Конец валидации ---


    setLoading(true);
    try {
      // Данные для отправки, исключая confirmPassword
      const userData = { email, password, fullName, userRole };

      // Вызываем сервис регистрации (предполагаем, что он вернет созданного пользователя или просто статус)
      await authService.register(userData);

      // Перенаправляем на страницу логина с сообщением об успехе (опционально)
      navigate('/login', { state: { message: 'Регистрация прошла успешно! Пожалуйста, войдите.' } });

    } catch (err) {
      console.error("Registration failed:", err);
      // Пытаемся получить сообщение об ошибке от бэкенда
      const apiError = err.response?.data?.message || err.message || 'Ошибка регистрации. Возможно, такой email уже существует.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Регистрация</h2>
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
         <div className="form-group">
          <label htmlFor="fullName">Полное имя:</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="passwordHash">Пароль (мин. 3 симв.):</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Подтвердите пароль:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
         <div className="form-group">
          <label htmlFor="userRole">Роль:</label>
          <select
             id="userRole"
             name="userRole"
             value={userRole}
             onChange={handleChange}
             disabled={loading}
             required
          >
            {/* Используем строки, как в Swagger Enum описании. Бэкенд должен их принять */}
            <option value="EXECUTOR">Исполнитель</option>
            <option value="ANALYST">Аналитик</option>
            {/* ADMIN обычно не регистрируется через форму */}
            {/* <option value="ADMIN">Администратор</option> */}
           </select>
           <small>Выберите роль: Исполнитель (EXECUTOR) или Аналитик (ANALYST)</small>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
         <p className="login-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;