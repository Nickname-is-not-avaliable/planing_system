// src/services/reportService.js
import api from './api';

// Получить все отчеты
const getAllReports = () => {
  return api.get('/reports');
};

// Получить отчет по ID
const getReportById = (id) => {
  return api.get(`/reports/${id}`);
};

// Создать отчет (данные соответствуют телу POST /api/reports)
// !! Важно: Уточнить, какие поля обязательны при СОЗДАНИИ отчета Исполнителем
// !! (assessedByUserId и analystAssessmentScore могут быть null/не передаваться)
const createReport = (reportData) => {
  return api.post('/reports', reportData);
};

// Обновить отчет (данные могут отличаться, например, добавление оценки)
const updateReport = (id, reportData) => {
  return api.put(`/reports/${id}`, reportData);
}

// Удалить отчет
const deleteReport = (id) => {
  return api.delete(`/reports/${id}`);
}

const reportService = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
};

export default reportService;