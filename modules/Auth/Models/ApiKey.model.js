module.exports = (sequelize, DataTypes) => {
    const ApiKey = sequelize.define('ApiKey', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        advertiser_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'advertisers', // Use lowercase table name
                key: 'id'
            }
        },
        key_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('ACTIVE', 'REVOKED'),
            defaultValue: 'ACTIVE'
        }
    }, {
        tableName: 'api_keys', // Explicitly set table name
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    ApiKey.associate = (models) => {
        ApiKey.belongsTo(models.Advertiser, {
            foreignKey: 'advertiser_id',
            as: 'advertiser'
        });
    };

    return ApiKey;
};

