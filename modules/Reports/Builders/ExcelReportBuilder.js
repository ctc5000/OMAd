const ExcelJS = require('exceljs');

class ExcelReportBuilder {
    /**
     * Построить Excel отчёт
     * 
     * @param {object} reportData - Данные для отчёта
     * @returns {Promise<Buffer>} - Excel документ в виде Buffer
     */
    async build(reportData) {
        const workbook = new ExcelJS.Workbook();
        
        // Титульный лист
        this._createTitleSheet(workbook, reportData);

        // Лист с основными метриками
        this._createSummarySheet(workbook, reportData);

        // Лист с ежедневной статистикой
        this._createDailyMetricsSheet(workbook, reportData);

        // Сохранить в буфер
        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Создать титульный лист
     * 
     * @param {ExcelJS.Workbook} workbook - Рабочая книга
     * @param {object} reportData - Данные для отчёта
     */
    _createTitleSheet(workbook, reportData) {
        const { summary } = reportData;
        const sheet = workbook.addWorksheet('Титульный лист');

        // Стили
        const titleStyle = { 
            font: { bold: true, size: 16 },
            alignment: { horizontal: 'center' }
        };
        const subtitleStyle = { 
            font: { size: 12 },
            alignment: { horizontal: 'center' }
        };

        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = 'Отчёт по рекламной кампании';
        sheet.getCell('A1').style = titleStyle;

        sheet.mergeCells('A3:D3');
        sheet.getCell('A3').value = `Кампания: ${summary.campaign_name || 'Без названия'}`;
        sheet.getCell('A3').style = subtitleStyle;

        sheet.mergeCells('A4:D4');
        sheet.getCell('A4').value = `Период: ${summary.from_date || ''} - ${summary.to_date || ''}`;
        sheet.getCell('A4').style = subtitleStyle;

        // Автоширина столбцов
        sheet.columns.forEach(column => {
            column.width = 20;
        });
    }

    /**
     * Создать лист с основными метриками
     * 
     * @param {ExcelJS.Workbook} workbook - Рабочая книга
     * @param {object} reportData - Данные для отчёта
     */
    _createSummarySheet(workbook, reportData) {
        const { summary } = reportData;
        const sheet = workbook.addWorksheet('Основные метрики');

        // Заголовки
        sheet.columns = [
            { header: 'Метрика', key: 'metric', width: 25 },
            { header: 'Значение', key: 'value', width: 20 }
        ];

        // Данные
        const metrics = [
            { metric: 'Уникальные посетители (UV)', value: summary.uv || 0 },
            { metric: 'Показы', value: summary.impressions || 0 },
            { metric: 'Клики', value: summary.clicks || 0 },
            { metric: 'CTR', value: summary.ctr ? `${summary.ctr}%` : '0%' },
            { metric: 'Конверсии', value: summary.conversions || 0 },
            { metric: 'CR', value: summary.cr ? `${summary.cr}%` : '0%' },
            { metric: 'Выручка', value: summary.revenue ? `${summary.revenue.toFixed(2)} ₽` : '0 ₽' }
        ];

        // Добавить данные
        sheet.addRows(metrics);

        // Стили
        sheet.getRow(1).font = { bold: true };
        sheet.eachRow((row, rowNumber) => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'left' };
            });
        });
    }

    /**
     * Создать лист с ежедневной статистикой
     * 
     * @param {ExcelJS.Workbook} workbook - Рабочая книга
     * @param {object} reportData - Данные для отчёта
     */
    _createDailyMetricsSheet(workbook, reportData) {
        const { daily } = reportData;
        const sheet = workbook.addWorksheet('Ежедневная статистика');

        // Заголовки
        sheet.columns = [
            { header: 'Дата', key: 'date', width: 15 },
            { header: 'Показы', key: 'impressions', width: 15 },
            { header: 'Клики', key: 'clicks', width: 15 },
            { header: 'CTR', key: 'ctr', width: 15 },
            { header: 'Конверсии', key: 'conversions', width: 15 },
            { header: 'CR', key: 'cr', width: 15 }
        ];

        // Преобразовать данные
        const dailyMetrics = daily.map(day => ({
            date: day.date,
            impressions: day.impressions || 0,
            clicks: day.clicks || 0,
            ctr: day.ctr !== undefined ? `${day.ctr}%` : '0%',
            conversions: day.conversions || 0,
            cr: day.cr !== undefined ? `${day.cr}%` : '0%'
        }));

        // Добавить данные
        sheet.addRows(dailyMetrics);

        // Стили
        sheet.getRow(1).font = { bold: true };
        sheet.eachRow((row, rowNumber) => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'left' };
            });
        });
    }
}

module.exports = ExcelReportBuilder;

