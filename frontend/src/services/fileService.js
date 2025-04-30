// src/services/fileService.js
import api from './api'; // Настроенный axios

// Загрузка файла
// Ожидает файл в поле 'file' (уточни, если имя другое!)
// Возвращает информацию о файле (например, { filename, filePath })
const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' - предполагаемое имя поля

  return api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Важно для FormData
    },
  });
};

// Скачивание файла - не используем напрямую в сервисе,
// ссылка будет формироваться в компоненте

const fileService = {
  uploadFile,
};

export default fileService;