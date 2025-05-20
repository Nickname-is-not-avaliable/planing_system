// src/pages/Plans/components/PlanExcelActions.jsx
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx'; // Импортируем библиотеку
import { FaFileDownload, FaFileUpload, FaQuestionCircle } from 'react-icons/fa'; // Иконки
import useAuth from '../../../hooks/useAuth'; // Нужен для createdById при импорте
import planService from '../../../services/planService'; // Для создания планов

// Хелпер для форматирования даты для Excel (YYYY-MM-DD)
const formatDateForExcel = (dateString) => {
    if (!dateString) return '';
    try {
        // Пытаемся создать дату. Исходная строка может быть YYYY-MM-DD или с временем.
        // new Date() хорошо справляется с ISO-подобными форматами.
        const date = new Date(dateString.split('T')[0]); // Убираем время, если оно есть, для консистентности
        if (isNaN(date.getTime())) { // Проверка на валидность даты
             console.warn("Invalid date string for Excel formatting:", dateString);
             return dateString; // Возвращаем как есть, если дата невалидна
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date for Excel:", dateString, e);
        return dateString; // Возвращаем как есть в случае ошибки
    }
};

// Ожидаемые заголовки столбцов в Excel и их маппинг на поля DTO
const EXPECTED_HEADERS_MAP = {
    'Название Плана': 'name',
    'Описание': 'description',
    'Целевое Значение': 'targetValue',
    'Дата Начала (ГГГГ-ММ-ДД)': 'startDate',
    'Дата Окончания (ГГГГ-ММ-ДД)': 'endDate',
    'ID Исполнителей (через запятую)': 'executorUserIds',
};
// Массив заголовков в том порядке, в котором они должны быть в шаблоне
const TEMPLATE_HEADERS = Object.keys(EXPECTED_HEADERS_MAP);

const PlanExcelActions = ({ plans, onImportComplete }) => {
    const { user } = useAuth(); // Для createdById при импорте

    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState({ success: 0, errors: 0, messages: [] });
    const importFileRef = useRef(null); // Для сброса input type="file"

    // Экспорт текущих планов в Excel
    const handleExportToExcel = () => {
        if (!plans || plans.length === 0) {
            alert("Нет данных для экспорта.");
            return;
        }
        const dataForSheet = plans.map(plan => ({
            'ID Плана (только для информации)': plan.id, // Не используется при импорте
            'Название Плана': plan.name,
            'Описание': plan.description,
            'Целевое Значение': plan.targetValue,
            'Дата Начала (ГГГГ-ММ-ДД)': formatDateForExcel(plan.startDate),
            'Дата Окончания (ГГГГ-ММ-ДД)': formatDateForExcel(plan.endDate),
            'ID Создателя (только для информации)': plan.createdByUserId,
            'ID Исполнителей (через запятую)': plan.executorUserIds ? plan.executorUserIds.join(', ') : '',
        }));

        // Используем TEMPLATE_HEADERS для экспорта, чтобы сохранить порядок, но добавляем инфо-поля
        const exportHeaders = [
            'ID Плана (только для информации)', ...TEMPLATE_HEADERS.slice(0, 3), // Name, Desc, Target
            'Дата Начала (ГГГГ-ММ-ДД)', 'Дата Окончания (ГГГГ-ММ-ДД)', // Даты из TEMPLATE_HEADERS
            'ID Создателя (только для информации)',
            'ID Исполнителей (через запятую)' // Из TEMPLATE_HEADERS
        ];


        const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: exportHeaders, skipHeader: false });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Планы");
        const colWidths = [
            { wch: 10 }, { wch: 40 }, { wch: 50 }, { wch: 20 }, { wch: 18 },
            { wch: 18 }, { wch: 15 }, { wch: 30 }
        ];
        worksheet["!cols"] = colWidths;
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(workbook, `plans_export_${dateStr}.xlsx`);
    };

    // Скачивание шаблона Excel для импорта
    const handleDownloadTemplate = () => {
        const exampleRow = [{
            'Название Плана': 'Пример: Разработка нового модуля',
            'Описание': 'Пример: Полное описание задач по разработке',
            'Целевое Значение': 100.5,
            'Дата Начала (ГГГГ-ММ-ДД)': formatDateForExcel(new Date().toISOString()),
            'Дата Окончания (ГГГГ-ММ-ДД)': formatDateForExcel(new Date(new Date().setDate(new Date().getDate() + 30)).toISOString()),
            'ID Исполнителей (через запятую)': '1, 2',
        }];
        const worksheet = XLSX.utils.json_to_sheet(exampleRow, { header: TEMPLATE_HEADERS, skipHeader: false });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Шаблон Для Импорта Планов");
        const colWidths = TEMPLATE_HEADERS.map(header => {
            if (header.includes('Название')) return { wch: 40 };
            if (header.includes('Описание')) return { wch: 60 };
            if (header.includes('Дата')) return { wch: 25 };
            if (header.includes('Исполнителей')) return { wch: 30 };
            return { wch: 20 }; // По умолчанию
        });
        worksheet["!cols"] = colWidths;
        XLSX.writeFile(workbook, "Шаблон_Импорта_Планов.xlsx");
    };

    // Парсинг и валидация даты из Excel
    const parseAndValidateDate = (dateValue, fieldName, rowIndex) => {
        if (dateValue === null || dateValue === undefined || String(dateValue).trim() === "") {
            // Если поле даты не обязательно, можно вернуть null. Если обязательно - ошибка.
            // В CreatePlanDto startDate и endDate обязательны.
            return { value: null, error: `Строка ${rowIndex + 2}: Поле "${fieldName}" обязательно.` };
        }
        let dateObj;
        if (typeof dateValue === 'number') { // Excel числовое представление даты
            const excelDate = XLSX.SSF.parse_date_code(dateValue);
            if (excelDate) {
                dateObj = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
            }
        } else if (typeof dateValue === 'string') { // Строковое представление
            dateObj = new Date(dateValue);
        } else if (dateValue instanceof Date) { // Уже объект Date
            dateObj = dateValue;
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return { value: `${year}-${month}-${day}`, error: null };
        }
        return { value: null, error: `Строка ${rowIndex + 2}: Некорректный формат даты для "${fieldName}". Ожидается ГГГГ-ММ-ДД или корректная дата Excel.` };
    };

    // Маппинг строки Excel в CreatePlanDto с валидацией
    const mapExcelRowToCreatePlanDto = (row, rowIndex) => {
        const planDto = {};
        let rowErrors = [];

        if (!user || !user.id) {
            rowErrors.push(`Строка ${rowIndex + 2}: Ошибка авторизации. Не удалось определить создателя плана.`);
        } else {
            planDto.createdByUserId = user.id;
        }

        for (const excelHeader in EXPECTED_HEADERS_MAP) {
            const dtoField = EXPECTED_HEADERS_MAP[excelHeader];
            let value = row[excelHeader]; // Значение из Excel по заголовку

            if (dtoField === 'name') {
                const nameValue = String(value || '').trim();
                if (nameValue.length < 3) rowErrors.push(`Строка ${rowIndex + 2}: "Название Плана" обязательно (мин. 3 симв.).`);
                planDto[dtoField] = nameValue;
            } else if (dtoField === 'description') {
                planDto[dtoField] = String(value || '').trim();
            } else if (dtoField === 'targetValue') {
                const numValue = parseFloat(String(value).replace(',', '.')); // Заменяем запятую на точку для parseFloat
                planDto[dtoField] = !isNaN(numValue) ? numValue : 0;
            } else if (dtoField === 'startDate' || dtoField === 'endDate') {
                const { value: parsedDate, error: dateError } = parseAndValidateDate(value, excelHeader, rowIndex);
                if (dateError) rowErrors.push(dateError);
                planDto[dtoField] = parsedDate;
            } else if (dtoField === 'executorUserIds') {
                const idsString = String(value || '').trim();
                if (!idsString) { // Исполнители обязательны
                     rowErrors.push(`Строка ${rowIndex + 2}: Поле "ID Исполнителей (через запятую)" обязательно.`);
                     planDto[dtoField] = [];
                } else {
                    const ids = idsString.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
                    if (ids.length === 0) rowErrors.push(`Строка ${rowIndex + 2}: Некорректные "ID Исполнителей". Ожидаются числа > 0 через запятую.`);
                    planDto[dtoField] = ids;
                    if (planDto[dtoField].length === 0 && idsString) { /* Ошибка уже добавлена */ }
                    else if (planDto[dtoField].length === 0) { // Еще раз, если строка была пустой, а поле обязательно
                        rowErrors.push(`Строка ${rowIndex + 2}: Необходимо указать хотя бы одного исполнителя.`);
                    }
                }
            }
        }

        if (planDto.startDate && planDto.endDate && new Date(planDto.startDate) > new Date(planDto.endDate)) {
            rowErrors.push(`Строка ${rowIndex + 2}: "Дата Начала" не может быть позже "Дата Окончания".`);
        }
        return { dto: planDto, errors: rowErrors };
    };

    // Обработчик импорта из Excel
    const handleImportFromExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        setImportStatus({ success: 0, errors: 0, messages: ["Начало импорта... Пожалуйста, подождите."] });

        const reader = new FileReader();
        reader.onload = async (e) => {
            let currentSuccess = 0;
            let currentErrors = 0;
            const currentMessages = ["Проверка файла и заголовков..."];
            setImportStatus(prev => ({ ...prev, messages: currentMessages }));

            try {
                const data = e.target.result;
                // { dateNF: 'yyyy-mm-dd', cellDates: true } - для лучшего парсинга дат как строк, если они так отформатированы
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Получаем заголовки из файла
                const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })[0];
                if (!headerRow || headerRow.length === 0) {
                    throw new Error("Файл не содержит заголовков.");
                }

                // Проверка наличия всех ожидаемых заголовков
                const missingHeaders = TEMPLATE_HEADERS.filter(expectedHeader => !headerRow.map(h => String(h).trim()).includes(expectedHeader));
                if (missingHeaders.length > 0) {
                    throw new Error(`Отсутствуют обязательные столбцы: ${missingHeaders.join(', ')}.`);
                }

                // Получаем данные как массив объектов, используя заголовки из файла
                const dataRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (dataRows.length === 0) {
                    currentMessages.push("Ошибка: Файл не содержит строк данных после заголовков.");
                    setImportStatus({ success: 0, errors: 1, messages: currentMessages });
                    setIsImporting(false); if (importFileRef.current) importFileRef.current.value = "";
                    return;
                }
                currentMessages.push(`Найдено строк для обработки: ${dataRows.length}. Обработка...`);
                setImportStatus(prev => ({ ...prev, messages: currentMessages }));


                for (let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i];
                    // Пропускаем пустые строки (если все значения в строке пустые)
                    if (Object.values(row).every(val => String(val).trim() === "")) {
                        currentMessages.push(`Строка ${i + 2}: Пропущена (пустая).`);
                        continue;
                    }

                    const { dto, errors: rowValidationErrors } = mapExcelRowToCreatePlanDto(row, i);

                    if (rowValidationErrors.length > 0) {
                        currentErrors++;
                        currentMessages.push(...rowValidationErrors);
                        setImportStatus({ success: currentSuccess, errors: currentErrors, messages: [...currentMessages] });
                        continue;
                    }

                    try {
                        await planService.createPlan(dto);
                        currentSuccess++;
                        currentMessages.push(`Строка ${i + 2}: План "${dto.name}" успешно создан.`);
                    } catch (apiErr) {
                        currentErrors++;
                        const apiErrMsg = apiErr.response?.data?.message || apiErr.message || 'Неизвестная ошибка API.';
                        currentMessages.push(`Строка ${i + 2}: Ошибка создания плана "${dto.name || 'Без названия'}": ${apiErrMsg}`);
                        console.error("API Error for row:", i, dto, apiErr);
                    }
                    // Обновляем статус после обработки каждой строки
                    setImportStatus({ success: currentSuccess, errors: currentErrors, messages: [...currentMessages] });
                }

                currentMessages.push(`Импорт завершен. Успешно: ${currentSuccess}, Ошибки: ${currentErrors}.`);
                if (typeof onImportComplete === 'function' && currentSuccess > 0) {
                    onImportComplete();
                }

            } catch (parseError) {
                console.error("Error processing Excel file:", parseError);
                currentMessages.push(`Критическая ошибка: ${parseError.message}`);
                currentErrors++;
            } finally {
                setImportStatus({ success: currentSuccess, errors: currentErrors, messages: currentMessages });
                setIsImporting(false);
                if (importFileRef.current) importFileRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="excel-actions-container">
            <button onClick={handleExportToExcel} className="action-btn secondary-btn" title="Экспортировать текущий список планов в Excel" disabled={isImporting || !plans || plans.length === 0}>
                <FaFileDownload /> Экспорт
            </button>
            <label htmlFor="excel-import-input" className={`action-btn secondary-btn ${isImporting ? 'disabled' : ''}`} title="Импортировать планы из Excel файла">
                <FaFileUpload /> Импорт
            </label>
            <input type="file" id="excel-import-input" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportFromExcel} ref={importFileRef} disabled={isImporting} />
            <button onClick={handleDownloadTemplate} className="action-btn info-btn" title="Скачать шаблон Excel для импорта планов" disabled={isImporting}>
                <FaQuestionCircle /> Шаблон
            </button>
            {isImporting && <span className="import-spinner">Импорт данных...</span>}

            {importStatus.messages.length > 0 && !isImporting && (
                <div className="import-status">
                    <h4>Результаты импорта:</h4>
                    <p>Успешно создано планов: {importStatus.success}</p>
                    <p>Строк с ошибками: {importStatus.errors}</p>
                    {importStatus.messages.length > 1 && (
                        <details className="import-details-toggle">
                            <summary>Показать/скрыть детали ({importStatus.messages.length -1} сообщений)</summary>
                            <ul className="import-error-details">
                                {importStatus.messages.slice(1).map((msg, idx) => (
                                    <li key={idx} className={msg.toLowerCase().includes('ошибка') || msg.toLowerCase().includes('некорректно') ? 'error-msg-item' : 'success-msg-item'}>
                                        {msg}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlanExcelActions;