'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создаем таблицу для показов
        await queryInterface.createTable('ad_impressions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: false
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
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Таблица для кликов
        await queryInterface.createTable('ad_clicks', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: false
            },
            campaign_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            advertiser_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Таблица для конверсий
        await queryInterface.createTable('ad_conversions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: false
            },
            campaign_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            advertiser_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            conversion_type: {
                type: Sequelize.ENUM('bank_card_request'),
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            }
        });

        // Индексы для производительности
        await queryInterface.addIndex('ad_impressions', ['session_id']);
        await queryInterface.addIndex('ad_impressions', ['campaign_id']);
        await queryInterface.addIndex('ad_impressions', ['advertiser_id']);
        await queryInterface.addIndex('ad_impressions', ['created_at']);

        await queryInterface.addIndex('ad_clicks', ['session_id']);
        await queryInterface.addIndex('ad_clicks', ['campaign_id']);
        await queryInterface.addIndex('ad_clicks', ['created_at']);

        await queryInterface.addIndex('ad_conversions', ['session_id']);
        await queryInterface.addIndex('ad_conversions', ['campaign_id']);
        await queryInterface.addIndex('ad_conversions', ['conversion_type']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('ad_conversions');
        await queryInterface.dropTable('ad_clicks');
        await queryInterface.dropTable('ad_impressions');
    }
};