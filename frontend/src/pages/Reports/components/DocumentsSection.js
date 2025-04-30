// src/pages/Reports/components/DocumentsSection.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import fileService from '../../../services/fileService';
import documentService from '../../../services/documentService';
import api from '../../../services/api';
// --- Импорт утилиты ---
import { getFileTypeIcon } from '../../../utils/fileUtils'; // Импортируем из нового файла
// --- Импорт иконок для действий ---
import { FaDownload, FaTrashAlt } from 'react-icons/fa';

// Константа для роли админа
const ADMIN_ROLE = 'ADMIN'; // Уточни, если имя роли другое

const DocumentsSection = ({ reportId }) => {
    const { user } = useAuth();
    const [allDocuments, setAllDocuments] = useState([]);
    const [loadingDocuments, setLoadingDocuments] = useState(true);
    const [documentError, setDocumentError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);
    const [deletingDocId, setDeletingDocId] = useState(null);

    // Загрузка всех документов
    const fetchAllDocuments = useCallback(async (signal) => {
        setLoadingDocuments(true);
        setDocumentError('');
        try {
            const response = await documentService.getAllDocuments(signal);
            setAllDocuments(response.data || []);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch documents:", err);
                setDocumentError('Не удалось загрузить список документов.');
            } else { console.log("Document fetch aborted."); }
        } finally {
             if (!signal?.aborted) { setLoadingDocuments(false); }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchAllDocuments(controller.signal);
        return () => controller.abort();
    }, [fetchAllDocuments]);

    // Фильтрация документов для текущего отчета
    const reportDocuments = useMemo(() => {
        const currentReportId = parseInt(reportId, 10);
        if (isNaN(currentReportId)) return [];
        return allDocuments.filter(doc => doc.reportId === currentReportId);
    }, [allDocuments, reportId]);

    // Обработчик выбора файла
    const handleFileChange = (event) => {
        setUploadError('');
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        } else { setSelectedFile(null); }
    };

    // Обработчик загрузки документа
    const handleUploadDocument = async () => {
        if (!selectedFile) { setUploadError('Выберите файл.'); return; }
        if (!user || typeof user.id !== 'number') {
            setUploadError('Ошибка: Не удалось определить пользователя для загрузки.');
            console.error("User ID is missing or invalid:", user); return;
        }
        const currentReportId = parseInt(reportId, 10);
        if (isNaN(currentReportId)) { setUploadError('Ошибка ID отчета.'); return; }

        setUploadError(''); setIsUploading(true);
        try {
            const uploadResponse = await fileService.uploadFile(selectedFile);
            const { filePath, filename } = uploadResponse.data;
            if (!filePath || !filename) { throw new Error("Ответ API загрузки файла не содержит 'filePath' или 'filename'"); }

            const documentData = { reportId: currentReportId, uploadedByUserId: user.id, filename: filename, filePath: filePath };
            await documentService.createDocument(documentData);
            await fetchAllDocuments(); // Перезагрузка без signal
            setSelectedFile(null);
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
        } catch (err) {
            console.error("Failed to upload document:", err);
            let apiErrorMsg = 'Не удалось загрузить документ.';
            if (err.response?.data) { apiErrorMsg = err.response.data.message || err.response.data.error || JSON.stringify(err.response.data); }
            else if (err.message) { apiErrorMsg = err.message; }
            setUploadError(apiErrorMsg);
        } finally { setIsUploading(false); }
    };

     // Обработчик удаления документа
     const handleDeleteDocument = async (documentId, documentOwnerId, documentFilename) => {
        if (!user?.id) { alert("Войдите для удаления."); return; }
        const isAdmin = user.userRole === ADMIN_ROLE;
        const isOwner = user.id === documentOwnerId;
        if (!isAdmin && !isOwner) { alert("У вас нет прав на удаление этого документа."); return; }
        if (isUploading || deletingDocId) return;

        if (window.confirm(`Удалить документ "${documentFilename}"?`)) {
            setDocumentError(''); setDeletingDocId(documentId);
            try {
                await documentService.deleteDocument(documentId);
                await fetchAllDocuments(); // Перезагрузка без signal
            } catch (err) {
                 console.error(`Failed to delete document (ID: ${documentId}):`, err);
                 const apiError = err.response?.data?.message || err.message || 'Не удалось удалить документ.';
                 setDocumentError(apiError);
            } finally { setDeletingDocId(null); }
        }
    };

    const canInteract = user && user.id; // Может загружать/удалять (с проверкой прав на удаление ниже)

    return (
        <div className="related-documents-section">
            <h3>Прикрепленные документы ({reportDocuments.length})</h3>
            {documentError && <p className="error-message">{documentError}</p>}

            {/* Форма загрузки */}
            {canInteract && (
                <div className="document-upload-form">
                   <div className="form-group">
                         <label htmlFor="documentUpload">Выберите файл:</label>
                         <input type="file" id="documentUpload" onChange={handleFileChange} ref={fileInputRef} disabled={isUploading || !!deletingDocId}/>
                    </div>
                    <button onClick={handleUploadDocument} disabled={!selectedFile || isUploading || !!deletingDocId}>
                        {isUploading ? 'Загрузка...' : 'Загрузить документ'}
                    </button>
                    {uploadError && <p className="error-message upload-error">{uploadError}</p>}
                </div>
             )}
             {!canInteract && (
                 <p style={{ fontStyle: 'italic', color: '#666' }}>
                     Пожалуйста, <Link to="/login">войдите</Link>, чтобы прикрепить или удалить документы.
                 </p>
             )}

            {/* Список документов */}
            <div className="documents-list">
                {loadingDocuments ? ( <p>Загрузка документов...</p> )
                : reportDocuments.length > 0 ? (
                    <ul>
                        {reportDocuments.map(doc => {
                             // Проверка прав на удаление для этого документа
                             const isAdmin = user?.userRole === ADMIN_ROLE;
                             const isOwner = user?.id === doc.uploadedById; // Сравниваем с ID загрузившего
                             const canDeleteThisDoc = isAdmin || isOwner;

                             return (
                                <li key={doc.id} className={deletingDocId === doc.id ? 'deleting' : ''}>
                                    <div className="doc-info">
                                        <span className="file-type-icon">
                                            {/* Используем импортированную функцию */}
                                            {getFileTypeIcon(doc.filename)}
                                        </span>
                                        <span className="doc-filename" title={doc.filename}>
                                            {doc.filename}
                                        </span>
                                    </div>
                                    <div className="doc-actions">
                                        {/* Ссылка/иконка для скачивания */}
                                        <a href={`${api.defaults.baseURL}/files/download/${encodeURIComponent(doc.filePath)}`}
                                           target="_blank" rel="noopener noreferrer"
                                           className="download-link" title={`Скачать ${doc.filename}`}>
                                            <FaDownload />
                                        </a>
                                        {/* Кнопка удаления (видна только если есть права) */}
                                        {canDeleteThisDoc && (
                                             <button
                                                 onClick={() => handleDeleteDocument(doc.id, doc.uploadedById, doc.filename)}
                                                 className="delete-doc-btn"
                                                 disabled={isUploading || deletingDocId !== null}
                                                 title="Удалить документ"
                                             >
                                                 {deletingDocId === doc.id ? '...' : <FaTrashAlt />}
                                             </button>
                                        )}
                                    </div>
                                </li>
                             );
                        })}
                    </ul>
                ) : ( !documentError && <p>Прикрепленных документов нет.</p> )}
            </div>
        </div>
    );
};

export default DocumentsSection;