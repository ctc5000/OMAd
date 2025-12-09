const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Настройка Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME || 'order_master_analytics',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Хранилище для всех моделей
global.sequelizeModels = {};

// Функция для загрузки моделей из модулей
async function loadModelsFromModules() {
    const modulesPath = path.join(__dirname, '../modules');
    const allModels = {};

    console.log('🔍 Поиск моделей в модулях...');

    for (const moduleDir of fs.readdirSync(modulesPath)) {
        const modulePath = path.join(modulesPath, moduleDir);
        const modelsIndexPath = path.join(modulePath, 'Models', 'index.js');

        if (fs.existsSync(modelsIndexPath)) {
            console.log(`📁 Загрузка моделей из модуля: ${moduleDir}`);
            try {
                const initModels = require(modelsIndexPath);
                const moduleModels = initModels(sequelize);
                Object.assign(allModels, moduleModels);
            } catch (error) {
                console.error(`❌ Ошибка загрузки моделей из ${moduleDir}:`, error.message);
            }
        }
    }

    global.sequelizeModels = allModels;
    console.log(`📊 Всего загружено моделей: ${Object.keys(allModels).length}`);
    return allModels;
}

// Функция для загрузки модулей
async function loadModules() {
    const modulesPath = path.join(__dirname, '../modules');
    const loadedModules = {};

    console.log('🚀 Загрузка модулей...');

    for (const moduleDir of fs.readdirSync(modulesPath)) {
        const modulePath = path.join(modulesPath, moduleDir);

        if (fs.statSync(modulePath).isDirectory()) {
            try {
                // Загрузка описания модуля
                const descriptionPath = path.join(modulePath, 'description.json');
                let moduleName = moduleDir;
                let apiPrefix = `/api/${moduleDir.toLowerCase()}`;

                if (fs.existsSync(descriptionPath)) {
                    const description = require(descriptionPath);
                    moduleName = description.moduleName || moduleDir;
                    apiPrefix = description.apiPrefix || apiPrefix;
                }

                // Загрузка контроллера
                const controllerPath = path.join(modulePath, 'Controllers', `${moduleName}Controller.js`);
                if (fs.existsSync(controllerPath)) {
                    const ControllerClass = require(controllerPath);
                    const controllerInstance = new ControllerClass(global.sequelizeModels, sequelize);

                    // Загрузка роутов
                    const routePath = path.join(modulePath, `${moduleName}.route.js`);
                    if (fs.existsSync(routePath)) {
                        const route = require(routePath);

                        // Функция для обработки async ошибок
                        const makeHandlerAwareOfAsyncErrors = (handler) => {
                            return async function(req, res, next) {
                                try {
                                    await handler(req, res);
                                } catch (error) {
                                    console.error(`❌ Ошибка в модуле ${moduleName}:`, error);
                                    res.status(500).json({
                                        success: false,
                                        error: 'Внутренняя ошибка сервера'
                                    });
                                }
                            };
                        };

                        route(app, moduleName, controllerInstance, makeHandlerAwareOfAsyncErrors, global.sequelizeModels);
                        loadedModules[moduleName] = controllerInstance;

                        console.log(`✅ Модуль "${moduleName}" загружен (префикс: ${apiPrefix})`);
                    }
                }
            } catch (error) {
                console.error(`❌ Ошибка загрузки модуля ${moduleDir}:`, error);
            }
        }
    }

    return loadedModules;
}

// Функция для миграций модулей
async function checkModuleMigrations() {
    const modulesPath = path.join(__dirname, '../modules');
    const { Umzug, SequelizeStorage } = require('umzug');

    for (const moduleDir of fs.readdirSync(modulesPath)) {
        const modulePath = path.join(modulesPath, moduleDir);
        const migrationsPath = path.join(modulePath, 'Migrations');

        if (fs.existsSync(migrationsPath) && fs.statSync(migrationsPath).isDirectory()) {
            try {
                const umzug = new Umzug({
                    migrations: {
                        glob: ['*.js'],
                        cwd: migrationsPath,
                        resolve: ({ name, path: migrationPath }) => {
                            const migration = require(migrationPath);
                            return {
                                name,
                                up: async () => migration.up(sequelize.getQueryInterface(), Sequelize),
                                down: async () => migration.down(sequelize.getQueryInterface(), Sequelize)
                            };
                        }
                    },
                    storage: new SequelizeStorage({ sequelize }),
                    logger: console
                });

                /* const pending = await umzug.pending();

                 if (pending.length > 0) {
                     console.log(`🟡 Модуль "${moduleDir}" имеет ${pending.length} невыполненных миграций`);
                     await umzug.up();
                     console.log(`✅ Миграции модуля "${moduleDir}" выполнены`);
                 } else {
                     console.log(`🟢 Все миграции модуля "${moduleDir}" уже выполнены`);
                 }*/
            } catch (error) {
                console.error(`🔴 Ошибка миграций для модуля "${moduleDir}":`, error);
            }
        }
    }
}

// Главная функция запуска
async function startServer() {
    try {
        // Проверка подключения к БД
        await sequelize.authenticate();
        console.log('✅ Подключение к базе данных установлено');

        // Загрузка моделей (сначала все модели)
        await loadModelsFromModules();

        // Выполнение миграций
        await checkModuleMigrations();

        // Синхронизация моделей (только для разработки)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('🔄 База данных синхронизирована');
        }

        // Загрузка модулей
        const modules = await loadModules();
        global.modules = modules;

        // Статические файлы
        app.use(express.static(path.join(__dirname, 'public')));

        // Главная страница
        app.get('/', (req, res) => {
            res.json({
                message: 'Order Master Analytics API',
                version: '1.0.0',
                modules: Object.keys(modules),
                docs: '/api-docs'
            });
        });

        // Проверка здоровья
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: 'connected',
                modules: Object.keys(modules).length
            });
        });

        // Обработка 404
        app.use((req, res) => {
            console.warn(`⚠️ 404: ${req.method} ${req.path}`);
            res.status(404).json({
                success: false,
                error: 'Маршрут не найден',
                path: req.path,
                method: req.method,
                availableModules: Object.keys(modules)
            });
        });

        // Обработка ошибок
        app.use((err, req, res, next) => {
            console.error('❌ Ошибка сервера:', err);
            res.status(500).json({
                success: false,
                error: 'Внутренняя ошибка сервера'
            });
        });

        // Запуск сервера
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`
      ===========================================
      📈 Order Master Analytics System
      ===========================================
      ✅ Сервер запущен: http://localhost:${PORT}
      ✅ Дешборд запущен: http://localhost:${PORT}/api/dashboard/web
      
      📊 API готов к работе
      🔗 Модули: ${Object.keys(modules).join(', ')}
      ===========================================
      `);
        });

    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Экспортируем для тестов
module.exports = {
    app,
    sequelize,
    startServer
};

// Запуск сервера, если файл запущен напрямую
if (require.main === module) {
    startServer();
}