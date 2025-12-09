const ExcelJS = require('exceljs');

/**
 * Построитель Excel отчётов
 * Генерирует простой Excel с листами Summary и Daily Metrics
 */
class ExcelReportBuilder {
    constructor() {
        this.ExcelJS = ExcelJS;
    }

    /**
     * Построить Excel отчёт из данных
     * 
     * Входные данные:
     * {
     *   summary: { uv, reach, impressions, clicks, conversions, ctr, cr, cpc, cpl },
     *   daily: [{ date, impressions, clicks, conversions }, ...]
     * }
     */
    async build(reportData) {
        console.log('🔨 Построение Excel отчёта');

        try {
            // Валидация входных данных
            if (!reportData || !reportData.summary) {
                throw new Error('Invalid report data: missing summary');
            }

            // Создать новый Workbook
            const workbook = new this.ExcelJS.Workbook();

            // Добавить лист со сводкой
            this.addSummarySheet(workbook, reportData.summary);

            // Добавить лист с ежедневными метриками
            if (reportData.daily && reportData.daily.length > 0) {
                this.addDailyMetricsSheet(workbook, reportData.daily);
            }

            // Сформировать буфер и вернуть
            const buffer = await workbook.xlsx.writeBuffer();
            console.log(`✅ Excel отчёт успешно сгенерирован (размер: ${buffer.length} байт)`);
            return buffer;

        } catch (error) {
            console.error('❌ Ошибка при построении Excel:', error.message);
            throw error;
        }
    }

    /**
     * Добавить лист со сводкой метрик
     */
    addSummarySheet(workbook, summary) {
        console.log('📊 Добавление листа сводки');

        const worksheet = workbook.addWorksheet('Summary');

        // Установить ширину колонок
        worksheet.columns = [
            { header: 'Метрика', key: 'metric', width: 20 },
            { header: 'Значение', key: 'value', width: 20 }
        ];

        // Заполнить данные
        const metricsData = [
            { metric: 'UV', value: summary.uv || 0 },
            { metric: 'Reach', value: summary.reach || 0 },
            { metric: 'Impressions', value: summary.impressions || 0 },
            { metric: 'Clicks', value: summary.clicks || 0 },
            { metric: 'Conversions', value: summary.conversions || 0 },
            { metric: 'CTR, %', value: summary.ctr !== undefined ? summary.ctr : 0 },
            { metric: 'CR, %', value: summary.cr !== undefined ? summary.cr : 0 },
            { metric: 'CPC, ₽', value: summary.cpc !== null ? summary.cpc : '—' },
            { metric: 'CPL, ₽', value: summary.cpl !== null ? summary.cpl : '—' },
        ];

        worksheet.addRows(metricsData);

        // Форматировать заголовок
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'center' };

        // Форматировать ячейки со значениями
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.alignment = { horizontal: 'right', vertical: 'center' };
            }
        });
    }

    /**
     * Добавить лист с ежедневными метриками
     */
    addDailyMetricsSheet(workbook, dailyData) {
        console.log('📋 Добавление листа ежедневных метрик');

        const worksheet = workbook.addWorksheet('Daily Metrics');

        // Установить ширину колонок
        worksheet.columns = [
            { header: 'Дата', key: 'date', width: 15 },
            { header: 'Impressions', key: 'impressions', width: 15 },
            { header: 'Clicks', key: 'clicks', width: 15 },
            { header: 'Conversions', key: 'conversions', width: 15 }
        ];

        // Подготовить данные для таблицы
        const rows = dailyData.map(item => ({
            date: item.date,
            impressions: item.impressions || 0,
            clicks: item.clicks || 0,
            conversions: item.conversions || 0
        }));

        worksheet.addRows(rows);

        // Форматировать заголовок
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'center' };

        // Форматировать ячейки данных
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.cells.forEach((cell, index) => {
                    if (index > 0) {
                        // Числовое форматирование для колонок с метриками
                        cell.numFmt = '#,##0';
                        cell.alignment = { horizontal: 'right', vertical: 'center' };
                    } else {
                        // Выравнивание по центру для даты
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                });
            }
        });
    }
}

module.exports = ExcelReportBuilder;

