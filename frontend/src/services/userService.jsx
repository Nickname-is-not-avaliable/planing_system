// src/services/userService.js
import api from './api';

// Получить всех пользователей (для выбора исполнителей)
const getAllUsers = () => {
  return api.get('/users'); // Используем эндпоинт GET /api/users
};

// Опционально: получить пользователя по ID (может пригодиться позже)
const getUserById = (id) => {
    return api.get(`/users/${id}`);
}

const partialUpdateUser = (id, partialUserData) => {
  return api.patch(`/users/${id}`, partialUserData);
};

const updateUser = (id, userData) => {
    return api.put(`/users/${id}`, userData);
};
const deleteUser = (id) => {
    return api.delete(`/users/${id}`) 
        .then(response => {
            return response;
        })
        .catch(error => {
            console.error(`[userService.deleteUser] Error deleting user ${id}:`, error.response || error.message || error); // <--- ЛОГ 3 (Ошибка)
            throw error; 
        });
};

const userService = {
  getAllUsers,
  getUserById,
  partialUpdateUser,
  updateUser,
  deleteUser,
};

export default userService;