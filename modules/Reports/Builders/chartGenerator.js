/**
 * Генератор графиков для отчётов
 * Использует chartjs-node-canvas для создания графиков
 */
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Цветовые палитры
const COLOR_PALETTES = {
    primary: [
        '#667eea', '#764ba2', '#4facfe', '#00f2fe', 
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9d56e'
    ],
    pastel: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#8AC926', '#00BBF9'
    ]
};

/**
 * Создать график с расширенной конфигурацией
 * 
 * @param {string} type - тип графика ('line', 'bar', 'pie', etc.)
 * @param {object} data - данные для графика
 * @param {object} [options={}] - дополнительные опции графика
 * @returns {Promise<Buffer|null>} - буфер с изображением графика
 */
async function createChart(type, data, options = {}) {
    try {
        console.log('🔧 Создание графика:', { type, data, options });

        const width = options.width || 800;
        const height = options.height || 400;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({
            width, 
            height, 
            backgroundColour: options.backgroundColor || 'white'
        });

        // Базовая конфигурация с возможностью переопределения
        const defaultConfig = {
            type: type,
            data: data,
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'top'
                    }
                },
                scales: type !== 'pie' ? {
                    x: {
                        title: {
                            display: !!options.xAxisTitle,
                            text: options.xAxisTitle || ''
                        }
                    },
                    y: {
                        title: {
                            display: !!options.yAxisTitle,
                            text: options.yAxisTitle || ''
                        }
                    }
                } : {}
            }
        };

        // Слияние дефолтной и пользовательской конфигурации
        const configuration = JSON.parse(JSON.stringify(defaultConfig));
        Object.assign(configuration.options, options.chartOptions || {});

        console.log('📊 Финальная конфигурация графика:', JSON.stringify(configuration, null, 2));

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        
        if (!imageBuffer || imageBuffer.length === 0) {
            console.error('❌ Пустой буфер изображения');
            return null;
        }

        console.log(`✅ График создан, размер буфера: ${imageBuffer.length} байт`);
        return imageBuffer;
    } catch (error) {
        console.error('❌ Ошибка при создании графика:', error);
        return null;
    }
}

/**
 * Создать линейный график с расширенной конфигурацией
 * 
 * @param {string[]} labels - метки по оси X
 * @param {object[]} datasets - наборы данных
 * @param {object} [options={}] - дополнительные опции
 */
function createLineChart(labels, datasets, options = {}) {
    console.log('📈 Создание линейного графика');
    
    // Применить цвета, если не указаны
    const processedDatasets = datasets.map((dataset, index) => ({
        ...dataset,
        borderColor: dataset.borderColor || COLOR_PALETTES.primary[index % COLOR_PALETTES.primary.length],
        backgroundColor: dataset.backgroundColor || COLOR_PALETTES.primary[index % COLOR_PALETTES.primary.length] + '33', // полупрозрачный
        tension: 0.4, // мягкие линии
        fill: true
    }));

    return createChart('line', 
        { labels, datasets: processedDatasets }, 
        {
            title: options.title || 'Линейный график',
            xAxisTitle: options.xAxisTitle || 'Период',
            yAxisTitle: options.yAxisTitle || 'Значение',
            ...options
        }
    );
}

/**
 * Создать столбчатый график с расширенной конфигурацией
 * 
 * @param {string[]} labels - метки по оси X
 * @param {object[]} datasets - наборы данных
 * @param {object} [options={}] - дополнительные опции
 */
function createBarChart(labels, datasets, options = {}) {
    console.log('📊 Создание столбчатого графика');
    
    // Применить цвета, если не указаны
    const processedDatasets = datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || COLOR_PALETTES.pastel[index % COLOR_PALETTES.pastel.length],
    }));

    return createChart('bar', 
        { labels, datasets: processedDatasets }, 
        {
            title: options.title || 'Столбчатый график',
            xAxisTitle: options.xAxisTitle || 'Период',
            yAxisTitle: options.yAxisTitle || 'Значение',
            ...options
        }
    );
}

/**
 * Создать круговую диаграмму с расширенной конфигурацией
 * 
 * @param {string[]} labels - метки секторов
 * @param {number[]} data - значения секторов
 * @param {object} [options={}] - дополнительные опции
 */
function createPieChart(labels, data, options = {}) {
    console.log('🥧 Создание круговой диаграммы');
    
    const dataset = {
        data: data,
        backgroundColor: COLOR_PALETTES.pastel.slice(0, labels.length)
    };

    return createChart('pie', 
        { labels, datasets: [dataset] }, 
        {
            title: options.title || 'Круговая диаграмма',
            showLegend: options.showLegend !== false,
            ...options
        }
    );
}

module.exports = {
    createChart,
    createLineChart,
    createBarChart,
    createPieChart,
    COLOR_PALETTES
};

