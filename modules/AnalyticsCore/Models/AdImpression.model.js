module.exports = (sequelize, DataTypes) => {
    const AdImpression = sequelize.define('AdImpression', {
        session_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        campaign_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        advertiser_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        banner_placement: {
            type: DataTypes.ENUM('checkout', 'waiter_call', 'tips_payment'),
            allowNull: false
        },
        banner_size: {
            type: DataTypes.STRING,
            allowNull: true
        },
        page_url: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'analytics_ad_impressions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                fields: ['session_id']
            },
            {
                fields: ['campaign_id']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['session_id', 'campaign_id']
            },
            {
                fields: ['campaign_id', 'created_at']
            }
        ]
    });

    AdImpression.associate = function(models) {
        // Проверяем, существует ли модель Session
        if (models.Session) {
            AdImpression.belongsTo(models.Session, {
                foreignKey: 'session_id',
                targetKey: 'session_id',
                as: 'session'
            });
        }

        // Проверяем, существует ли модель Campaign
        if (models.Campaign) {
            AdImpression.belongsTo(models.Campaign, {
                foreignKey: 'campaign_id',
                as: 'campaign'
            });
        }

        // Проверяем, существует ли модель AdClick
        if (models.AdClick) {
            AdImpression.hasMany(models.AdClick, {
                foreignKey: 'impression_id',
                as: 'clicks'
            });
        }
    };

    return AdImpression;
};