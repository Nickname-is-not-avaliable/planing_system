// src/pages/Admin/UserManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import userService from '../../services/userService'; // Путь: ../../services/
import { translateRole } from '../../utils/authUtils'; // Путь: ../../utils/
import EditUserModal from './components/EditUserModal'; // Путь: ./components/
import useAuth from '../../hooks/useAuth'; // Импортируем useAuth для получения текущего пользователя
import './UserManagementPage.css'; // Стили для этой страницы

const UserManagementPage = () => {
    // Получаем текущего залогиненного пользователя и функцию для обновления его данных в контексте
    const { user: loggedInUser, updateUserInContext } = useAuth();

    const [users, setUsers] = useState([]); // Список всех пользователей
    const [loading, setLoading] = useState(true); // Флаг загрузки списка
    const [error, setError] = useState(''); // Общая ошибка для страницы (например, при загрузке списка)
    const [modalError, setModalError] = useState(''); // Ошибка для отображения в модальном окне

    // Состояния для управления модальным окном редактирования
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null); // Пользователь, данные которого редактируются

    // Функция для загрузки списка всех пользователей
    const fetchUsers = useCallback(async (signal) => {
        setLoading(true);
        setError(''); // Сбрасываем основную ошибку
        try {
            const response = await userService.getAllUsers(signal);
            setUsers(response.data || []);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch users:", err);
                setError('Не удалось загрузить список пользователей.');
            } else {
                console.log("Users fetch aborted.");
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, []); // useCallback для стабильности ссылки на функцию

    // Загрузка пользователей при монтировании компонента
    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);
        // Функция очистки для отмены запроса при размонтировании компонента
        return () => controller.abort();
    }, [fetchUsers]); // Зависим от стабильной функции fetchUsers

    // Открытие модального окна для редактирования пользователя
    const openEditModal = (userToEdit) => {
        setCurrentUserToEdit(userToEdit); // Устанавливаем пользователя для редактирования
        setIsModalOpen(true);             // Открываем модалку
        setModalError('');                // Сбрасываем ошибку модалки
    };

    // Закрытие модального окна
    const closeEditModal = () => {
        setIsModalOpen(false);
        setCurrentUserToEdit(null); // Сбрасываем пользователя
        setModalError('');          // Очищаем ошибку модалки
    };

    // Обработчик сохранения изменений пользователя из модального окна
    const handleSaveChanges = async (userId, updatedUserDataFromModal) => {
        // updatedUserDataFromModal ожидает { fullName, email, userRole }
        setModalError(''); // Сбрасываем предыдущую ошибку модалки
        try {
            // Вызываем partialUpdateUser, который должен вернуть обновленный UserDto
            const response = await userService.partialUpdateUser(userId, updatedUserDataFromModal);
            const updatedUserFromApi = response.data; // Предполагаем, что API возвращает UserDto

            // Обновляем данные в AuthContext, если редактировался текущий залогиненный пользователь
            if (loggedInUser && loggedInUser.id === userId) {
                // Формируем полный объект пользователя для контекста,
                // используя существующие данные и обновляя их из ответа API
                const userToUpdateInContext = {
                    ...loggedInUser,             // Копируем все поля текущего пользователя
                    fullName: updatedUserFromApi.fullName, // Обновляем из ответа API
                    email: updatedUserFromApi.email,       // Обновляем из ответа API
                    userRole: updatedUserFromApi.userRole, // Обновляем из ответа API
                    // ID и passwordHash не должны меняться этим запросом
                };
                console.log("UserManagementPage: Updating logged in user in context:", userToUpdateInContext);
                updateUserInContext(userToUpdateInContext); // Вызываем функцию из AuthContext
            }

            closeEditModal();         // Закрываем модалку при успехе
            await fetchUsers();       // Обновляем список пользователей на странице
                                      // (можно передать signal из нового AbortController, если это долгий процесс)
        } catch (err) {
            console.error("Failed to update user from modal:", err);
            const apiError = err.response?.data?.message || err.response?.data?.error || err.message || 'Не удалось обновить данные пользователя.';
            setModalError(apiError); // Устанавливаем ошибку для отображения ВНУТРИ модалки
            throw err; // Перебрасываем ошибку, чтобы EditUserModal мог сбросить свой флаг isSaving
        }
    };

    // Функция удаления пользователя
    const handleDeleteUser = async (userIdToDelete, userEmail) => {
        // Проверка на самоудаление
        if (loggedInUser && loggedInUser.id === userIdToDelete) {
            alert("Вы не можете удалить свою собственную учетную запись через этот интерфейс.");
            return;
        }

        if (window.confirm(`Вы уверены, что хотите удалить пользователя ${userEmail}? Это действие необратимо.`)) {
            setError(''); // Сбрасываем основную ошибку
            try {
                await userService.deleteUser(userIdToDelete);
                await fetchUsers(); // Обновляем список после удаления
            } catch (err) {
                console.error("Failed to delete user:", err);
                const apiError = err.response?.data?.message || err.message || 'Не удалось удалить пользователя.';
                setError(apiError); // Устанавливаем основную ошибку
            }
        }
    };

    // Отображение состояния загрузки списка пользователей
    if (loading) {
        return <p>Загрузка списка пользователей...</p>;
    }

    // Основной рендеринг компонента
    return (
        <div className="user-management-container">
            <h2>Управление пользователями</h2>
            {/* Отображение основной ошибки (например, ошибка загрузки списка) */}
            {error && <p className="error-message main-error">{error}</p>}

            <table className="users-table">
                <thead>
                    <tr>
                        {/* ID пользователя не отображаем в таблице */}
                        <th>Email</th>
                        <th>Полное имя</th>
                        <th>Роль</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(userInList => (
                        <tr key={userInList.id}> {/* Используем ID как ключ */}
                            <td>{userInList.email}</td>
                            <td>{userInList.fullName || '-'}</td>
                            <td>{translateRole(userInList.userRole)}</td>
                            <td>
                                <button
                                    onClick={() => openEditModal(userInList)}
                                    className="action-btn edit-btn"
                                >
                                    Редактировать
                                </button>
                                {/* Кнопка удаления с проверкой на самоудаление */}
                                <button
                                    onClick={() => handleDeleteUser(userInList.id, userInList.email)}
                                    className="action-btn delete-btn"
                                    disabled={loggedInUser && loggedInUser.id === userInList.id}
                                    title={loggedInUser && loggedInUser.id === userInList.id ? "Нельзя удалить себя" : "Удалить пользователя"}
                                >
                                    Удалить
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Модальное окно для редактирования */}
            {isModalOpen && currentUserToEdit && (
                <EditUserModal
                    user={currentUserToEdit}
                    onClose={closeEditModal}
                    onSave={handleSaveChanges}
                    // Передаем ошибку в модалку, чтобы она могла ее отобразить, если это ее ошибка
                    // EditUserModal должен сам решить, показывать ли ее.
                    // Этот prop можно назвать, например, externalError и обрабатывать в EditUserModal
                    // Если EditUserModal сам устанавливает свой error, то modalError здесь не нужен.
                    // Оставляю это на твое усмотрение, как лучше организовать передачу ошибки в модалку.
                    // Вариант: передать setModalError в модалку, чтобы она сама ставила ошибку
                />
            )}
        </div>
    );
};

export default UserManagementPage;