// src/pages/Reports/ReportListPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import reportService from '../../services/reportService';
import planService from '../../services/planService';
import userService from '../../services/userService';
import useAuth from '../../hooks/useAuth';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaTimes } from 'react-icons/fa';
import { filterData, sortData } from '../../utils/tableUtils'; // Путь: ../../utils/
import ReportExcelActions from './components/ReportExcelActions';
import './ReportListPage.css'; // Если есть уникальные стили

const ReportListPage = () => {
    const { user } = useAuth();
    const [initialReports, setInitialReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [planNames, setPlanNames] = useState({});
    const [userNames, setUserNames] = useState({});
    const [loadingRelatedData, setLoadingRelatedData] = useState(false);

    const [sortConfig, setSortConfig] = useState({ field: null, direction: 'ascending' });
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        planId: '',
        reportingUserId: '',
        year: '',
        quarter: '',
        assessed: '', // 'yes', 'no', ''
        createdFrom: '',
        createdTo: ''
    });

    const fetchRelatedNames = useCallback(async (reportsData, signal) => {
        if (!reportsData || reportsData.length === 0) return;
        setLoadingRelatedData(true);
        const planIdsToFetch = [...new Set(reportsData.map(r => r.planId).filter(id => Boolean(id) && !planNames[id]))];
        const userIdsToFetch = [...new Set([
            ...reportsData.map(r => r.reportingUserId).filter(id => Boolean(id) && !userNames[id]),
            ...reportsData.map(r => r.assessedByUserId).filter(id => Boolean(id) && !userNames[id])
        ])];

        const loadedPlanNames = {};
        const loadedUserNames = {};

        const planPromises = planIdsToFetch.map(id =>
            planService.getPlanById(id, signal)
                .then(res => { loadedPlanNames[id] = res.data.name; })
                .catch(err => { if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') { loadedPlanNames[id] = `(План ${id} - ошибка)`; } })
        );
        const userPromises = userIdsToFetch.map(id =>
             userService.getUserById(id, signal)
                 .then(res => { loadedUserNames[id] = res.data.fullName; })
                 .catch(err => { if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') { loadedUserNames[id] = `(Пользователь ${id} - ошибка)`; } })
        );
        try {
            await Promise.all([...planPromises, ...userPromises]);
            if (Object.keys(loadedPlanNames).length > 0) setPlanNames(prev => ({ ...prev, ...loadedPlanNames }));
            if (Object.keys(loadedUserNames).length > 0) setUserNames(prev => ({ ...prev, ...loadedUserNames }));
        } catch (err) { console.error("Error processing related names batch for reports:", err); }
        finally { if (!signal?.aborted) setLoadingRelatedData(false); }
    }, [planNames, userNames]);

    const fetchReports = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const response = await reportService.getAllReports(signal);
            const reportsData = response.data || [];
            setInitialReports(reportsData);
            if (reportsData.length > 0) fetchRelatedNames(reportsData, signal);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') { setError('Не удалось загрузить список отчетов.'); }
            else { console.log("Reports list fetch aborted."); }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [fetchRelatedNames]);

    useEffect(() => {
        const controller = new AbortController();
        fetchReports(controller.signal);
        return () => controller.abort();
    }, [fetchReports]);

    const handleReportImportCompleted = () => {
        console.log("Report import completed, refreshing report list...");
        const controller = new AbortController();
        fetchReports(controller.signal); // Вызываем перезагрузку списка отчетов
    };

    const processedReports = useMemo(() => {
        const filtered = filterData(initialReports, filters, 'reports');
        return sortData(filtered, sortConfig, ['createdAt']); // 'createdAt' - поле для сортировки как дата
    }, [initialReports, filters, sortConfig]);

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
        setFilters({ planId: '', reportingUserId: '', year: '', quarter: '', assessed: '', createdFrom: '', createdTo: '' });
    };

    const handleDeleteReport = async (reportId, reportDetails) => {
        if (!user || user.userRole !== 'ADMIN') { alert("У вас нет прав для удаления отчетов."); return; }
        if (window.confirm(`Вы уверены, что хотите удалить ${reportDetails}?`)) {
            setError('');
            try {
                await reportService.deleteReport(reportId);
                const controller = new AbortController();
                await fetchReports(controller.signal);
            } catch (err) { setError(err.response?.data?.message || err.message || 'Не удалось удалить отчет.'); }
        }
    };

    const getPlanName = (planId) => planNames[planId] || (planId ? (loadingRelatedData ? 'Загрузка...' : `План ${planId}`) : 'N/A');
    const getUserName = (userId) => userNames[userId] || (userId ? (loadingRelatedData ? 'Загрузка...' : `Пользователь ${userId}`) : 'Не назначен');
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; }
    };

    if (loading && initialReports.length === 0) return <div className="loading-container"><p>Загрузка отчетов...</p></div>;

    return (
        <div className="page-container report-list-page">
            <div className="page-header">
                <h2>Список квартальных отчетов ({processedReports.length})</h2>
                <div className="header-actions">
                    <Link to="/reports/new">
                        <button className="action-btn primary-btn">Создать новый отчет</button>
                    </Link>
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
                            <label htmlFor="filterPlanId">ID Плана:</label>
                            <input type="number" id="filterPlanId" name="planId" className="form-control" placeholder="ID"
                                   value={filters.planId} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="filterReportingUserId">ID Отчитавшегося:</label>
                            <input type="number" id="filterReportingUserId" name="reportingUserId" className="form-control" placeholder="ID"
                                   value={filters.reportingUserId} onChange={handleFilterChange} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group-half">
                            <label htmlFor="filterYear">Год:</label>
                            <input type="number" id="filterYear" name="year" className="form-control" placeholder="ГГГГ"
                                   value={filters.year} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="filterQuarter">Квартал:</label>
                            <select id="filterQuarter" name="quarter" className="form-control"
                                    value={filters.quarter} onChange={handleFilterChange}>
                                <option value="">Все</option><option value="1">1</option><option value="2">2</option>
                                <option value="3">3</option><option value="4">4</option>
                            </select>
                        </div>
                    </div>
                     <div className="form-row">
                        <div className="form-group-half">
                            <label htmlFor="filterAssessed">Статус оценки:</label>
                            <select id="filterAssessed" name="assessed" className="form-control"
                                    value={filters.assessed} onChange={handleFilterChange}>
                                <option value="">Все</option>
                                <option value="yes">Оценен</option>
                                <option value="no">Не оценен</option>
                            </select>
                        </div>
                         <div className="form-group-half"> {/* Пустое место для выравнивания, если нужно */} </div>
                    </div>
                    <div className="filter-group form-row">
                        <div className="form-group-half">
                            <label htmlFor="filterCreatedFrom">Дата создания (от):</label>
                            <input type="date" id="filterCreatedFrom" name="createdFrom" className="form-control"
                                   value={filters.createdFrom} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group-half">
                            <label htmlFor="filterCreatedTo">Дата создания (до):</label>
                            <input type="date" id="filterCreatedTo" name="createdTo" className="form-control"
                                   value={filters.createdTo} onChange={handleFilterChange} />
                        </div>
                    </div>
                    <div className="filter-actions">
                        <button onClick={handleResetFilters} className="action-btn cancel-btn"><FaTimes /> Сбросить</button>
                    </div>
                </div>
            )}

            {user && !loading && ( 
                 <ReportExcelActions
                    reports={processedReports} // Для экспорта
                    onImportComplete={handleReportImportCompleted} // <--- Передаем колбэк
                    planNamesCache={planNames} // Для отображения имен планов в экспортируемом файле
                    userNamesCache={userNames}   // Для отображения имен пользователей в экспортируемом файле
                 />
            )}

            {!loading && processedReports.length === 0 && !error ? (
                <p style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    {Object.values(filters).some(val => val !== '')
                        ? 'Отчетов, соответствующих фильтрам, не найдено.'
                        : 'Отчетов пока нет.'}
                </p>
            ) : !error && processedReports.length > 0 ? (
                <table className="data-table sortable-table">
                                        <thead>
                        <tr>
                            <th onClick={() => requestSort('id')} className={sortConfig.field === 'id' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Номер Отчета</span>
                                    {getSortIcon('id')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('planId')} className={sortConfig.field === 'planId' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">План</span>
                                    {getSortIcon('planId')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('year')} className={sortConfig.field === 'year' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Год</span>
                                    {getSortIcon('year')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('quarter')} className={sortConfig.field === 'quarter' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Квартал</span>
                                    {getSortIcon('quarter')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('actualValue')} className={sortConfig.field === 'actualValue' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Факт.</span>
                                    {getSortIcon('actualValue')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('reportingUserId')} className={sortConfig.field === 'reportingUserId' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Отчитался</span>
                                    {getSortIcon('reportingUserId')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('assessedByUserId')} className={sortConfig.field === 'assessedByUserId' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Оценил</span>
                                    {getSortIcon('assessedByUserId')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('analystAssessmentScore')} className={sortConfig.field === 'analystAssessmentScore' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Оценка</span>
                                    {getSortIcon('analystAssessmentScore')}
                                </div>
                            </th>
                            <th onClick={() => requestSort('createdAt')} className={sortConfig.field === 'createdAt' ? 'sorted' : ''}>
                                <div className="th-content-wrapper">
                                    <span className="th-text">Дата созд.</span>
                                    {getSortIcon('createdAt')}
                                </div>
                            </th>
                            <th> {/* Несортируемый столбец "Действия" */}
                                <div className="th-content-wrapper">
                                    <span className="th-text">Действия</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedReports.map((report) => (
                            <tr key={report.id}>
                                <td>{report.id}</td>
                                <td>{getPlanName(report.planId)}</td>
                                <td>{report.year}</td>
                                <td>{report.quarter}</td>
                                <td>{report.actualValue ?? '-'}</td>
                                <td>{getUserName(report.reportingUserId)}</td>
                                <td>{getUserName(report.assessedByUserId)}</td>
                                <td>{report.analystAssessmentScore ?? '-'}</td>
                                <td>{formatDate(report.createdAt)}</td>
                                <td className="actions-cell">
                                    <Link to={`/reports/${report.id}`} className="action-link">Детали</Link>
                                    {user && user.userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => handleDeleteReport(report.id, `отчет №${report.id} по плану "${getPlanName(report.planId)}"`)}
                                            className="action-btn delete-btn list-delete-btn"
                                            title="Удалить отчет"
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
            {loadingRelatedData && initialReports.length > 0 && <p className="loading-names-indicator">Загрузка дополнительной информации...</p>}
        </div>
    );
};

export default ReportListPage;