const puppeteer = require('puppeteer');
const { createLineChart, createBarChart } = require('./chartGenerator');
const DateUtils = require('../Utils/DateUtils');
const fs = require('fs');
const path = require('path');

class PuppeteerPdfReportBuilder {
    /**
     * Построить PDF отчёт с помощью Puppeteer
     * 
     * @param {object} reportData - Данные для отчёта
     * @param {string} [period='this_week'] - Период отчета
     * @returns {Promise<Buffer>} - PDF документ в виде Buffer
     */
    async build(reportData, period = 'this_week') {
        console.log('🚀 Начало генерации PDF отчёта через Puppeteer');
        console.log('📊 Период отчета:', period);

        // Получаем диапазон дат
        const { fromDate, toDate } = DateUtils.getDateRange(period);
        const periodDescription = DateUtils.getPeriodDescription(period);

        let browser = null;
        try {
            // Создаем графики с проверкой
            const clicksChart = await this._safeCreateChart(
                createLineChart,
                reportData.daily.map(d => d.date),
                [{ 
                    label: 'Клики', 
                    data: reportData.daily.map(d => d.clicks || 0) 
                }],
                { 
                    title: 'Динамика кликов', 
                    xAxisTitle: 'Дата', 
                    yAxisTitle: 'Количество кликов' 
                }
            );

            const conversionsChart = await this._safeCreateChart(
                createBarChart,
                reportData.daily.map(d => d.date),
                [{ 
                    label: 'Конверсии', 
                    data: reportData.daily.map(d => d.conversions || 0) 
                }],
                { 
                    title: 'Динамика конверсий', 
                    xAxisTitle: 'Дата', 
                    yAxisTitle: 'Количество конверсий' 
                }
            );

            // Генерируем HTML для PDF с учетом периода
            const htmlContent = this._generateReportHtml(
                reportData, 
                clicksChart, 
                conversionsChart, 
                fromDate, 
                toDate, 
                periodDescription
            );

            // Запускаем браузер с расширенными опциями
            browser = await puppeteer.launch({ 
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-gpu', 
                    '--disable-dev-shm-usage'
                ],
                timeout: 60000
            });
            const page = await browser.newPage();

            // Настройки страницы
            await page.setDefaultNavigationTimeout(60000);
            await page.setDefaultTimeout(60000);

            // Устанавливаем контент страницы с расширенным ожиданием
            await page.setContent(htmlContent, { 
                waitUntil: ['load', 'networkidle0'], 
                timeout: 60000 
            });

            // Ожидание загрузки всех ресурсов
            await page.evaluate(() => {
                return Promise.all(
                    Array.from(document.images).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise((resolve, reject) => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', reject);
                        });
                    })
                );
            });

            // Генерируем PDF с расширенными настройками
            const rawPdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: '50px',
                    bottom: '50px',
                    left: '50px',
                    right: '50px'
                },
                timeout: 60000,
                displayHeaderFooter: false,
                headerTemplate: '',
                footerTemplate: ''
            });

            // Нормализация PDF в Buffer
            const pdfBuffer = Buffer.from(rawPdf);

            // Проверка PDF буфера
            this._validatePdfBuffer(pdfBuffer);

            // Сохраняем PDF для отладки
            this._saveDebugPdf(pdfBuffer);

            console.log(`✅ PDF сгенерирован, размер: ${pdfBuffer.length} байт`);
            return pdfBuffer;

        } catch (error) {
            console.error('❌ Ошибка при создании PDF через Puppeteer:', error);
            console.error('Стек ошибки:', error.stack);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Безопасное создание графика с обработкой ошибок
     * 
     * @param {Function} chartCreator - Функция создания графика
     * @param  {...any} args - Аргументы для функции создания графика
     * @returns {Promise<Buffer|null>} - Буфер графика или null
     */
    async _safeCreateChart(chartCreator, ...args) {
        try {
            const chart = await chartCreator(...args);
            
            // Проверка буфера графика
            if (!chart || chart.length === 0) {
                console.warn('❗ Пустой буфер графика');
                return null;
            }

            return chart;
        } catch (error) {
            console.error('❌ Ошибка создания графика:', error);
            return null;
        }
    }

    /**
     * Проверка корректности PDF буфера
     * 
     * @param {Buffer} pdfBuffer - Буфер PDF документа
     * @throws {Error} Если буфер некорректен
     */
    _validatePdfBuffer(pdfBuffer) {
        if (!Buffer.isBuffer(pdfBuffer)) {
            throw new Error('PDF не Buffer');
        }

        if (pdfBuffer.length < 5) {
            throw new Error('PDF слишком короткий');
        }

        const signature = pdfBuffer.slice(0, 5).toString('ascii');

        console.log('🔍 PDF signature:', signature);

        if (signature !== '%PDF-') {
            throw new Error(`Некорректная сигнатура PDF: ${signature}`);
        }
    }

    /**
     * Сохранить PDF для отладки
     * 
     * @param {Buffer} pdfBuffer - Буфер PDF документа
     */
    _saveDebugPdf(pdfBuffer) {
        const debugPath = path.join(__dirname, 'debug_report.pdf');
        const debugInfoPath = path.join(__dirname, 'debug_report_info.txt');

        try {
            // Сохраняем PDF
            fs.writeFileSync(debugPath, pdfBuffer);
            console.log(`💾 PDF сохранен для отладки: ${debugPath}`);

            // Сохраняем диагностическую информацию
            const debugInfo = [
                `Размер PDF: ${pdfBuffer.length} байт`,
                `Первые 20 байт (HEX): ${pdfBuffer.slice(0, 20).toString('hex')}`,
                `Первые 20 байт (ASCII): ${pdfBuffer.slice(0, 20).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`
            ].join('\n');

            fs.writeFileSync(debugInfoPath, debugInfo);
            console.log(`📝 Диагностическая информация сохранена: ${debugInfoPath}`);

        } catch (error) {
            console.error('❌ Ошибка сохранения PDF:', error);
        }
    }

    /**
     * Генерирует HTML для отчета с упрощенным стилем
     * 
     * @param {object} reportData - Данные для отчёта
     * @param {Buffer} clicksChart - Изображение графика кликов
     * @param {Buffer} conversionsChart - Изображение графика конверсий
     * @param {string} fromDate - Начальная дата периода
     * @param {string} toDate - Конечная дата периода
     * @param {string} periodDescription - Описание периода
     * @returns {string} HTML-строка
     */
    _generateReportHtml(reportData, clicksChart, conversionsChart, fromDate, toDate, periodDescription) {
        const { summary, daily } = reportData;

        const clicksChartBase64 = clicksChart ? `data:image/png;base64,${clicksChart.toString('base64')}` : '';
        const conversionsChartBase64 = conversionsChart ? `data:image/png;base64,${conversionsChart.toString('base64')}` : '';

        return `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>Отчет по кампании</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1, h2 {
                    color: #2c3e50;
                }
                .chart {
                    max-width: 100%;
                    margin: 20px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
            </style>
        </head>
        <body>
            <h1>Отчет по рекламной кампании</h1>
            
            <h2>Информация о кампании</h2>
            <p><strong>Название:</strong> ${summary.campaign_name || 'Без названия'}</p>
            <p><strong>Период:</strong> ${fromDate} - ${toDate} (${periodDescription})</p>

            <h2>Основные метрики</h2>
            <table>
                <tr>
                    <th>Метрика</th>
                    <th>Значение</th>
                </tr>
                <tr>
                    <td>Уникальные посетители</td>
                    <td>${summary.uv || 0}</td>
                </tr>
                <tr>
                    <td>Показы</td>
                    <td>${summary.impressions || 0}</td>
                </tr>
                <tr>
                    <td>Клики</td>
                    <td>${summary.clicks || 0}</td>
                </tr>
                <tr>
                    <td>CTR</td>
                    <td>${summary.ctr || 0}%</td>
                </tr>
                <tr>
                    <td>Конверсии</td>
                    <td>${summary.conversions || 0}</td>
                </tr>
                <tr>
                    <td>CR</td>
                    <td>${summary.cr || 0}%</td>
                </tr>
                <tr>
                    <td>Выручка</td>
                    <td>${summary.revenue ? summary.revenue.toFixed(2) + ' ₽' : '0 ₽'}</td>
                </tr>
            </table>

            <h2>Графики производительности</h2>
            ${clicksChartBase64 ? `<img src="${clicksChartBase64}" alt="Динамика кликов" class="chart">` : '<p>График кликов недоступен</p>'}
            ${conversionsChartBase64 ? `<img src="${conversionsChartBase64}" alt="Динамика конверсий" class="chart">` : '<p>График конверсий недоступен</p>'}

            <h2>Ежедневная статистика</h2>
            <table>
                <tr>
                    <th>Дата</th>
                    <th>Показы</th>
                    <th>Клики</th>
                    <th>CTR</th>
                    <th>Конверсии</th>
                    <th>CR</th>
                </tr>
                ${daily.map(day => `
                    <tr>
                        <td>${day.date}</td>
                        <td>${day.impressions || 0}</td>
                        <td>${day.clicks || 0}</td>
                        <td>${day.ctr !== undefined ? day.ctr + '%' : '0%'}</td>
                        <td>${day.conversions || 0}</td>
                        <td>${day.cr !== undefined ? day.cr + '%' : '0%'}</td>
                    </tr>
                `).join('')}
            </table>
        </body>
        </html>
        `;
    }
}

module.exports = PuppeteerPdfReportBuilder;
