// src/utils/authUtils.js

/**
 * Переводит системное имя роли пользователя в читаемое на русском языке.
 * @param {string | undefined | null} roleName - Системное имя роли (ADMIN, USER и т.д.)
 * @returns {string} - Русское название роли или исходное имя/заглушка.
 */
export const translateRole = (roleName) => {
    const rolesMap = {
      ADMIN: 'Администратор',
      ANALYST: 'Аналитик',
      MANAGER: 'Менеджер (Аналитик)', // Уточни название
      USER: 'Пользователь',
      EXECUTOR: 'Исполнитель',
    };
    return rolesMap[roleName] || roleName || 'Неизвестная роль';
  };