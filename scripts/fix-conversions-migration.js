const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/app');

async function fixConversionsMigration() {
    console.log('🔧 Исправление миграции конверсий...');

    try {
        await sequelize.authenticate();
        console.log('✅ Подключение к базе данных установлено');

        // Удаляем запись о неудачной миграции если есть
        await sequelize.query(
            "DELETE FROM analytics_migrations WHERE name = '004-create-ad-conversions'"
        );

        console.log('🗑️ Удалена запись о предыдущей попытке миграции');

        // Загружаем исправленную миграцию
        const migrationPath = path.join(__dirname, '../modules/AnalyticsCore/Migrations/004-create-ad-conversions.js');
        const migration = require(migrationPath);

        console.log('🔄 Выполняем исправленную миграцию...');

        // Выполняем миграцию
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

        // Сохраняем информацию о выполнении
        await sequelize.query(
            'INSERT INTO analytics_migrations (name, module) VALUES (?, ?)',
            { replacements: ['004-create-ad-conversions', 'AnalyticsCore'] }
        );

        console.log('✅ Миграция конверсий успешно выполнена!');

        // Проверяем созданные таблицы
        const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name LIKE 'analytics_%'
      ORDER BY table_name
    `);

        console.log('\n📊 Созданные таблицы аналитики:');
        console.log('===============================');
        tables.forEach(table => {
            console.log(`   ✅ ${table.table_name}`);
        });

        // Проверяем ENUM типы
        const [enums] = await sequelize.query(`
      SELECT t.typname as enum_name, 
             array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typname LIKE 'enum_analytics_%'
      GROUP BY t.typname
      ORDER BY t.typname
    `);

        console.log('\n🔤 Созданные ENUM типы:');
        console.log('======================');
        enums.forEach(enumType => {
            console.log(`   🔸 ${enumType.enum_name}: ${enumType.enum_values.join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);

        // Если таблица уже частично создана, попробуем удалить и создать заново
        if (error.message.includes('already exists')) {
            console.log('\n🔄 Пытаемся исправить путем удаления и повторного создания...');

            try {
                // Проверяем существование таблицы
                const [tableExists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'analytics_ad_conversions'
          )
        `);

                if (tableExists[0].exists) {
                    console.log('🗑️ Удаляем существующую таблицу...');

                    // Удаляем индексы сначала
                    const indicesToRemove = [
                        'idx_conversions_session_id',
                        'idx_conversions_campaign_id',
                        'idx_conversions_advertiser_id',
                        'idx_conversions_click_id',
                        'idx_conversions_conversion_type',
                        'idx_conversions_status',
                        'idx_conversions_created_at',
                        'idx_conversions_campaign_created',
                        'idx_conversions_type_status_created'
                    ];

                    for (const indexName of indicesToRemove) {
                        try {
                            await sequelize.query(`DROP INDEX IF EXISTS "${indexName}"`);
                        } catch (e) {
                            // Игнорируем ошибки если индекс не существует
                        }
                    }

                    // Удаляем таблицу
                    await sequelize.query('DROP TABLE IF EXISTS analytics_ad_conversions');
                    console.log('✅ Таблица удалена');

                    // Удаляем ENUM типы
                    await sequelize.query(`
            DROP TYPE IF EXISTS "enum_analytics_ad_conversions_conversion_type";
            DROP TYPE IF EXISTS "enum_analytics_ad_conversions_status";
          `);
                    console.log('✅ ENUM типы удалены');

                    // Запускаем миграцию снова
                    const migration = require(migrationPath);
                    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
                    console.log('✅ Таблица успешно пересоздана');
                }
            } catch (fixError) {
                console.error('❌ Не удалось исправить автоматически:', fixError.message);
            }
        }
    } finally {
        await sequelize.close();
    }
}

fixConversionsMigration().catch(console.error);