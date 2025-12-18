module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('api_keys', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            advertiser_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'advertisers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            key_hash: {
                type: Sequelize.STRING,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('ACTIVE', 'REVOKED'),
                defaultValue: 'ACTIVE'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('api_keys');
    }
};
