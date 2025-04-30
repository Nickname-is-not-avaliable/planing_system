// src/services/documentService.js
import api from './api';

// --- ИЗМЕНЕНО: Получаем ВСЕ документы ---
// Фильтрация будет на фронтенде
const getAllDocuments = (signal) => {
  // GET /api/documents
  return api.get('/documents', { signal });
};

// Создать запись о документе (связать файл с отчетом)
// Ожидает { reportId, uploadedById, filename, filePath }
const createDocument = (documentData) => {
  // POST /api/documents
  return api.post('/documents', documentData);
};

// Удаление документа (записи о нем)
const deleteDocument = (documentId) => {
    // DELETE /api/documents/{documentId}
    return api.delete(`/documents/${documentId}`);
}

const documentService = {
  getAllDocuments, // <--- Изменено
  createDocument,
  deleteDocument
};

export default documentService;