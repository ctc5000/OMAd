'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Добавляем поля стоимости в таблицу campaigns
        await queryInterface.addColumn('analytics_campaigns', 'cost_per_uv', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Стоимость за одного уникального посетителя'
        });

        await queryInterface.addColumn('analytics_campaigns', 'cost_per_click', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Стоимость за один клик'
        });

        await queryInterface.addColumn('analytics_campaigns', 'cost_per_lead', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Стоимость за одну конверсию (lead)'
        });

        console.log('✅ Поля стоимости добавлены в таблицу analytics_campaigns');
    },

    async down(queryInterface, Sequelize) {
        // Удаляем добавленные поля при откате миграции
        await queryInterface.removeColumn('analytics_campaigns', 'cost_per_uv');
        await queryInterface.removeColumn('analytics_campaigns', 'cost_per_click');
        await queryInterface.removeColumn('analytics_campaigns', 'cost_per_lead');

        console.log('🗑️ Поля стоимости удалены из таблицы analytics_campaigns');
    }
};

