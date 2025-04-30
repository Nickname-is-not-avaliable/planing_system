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

// Опционально: другие функции CRUD для пользователей, если нужны будут в админке
// const updateUser = (id, userData) => { ... }
// const deleteUser = (id) => { ... }

const userService = {
  getAllUsers,
  getUserById,
  // updateUser,
  // deleteUser,
};

export default userService;