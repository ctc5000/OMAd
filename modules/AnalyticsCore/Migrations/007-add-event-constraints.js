module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Добавляем проверки для сессии
        await queryInterface.addConstraint('analytics_sessions', {
            type: 'check',
            fields: ['restaurant_id'],
            name: 'restaurant_id_positive_check',
            where: {
                restaurant_id: {
                    [Sequelize.Op.gt]: 0
                }
            }
        });

        // Добавляем проверки для показов
        await queryInterface.addConstraint('analytics_ad_impressions', {
            type: 'check',
            fields: ['campaign_id', 'advertiser_id'],
            name: 'campaign_advertiser_positive_check',
            where: {
                campaign_id: {
                    [Sequelize.Op.gt]: 0
                },
                advertiser_id: {
                    [Sequelize.Op.gt]: 0
                }
            }
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeConstraint('analytics_sessions', 'restaurant_id_positive_check');
        await queryInterface.removeConstraint('analytics_ad_impressions', 'campaign_advertiser_positive_check');
    }
};