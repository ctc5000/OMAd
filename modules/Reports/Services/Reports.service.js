const PdfReportBuilder = require('../Builders/PuppeteerPdfReportBuilder');
const ExcelReportBuilder = require('../Builders/ExcelReportBuilder');
const ReportsDataService = require('./ReportsDataService');
const DateUtils = require('../Utils/DateUtils');

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
     * @param {string} [period='this_week'] - Период отчета
     * @returns {Promise<Buffer>} - PDF документ в виде Buffer
     */
    async generatePdfReport(campaignId, period = 'this_week') {
        console.log(`📄 Генерация PDF отчёта: кампания ${campaignId}, период: ${period}`);

        try {
            // Получаем диапазон дат
            const { fromDate, toDate } = DateUtils.getDateRange(period);

            // Получить данные для отчёта
            const summary = await this.dataService.getSummaryMetrics(campaignId, fromDate, toDate);
            const daily = await this.dataService.getDailyMetrics(campaignId, fromDate, toDate);

            // Подготовить данные для PDF
            const reportData = {
                summary,
                daily
            };

            // Построить PDF через PdfReportBuilder
            const pdfBuffer = await this.pdfBuilder.build(reportData, period);

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
     * @param {string} [period='this_week'] - Период отчета
     * @returns {Promise<Buffer>} - Excel документ в виде Buffer
     */
    async generateExcelReport(campaignId, period = 'this_week') {
        console.log(`📊 Генерация Excel отчёта: кампания ${campaignId}, период: ${period}`);

        try {
            // Получаем диапазон дат
            const { fromDate, toDate } = DateUtils.getDateRange(period);

            // Получить данные для отчёта
            const summary = await this.dataService.getSummaryMetrics(campaignId, fromDate, toDate);
            const daily = await this.dataService.getDailyMetrics(campaignId, fromDate, toDate);

            // Подготовить данные для Excel
            const reportData = {
                summary,
                daily
            };

            // Построить Excel через ExcelReportBuilder
            const excelBuffer = await this.excelBuilder.build(reportData, period);

            return excelBuffer;

        } catch (error) {
            console.error('❌ Ошибка при генерации Excel:', error.message);
            throw error;
        }
    }
}

module.exports = ReportsService;

