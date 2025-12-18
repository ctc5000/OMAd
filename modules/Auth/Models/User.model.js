module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('ADMIN', 'AD_MANAGER', 'ADVERTISER'),
            allowNull: false
        },
        advertiser_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'advertisers', // Use lowercase table name
                key: 'id'
            }
        }
    }, {
        tableName: 'users', // Explicitly set table name
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    User.associate = (models) => {
        User.belongsTo(models.Advertiser, {
            foreignKey: 'advertiser_id',
            as: 'advertiser'
        });
    };

    return User;
};