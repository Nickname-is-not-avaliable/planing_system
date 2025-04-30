// src/utils/fileUtils.js
import React from 'react';
// Импортируем нужные иконки прямо здесь
import {
    FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFileArchive,
    FaFileAudio, FaFileVideo, FaFileAlt
} from 'react-icons/fa';

/**
 * Возвращает React-компонент иконки на основе расширения файла.
 * @param {string | undefined | null} filename - Имя файла.
 * @returns {React.ReactElement} - Иконка файла.
 */
export const getFileTypeIcon = (filename) => {
    if (!filename) return <FaFileAlt title="File" />; // Иконка по умолчанию

    // Безопасное извлечение расширения
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
         return <FaFileAlt title="File" />; // Нет расширения
    }
    const extension = filename.substring(lastDotIndex + 1).toLowerCase();

    switch (extension) {
        case 'pdf': return <FaFilePdf title="PDF Document" style={{ color: '#dc3545' }} />;
        case 'doc': case 'docx': return <FaFileWord title="Word Document" style={{ color: '#0d6efd' }} />;
        case 'xls': case 'xlsx': return <FaFileExcel title="Excel Spreadsheet" style={{ color: '#198754' }} />;
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'svg': case 'webp': return <FaFileImage title="Image File" style={{ color: '#6f42c1' }} />;
        case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return <FaFileArchive title="Archive File" style={{ color: '#fd7e14' }} />;
        case 'mp3': case 'wav': case 'ogg': case 'aac': return <FaFileAudio title="Audio File" />;
        case 'mp4': case 'avi': case 'mov': case 'wmv': case 'mkv': return <FaFileVideo title="Video File" />;
        case 'txt': return <FaFileAlt title="Text File" />; // Используем стандартную для txt
        default: return <FaFileAlt title="File" />; // Иконка по умолчанию для остальных
    }
};

// Можно добавить другие утилиты для файлов сюда в будущем