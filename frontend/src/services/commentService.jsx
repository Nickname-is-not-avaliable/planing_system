// src/services/commentService.js
import api from './api';

// Получить комментарии для конкретного отчета
const getCommentsForReport = (reportId, signal) => { // Добавляем signal для отмены
  return api.get('/comments', { params: { reportId }, signal });
};

// Создать новый комментарий
const createComment = (commentData) => {
  return api.post('/comments', commentData);
};

// --- НОВАЯ ФУНКЦИЯ ---
// Удалить комментарий по ID
const deleteComment = (id) => {
  return api.delete(`/comments/${id}`);
};
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---


// Опционально: Обновление
// const updateComment = (id, commentData) => api.put(`/comments/${id}`, commentData);

const commentService = {
  getCommentsForReport,
  createComment,
  deleteComment, // <--- Добавили в экспорт
  // updateComment,
};

export default commentService;