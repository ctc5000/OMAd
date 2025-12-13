const ReportsService = require('../Services/Reports.service');

class ReportsController {
    constructor(models, sequelize) {
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
     */
    async generatePdfReport(req, res) {
        try {
            const { id } = req.params;
            const { from, to } = req.query;

            console.log(`📄 Запрос PDF отчёта для кампании ${id}, период: ${from} - ${to}`);

            // Валидация параметров
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Требуется campaign_id в URL'
                });
            }

            if (!from || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'Требуются параметры from и to (формат: YYYY-MM-DD)'
                });
            }

            // Вызвать сервис для генерации PDF
            const pdfBuffer = await this.reportsService.generatePdfReport(id, from, to);

            // Отправить файл клиенту
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report_campaign_${id}.pdf"`);
            res.send(pdfBuffer);

            console.log(`✅ PDF отчёт отправлен клиенту`);

        } catch (error) {
            console.error('❌ Ошибка генерации PDF отчёта:', error.message);
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
     * - from: дата начала (YYYY-MM-DD)
     * - to: дата окончания (YYYY-MM-DD)
     */
    async generateExcelReport(req, res) {
        try {
            const { id } = req.params;
            const { from, to } = req.query;

            console.log(`📊 Запрос Excel отчёта для кампании ${id}, период: ${from} - ${to}`);

            // Валидация параметров
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Требуется campaign_id в URL'
                });
            }

            if (!from || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'Требуются параметры from и to (формат: YYYY-MM-DD)'
                });
            }

            // Вызвать сервис для генерации Excel
            const excelBuffer = await this.reportsService.generateExcelReport(id, from, to);

            // Отправить файл клиенту
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="report_campaign_${id}.xlsx"`);
            res.send(excelBuffer);

            console.log(`✅ Excel отчёт отправлен клиенту`);

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


