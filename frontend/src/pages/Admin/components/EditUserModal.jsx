// src/pages/Admin/components/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { translateRole } from '../../../utils/authUtils'; // Путь: ../../../utils/
import './EditUserModal.css'; // Создадим стили

const AVAILABLE_ROLES = ['ADMIN', 'ANALYST', 'EXECUTOR']; // Уточни

const EditUserModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        userRole: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                userRole: user.userRole || '',
            });
        } else {
            // Сброс формы, если user null (например, при закрытии модалки)
            setFormData({ fullName: '', email: '', userRole: '' });
        }
        setError(''); // Сбрасываем ошибку при открытии/смене пользователя
    }, [user]); // Обновляем форму при смене пользователя

    if (!user) {
        return null; // Не рендерим ничего, если нет пользователя для редактирования
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        // Валидация (базовая)
        if (!formData.fullName.trim()) {
            setError("Полное имя не может быть пустым.");
            setIsSaving(false);
            return;
        }
        if (!formData.email.trim()) { // TODO: Добавить валидацию формата email
            setError("Email не может быть пустым.");
            setIsSaving(false);
            return;
        }
        if (!formData.userRole) {
            setError("Необходимо выбрать роль.");
            setIsSaving(false);
            return;
        }

        try {
            // Вызываем onSave, переданный из родительского компонента
            // onSave должен быть async функцией, которая вызывает userService.partialUpdateUser
            await onSave(user.id, formData);
            // onClose(); // Закрываем модалку после успешного сохранения (можно перенести в onSave)
        } catch (apiError) {
            // Ошибку должен обработать onSave и, возможно, передать сюда
            // или setError(apiError.message)
            console.error("Error in modal submit (should be handled by onSave):", apiError);
            // setError(apiError.message || "Не удалось сохранить изменения.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}> {/* Закрытие по клику на оверлей */}
            <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Предотвращение закрытия по клику на контент */}
                <h2>Редактирование пользователя {user.email}</h2>
                {error && <p className="error-message modal-error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName">Полное имя:</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={isSaving}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isSaving}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="userRole">Роль:</label>
                        <select
                            id="userRole"
                            name="userRole"
                            value={formData.userRole}
                            onChange={handleChange}
                            disabled={isSaving}
                            required
                        >
                            <option value="" disabled>-- Выберите роль --</option>
                            {AVAILABLE_ROLES.map(role => (
                                <option key={role} value={role}>{translateRole(role)}</option>
                            ))}
                        </select>
                    </div>
                    {/* Пароль здесь не меняем, для этого нужен отдельный механизм */}
                    <div className="modal-actions">
                        <button type="submit" className="action-btn save-btn" disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button type="button" className="action-btn cancel-btn" onClick={onClose} disabled={isSaving}>
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;