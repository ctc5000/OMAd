'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Сначала создаем ENUM типы
        await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_analytics_ad_conversions_conversion_type') THEN
          CREATE TYPE "enum_analytics_ad_conversions_conversion_type" AS ENUM (
            'bank_card_request', 
            'loan_application', 
            'other_product', 
            'other'
          );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_analytics_ad_conversions_status') THEN
          CREATE TYPE "enum_analytics_ad_conversions_status" AS ENUM (
            'pending', 
            'confirmed', 
            'rejected'
          );
        END IF;
      END $$;
    `);

        // Создание таблицы ad_conversions
        await queryInterface.createTable('analytics_ad_conversions', {
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
            click_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'analytics_ad_clicks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            conversion_type: {
                type: Sequelize.ENUM('bank_card_request', 'loan_application', 'other_product', 'other'),
                defaultValue: 'bank_card_request',
                allowNull: false
            },
            conversion_value: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Стоимость конверсии в рублях'
            },
            conversion_data: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Дополнительные данные конверсии'
            },
            status: {
                type: Sequelize.ENUM('pending', 'confirmed', 'rejected'),
                defaultValue: 'pending',
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            },
            confirmed_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Индексы для таблицы ad_conversions
        await queryInterface.addIndex('analytics_ad_conversions', ['session_id'], {
            name: 'idx_conversions_session_id'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['campaign_id'], {
            name: 'idx_conversions_campaign_id'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['advertiser_id'], {
            name: 'idx_conversions_advertiser_id'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['click_id'], {
            name: 'idx_conversions_click_id'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['conversion_type'], {
            name: 'idx_conversions_conversion_type'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['status'], {
            name: 'idx_conversions_status'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['created_at'], {
            name: 'idx_conversions_created_at'
        });

        // Составные индексы для аналитики
        await queryInterface.addIndex('analytics_ad_conversions', ['campaign_id', 'created_at'], {
            name: 'idx_conversions_campaign_created'
        });

        await queryInterface.addIndex('analytics_ad_conversions', ['conversion_type', 'status', 'created_at'], {
            name: 'idx_conversions_type_status_created'
        });

        console.log('✅ Таблица analytics_ad_conversions создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_session_id');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_campaign_id');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_advertiser_id');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_click_id');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_conversion_type');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_status');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_created_at');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_campaign_created');
        await queryInterface.removeIndex('analytics_ad_conversions', 'idx_conversions_type_status_created');

        // Удаление таблицы
        await queryInterface.dropTable('analytics_ad_conversions');

        // Удаление ENUM типов
        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_analytics_ad_conversions_conversion_type";
      DROP TYPE IF EXISTS "enum_analytics_ad_conversions_status";
    `);

        console.log('🗑️ Таблица analytics_ad_conversions удалена');
    }
};