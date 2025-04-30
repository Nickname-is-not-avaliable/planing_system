// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import api from '../services/api'; // Импортируем api для интерцептора

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // user будет хранить UserDto { id, email, fullName, userRole }
  const [user, setUser] = useState(null);
  // Состояние для токена (даже если его пока нет, для будущего JWT)
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);
  const [loading, setLoading] = useState(true); // Для проверки при загрузке

  // При изменении токена обновляем заголовок в api instance
  useEffect(() => {
      if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          localStorage.setItem('authToken', token);
      } else {
          delete api.defaults.headers.common['Authorization'];
          localStorage.removeItem('authToken');
      }
  }, [token]);


  // Загрузка пользователя из localStorage при запуске
  useEffect(() => {
    const loadUserFromStorage = async () => {
      const storedToken = localStorage.getItem('authToken'); // Загружаем токен
      const userData = localStorage.getItem('authUser');
      if (userData) { // Если есть данные пользователя
         try {
           const parsedUser = JSON.parse(userData);
           setUser(parsedUser); // Устанавливаем пользователя
           // Если был токен, устанавливаем его тоже (важно для интерцептора)
           if (storedToken) {
              setToken(storedToken);
           }
           // TODO: Опционально в будущем: Проверить валидность токена/сессии запросом к /api/users/me
         } catch (error) {
           console.error("Failed to parse user data from storage", error);
           localStorage.removeItem('authUser');
           localStorage.removeItem('authToken'); // Чистим и токен
         }
      }
      setLoading(false);
    };
    loadUserFromStorage();
  }, []);

  // Обновленная функция login
  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      // Ожидаем, что response.data - это UserDto { id, email, fullName, userRole }
      const loggedInUser = response.data;

      // !!! Обработка токена (ПОКА ЗАГЛУШКА, но структура готова) !!!
      // Если бы бэкенд возвращал токен в теле: const { token, ...userData } = response.data;
      // Если бы токен был в хедере: const newToken = response.headers['authorization']?.split(' ')[1];
      const newToken = null; // <--- Пока нет токена

      localStorage.setItem('authUser', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setToken(newToken); // Устанавливаем токен (будет null пока)

      return true; // Успех
    } catch (error) {
      console.error("Login failed:", error);
      // Чистим всё при ошибке
      localStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
      return false; // Неудача
    }
  };

  const logout = () => {
    // TODO: Опционально: вызвать эндпоинт выхода на бэкенде, если он появится
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null);
  };

  // Значение контекста теперь включает token
  const value = { user, token, login, logout, loading };

  // Не рендерим детей, пока идет проверка пользователя при запуске
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;