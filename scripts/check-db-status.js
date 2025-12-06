const { sequelize } = require('../src/app');

async function checkDatabaseStatus() {
    console.log('📊 Проверка статуса базы данных аналитики...');

    try {
        await sequelize.authenticate();
        console.log('✅ Подключение к базе данных: OK');

        // Проверяем таблицы
        const [tables] = await sequelize.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_name LIKE 'analytics_%'
      ORDER BY table_name
    `);

        console.log(`\n📁 Таблицы аналитики (${tables.length}):`);
        console.log('==================================');

        if (tables.length === 0) {
            console.log('❌ Таблицы аналитики не найдены');
        } else {
            for (const table of tables) {
                const [rowCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
                console.log(`✅ ${table.table_name}: ${rowCount[0].count} записей, ${table.column_count} колонок`);
            }
        }

        // Проверяем связи между таблицами
        console.log('\n🔗 Проверка связей между таблицами:');
        console.log('==================================');

        const foreignKeys = [
            { table: 'analytics_ad_impressions', column: 'session_id', references: 'analytics_sessions(session_id)' },
            { table: 'analytics_ad_clicks', column: 'session_id', references: 'analytics_sessions(session_id)' },
            { table: 'analytics_ad_clicks', column: 'impression_id', references: 'analytics_ad_impressions(id)' },
            { table: 'analytics_ad_conversions', column: 'session_id', references: 'analytics_sessions(session_id)' },
            { table: 'analytics_ad_conversions', column: 'click_id', references: 'analytics_ad_clicks(id)' }
        ];

        for (const fk of foreignKeys) {
            const [result] = await sequelize.query(`
        SELECT COUNT(*) as exists
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = '${fk.table}'
          AND kcu.column_name = '${fk.column}'
      `);

            if (result[0].exists > 0) {
                console.log(`✅ ${fk.table}.${fk.column} → ${fk.references}`);
            } else {
                console.log(`❌ ${fk.table}.${fk.column} → ${fk.references} (отсутствует)`);
            }
        }

        // Проверяем выполненные миграции
        const [migrations] = await sequelize.query(`
      SELECT name, module, executed_at 
      FROM analytics_migrations 
      ORDER BY executed_at
    `);

        console.log('\n🚀 Выполненные миграции:');
        console.log('=======================');

        if (migrations.length === 0) {
            console.log('❌ Миграции не выполнялись');
        } else {
            migrations.forEach(migration => {
                console.log(`✅ ${migration.name} (${migration.module}) - ${new Date(migration.executed_at).toLocaleString()}`);
            });
        }

        // Рекомендации
        console.log('\n💡 Рекомендации:');
        console.log('================');

        const expectedTables = [
            'analytics_sessions',
            'analytics_ad_impressions',
            'analytics_ad_clicks',
            'analytics_ad_conversions',
            'analytics_campaigns'
        ];

        const missingTables = expectedTables.filter(table =>
            !tables.some(t => t.table_name === table)
        );

        if (missingTables.length > 0) {
            console.log(`⚠️ Отсутствуют таблицы: ${missingTables.join(', ')}`);
            console.log('   Запустите: npm run migrate:fix');
        } else {
            console.log('✅ Все таблицы созданы успешно!');
            console.log('🎉 Система аналитики готова к работе!');
        }

    } catch (error) {
        console.error('❌ Ошибка проверки базы данных:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkDatabaseStatus().catch(console.error);