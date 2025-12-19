module.exports = (sequelize, DataTypes) => {
    const Advertiser = sequelize.define('Advertiser', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        status: {
            type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'DELETED'),
            defaultValue: 'ACTIVE'
        }
    }, {
        tableName: 'advertisers', // Explicitly set table name
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    Advertiser.associate = (models) => {
        Advertiser.hasMany(models.User, {
            foreignKey: 'advertiser_id',
            as: 'users'
        });
        Advertiser.hasMany(models.ApiKey, {
            foreignKey: 'advertiser_id',
            as: 'apiKeys'
        });
    };

    return Advertiser;
};
