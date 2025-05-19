// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService'; // Путь: ../services/
import api from '../services/api';                 // Путь: ../services/

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // user будет хранить UserDto { id, email, fullName, userRole } или null
  const [user, setUser] = useState(null);
  // Состояние для токена (для будущего JWT, сейчас может быть null)
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);
  // Флаг для отслеживания начальной загрузки пользователя из localStorage
  const [loading, setLoading] = useState(true);

  // Эффект для управления заголовком Authorization при изменении токена
  useEffect(() => {
      console.log("AuthContext: Token changed to", token);
      if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          localStorage.setItem('authToken', token); // Сохраняем токен
          console.log("AuthContext: Authorization header set with token.");
      } else {
          delete api.defaults.headers.common['Authorization'];
          localStorage.removeItem('authToken'); // Удаляем токен
          console.log("AuthContext: Authorization header removed.");
      }
  }, [token]); // Зависит от токена

  // Эффект для загрузки пользователя из localStorage при первом монтировании компонента
  useEffect(() => {
    const loadUserFromStorage = async () => {
      console.log("AuthContext: Attempting to load user from localStorage...");
      const storedToken = localStorage.getItem('authToken');
      const userDataString = localStorage.getItem('authUser');

      if (userDataString) {
         try {
           const parsedUser = JSON.parse(userDataString);
           console.log("AuthContext: User data found in localStorage:", parsedUser);
           setUser(parsedUser);
           // Если пользователь загружен, а токен тоже есть в хранилище, установим его в state
           // Это важно, чтобы useEffect выше установил заголовок авторизации
           if (storedToken && !token) { // Устанавливаем, только если он еще не установлен
             setToken(storedToken);
           }
           // TODO: Опционально в будущем: Проверить валидность токена/сессии запросом к /api/users/me
         } catch (error) {
           console.error("AuthContext: Failed to parse user data from localStorage", error);
           localStorage.removeItem('authUser');
           localStorage.removeItem('authToken'); // Также чистим токен, если данные пользователя некорректны
           setUser(null); // Убеждаемся, что user сброшен
           setToken(null);  // И токен тоже
         }
      } else {
          console.log("AuthContext: No user data found in localStorage.");
      }
      setLoading(false); // Завершаем начальную загрузку
    };
    loadUserFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполнить один раз при монтировании

  // Функция входа в систему
  const login = async (email, password) => {
    console.log("AuthContext: Attempting login...");
    try {
      const response = await authService.login(email, password);
      // Ожидаем, что response.data - это UserDto { id, email, fullName, userRole }
      const loggedInUser = response.data;
      console.log("AuthContext: Login successful, user data:", loggedInUser);

      // --- Обработка токена (задел на будущее) ---
      // Если бэкенд возвращал токен в теле: const { token: newToken, ...userDataFromResponse } = response.data; const loggedInUser = userDataFromResponse;
      // Если токен в хедере: const newToken = response.headers['authorization']?.split(' ')[1];
      const newToken = null; // <--- Пока нет реального JWT
      // ---

      localStorage.setItem('authUser', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setToken(newToken); // Устанавливаем токен (будет null, пока не реализован JWT)

      return true; // Успех
    } catch (error) {
      console.error("AuthContext: Login failed:", error.response?.data || error.message);
      // Очищаем все при ошибке
      localStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
      return false; // Неудача
    }
  };

  // Функция выхода из системы
  const logout = () => {
    console.log("AuthContext: Logging out user.");
    // TODO: Опционально: вызвать эндпоинт выхода на бэкенде, если он появится
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null); // Сбрасываем токен
  };

  // Функция для обновления данных текущего пользователя в контексте (и localStorage)
  const updateUserInContext = (newUserData) => {
    // newUserData должен быть объектом, содержащим поля пользователя,
    // которые нужно обновить в контексте (обычно это UserDto после успешного PATCH/PUT).
    if (newUserData && typeof newUserData.id === 'number') { // Простая проверка, что данные валидны
        console.log("AuthContext: Updating user data in context and localStorage with:", newUserData);
        // Лучше всего обновить user, сохранив предыдущие поля, если newUserData частичный
        // Но если newUserData это полный UserDto, то просто setUser(newUserData)
        setUser(currentUser => ({ ...currentUser, ...newUserData })); // Сливаем, если newUserData может быть неполным
        // setUser(newUserData); // Если newUserData всегда полный UserDto
        localStorage.setItem('authUser', JSON.stringify(newUserData)); // Сохраняем полный обновленный объект
    } else {
        console.warn("AuthContext: Attempted to update user with invalid or missing data", newUserData);
    }
  };

  // Значение, предоставляемое контекстом
  const value = {
      user,
      token,    // Предоставляем токен, даже если он пока не используется активно для JWT
      loading,  // Флаг начальной загрузки пользователя
      login,
      logout,
      updateUserInContext // <--- Добавлена функция обновления
    };

  // Не рендерим дочерние компоненты, пока идет начальная загрузка пользователя
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;