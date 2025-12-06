'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создание таблицы ad_impressions
        await queryInterface.createTable('analytics_ad_impressions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            session_id: {
                type: Sequelize.STRING(255),
                allowNull: false,
                references: {
                    model: 'analytics_sessions',
                    key: 'session_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            campaign_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            advertiser_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            banner_placement: {
                type: Sequelize.ENUM('checkout', 'waiter_call', 'tips_payment'),
                allowNull: false
            },
            banner_size: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            page_url: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Индексы для таблицы ad_impressions
        await queryInterface.addIndex('analytics_ad_impressions', ['session_id'], {
            name: 'idx_impressions_session_id'
        });

        await queryInterface.addIndex('analytics_ad_impressions', ['campaign_id'], {
            name: 'idx_impressions_campaign_id'
        });

        await queryInterface.addIndex('analytics_ad_impressions', ['advertiser_id'], {
            name: 'idx_impressions_advertiser_id'
        });

        await queryInterface.addIndex('analytics_ad_impressions', ['banner_placement'], {
            name: 'idx_impressions_banner_placement'
        });

        await queryInterface.addIndex('analytics_ad_impressions', ['created_at'], {
            name: 'idx_impressions_created_at'
        });

        console.log('✅ Таблица analytics_ad_impressions создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('analytics_ad_impressions', 'idx_impressions_session_id');
        await queryInterface.removeIndex('analytics_ad_impressions', 'idx_impressions_campaign_id');
        await queryInterface.removeIndex('analytics_ad_impressions', 'idx_impressions_advertiser_id');
        await queryInterface.removeIndex('analytics_ad_impressions', 'idx_impressions_banner_placement');
        await queryInterface.removeIndex('analytics_ad_impressions', 'idx_impressions_created_at');

        // Удаление таблицы
        await queryInterface.dropTable('analytics_ad_impressions');

        console.log('🗑️ Таблица analytics_ad_impressions удалена');
    }
};