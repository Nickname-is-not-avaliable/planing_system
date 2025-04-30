// src/pages/Auth/LoginPage.js
import React, { useState, useEffect } from 'react'; // Добавили useEffect
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Добавили Link
import useAuth from '../../hooks/useAuth';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Для сообщения после регистрации
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем путь, откуда пришли, или "/", и сообщение из state (после регистрации)
  const from = location.state?.from?.pathname || "/";
  const message = location.state?.message;

  useEffect(() => {
      // Если есть сообщение (например, после регистрации), показываем его
      if (message) {
          setSuccessMessage(message);
          // Очищаем state в истории, чтобы сообщение не висело при перезагрузке
          window.history.replaceState({}, document.title)
      }
  }, [message]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage(''); // Убираем сообщение об успехе при попытке входа
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Ошибка входа. Проверьте email и пароль.');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Вход в систему</h2>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>} {/* Показываем сообщение об успехе */}
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        {/* --- Ссылка на регистрацию --- */}
        <p className="register-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
        {/* --- Конец ссылки --- */}
      </form>
    </div>
  );
};

export default LoginPage;