module.exports = (sequelize, DataTypes) => {
    const Campaign = sequelize.define('Campaign', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        advertiser_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        budget: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true
        },
        cpu_v_target: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        cpc_target: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        cpl_target: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'archived'),
            defaultValue: 'draft'
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        targeting: {
            type: DataTypes.JSONB,
            allowNull: true
        }
    }, {
        tableName: 'analytics_campaigns',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['advertiser_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    Campaign.associate = function(models) {
        // Связь с показами
        Campaign.hasMany(models.AdImpression, {
            foreignKey: 'campaign_id',
            as: 'impressions'
        });

        // Связь с кликами
        Campaign.hasMany(models.AdClick, {
            foreignKey: 'campaign_id',
            as: 'clicks'
        });

        // Связь с конверсиями
        Campaign.hasMany(models.AdConversion, {
            foreignKey: 'campaign_id',
            as: 'conversions'
        });
    };

    return Campaign;
};