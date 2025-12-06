'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Создание таблицы sessions
        await queryInterface.createTable('analytics_sessions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            session_id: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            restaurant_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            restaurant_segment: {
                type: Sequelize.ENUM('кофейня', 'средний', 'премиум'),
                allowNull: false
            },
            user_agent: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            ip_address: {
                type: Sequelize.STRING(45),
                allowNull: true
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

        // Индексы для таблицы sessions
        await queryInterface.addIndex('analytics_sessions', ['session_id'], {
            name: 'idx_sessions_session_id',
            unique: true
        });

        await queryInterface.addIndex('analytics_sessions', ['restaurant_id'], {
            name: 'idx_sessions_restaurant_id'
        });

        await queryInterface.addIndex('analytics_sessions', ['restaurant_segment'], {
            name: 'idx_sessions_restaurant_segment'
        });

        await queryInterface.addIndex('analytics_sessions', ['created_at'], {
            name: 'idx_sessions_created_at'
        });

        console.log('✅ Таблица analytics_sessions создана');
    },

    async down(queryInterface, Sequelize) {
        // Удаление индексов
        await queryInterface.removeIndex('analytics_sessions', 'idx_sessions_session_id');
        await queryInterface.removeIndex('analytics_sessions', 'idx_sessions_restaurant_id');
        await queryInterface.removeIndex('analytics_sessions', 'idx_sessions_restaurant_segment');
        await queryInterface.removeIndex('analytics_sessions', 'idx_sessions_created_at');

        // Удаление таблицы
        await queryInterface.dropTable('analytics_sessions');

        console.log('🗑️ Таблица analytics_sessions удалена');
    }
};