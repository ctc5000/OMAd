'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sessions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            session_id: {
                type: Sequelize.STRING,
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

        await queryInterface.addIndex('sessions', ['session_id']);
        await queryInterface.addIndex('sessions', ['restaurant_id']);
        await queryInterface.addIndex('sessions', ['restaurant_segment']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sessions');
    }
};