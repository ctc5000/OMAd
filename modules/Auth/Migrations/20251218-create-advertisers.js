module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('advertisers', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('ACTIVE', 'SUSPENDED', 'DELETED'),
                defaultValue: 'ACTIVE'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('advertisers');
    }
};

