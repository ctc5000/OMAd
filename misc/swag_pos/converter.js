const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const postmanToOpenApi = require('postman-to-openapi');

async function convert() {
    // 1. Загружаем Postman-коллекцию
    const collectionPath = path.join(__dirname, 'EMenuIiiko.postman_collection.json');
    let collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

    // 2. Функция для рекурсивного исправления URL
    const fixUrls = (items) => {
        items.forEach(item => {
            if (item.request?.url) {
                // Обработка строковых URL
                if (typeof item.request.url === 'string') {
                    if (!item.request.url.startsWith('http')) {
                        item.request.url = `http://${item.request.url}`;
                    }
                }
                // Обработка объекта URL (современный формат Postman)
                else if (item.request.url.raw && !item.request.url.raw.startsWith('http')) {
                    item.request.url.raw = `http://${item.request.url.raw}`;
                    if (item.request.url.host) {
                        item.request.url.host = item.request.url.host.map(part =>
                            part.includes('://') ? part : `http://${part}`
                        );
                    }
                }
            }
            // Рекурсия для вложенных элементов
            if (item.item) fixUrls(item.item);
        });
    };

    // 3. Исправляем URL в коллекции
    fixUrls(collection.item);

    // 4. Сохраняем временный исправленный файл
    const fixedPath = path.join(__dirname, 'fixed_collection.json');
    fs.writeFileSync(fixedPath, JSON.stringify(collection, null, 2));

    try {
        // 5. Конвертируем в OpenAPI
        await postmanToOpenApi(fixedPath, path.join(__dirname, 'emenu.yaml'), {
            defaultTag: 'General'
        });

        // 6. Дополнительная обработка для замены URL серверов
        const swaggerContent = fs.readFileSync(path.join(__dirname, 'emenu.yaml'), 'utf8');
        const swaggerData = yaml.load(swaggerContent);

        // Удаляем или модифицируем серверы
        swaggerData.servers = [{ url: '/' }];

        // Чистим пути в paths
        const cleanPaths = {};
        Object.entries(swaggerData.paths).forEach(([path, methods]) => {
            const cleanPath = path
                .replace(/https?:\/\/[^/]+/, '') // Удаляем http://host:port
                .replace(/^\/+/, '/'); // Удаляем лишние слеши в начале
            cleanPaths[cleanPath] = methods;
        });
        swaggerData.paths = cleanPaths;

        // Сохраняем финальный файл
        fs.writeFileSync(
            path.join(__dirname, 'emenu.yaml'),
            yaml.dump(swaggerData)
        );

        console.log('Конвертация успешно завершена!');
    } finally {
        // Удаляем временный файл
        if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath);
    }
}

convert().catch(err => console.error('Ошибка:', err));