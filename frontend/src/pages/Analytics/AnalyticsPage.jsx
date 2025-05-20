// src/pages/Analytics/AnalyticsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import reportService from '../../services/reportService';
import planService from '../../services/planService';
import userService from '../../services/userService';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import { FaFilter, FaTimes, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaTasks, FaUndo } from 'react-icons/fa';
import './AnalyticsPage.css';
// import { translateRole } from '../../utils/authUtils'; // Если потребуется для имен пользователей в графиках

// Регистрация компонентов Chart.js
ChartJS.register(
    ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend
);

// Хелпер для перевода категории (можно вынести в утилиты)
const translateCategory = (category) => {
    switch(category) {
        case 'active': return 'Активные';
        case 'completed': return 'Завершенные';
        case 'overdue': return 'Просроченные/Проблемные';
        case 'total': return 'Все (по фильтру)';
        default: return category || 'Все';
    }
};


const AnalyticsPage = () => {
    // Состояния для данных с сервера
    const [allReports, setAllReports] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // Для имен в фильтрах/графиках

    // Состояния загрузки и ошибок
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Кэши для имен
    const [planNames, setPlanNames] = useState({});
    const [userNames, setUserNames] = useState({});

    // Состояния для основных фильтров
    const [filters, setFilters] = useState({
        year: '', quarter: '', planId: '', executorId: '', dateFrom: '', dateTo: ''
    });

    // Состояния для выделения категории планов по клику на карточку
    const [selectedPlanCategory, setSelectedPlanCategory] = useState(null);
    const [highlightedPlanIds, setHighlightedPlanIds] = useState([]);

    // Загрузка всех необходимых данных при монтировании
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const loadInitialData = async () => {
            setLoading(true); setError('');
            setPlanNames({}); setUserNames({}); // Сброс кэша
            try {
                console.log("[AnalyticsPage] Fetching initial data...");
                const [reportsRes, plansRes, usersRes] = await Promise.all([
                    reportService.getAllReports(signal),
                    planService.getAllPlans(signal),
                    userService.getAllUsers(signal)
                ]);
                const reportsData = reportsRes.data || [];
                const plansData = plansRes.data || [];
                const usersData = usersRes.data || [];

                setAllReports(reportsData);
                setAllPlans(plansData);
                setAllUsers(usersData);

                const pNames = {}; plansData.forEach(p => { pNames[p.id] = p.name; });
                setPlanNames(pNames);
                const uNames = {}; usersData.forEach(u => { uNames[u.id] = u.fullName || u.email; });
                setUserNames(uNames);
                console.log("[AnalyticsPage] Initial data loaded.");
            } catch (err) {
                if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                    console.error("Failed to fetch data for analytics:", err);
                    setError('Не удалось загрузить данные для анализа.');
                } else { console.log("[AnalyticsPage] Initial data fetch aborted."); }
            } finally {
                if (!signal.aborted) { setLoading(false); }
            }
        };
        loadInitialData();
        return () => controller.abort();
    }, []); // Пустой массив - загрузка один раз

    // Обработчики фильтров
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    const handleResetFilters = () => {
        setFilters({ year: '', quarter: '', planId: '', executorId: '', dateFrom: '', dateTo: '' });
        setSelectedPlanCategory(null); // Сбрасываем и выделение
        setHighlightedPlanIds([]);
    };

    // Базовая фильтрация на основе основных фильтров
    const { baseFilteredReports, baseFilteredPlans } = useMemo(() => {
        let reports = [...allReports];
        let plans = [...allPlans];

        if (filters.year) reports = reports.filter(r => r.year === parseInt(filters.year, 10));
        if (filters.quarter) reports = reports.filter(r => r.quarter === parseInt(filters.quarter, 10));
        if (filters.planId) {
            const pId = parseInt(filters.planId, 10);
            reports = reports.filter(r => r.planId === pId);
            plans = plans.filter(p => p.id === pId);
        }
        if (filters.executorId) {
            const execId = parseInt(filters.executorId, 10);
            reports = reports.filter(r => r.reportingUserId === execId);
            plans = plans.filter(p => p.executorUserIds && p.executorUserIds.includes(execId));
        }
        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom); from.setHours(0,0,0,0);
            reports = reports.filter(r => r.createdAt && new Date(r.createdAt) >= from);
            plans = plans.filter(p => p.startDate && new Date(p.startDate) >= from);
        }
        if (filters.dateTo) {
            const to = new Date(filters.dateTo); to.setHours(23,59,59,999);
            reports = reports.filter(r => r.createdAt && new Date(r.createdAt) <= to);
            plans = plans.filter(p => p.endDate && new Date(p.endDate) <= to);
        }
        return { baseFilteredReports: reports, baseFilteredPlans: plans };
    }, [allReports, allPlans, filters]);

    // Расчет статистики планов (работает с baseFilteredPlans и baseFilteredReports)
    const planStats = useMemo(() => {
        const now = new Date();
        let active = 0, completed = 0, overdue = 0;
        const activeIds = [], completedIds = [], overdueIds = [];

        baseFilteredPlans.forEach(plan => {
            const endDate = new Date(plan.endDate);
            const reportsForThisPlan = baseFilteredReports.filter(r => r.planId === plan.id);
            const hasAssessedReports = reportsForThisPlan.some(r => r.analystAssessmentScore !== null);

            if (endDate < now) { // План должен был завершиться
                if (hasAssessedReports || reportsForThisPlan.length > 0) { // Считаем завершенным, если есть хоть какие-то отчеты (оцененные или нет)
                    completed++; completedIds.push(plan.id);
                } else { // Просрочен, если нет вообще отчетов
                    overdue++; overdueIds.push(plan.id);
                }
            } else { // План еще активен
                active++; activeIds.push(plan.id);
            }
        });
        return { total: baseFilteredPlans.length, active, completed, overdue, activeIds, completedIds, overdueIds };
    }, [baseFilteredPlans, baseFilteredReports]);

    // Обработчик клика по карточке статистики
    const handleStatCardClick = (category, ids) => {
        if (selectedPlanCategory === category) {
            setSelectedPlanCategory(null); setHighlightedPlanIds([]);
        } else {
            setSelectedPlanCategory(category); setHighlightedPlanIds(ids);
        }
    };
    const resetHighlightedPlans = () => {
        setSelectedPlanCategory(null); setHighlightedPlanIds([]);
    };

    // Финальные данные для графиков (учитывают выделенные ID планов)
    const { finalFilteredReports, finalFilteredPlans } = useMemo(() => {
        if (highlightedPlanIds.length > 0) {
            const newFilteredPlans = baseFilteredPlans.filter(p => highlightedPlanIds.includes(p.id));
            const newFilteredReports = baseFilteredReports.filter(r => highlightedPlanIds.includes(r.planId));
            return { finalFilteredReports: newFilteredReports, finalFilteredPlans: newFilteredPlans };
        }
        return { finalFilteredReports: baseFilteredReports, finalFilteredPlans: baseFilteredPlans };
    }, [baseFilteredReports, baseFilteredPlans, highlightedPlanIds]);

    // Подготовка данных для графиков (теперь используют finalFilteredReports/Plans)
    const planStatusData = useMemo(() => {
        if (finalFilteredPlans.length === 0) return null;
        let inProgressCount = 0, successCount = 0, satisfactoryCount = 0, problematicCount = 0;
        const now = new Date();

        finalFilteredPlans.forEach(plan => {
            const endDate = new Date(plan.endDate);
            const reports = finalFilteredReports.filter(r => r.planId === plan.id);
            const assessedReports = reports.filter(r => r.analystAssessmentScore !== null);

            if (endDate >= now) { inProgressCount++; }
            else { // План завершен по сроку
                if (assessedReports.length > 0) {
                    const avgScore = assessedReports.reduce((sum, r) => sum + r.analystAssessmentScore, 0) / assessedReports.length;
                    if (avgScore >= 4) successCount++;
                    else if (avgScore >= 3) satisfactoryCount++;
                    else problematicCount++;
                } else { problematicCount++; } // Завершен, но нет оцененных отчетов
            }
        });
        return {
            labels: ['В процессе', 'Успешно', 'Удовлетворительно', 'Проблемные/Просрочены'],
            datasets: [{ data: [inProgressCount, successCount, satisfactoryCount, problematicCount],
                         backgroundColor: ['#36A2EB', '#4BC0C0', '#FFCE56', '#FF6384'], hoverOffset: 4 }]
        };
    }, [finalFilteredPlans, finalFilteredReports]);

    const scoreDistributionData = useMemo(() => {
        if (finalFilteredReports.length === 0) return null;
        const scores = [1, 2, 3, 4, 5];
        const scoreCounts = scores.map(score => finalFilteredReports.filter(r => r.analystAssessmentScore === score).length);
        return {
            labels: scores.map(score => `Оценка ${score}`),
            datasets: [{ label: 'Кол-во отчетов', data: scoreCounts,
                         backgroundColor: ['rgba(255, 99, 132, 0.7)','rgba(255, 159, 64, 0.7)','rgba(255, 205, 86, 0.7)','rgba(75, 192, 192, 0.7)','rgba(54, 162, 235, 0.7)'],
                         borderColor: ['#FF6384','#FF9F40','#FFCD56','#4BC0C0','#36A2EB'], borderWidth: 1 }],
        };
    }, [finalFilteredReports]);

    const executorActivityData = useMemo(() => {
        if (finalFilteredReports.length === 0 || allUsers.length === 0) return null;
        const activity = {};
        finalFilteredReports.forEach(report => {
            const userId = report.reportingUserId;
            const userName = userNames[userId] || `Пользователь ${userId}`;
            if (!activity[userId]) activity[userId] = { submitted: 0, totalScore: 0, assessedCount: 0, name: userName };
            activity[userId].submitted++;
            if (report.analystAssessmentScore !== null) {
                activity[userId].totalScore += report.analystAssessmentScore;
                activity[userId].assessedCount++;
            }
        });
        const labels = Object.values(activity).map(val => val.name).filter(Boolean); // Убираем undefined/null имена
        const submittedData = Object.values(activity).filter(val => val.name).map(val => val.submitted);
        const avgScoreData = Object.values(activity).filter(val => val.name).map(val => val.assessedCount > 0 ? parseFloat((val.totalScore / val.assessedCount).toFixed(1)) : 0);

        if (labels.length === 0) return null; // Если нет данных для отображения

        return {
            labels,
            datasets: [
                { label: 'Подано отчетов', data: submittedData, backgroundColor: 'rgba(54, 162, 235, 0.7)', yAxisID: 'yReports' },
                { label: 'Средняя оценка', data: avgScoreData, backgroundColor: 'rgba(255, 159, 64, 0.7)', yAxisID: 'yScore', type: 'line', tension: 0.1, borderColor: 'rgba(255,159,64,1)' }
            ]
        };
    }, [finalFilteredReports, allUsers, userNames]);

    // Опции для графиков
    const commonChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };
    const scoreChartOptions = { ...commonChartOptions, plugins: {...commonChartOptions.plugins, title: {display: true, text: 'Распределение оценок по отчетам', font: {size: 16}} }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, title: {display:true, text: 'Кол-во отчетов'}}, x: {title: {display:true, text: 'Оценка'}} } };
    const planStatusChartOptions = { ...commonChartOptions, plugins: {...commonChartOptions.plugins, title: {display: true, text: 'Статус выполнения планов', font: {size: 16}}} };
    const executorActivityChartOptions = {
        ...commonChartOptions,
        plugins: {...commonChartOptions.plugins, title: {display: true, text: 'Активность исполнителей', font: {size: 16}}},
        scales: {
            yReports: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Кол-во отчетов' }, beginAtZero: true, ticks:{stepSize:1} },
            yScore: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Средняя оценка' }, beginAtZero: true, max: 5, grid: { drawOnChartArea: false } }
        }
    };
    // Обработчик кликов (пример)
    const handleChartClick = (event, elements, chartInstance) => {
        if (elements.length > 0 && chartInstance) {
            const clickedElementIndex = elements[0].index;
            const datasetIndex = elements[0].datasetIndex;
            const data = chartInstance.data.datasets[datasetIndex].data[clickedElementIndex];
            const label = chartInstance.data.labels[clickedElementIndex];
            console.log(`Клик на "${label}" со значением: ${data}`);
            // alert(`Клик на "${label}" со значением ${data}`);
        }
    };

    if (loading) return <div className="loading-container"><p>Загрузка данных для аналитики...</p></div>;

    return (
        <div className="page-container analytics-page">
            <h2>Аналитика и Статистика</h2>
            {error && <p className="error-message main-error">{error}</p>}

            <div className="filter-panel analytics-filters">
                <h4>Фильтры аналитики</h4>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="filterYear">Год (отчетов):</label>
                        <input type="number" id="filterYear" name="year" className="form-control" placeholder="Все" value={filters.year} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="filterQuarter">Квартал (отчетов):</label>
                        <select id="filterQuarter" name="quarter" className="form-control" value={filters.quarter} onChange={handleFilterChange}>
                            <option value="">Все</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="filterPlanId">План:</label>
                        <select id="filterPlanId" name="planId" className="form-control" value={filters.planId} onChange={handleFilterChange}>
                            <option value="">Все планы</option>
                            {allPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name || `План ID: ${plan.id}`}</option>)}
                        </select>
                    </div>
                     <div className="form-group">
                        <label htmlFor="filterExecutorId">Исполнитель (отчитался):</label>
                        <select id="filterExecutorId" name="executorId" className="form-control" value={filters.executorId} onChange={handleFilterChange}>
                            <option value="">Все исполнители</option>
                            {allUsers.filter(u => u.userRole === 'EXECUTOR' || u.userRole === 'USER').map(exec =>
                                <option key={exec.id} value={exec.id}>{exec.fullName || exec.email}</option>
                            )}
                        </select>
                    </div>
                </div>
                 <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="filterDateFrom">Период (дат создания отчетов/дат планов):</label>
                        <input type="date" id="filterDateFrom" name="dateFrom" className="form-control" value={filters.dateFrom} onChange={handleFilterChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="filterDateTo">Период (до):</label>
                        <input type="date" id="filterDateTo" name="dateTo" className="form-control" value={filters.dateTo} onChange={handleFilterChange} />
                    </div>
                </div>
                <div className="filter-actions">
                    <button onClick={handleResetFilters} className="action-btn cancel-btn"><FaTimes/> Сбросить все фильтры</button>
                </div>
            </div>

            {selectedPlanCategory && (
                <div className="highlight-reset-container">
                    <p>Отображаются планы категории: <strong>{translateCategory(selectedPlanCategory)}</strong></p>
                    <button onClick={resetHighlightedPlans} className="action-btn secondary-btn">
                        <FaUndo /> Показать все (по фильтрам)
                    </button>
                </div>
            )}

            <div className="stats-cards-grid">
                <div className={`stat-card ${selectedPlanCategory === 'total' ? 'selected' : ''}`} onClick={() => handleStatCardClick('total', baseFilteredPlans.map(p => p.id))}>
                    <FaTasks/> <h4>Всего планов <small>(по фильтру)</small></h4> <p>{planStats.total}</p>
                </div>
                <div className={`stat-card active ${selectedPlanCategory === 'active' ? 'selected' : ''}`} onClick={() => handleStatCardClick('active', planStats.activeIds)}>
                    <FaHourglassHalf/> <h4>Активных</h4> <p>{planStats.active}</p>
                </div>
                <div className={`stat-card completed ${selectedPlanCategory === 'completed' ? 'selected' : ''}`} onClick={() => handleStatCardClick('completed', planStats.completedIds)}>
                    <FaCheckCircle/> <h4>Завершено</h4> <p>{planStats.completed}</p>
                </div>
                <div className={`stat-card overdue ${selectedPlanCategory === 'overdue' ? 'selected' : ''}`} onClick={() => handleStatCardClick('overdue', planStats.overdueIds)}>
                    <FaExclamationTriangle/> <h4>Просрочено/Проблемные</h4> <p>{planStats.overdue}</p>
                </div>
            </div>

            {(finalFilteredReports.length === 0 && finalFilteredPlans.length === 0 && !loading) &&
             <p className="no-data-message">
                {highlightedPlanIds.length > 0 ? "Нет данных для выбранной категории планов." : "Нет данных, соответствующих основным фильтрам."}
             </p>
            }

            <div className="charts-grid">
                {planStatusData && finalFilteredPlans.length > 0 && (
                    <div className="chart-container pie-chart-container">
                        <Doughnut data={planStatusData} options={planStatusChartOptions} />
                    </div>
                )}
                {scoreDistributionData && finalFilteredReports.length > 0 && (
                    <div className="chart-container">
                        <Bar data={scoreDistributionData} options={{...scoreChartOptions, onClick: (e,el) => { const chart = ChartJS.getChart(e.nativeEvent.target); if(chart) handleChartClick(e,el, chart); }}} />
                    </div>
                )}
                {executorActivityData && finalFilteredReports.length > 0 && (
                    <div className="chart-container">
                        <Bar data={executorActivityData} options={executorActivityChartOptions} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPage;