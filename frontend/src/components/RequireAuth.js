// src/components/RequireAuth.js
import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; // Путь: ../hooks/

const RequireAuth = ({ children, allowedRoles }) => {
  const { user } = useAuth(); // Получаем пользователя из контекста
  const location = useLocation(); // Получаем текущее местоположение

  // 1. Проверка аутентификации
  if (!user) {
    // Пользователь не вошел в систему.
    // Перенаправляем на страницу логина, сохраняя текущий путь (location)
    // чтобы можно было вернуться назад после успешного входа.
    console.log('RequireAuth: User not found, redirecting to login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
    // 'replace' заменяет текущую запись в истории навигации,
    // чтобы пользователь не мог вернуться на защищенную страницу кнопкой "Назад" браузера до логина.
  }

  // 2. Проверка ролей (ЗАДЕЛ НА БУДУЩЕЕ)
  // Эта проверка сработает, только если при использовании <RequireAuth> передан пропс allowedRoles
  if (allowedRoles && !allowedRoles.includes(user.userRole)) { // Используем user.userRole
      // Роль пользователя не входит в список разрешенных.
      // Перенаправляем на главную страницу (или можно на специальную страницу "Доступ запрещен").
      console.warn(`RequireAuth: Access denied for role "${user.userRole}". Required: ${allowedRoles.join(', ')}. Redirecting to home.`);
      // TODO: Возможно, создать страницу /unauthorized и перенаправлять туда?
      return <Navigate to="/" replace />; // Перенаправляем на главную
  }

  // Если пользователь аутентифицирован (и, если проверялись роли, имеет нужную роль) -
  // рендерим дочерний компонент (защищенную страницу).
  console.log('RequireAuth: Access granted.');
  return children;
};

export default RequireAuth;