const PDFDocument = require('pdfkit');
const { createLineChart, createBarChart } = require('./chartGenerator');
const fs = require('fs');
const path = require('path');

class PdfReportBuilder {
    /**
     * Построить PDF отчёт
     * 
     * @param {object} reportData - Данные для отчёта
     * @returns {Promise<Buffer>} - PDF документ в виде Buffer
     */
    async build(reportData) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🚀 Начало генерации PDF отчёта');
                console.log('📊 Входные данные:', JSON.stringify(reportData, null, 2));

                const doc = new PDFDocument({ 
                    size: 'A4', 
                    margins: { 
                        top: 50, 
                        bottom: 50, 
                        left: 50, 
                        right: 50 
                    },
                    bufferPages: true,  // Важно для корректной работы с буфером
                    font: 'Helvetica'   // Используем стандартный шрифт
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    console.log(`✅ PDF сгенерирован, размер: ${pdfBuffer.length} байт`);
                    resolve(pdfBuffer);
                });

                // Установка кириллического шрифта
                const fontPath = path.join(__dirname, '..', '..', '..', 'fonts', 'DejaVuSans.ttf');
                if (fs.existsSync(fontPath)) {
                    doc.registerFont('custom', fontPath);
                    doc.font('custom');
                }

                // Титульная страница
                this._createTitlePage(doc, reportData);

                // Страница с основными метриками
                this._createSummaryPage(doc, reportData);

                // Страница с графиками
                this._createChartsPage(doc, reportData);

                doc.end();
            } catch (error) {
                console.error('❌ Ошибка при создании PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Создать титульную страницу
     * 
     * @param {PDFDocument} doc - Документ PDFKit
     * @param {object} reportData - Данные для отчёта
     */
    _createTitlePage(doc, reportData) {
        const { summary } = reportData;

        doc.fontSize(24)
           .text('Отчёт по рекламной кампании', { align: 'center' })
           .moveDown();

        doc.fontSize(16)
           .text(`Кампания: ${summary.campaign_name || 'Без названия'}`, { align: 'center' })
           .moveDown();

        doc.fontSize(12)
           .text(`Период: ${summary.from_date || ''} - ${summary.to_date || ''}`, { align: 'center' })
           .moveDown(2);

        doc.fontSize(10)
           .text('Order Master Analytics', { align: 'center', color: 'gray' });
    }

    /**
     * Создать страницу с основными метриками
     * 
     * @param {PDFDocument} doc - Документ PDFKit
     * @param {object} reportData - Данные для отчёта
     */
    _createSummaryPage(doc, reportData) {
        const { summary } = reportData;

        doc.addPage()
           .fontSize(16)
           .text('Основные метрики', { underline: true });

        doc.fontSize(12)
           .moveDown()
           .text(`Уникальные посетители: ${summary.uv || 0}`)
           .text(`Показы: ${summary.impressions || 0}`)
           .text(`Клики: ${summary.clicks || 0}`)
           .text(`CTR: ${summary.ctr || 0}%`)
           .text(`Конверсии: ${summary.conversions || 0}`)
           .text(`CR: ${summary.cr || 0}%`)
           .text(`Выручка: ${summary.revenue ? summary.revenue.toFixed(2) + ' ₽' : '0 ₽'}`);
    }

    /**
     * Создать страницу с графиками
     * 
     * @param {PDFDocument} doc - Документ PDFKit
     * @param {object} reportData - Данные для отчёта
     */
    async _createChartsPage(doc, reportData) {
        const { daily } = reportData;

        console.log('📈 Создание страницы с графиками');
        console.log('📊 Данные для графиков:', JSON.stringify(daily, null, 2));

        doc.addPage()
           .fontSize(16)
           .text('Графики производительности', { underline: true });

        // Линейный график кликов
        const clicksChart = await createLineChart(
            daily.map(d => d.date),
            [{ 
                label: 'Клики', 
                data: daily.map(d => d.clicks || 0) 
            }],
            { 
                title: 'Динамика кликов', 
                xAxisTitle: 'Дата', 
                yAxisTitle: 'Количество кликов' 
            }
        );

        // Столбчатый график конверсий
        const conversionsChart = await createBarChart(
            daily.map(d => d.date),
            [{ 
                label: 'Конверсии', 
                data: daily.map(d => d.conversions || 0) 
            }],
            { 
                title: 'Динамика конверсий', 
                xAxisTitle: 'Дата', 
                yAxisTitle: 'Количество конверсий' 
            }
        );

        // Добавить графики в PDF
        if (clicksChart) {
            console.log(`✅ Линейный график кликов: ${clicksChart.length} байт`);
            doc.image(clicksChart, { 
                fit: [500, 250], 
                align: 'center', 
                valign: 'center' 
            });
        } else {
            console.warn('❗ Не удалось создать линейный график кликов');
            doc.text('Не удалось создать график кликов', { align: 'center' });
        }

        doc.moveDown();

        if (conversionsChart) {
            console.log(`✅ Столбчатый график конверсий: ${conversionsChart.length} байт`);
            doc.image(conversionsChart, { 
                fit: [500, 250], 
                align: 'center', 
                valign: 'center' 
            });
        } else {
            console.warn('❗ Не удалось создать столбчатый график конверсий');
            doc.text('Не удалось создать график конверсий', { align: 'center' });
        }
    }
}

module.exports = PdfReportBuilder;

