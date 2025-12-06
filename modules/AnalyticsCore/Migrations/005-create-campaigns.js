'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создание таблицы campaigns
        await queryInterface.createTable('analytics_campaigns', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            advertiser_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            budget: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true,
                comment: 'Бюджет кампании в рублях'
            },
            cpu_v_target: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Целевой CPUV'
            },
            cpc_target: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Целевой CPC'
            },
            cpl_target: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Целевой CPL'
            },
            status: {
                type: Sequelize.ENUM('draft', 'active', 'paused', 'completed', 'archived'),
                defaultValue: 'draft',
                allowNull: false
            },
            start_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            end_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            targeting: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Настройки таргетинга (сегменты ресторанов и т.д.)'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Индексы для таблицы campaigns
        await queryInterface.addIndex('analytics_campaigns', ['advertiser_id'], {
            name: 'idx_campaigns_advertiser_id'
        });

        await queryInterface.addIndex('analytics_campaigns', ['status'], {
            name: 'idx_campaigns_status'
        });

        await queryInterface.addIndex('analytics_campaigns', ['start_date', 'end_date'], {
            name: 'idx_campaigns_dates'
        });

        await queryInterface.addIndex('analytics_campaigns', ['created_at'], {
            name: 'idx_campaigns_created_at'
        });

        console.log('✅ Таблица analytics_campaigns создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('analytics_campaigns', 'idx_campaigns_advertiser_id');
        await queryInterface.removeIndex('analytics_campaigns', 'idx_campaigns_status');
        await queryInterface.removeIndex('analytics_campaigns', 'idx_campaigns_dates');
        await queryInterface.removeIndex('analytics_campaigns', 'idx_campaigns_created_at');

        // Удаление таблицы
        await queryInterface.dropTable('analytics_campaigns');

        console.log('🗑️ Таблица analytics_campaigns удалена');
    }
};