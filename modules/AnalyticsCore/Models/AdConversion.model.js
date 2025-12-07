module.exports = (sequelize, DataTypes) => {
    const AdConversion = sequelize.define('AdConversion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
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
        click_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        conversion_type: {
            type: DataTypes.ENUM('bank_card_request', 'loan_application', 'other_product', 'other'),
            defaultValue: 'bank_card_request'
        },
        conversion_value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        conversion_data: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
            defaultValue: 'pending'
        },
        confirmed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'analytics_ad_conversions',
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
                fields: ['click_id']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['status']
            },
            {
                fields: ['session_id', 'campaign_id']
            },
            {
                fields: ['campaign_id', 'created_at']
            },
            {
                fields: ['campaign_id', 'status']
            }
        ]
    });

    AdConversion.associate = function(models) {
        // Связь с сессией
        AdConversion.belongsTo(models.Session, {
            foreignKey: 'session_id',
            targetKey: 'session_id',
            as: 'session'
        });

        // Связь с кликом (опциональная)
        AdConversion.belongsTo(models.AdClick, {
            foreignKey: 'click_id',
            as: 'click'
        });

        // Связь с кампанией
        AdConversion.belongsTo(models.Campaign, {
            foreignKey: 'campaign_id',
            as: 'campaign'
        });
    };

    return AdConversion;
};