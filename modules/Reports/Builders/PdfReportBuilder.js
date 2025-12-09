const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

/**
 * Построитель PDF отчётов
 * Генерирует минимальный рабочий PDF с таблицей метрик и графиком
 */
class PdfReportBuilder {
    constructor() {
        this.PDFDocument = PDFDocument;
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });
    }

    /**
     * Построить PDF отчёт из данных
     * 
     * Входные данные:
     * {
     *   summary: { uv, reach, impressions, clicks, conversions, ctr, cr, cpc, cpl },
     *   daily: [{ date, impressions, clicks, conversions }, ...]
     * }
     */
    async build(reportData) {
        console.log('🔨 Построение PDF отчёта');

        try {
            // Валидация входных данных
            if (!reportData || !reportData.summary) {
                throw new Error('Invalid report data: missing summary');
            }

            const doc = new this.PDFDocument();
            const buffers = [];
            doc.on('data', chunk => buffers.push(chunk));

            // Добавить заголовок
            this.addTitle(doc, 'Отчет по кампании');

            // Добавить таблицу основных метрик
            this.addMetricsSummary(doc, reportData.summary);

            // Добавить график ежедневных показов
            if (reportData.daily && reportData.daily.length > 0) {
                await this.addDailyMetricsChart(doc, reportData.daily);
            }

            // Завершить документ
            doc.end();

            // Собрать буфер и вернуть
            const pdfBuffer = Buffer.concat(buffers);
            console.log(`✅ PDF отчёт успешно сгенерирован (размер: ${pdfBuffer.length} байт)`);
            return pdfBuffer;

        } catch (error) {
            console.error('❌ Ошибка при построении PDF:', error.message);
            throw error;
        }
    }

    /**
     * Добавить заголовок
     */
    addTitle(doc, title) {
        console.log('📄 Добавление заголовка');
        doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, { align: 'center' });
        doc.moveDown();
    }

    /**
     * Добавить таблицу основных метрик
     */
    addMetricsSummary(doc, summary) {
        console.log('📊 Добавление таблицы метрик');
        
        doc.fontSize(14).font('Helvetica-Bold').text('Основные метрики:', { underline: true });
        doc.moveDown(0.5);

        const metrics = [
            ['UV', summary.uv ? summary.uv.toLocaleString('ru-RU') : '—'],
            ['Reach', summary.reach ? summary.reach.toLocaleString('ru-RU') : '—'],
            ['Impressions', summary.impressions ? summary.impressions.toLocaleString('ru-RU') : '—'],
            ['Clicks', summary.clicks ? summary.clicks.toLocaleString('ru-RU') : '—'],
            ['Conversions', summary.conversions ? summary.conversions.toLocaleString('ru-RU') : '—'],
            ['CTR', summary.ctr !== undefined ? `${summary.ctr}%` : '—'],
            ['CR', summary.cr !== undefined ? `${summary.cr}%` : '—'],
            ['CPC', summary.cpc !== null ? `${summary.cpc.toFixed(2)} ₽` : '—'],
            ['CPL', summary.cpl !== null ? `${summary.cpl.toFixed(2)} ₽` : '—'],
        ];

        doc.fontSize(11).font('Helvetica');
        const startX = 50;
        const labelWidth = 100;
        const valueWidth = 100;
        let currentY = doc.y;

        // Заголовки таблицы
        doc.font('Helvetica-Bold');
        doc.text('Метрика', startX, currentY);
        doc.text('Значение', startX + labelWidth, currentY);
        currentY += 20;

        // Строки таблицы
        doc.font('Helvetica');
        for (const [label, value] of metrics) {
            doc.text(label, startX, currentY);
            doc.text(value, startX + labelWidth, currentY);
            currentY += 18;
        }

        doc.moveDown();
    }

    /**
     * Добавить график ежедневных показов
     */
    async addDailyMetricsChart(doc, dailyData) {
        console.log('📈 Добавление графика ежедневных метрик');

        try {
            // Подготовить данные для графика
            const labels = dailyData.map(d => d.date);
            const impressionsData = dailyData.map(d => d.impressions || 0);
            const clicksData = dailyData.map(d => d.clicks || 0);

            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Impressions',
                            data: impressionsData,
                            borderColor: '#36A2EB',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            borderWidth: 2,
                            tension: 0.3
                        },
                        {
                            label: 'Clicks',
                            data: clicksData,
                            borderColor: '#FF6384',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            borderWidth: 2,
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Ежедневные показы и клики'
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            };

            // Сгенерировать график
            const chartImage = await this.chartJSNodeCanvas.drawChart(chartConfig);

            // Добавить заголовок графика
            doc.fontSize(14).font('Helvetica-Bold').text('Динамика метрик по дням:', { underline: true });
            doc.moveDown(0.5);

            // Вставить график в PDF
            doc.image(chartImage, 50, doc.y, { width: 500, height: 250 });
            doc.moveDown(12);

        } catch (error) {
            console.warn('⚠️ Ошибка при генерации графика, продолжаем без графика:', error.message);
            // Продолжаем без графика
        }
    }
}

module.exports = PdfReportBuilder;

