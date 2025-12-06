module.exports = (sequelize, DataTypes) => {
    const Session = sequelize.define('Session', {
        session_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        restaurant_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        restaurant_segment: {
            type: DataTypes.ENUM('кофейня', 'средний', 'премиум'),
            allowNull: false
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        }
    }, {
        tableName: 'analytics_sessions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['session_id'],
                unique: true
            },
            {
                fields: ['restaurant_id']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    Session.associate = function(models) {
        // Проверяем, существует ли модель AdImpression
        if (models.AdImpression) {
            Session.hasMany(models.AdImpression, {
                foreignKey: 'session_id',
                sourceKey: 'session_id',
                as: 'impressions'
            });
        }

        // Проверяем, существует ли модель AdClick
        if (models.AdClick) {
            Session.hasMany(models.AdClick, {
                foreignKey: 'session_id',
                sourceKey: 'session_id',
                as: 'clicks'
            });
        }

        // Проверяем, существует ли модель AdConversion
        if (models.AdConversion) {
            Session.hasMany(models.AdConversion, {
                foreignKey: 'session_id',
                sourceKey: 'session_id',
                as: 'conversions'
            });
        }
    };

    return Session;
};