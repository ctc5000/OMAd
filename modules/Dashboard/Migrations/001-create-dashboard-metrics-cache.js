'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создание таблицы для кэширования метрик
        await queryInterface.createTable('dashboard_metrics_cache', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            period: {
                type: Sequelize.ENUM('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'),
                allowNull: false
            },
            campaign_id: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            advertiser_id: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            metrics: {
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: {}
            },
            calculated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        // Индексы
        await queryInterface.addIndex('dashboard_metrics_cache', ['period', 'campaign_id', 'advertiser_id'], {
            name: 'idx_dashboard_cache_composite',
            unique: true
        });

        await queryInterface.addIndex('dashboard_metrics_cache', ['expires_at'], {
            name: 'idx_dashboard_cache_expires'
        });

        console.log('✅ Таблица dashboard_metrics_cache создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('dashboard_metrics_cache', 'idx_dashboard_cache_composite');
        await queryInterface.removeIndex('dashboard_metrics_cache', 'idx_dashboard_cache_expires');

        // Удаление таблицы
        await queryInterface.dropTable('dashboard_metrics_cache');

        // Удаление ENUM типа
        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_dashboard_metrics_cache_period";
    `);

        console.log('🗑️ Таблица dashboard_metrics_cache удалена');
    }
};