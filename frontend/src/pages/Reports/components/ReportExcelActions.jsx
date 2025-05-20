// src/pages/Reports/components/ReportExcelActions.jsx
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FaFileDownload, FaFileUpload, FaQuestionCircle, FaSpinner } from 'react-icons/fa'; // Добавил FaSpinner
import useAuth from '../../../hooks/useAuth';
import reportService from '../../../services/reportService';
import planService from '../../../services/planService';
// import userService from '../../../services/userService'; // Не используется напрямую здесь, имена приходят через props
import api from '../../../services/api';

// Хелпер для форматирования даты
const formatDateForExcel = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString.split('T')[0]);
        if (isNaN(date.getTime())) return dateString;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return dateString; }
};

// Заголовки для импорта
const REPORT_IMPORT_HEADERS_MAP = {
    'ID Плана*': 'planId',
    'Год*': 'year',
    'Квартал (1-4)*': 'quarter',
    'Фактическое значение*': 'actualValue',
};
const REPORT_TEMPLATE_HEADERS = Object.keys(REPORT_IMPORT_HEADERS_MAP);

const ReportExcelActions = ({ reports, onImportComplete, planNamesCache = {}, userNamesCache = {} }) => {
    const { user } = useAuth();
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState({ success: 0, errors: 0, messages: [], showDetails: false });
    const importFileRef = useRef(null);

    // --- ЭКСПОРТ ОТЧЕТОВ ---
    const handleExportToExcel = () => {
        if (!reports || reports.length === 0) {
            alert("Нет данных для экспорта.");
            return;
        }
        // Формируем данные с использованием кэшей имен
        const dataForSheet = reports.map(report => ({
            'ID Отчета': report.id,
            'ID Плана': report.planId,
            'Название Плана': planNamesCache[report.planId] || `План ${report.planId}`,
            'Год': report.year,
            'Квартал': report.quarter,
            'Фактическое значение': report.actualValue,
            'ID Отчитавшегося': report.reportingUserId,
            'Отчитался': userNamesCache[report.reportingUserId] || `Пользователь ${report.reportingUserId}`,
            'ID Оценившего': report.assessedByUserId,
            'Оценил': userNamesCache[report.assessedByUserId] || (report.assessedByUserId ? `Пользователь ${report.assessedByUserId}`: 'Не оценен'),
            'Оценка Аналитика': report.analystAssessmentScore,
            'Дата Создания': formatDateForExcel(report.createdAt),
        }));
        const exportHeaders = Object.keys(dataForSheet[0] || {}); // Берем заголовки из первой строки данных

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: exportHeaders, skipHeader: false });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Отчеты");
        const colWidths = [
            { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 20 },
            { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }
        ];
        if (worksheet) worksheet["!cols"] = colWidths; // Проверяем, что worksheet существует
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(workbook, `reports_export_${dateStr}.xlsx`);
    };

    // --- СКАЧИВАНИЕ ШАБЛОНА ---
    const handleDownloadTemplate = () => {
        const exampleRow = [{
            [REPORT_TEMPLATE_HEADERS[0]]: 1,
            [REPORT_TEMPLATE_HEADERS[1]]: new Date().getFullYear(),
            [REPORT_TEMPLATE_HEADERS[2]]: 1,
            [REPORT_TEMPLATE_HEADERS[3]]: 120.75,
        }];
        const worksheet = XLSX.utils.json_to_sheet(exampleRow, { header: REPORT_TEMPLATE_HEADERS, skipHeader: false });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Шаблон Для Импорта Отчетов");
        const colWidths = REPORT_TEMPLATE_HEADERS.map(header => {
            if (header.includes('ID Плана')) return { wch: 15 };
            if (header.includes('Фактическое')) return { wch: 25 };
            return { wch: 18 };
        });
        if (worksheet) worksheet["!cols"] = colWidths;
        XLSX.writeFile(workbook, "Шаблон_Импорта_Отчетов.xlsx");
    };

    // --- ЛОГИКА ИМПОРТА ---
    const mapExcelRowToCreateReportDto = async (row, rowIndex) => {
        const reportDto = {};
        let rowErrors = [];

        if (!user || !user.id) {
            rowErrors.push(`Строка ${rowIndex + 2}: Не удалось определить пользователя (для reportingUserId).`);
        } else {
            reportDto.reportingUserId = user.id;
        }

        const planIdRaw = row[REPORT_TEMPLATE_HEADERS[0]]; // 'ID Плана*'
        const planId = parseInt(planIdRaw, 10);
        if (isNaN(planId) || planId <= 0) {
            rowErrors.push(`Строка ${rowIndex + 2}: Поле "${REPORT_TEMPLATE_HEADERS[0]}" должно быть корректным ID плана (>0). Получено: "${planIdRaw}".`);
        } else {
            try {
                await planService.getPlanById(planId); // Проверка существования плана
                reportDto.planId = planId;
            } catch (e) {
                rowErrors.push(`Строка ${rowIndex + 2}: План с ID ${planId} не найден или недоступен.`);
            }
        }

        const yearRaw = row[REPORT_TEMPLATE_HEADERS[1]]; // 'Год*'
        const year = parseInt(yearRaw, 10);
        if (isNaN(year) || year < 2000 || year > 2099) {
            rowErrors.push(`Строка ${rowIndex + 2}: Поле "${REPORT_TEMPLATE_HEADERS[1]}" должно быть корректным годом (2000-2099). Получено: "${yearRaw}".`);
        } else { reportDto.year = year; }

        const quarterRaw = row[REPORT_TEMPLATE_HEADERS[2]]; // 'Квартал (1-4)*'
        const quarter = parseInt(quarterRaw, 10);
        if (isNaN(quarter) || quarter < 1 || quarter > 4) {
            rowErrors.push(`Строка ${rowIndex + 2}: Поле "${REPORT_TEMPLATE_HEADERS[2]}" должно быть числом от 1 до 4. Получено: "${quarterRaw}".`);
        } else { reportDto.quarter = quarter; }

        const actualValueRaw = row[REPORT_TEMPLATE_HEADERS[3]]; // 'Фактическое значение*'
        const actualValue = parseFloat(String(actualValueRaw).replace(',', '.'));
        if (isNaN(actualValue)) {
            rowErrors.push(`Строка ${rowIndex + 2}: Поле "${REPORT_TEMPLATE_HEADERS[3]}" должно быть числом. Получено: "${actualValueRaw}".`);
        } else { reportDto.actualValue = actualValue; }

        return { dto: reportDto, errors: rowErrors };
    };

    const handleImportFromExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        setImportStatus({ success: 0, errors: 0, messages: ["Начало импорта отчетов..."], showDetails: false });

        const reader = new FileReader();
        reader.onload = async (e) => {
            let currentSuccess = 0;
            let currentErrors = 0;
            const currentMessages = ["Проверка файла и заголовков..."];
            setImportStatus(prev => ({ ...prev, messages: currentMessages }));

            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const headerRowFromFile = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })[0];

                if (!headerRowFromFile || headerRowFromFile.length === 0) throw new Error("Файл не содержит заголовков.");
                const missingHeaders = REPORT_TEMPLATE_HEADERS.filter(expectedHeader =>
                    !headerRowFromFile.map(h => String(h).trim()).includes(expectedHeader)
                );
                if (missingHeaders.length > 0) throw new Error(`В файле отсутствуют обязательные столбцы: ${missingHeaders.join(', ')}.`);

                const dataRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                if (dataRows.length === 0) {
                    currentMessages.push("Ошибка: Файл не содержит строк данных после заголовков.");
                    setImportStatus({ success: 0, errors: 1, messages: currentMessages, showDetails: true });
                    setIsImporting(false); if (importFileRef.current) importFileRef.current.value = "";
                    return;
                }
                currentMessages.push(`Найдено строк для обработки: ${dataRows.length}. Обработка...`);
                setImportStatus(prev => ({ ...prev, messages: currentMessages }));

                for (let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i];
                    if (Object.values(row).every(val => String(val).trim() === "")) {
                        currentMessages.push(`Строка ${i + 2}: Пропущена (пустая).`); continue;
                    }

                    const { dto, errors: rowValidationErrors } = await mapExcelRowToCreateReportDto(row, i);

                    if (rowValidationErrors.length > 0) {
                        currentErrors++; currentMessages.push(...rowValidationErrors);
                        setImportStatus(prev => ({ ...prev, errors: currentErrors, messages: [...currentMessages] }));
                        continue;
                    }

                    try {
                        await reportService.createReport(dto);
                        currentSuccess++;
                        currentMessages.push(`Строка ${i + 2}: Отчет для плана ID ${dto.planId} (${dto.year} Q${dto.quarter}) успешно создан.`);
                    } catch (apiErr) {
                        currentErrors++;
                        const apiErrMsg = apiErr.response?.data?.message || apiErr.message || 'Неизвестная ошибка API.';
                        currentMessages.push(`Строка ${i + 2}: Ошибка создания отчета для плана ID ${dto.planId}: ${apiErrMsg}`);
                    }
                    // Обновляем статус после каждой строки для обратной связи
                    setImportStatus({ success: currentSuccess, errors: currentErrors, messages: [...currentMessages], showDetails: true });
                }
                currentMessages.push(`Импорт завершен. Успешно: ${currentSuccess}, Ошибки: ${currentErrors}.`);
                if (typeof onImportComplete === 'function' && currentSuccess > 0) onImportComplete();

            } catch (parseError) {
                console.error("Error processing Excel file:", parseError);
                currentMessages.push(`Критическая ошибка обработки файла: ${parseError.message}`);
                currentErrors++;
            } finally {
                setImportStatus(prev => ({ ...prev, success: currentSuccess, errors: currentErrors, messages: currentMessages, showDetails: true }));
                setIsImporting(false);
                if (importFileRef.current) importFileRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- РЕНДЕРИНГ ---
    return (
        <div className="excel-actions-container">
            <button
                onClick={handleExportToExcel}
                className="action-btn secondary-btn"
                title="Экспортировать текущий список отчетов в Excel"
                disabled={isImporting || !reports || reports.length === 0}
            >
                <FaFileDownload /> Экспорт отчетов
            </button>

            <label
                htmlFor="report-excel-import-input"
                className={`action-btn secondary-btn ${isImporting ? 'disabled' : ''}`}
                title="Импортировать отчеты из Excel файла"
            >
                <FaFileUpload /> Импорт отчетов
            </label>
            <input
                type="file"
                id="report-excel-import-input"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleImportFromExcel}
                ref={importFileRef}
                disabled={isImporting}
            />

            <button
                onClick={handleDownloadTemplate}
                className="action-btn info-btn"
                title="Скачать шаблон Excel для импорта отчетов"
                disabled={isImporting}
            >
                <FaQuestionCircle /> Шаблон для отчетов
            </button>

            {isImporting && (
                <span className="import-spinner">
                    <FaSpinner className="fa-spin" /> Импорт отчетов...
                </span>
            )}

            {/* Блок статуса импорта */}
            {importStatus.messages.length > 0 && !isImporting && (
                <div className="import-status">
                    <h4>Результаты импорта отчетов:</h4>
                    <p>Успешно создано: {importStatus.success}</p>
                    <p>Строк с ошибками: {importStatus.errors}</p>
                    {importStatus.messages.length > 1 && ( // Показываем детали, если есть сообщения кроме стартового
                        <details className="import-details-toggle" open={importStatus.showDetails || importStatus.errors > 0}>
                            <summary>
                                {importStatus.showDetails ? 'Скрыть детали' : 'Показать детали'} ({importStatus.messages.length -1} сообщений)
                            </summary>
                            <ul className="import-error-details">
                                {importStatus.messages.slice(1).map((msg, idx) => (
                                    // Выделяем сообщения об ошибках
                                    <li
                                        key={idx}
                                        className={
                                            msg.toLowerCase().includes('ошибка') ||
                                            msg.toLowerCase().includes('не найден') ||
                                            msg.toLowerCase().includes('некорректно') ||
                                            msg.toLowerCase().includes('отсутствуют')
                                            ? 'error-msg-item' : 'success-msg-item'}
                                    >
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

export default ReportExcelActions;