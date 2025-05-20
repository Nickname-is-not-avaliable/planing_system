// src/pages/Plans/PlanListPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import planService from '../../services/planService';
import useAuth from '../../hooks/useAuth';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaTimes } from 'react-icons/fa';
import { filterData, sortData } from '../../utils/tableUtils'; // Убедись, что путь правильный
import PlanExcelActions from './components/PlanExcelActions';
// import './PlanListPage.css'; // Если есть уникальные стили

const PlanListPage = () => {
    const { user } = useAuth();
    const [initialPlans, setInitialPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ field: null, direction: 'ascending' });
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        searchTerm: '',
        startDate: '',
        endDate: '',
        // targetMin: '', // Раскомментируй, если будешь использовать
        // targetMax: ''
    });

    const fetchPlans = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const response = await planService.getAllPlans(signal);
            setInitialPlans(response.data || []);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                setError('Не удалось загрузить список планов.');
            } else { console.log("Plans fetch aborted."); }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchPlans(controller.signal);
        return () => controller.abort();
    }, [fetchPlans]);

    const handleImportHasCompleted = () => {
        console.log("Import completed, refreshing plan list...");
        const controller = new AbortController(); // Новый контроллер для перезагрузки
        fetchPlans(controller.signal);
    };

    const processedPlans = useMemo(() => {
        const filtered = filterData(initialPlans, filters, 'plans');
        return sortData(filtered, sortConfig, ['startDate', 'endDate']); // Даты для сортировки
    }, [initialPlans, filters, sortConfig]);

    const requestSort = (field) => {
        let direction = 'ascending';
        if (sortConfig.field === field && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ field, direction });
    };
    const getSortIcon = (field) => {
        if (sortConfig.field !== field) return <FaSort className="sort-icon neutral" />;
        return sortConfig.direction === 'ascending' ? <FaSortUp className="sort-icon active" /> : <FaSortDown className="sort-icon active" />;
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
    };
    const handleResetFilters = () => {
        setFilters({ searchTerm: '', startDate: '', endDate: '' /*, targetMin: '', targetMax: '' */ });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; }
    };
    const handleDeletePlan = async (planId, planName) => {
        if (!user || user.userRole !== 'ADMIN') { alert("У вас нет прав для удаления планов."); return; }
        if (window.confirm(`Удалить план "${planName}" (ID: ${planId})?`)) {
            setError('');
            try {
                await planService.deletePlan(planId);
                const controller = new AbortController();
                await fetchPlans(controller.signal);
            } catch (err) { setError(err.response?.data?.message || err.message || 'Не удалось удалить план.'); }
        }
    };

    const canCreatePlan = user && (user.userRole === 'ADMIN' || user.userRole === 'ANALYST');

    if (loading && initialPlans.length === 0) return <div className="loading-container"><p>Загрузка планов...</p></div>;

    return (
        <div className="page-container plan-list-page">
            <div className="page-header">
                <h2>Список планов ({processedPlans.length})</h2>
                <div className="header-actions">
                    {canCreatePlan && (
                        <Link to="/plans/new">
                            <button className="action-btn primary-btn">Создать новый план</button>
                        </Link>
                    )}
                    <button onClick={() => setShowFilters(!showFilters)} className="action-btn secondary-btn filter-toggle-btn">
                        <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                    </button>
                </div>
            </div>

            {error && <p className="error-message main-error">{error}</p>}

            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-group">
                        <label htmlFor="filterSearchTerm">Поиск по названию/описанию:</label>
                        <input
                            type="text" id="filterSearchTerm" name="searchTerm" className="form-control"
                            placeholder="Введите текст..." value={filters.searchTerm}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="filter-group form-row">
                        <div className="form-group-half">
                            <label htmlFor="filterPlanStartDate">Дата начала (от):</label>
                            <input
                                type="date" id="filterPlanStartDate" name="startDate" className="form-control"
                                value={filters.startDate} onChange={handleFilterChange}
                            />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="filterPlanEndDate">Дата окончания (до):</label>
                            <input
                                type="date" id="filterPlanEndDate" name="endDate" className="form-control"
                                value={filters.endDate} onChange={handleFilterChange}
                            />
                        </div>
                    </div>
                    {/*
                    <div className="filter-group form-row">
                        <div className="form-group-half">
                            <label htmlFor="filterPlanTargetMin">Цель (от):</label>
                            <input type="number" id="filterPlanTargetMin" name="targetMin" className="form-control"
                                   value={filters.targetMin} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="filterPlanTargetMax">Цель (до):</label>
                            <input type="number" id="filterPlanTargetMax" name="targetMax" className="form-control"
                                   value={filters.targetMax} onChange={handleFilterChange} />
                        </div>
                    </div>
                    */}
                    <div className="filter-actions">
                        <button onClick={handleResetFilters} className="action-btn cancel-btn"><FaTimes /> Сбросить</button>
                    </div>
                </div>
            )}

            {!loading && initialPlans.length > 0 && user.userRole != 'ADMIN' || user.userRole != 'ANALYST' && (
                 <PlanExcelActions plans={processedPlans}
                 onImportComplete={handleImportHasCompleted}  />
            )}

            {!loading && processedPlans.length === 0 && !error ? (
                <p style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    {Object.values(filters).some(val => val !== '')
                        ? 'Планов, соответствующих фильтрам, не найдено.'
                        : 'Планов пока нет.'}
                </p>
            ) : !error && processedPlans.length > 0 ? (
                <table className="data-table sortable-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('id')}>Номер {getSortIcon('id')}</th>
                            <th onClick={() => requestSort('name')}>Название {getSortIcon('name')}</th>
                            <th onClick={() => requestSort('targetValue')}>Целевое значение {getSortIcon('targetValue')}</th>
                            <th onClick={() => requestSort('startDate')}>Дата начала {getSortIcon('startDate')}</th>
                            <th onClick={() => requestSort('endDate')}>Дата окончания {getSortIcon('endDate')}</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedPlans.map((plan) => (
                            <tr key={plan.id}>
                                <td>{plan.id}</td>
                                <td>{plan.name || '-'}</td>
                                <td>{plan.targetValue ?? '-'}</td>
                                <td>{formatDate(plan.startDate)}</td>
                                <td>{formatDate(plan.endDate)}</td>
                                <td className="actions-cell">
                                    <Link to={`/plans/${plan.id}`} className="action-link">Детали</Link>
                                    {user && user.userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => handleDeletePlan(plan.id, plan.name)}
                                            className="action-btn delete-btn list-delete-btn"
                                            title="Удалить план"
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : null}
            {loading && initialPlans.length > 0 && <p className="loading-names-indicator">Обновление списка...</p>}
        </div>
    );
};

export default PlanListPage;