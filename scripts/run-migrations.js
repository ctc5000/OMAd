const fs = require('fs');
const path = require('path');

async function runMigrations() {
    console.log('🚀 Запуск миграций модулей...');

    // Загружаем sequelize из app.js
    const { sequelize } = require('../src/app');

    // Проверяем подключение
    try {
        await sequelize.authenticate();
        console.log('✅ Подключение к базе данных установлено');
    } catch (error) {
        console.error('❌ Не удалось подключиться к базе данных:', error.message);
        process.exit(1);
    }

    const modulesPath = path.join(__dirname, '../modules');
    let executedMigrations = 0;

    // Проверяем существование директории modules
    if (!fs.existsSync(modulesPath)) {
        console.error(`❌ Директория modules не найдена: ${modulesPath}`);
        process.exit(1);
    }

    // Создаем таблицу для отслеживания выполненных миграций
    try {
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS analytics_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        module VARCHAR(100) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Таблица для отслеживания миграций создана/проверена');
    } catch (error) {
        console.error('❌ Ошибка создания таблицы миграций:', error.message);
    }

    // Получаем список всех модулей
    const modules = fs.readdirSync(modulesPath)
        .filter(item => {
            const itemPath = path.join(modulesPath, item);
            return fs.statSync(itemPath).isDirectory();
        });

    console.log(`🔍 Найдено модулей: ${modules.length}`);

    // Проходим по всем модулям
    for (const moduleDir of modules) {
        console.log(`\n📦 Обработка модуля: ${moduleDir}`);

        const modulePath = path.join(modulesPath, moduleDir);
        const migrationsPath = path.join(modulePath, 'Migrations');

        if (fs.existsSync(migrationsPath) && fs.statSync(migrationsPath).isDirectory()) {
            console.log(`🔍 Проверка миграций в модуле: ${moduleDir}`);

            const migrationFiles = fs.readdirSync(migrationsPath)
                .filter(file => file.endsWith('.js'))
                .sort();

            console.log(`📄 Найдено ${migrationFiles.length} файлов миграций`);

            for (const fileName of migrationFiles) {
                const migrationName = path.parse(fileName).name;

                // Проверяем, выполнена ли уже эта миграция
                const [existing] = await sequelize.query(
                    'SELECT id FROM analytics_migrations WHERE name = ? AND module = ?',
                    { replacements: [migrationName, moduleDir] }
                );

                if (existing.length > 0) {
                    console.log(`⏭️ Миграция ${migrationName} уже выполнена, пропускаем`);
                    continue;
                }

                try {
                    console.log(`🔄 Выполнение миграции: ${fileName}`);
                    const migrationPath = path.join(migrationsPath, fileName);

                    // Очищаем кэш require для этого файла
                    delete require.cache[require.resolve(migrationPath)];
                    const migration = require(migrationPath);

                    // Выполняем миграцию
                    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

                    // Сохраняем информацию о выполнении
                    await sequelize.query(
                        'INSERT INTO analytics_migrations (name, module) VALUES (?, ?)',
                        { replacements: [migrationName, moduleDir] }
                    );

                    executedMigrations++;
                    console.log(`✅ Миграция ${migrationName} выполнена успешно`);
                } catch (error) {
                    console.error(`❌ Ошибка выполнения миграции ${fileName}:`, error.message);
                    console.error(`Подробности:`, error);
                    // Можно решить продолжить или остановиться
                    // break; // Раскомментируйте для остановки при ошибке
                }
            }
        } else {
            console.log(`⚠️ Папка миграций не найдена: ${migrationsPath}`);
        }
    }

    console.log(`\n📊 Итого: выполнено ${executedMigrations} миграций`);

    if (executedMigrations > 0) {
        console.log('🎉 Миграции успешно выполнены!');
    } else {
        console.log('ℹ️ Нет новых миграций для выполнения');
    }

    await sequelize.close();
    process.exit(0);
}

runMigrations().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});