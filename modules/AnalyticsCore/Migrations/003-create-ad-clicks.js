'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создание таблицы ad_clicks
        await queryInterface.createTable('analytics_ad_clicks', {
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
            impression_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'analytics_ad_impressions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            click_position_x: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Координата X клика на баннере'
            },
            click_position_y: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Координата Y клика на баннере'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Индексы для таблицы ad_clicks
        await queryInterface.addIndex('analytics_ad_clicks', ['session_id'], {
            name: 'idx_clicks_session_id'
        });

        await queryInterface.addIndex('analytics_ad_clicks', ['campaign_id'], {
            name: 'idx_clicks_campaign_id'
        });

        await queryInterface.addIndex('analytics_ad_clicks', ['advertiser_id'], {
            name: 'idx_clicks_advertiser_id'
        });

        await queryInterface.addIndex('analytics_ad_clicks', ['impression_id'], {
            name: 'idx_clicks_impression_id'
        });

        await queryInterface.addIndex('analytics_ad_clicks', ['created_at'], {
            name: 'idx_clicks_created_at'
        });

        // Составной индекс для быстрого поиска кликов по кампании и времени
        await queryInterface.addIndex('analytics_ad_clicks', ['campaign_id', 'created_at'], {
            name: 'idx_clicks_campaign_created'
        });

        console.log('✅ Таблица analytics_ad_clicks создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_session_id');
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_campaign_id');
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_advertiser_id');
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_impression_id');
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_created_at');
        await queryInterface.removeIndex('analytics_ad_clicks', 'idx_clicks_campaign_created');

        // Удаление таблицы
        await queryInterface.dropTable('analytics_ad_clicks');

        console.log('🗑️ Таблица analytics_ad_clicks удалена');
    }
};