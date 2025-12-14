const ReportsService = require('../Services/Reports.service');
const DateUtils = require('../Utils/DateUtils');

class ReportsController {
    constructor(models, sequelize) {
        console.log('🚀 Инициализация ReportsController');
        console.log('📦 Доступные модели:', Object.keys(models));
        console.log('📊 Sequelize:', !!sequelize);

        this.models = models;
        this.sequelize = sequelize;
        
        // Инициализировать ReportsService
        this.reportsService = new ReportsService(models, sequelize);
    }

    /**
     * Генерирует PDF отчёт по кампании
     * 
     * Query параметры:
     * - from: дата начала (YYYY-MM-DD)
     * - to: дата окончания (YYYY-MM-DD)
     * - period: период отчета ('today', 'yesterday', 'this_week', 'this_month')
     */
    async generatePdfReport(req, res) {
        try {
            console.log('🔍 Полный запрос PDF:', {
                params: req.params,
                query: req.query,
                body: req.body,
                headers: req.headers
            });

            const { id } = req.params;
            const { period = 'this_week' } = req.query;

            console.log(`📄 Запрос PDF отчёта для кампании ${id}, период: ${period}`);

            // Валидация параметров
            if (!id) {
                console.warn('❌ Отсутствует campaign_id');
                return res.status(400).json({
                    success: false,
                    error: 'Требуется campaign_id в URL'
                });
            }

            // Проверка существования кампании
            const campaign = await this.models.Campaign.findByPk(id);
            if (!campaign) {
                console.warn(`❌ Кампания ${id} не найдена`);
                return res.status(404).json({
                    success: false,
                    error: `Кампания ${id} не найдена`
                });
            }

            // Вызвать сервис для генерации PDF
            const pdfBuffer = await this.reportsService.generatePdfReport(id, period);

            // Проверка PDF буфера
            if (!pdfBuffer || pdfBuffer.length === 0) {
                console.error('❌ Пустой PDF буфер');
                return res.status(500).json({
                    success: false,
                    error: 'Не удалось сгенерировать PDF'
                });
            }

            // Получаем диапазон дат для имени файла
            const { fromDate, toDate } = DateUtils.getDateRange(period);

            // Отправить файл клиенту с корректными заголовками
            res.contentType('application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report_campaign_${id}_${fromDate}_to_${toDate}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

            console.log(`✅ PDF отчёт отправлен клиенту, размер: ${pdfBuffer.length} байт`);

        } catch (error) {
            console.error('❌ Ошибка генерации PDF отчёта:', error.message);
            console.error('Стек ошибки:', error.stack);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Генерирует Excel отчёт по кампании
     * 
     * Query параметры:
     * - period: период отчета ('today', 'yesterday', 'this_week', 'this_month')
     */
    async generateExcelReport(req, res) {
        try {
            console.log('🔍 Полный запрос Excel:', {
                params: req.params,
                query: req.query,
                body: req.body,
                headers: req.headers
            });

            const { id } = req.params;
            const { period = 'this_week' } = req.query;

            console.log(`📊 Запрос Excel отчёта для кампании ${id}, период: ${period}`);

            // Валидация параметров
            if (!id) {
                console.warn('❌ Отсутствует campaign_id');
                return res.status(400).json({
                    success: false,
                    error: 'Требуется campaign_id в URL'
                });
            }

            // Проверка существования кампании
            const campaign = await this.models.Campaign.findByPk(id);
            if (!campaign) {
                console.warn(`❌ Кампания ${id} не найдена`);
                return res.status(404).json({
                    success: false,
                    error: `Кампания ${id} не найдена`
                });
            }

            // Вызвать сервис для генерации Excel
            const excelBuffer = await this.reportsService.generateExcelReport(id, period);

            // Получаем диапазон дат для имени файла
            const { fromDate, toDate } = DateUtils.getDateRange(period);

            // Отправить файл клиенту
            res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="report_campaign_${id}_${fromDate}_to_${toDate}.xlsx"`);
            res.setHeader('Content-Length', excelBuffer.length);
            res.send(excelBuffer);

            console.log(`✅ Excel отчёт отправлен клиенту, размер: ${excelBuffer.length} байт`);

        } catch (error) {
            console.error('❌ Ошибка генерации Excel отчёта:', error.message);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ReportsController;