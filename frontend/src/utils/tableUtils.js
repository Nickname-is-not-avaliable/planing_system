// src/utils/tableUtils.js

/**
 * Фильтрует массив данных на основе предоставленных фильтров.
 * @param {Array} data - Исходный массив объектов.
 * @param {Object} filters - Объект с фильтрами.
 *                            Для ReportListPage: { planId, reportingUserId, year, quarter, assessed, createdFrom, createdTo }
 *                            Для PlanListPage: { searchTerm, startDate, endDate, targetMin, targetMax }
 * @param {String} entityType - Тип сущности ('reports' или 'plans'), чтобы знать, какие поля фильтровать.
 * @returns {Array} - Отфильтрованный массив.
 */
export const filterData = (data, filters, entityType) => {
    if (!data) return [];
    let filteredData = [...data];

    if (entityType === 'reports') {
        const {
            planId: filterPlanId,
            reportingUserId: filterReportingUserId,
            year: filterYear,
            quarter: filterQuarter,
            assessed: filterAssessed,
            createdFrom: filterCreatedFrom,
            createdTo: filterCreatedTo
        } = filters;

        if (filterPlanId) {
            const planIdNum = parseInt(filterPlanId, 10);
            if (!isNaN(planIdNum)) filteredData = filteredData.filter(item => item.planId === planIdNum);
        }
        if (filterReportingUserId) {
            const userIdNum = parseInt(filterReportingUserId, 10);
            if (!isNaN(userIdNum)) filteredData = filteredData.filter(item => item.reportingUserId === userIdNum);
        }
        if (filterYear) {
            const yearNum = parseInt(filterYear, 10);
            if (!isNaN(yearNum)) filteredData = filteredData.filter(item => item.year === yearNum);
        }
        if (filterQuarter) {
            const quarterNum = parseInt(filterQuarter, 10);
            if (!isNaN(quarterNum)) filteredData = filteredData.filter(item => item.quarter === quarterNum);
        }
        if (filterAssessed === 'yes') filteredData = filteredData.filter(item => item.analystAssessmentScore !== null);
        else if (filterAssessed === 'no') filteredData = filteredData.filter(item => item.analystAssessmentScore === null);

        if (filterCreatedFrom) {
            const dateFrom = new Date(filterCreatedFrom); dateFrom.setHours(0,0,0,0);
            filteredData = filteredData.filter(item => item.createdAt && new Date(item.createdAt) >= dateFrom);
        }
        if (filterCreatedTo) {
            const dateTo = new Date(filterCreatedTo); dateTo.setHours(23,59,59,999);
            filteredData = filteredData.filter(item => item.createdAt && new Date(item.createdAt) <= dateTo);
        }
    } else if (entityType === 'plans') {
        const {
            searchTerm,
            startDate: filterStartDate,
            endDate: filterEndDate,
            // targetMin, targetMax // Если будешь добавлять
        } = filters;

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredData = filteredData.filter(plan =>
                (plan.name && plan.name.toLowerCase().includes(lowerSearchTerm)) ||
                (plan.description && plan.description.toLowerCase().includes(lowerSearchTerm))
            );
        }
        if (filterStartDate) {
            const startDateFilter = new Date(filterStartDate);
            startDateFilter.setHours(0, 0, 0, 0);
            filteredData = filteredData.filter(plan =>
                plan.startDate && new Date(plan.startDate) >= startDateFilter
            );
        }
        if (filterEndDate) {
            const endDateFilter = new Date(filterEndDate);
            endDateFilter.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(plan =>
                plan.endDate && new Date(plan.endDate) <= endDateFilter
            );
        }
        // TODO: Добавить фильтрацию по targetValueMin/Max, если используется
    } else if (entityType === 'users') { // <--- НОВАЯ ВЕТКА ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
        const {
            searchTerm,
            role: filterUserRole // Переименовали для ясности, что это userRole из filters
        } = filters;

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredData = filteredData.filter(user =>
                (user.email && user.email.toLowerCase().includes(lowerSearchTerm)) ||
                (user.fullName && user.fullName.toLowerCase().includes(lowerSearchTerm))
            );
        }
        if (filterUserRole) { // Если фильтр по роли выбран
            filteredData = filteredData.filter(user => user.userRole === filterUserRole);
        }
    }
   

    return filteredData;
};

/**
 * Сортирует массив данных на основе конфигурации сортировки.
 * @param {Array} data - Массив объектов для сортировки.
 * @param {Object} sortConfig - Объект конфигурации: { field: string | null, direction: 'ascending' | 'descending' }.
 * @param {Array<String>} dateFields - Массив имен полей, которые являются датами и требуют особого сравнения.
 * @returns {Array} - Отсортированный массив (новая копия).
 */
export const sortData = (data, sortConfig, dateFields = []) => {
    if (!data) return [];
    let sortableData = [...data]; // Создаем копию

    if (sortConfig && sortConfig.field !== null) {
        sortableData.sort((a, b) => {
            let valA = a[sortConfig.field];
            let valB = b[sortConfig.field];

            // Обработка дат
            if (dateFields.includes(sortConfig.field)) {
                valA = valA ? new Date(valA).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
                valB = valB ? new Date(valB).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                // Числа сравниваем как есть
            } else {
                // Обработка null/undefined для других полей
                if (valA == null && valB != null) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (valB == null && valA != null) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA == null && valB == null) return 0;
                // Попытка привести к строке, если типы разные и не числа/даты
                valA = String(valA);
                valB = String(valB);
            }

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return sortableData;
};