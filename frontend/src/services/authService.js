// src/services/authService.js
import api from './api';

// Используем новый эндпоинт POST /api/users/auth
// Принимает: { email, password }
// Возвращает: UserDto (предположительно { id, email, fullName, userRole }) при успехе,
//            иначе ошибку 401 или другую.
// !! ВАЖНО: Структура ответа UserDto должна соответствовать твоему UserDto на бэке.
const login = (email, password) => {
  // Меняем URL на новый эндпоинт
  return api.post('/users/auth', { email, password });
};

// !!! Оставляем комментарий про токен для будущего JWT !!!
// Если/когда бэкенд начнет возвращать токен (например, в хедере или теле ответа),
// нужно будет адаптировать обработку в AuthContext.js

// Опционально: Регистрация (остается без изменений)
const register = (userData) => {
  return api.post('/users', userData);
};

const authService = {
  login,
  register,
};

export default authService;