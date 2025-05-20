// src/pages/Admin/UserManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import userService from '../../services/userService';
import { translateRole } from '../../utils/authUtils';
import EditUserModal from './components/EditUserModal';
import useAuth from '../../hooks/useAuth';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaTimes } from 'react-icons/fa';
import { filterData, sortData } from '../../utils/tableUtils'; // Путь: ../../utils/
import './UserManagementPage.css';

const UserManagementPage = () => {
    const { user: loggedInUser } = useAuth();
    const [initialUsers, setInitialUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // Общая ошибка списка
    const [modalError, setModalError] = useState(''); // Ошибка для модалки

    // Состояния для модального окна
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);

    // Состояния для сортировки
    const [sortConfig, setSortConfig] = useState({ field: null, direction: 'ascending' });

    // Состояния для фильтрации
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        searchTerm: '', // Для email и fullName
        userRole: '',   // Для фильтрации по роли
    });

    // Загрузка пользователей
    const fetchUsers = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const response = await userService.getAllUsers(signal);
            setInitialUsers(response.data || []);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch users:", err);
                setError('Не удалось загрузить список пользователей.');
            } else { console.log("Users fetch aborted."); }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);
        return () => controller.abort();
    }, [fetchUsers]);

    // Логика фильтрации и сортировки пользователей
    const processedUsers = useMemo(() => {
        // Создаем копию filters для передачи в filterData, т.к. filterData ожидает поле 'searchTerm'
        const userFilters = {
            searchTerm: filters.searchTerm,
            role: filters.userRole, // Передаем роль для фильтрации
        };
        const filtered = filterData(initialUsers, userFilters, 'users'); // Указываем тип 'users'
        // Для пользователей нет очевидных полей дат для сортировки, передаем пустой массив
        return sortData(filtered, sortConfig, []);
    }, [initialUsers, filters, sortConfig]);

    // Функции для сортировки
    const requestSort = (field) => {
        let direction = 'ascending';
        if (sortConfig.field === field && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ field, direction });
    };
    const getSortIcon = (field) => {
        if (sortConfig.field !== field) return <FaSort className="sort-icon neutral" />;
        return sortConfig.direction === 'ascending' ? <FaSortUp className="sort-icon active" /> : <FaSortDown className="sort-icon active" />;
    };

    // Функции для фильтров
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    const handleResetFilters = () => {
        setFilters({ searchTerm: '', userRole: '' });
    };

    // Функции модального окна
    const openEditModal = (userToEdit) => { setCurrentUserToEdit(userToEdit); setIsModalOpen(true); setModalError(''); };
    const closeEditModal = () => { setIsModalOpen(false); setCurrentUserToEdit(null); setModalError(''); };
    const handleSaveChanges = async (userId, updatedUserDataFromModal) => {
        setModalError('');
        try {
            const response = await userService.partialUpdateUser(userId, updatedUserDataFromModal);
            const updatedUserFromApi = response.data;
            if (loggedInUser && loggedInUser.id === userId) {
                const userToUpdateInContext = { ...loggedInUser, ...updatedUserFromApi };
                // Предполагаем, что updateUserInContext есть в useAuth и обновляет контекст/localStorage
                // this.props.updateUserInContext(userToUpdateInContext); // Если бы это был классовый компонент
                // В функциональном компоненте нужно получить updateUserInContext из useAuth()
                // const { updateUserInContext } = useAuth(); // - это уже есть выше
                if(typeof updateUserInContext === 'function') {
                    updateUserInContext(userToUpdateInContext);
                } else {
                    console.warn("updateUserInContext function is not available from useAuth");
                }
            }
            closeEditModal();
            await fetchUsers(); // Перезагружаем список (можно с новым AbortController)
        } catch (err) {
            const apiError = err.response?.data?.message || err.message || 'Не удалось обновить пользователя.';
            setModalError(apiError); throw err;
        }
    };

    // Функция удаления пользователя
    const handleDeleteUser = async (userIdToDelete, userEmail) => {
        if (loggedInUser && loggedInUser.id === userIdToDelete) {
            alert("Вы не можете удалить свою собственную учетную запись."); return;
        }
        if (window.confirm(`Удалить пользователя ${userEmail}?`)) {
            setError('');
            try {
                await userService.deleteUser(userIdToDelete);
                await fetchUsers(); // Перезагружаем (можно с новым AbortController)
            } catch (err) { setError(err.response?.data?.message || err.message || 'Не удалось удалить пользователя.'); }
        }
    };


    const USER_ROLES_FOR_FILTER = ['ADMIN', 'ANALYST', 'EXECUTOR'];


    if (loading && initialUsers.length === 0) return <div className="loading-container"><p>Загрузка пользователей...</p></div>;

    return (
        <div className="page-container user-management-page">
            <div className="page-header">
                <h2>Управление пользователями ({processedUsers.length})</h2>
                <div className="header-actions">
                    {/* Кнопка создания пользователя, если нужна */}
                    {/* <Link to="/admin/users/new">
                        <button className="action-btn primary-btn">Добавить пользователя</button>
                    </Link> */}
                    <button onClick={() => setShowFilters(!showFilters)} className="action-btn secondary-btn filter-toggle-btn">
                        <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                    </button>
                </div>
            </div>

            {error && <p className="error-message main-error">{error}</p>}

            {showFilters && (
                <div className="filter-panel">
                    <div className="form-row">
                        <div className="form-group-half">
                            <label htmlFor="userFilterSearchTerm">Поиск по Email/ФИО:</label>
                            <input
                                type="text" id="userFilterSearchTerm" name="searchTerm"
                                className="form-control" placeholder="Email или ФИО..."
                                value={filters.searchTerm} onChange={handleFilterChange}
                            />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="userFilterRole">Роль:</label>
                            <select
                                id="userFilterRole" name="userRole"
                                className="form-control" value={filters.userRole}
                                onChange={handleFilterChange}
                            >
                                <option value="">Все роли</option>
                                {USER_ROLES_FOR_FILTER.map(role => (
                                    <option key={role} value={role}>{translateRole(role)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="filter-actions">
                        <button onClick={handleResetFilters} className="action-btn cancel-btn">
                            <FaTimes /> Сбросить фильтры
                        </button>
                    </div>
                </div>
            )}

            {!loading && processedUsers.length === 0 && !error ? (
                <p style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    {Object.values(filters).some(val => val !== '')
                        ? 'Пользователей, соответствующих фильтрам, не найдено.'
                        : 'Пользователей в системе нет.'}
                </p>
            ) : !error && processedUsers.length > 0 ? (
                <table className="data-table sortable-table">
                    <thead>
                        <tr>
                            {/* ID не отображаем, но по нему можно сортировать, если нужно (скрыто) */}
                            {/* <th onClick={() => requestSort('id')}>ID {getSortIcon('id')}</th> */}
                            <th onClick={() => requestSort('email')}>Email {getSortIcon('email')}</th>
                            <th onClick={() => requestSort('fullName')}>Полное имя {getSortIcon('fullName')}</th>
                            <th onClick={() => requestSort('userRole')}>Роль {getSortIcon('userRole')}</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedUsers.map(userInList => (
                            <tr key={userInList.id}>
                                {/* <td>{userInList.id}</td> */}
                                <td>{userInList.email}</td>
                                <td>{userInList.fullName || '-'}</td>
                                <td>{translateRole(userInList.userRole)}</td>
                                <td className="actions-cell">
                                    <button
                                        onClick={() => openEditModal(userInList)}
                                        className="action-btn edit-btn"
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(userInList.id, userInList.email)}
                                        className="action-btn delete-btn list-delete-btn"
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
            ) : null}
            {/* Индикатор общей загрузки или обновления */}
            {loading && initialUsers.length > 0 && <p className="loading-names-indicator">Обновление списка пользователей...</p>}


            {isModalOpen && currentUserToEdit && (
                <EditUserModal
                    user={currentUserToEdit}
                    onClose={closeEditModal}
                    onSave={handleSaveChanges}
                    // Если EditUserModal сам управляет своей ошибкой, то modalError можно не передавать
                    // или передать как initialError, если он такой prop поддерживает
                />
            )}
        </div>
    );
};

export default UserManagementPage;