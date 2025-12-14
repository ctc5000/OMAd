const PdfReportBuilder = require('../Builders/PuppeteerPdfReportBuilder');
const ExcelReportBuilder = require('../Builders/ExcelReportBuilder');
const ReportsDataService = require('./ReportsDataService');

/**
 * Сервис для генерации отчётов
 * Использует ReportsDataService для получения данных и соответствующие builders
 */
class ReportsService {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize;
        
        // Инициализировать построители отчётов
        this.pdfBuilder = new PdfReportBuilder();
        this.excelBuilder = new ExcelReportBuilder();
        this.dataService = new ReportsDataService(models, sequelize);
    }

    /**
     * Генерирует PDF отчёт по кампании
     * 
     * @param {number} campaignId - ID кампании
     * @param {string} fromDate - Дата начала периода (YYYY-MM-DD)
     * @param {string} toDate - Дата окончания периода (YYYY-MM-DD)
     * @returns {Promise<Buffer>} - PDF документ в виде Buffer
     */
    async generatePdfReport(campaignId, fromDate, toDate) {
        console.log(`📄 Генерация PDF отчёта: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // Валидация даты
            if (!fromDate || !toDate) {
                throw new Error('fromDate и toDate обязательны');
            }

            // Получить данные для отчёта
            const summary = await this.dataService.getSummaryMetrics(campaignId, fromDate, toDate);
            const daily = await this.dataService.getDailyMetrics(campaignId, fromDate, toDate);

            // Подготовить данные для PDF
            const reportData = {
                summary,
                daily
            };

            // Построить PDF через PdfReportBuilder
            const pdfBuffer = await this.pdfBuilder.build(reportData);

            return pdfBuffer;

        } catch (error) {
            console.error('❌ Ошибка при генерации PDF:', error.message);
            console.error('Стек ошибки:', error.stack);
            throw error;
        }
    }

    /**
     * Генерирует Excel отчёт по кампании
     * 
     * @param {number} campaignId - ID кампании
     * @param {string} fromDate - Дата начала периода (YYYY-MM-DD)
     * @param {string} toDate - Дата окончания периода (YYYY-MM-DD)
     * @returns {Promise<Buffer>} - Excel документ в виде Buffer
     */
    async generateExcelReport(campaignId, fromDate, toDate) {
        console.log(`📊 Генерация Excel отчёта: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // Валидация даты
            if (!fromDate || !toDate) {
                throw new Error('fromDate и toDate обязательны');
            }

            // Получить данные для отчёта
            const summary = await this.dataService.getSummaryMetrics(campaignId, fromDate, toDate);
            const daily = await this.dataService.getDailyMetrics(campaignId, fromDate, toDate);

            // Подготовить данные для Excel
            const reportData = {
                summary,
                daily
            };

            // Построить Excel через ExcelReportBuilder
            const excelBuffer = await this.excelBuilder.build(reportData);

            return excelBuffer;

        } catch (error) {
            console.error('❌ Ошибка при генерации Excel:', error.message);
            throw error;
        }
    }
}

module.exports = ReportsService;

