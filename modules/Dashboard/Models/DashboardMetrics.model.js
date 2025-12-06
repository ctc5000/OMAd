module.exports = (sequelize, DataTypes) => {
    const DashboardMetrics = sequelize.define('DashboardMetrics', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        period: {
            type: DataTypes.ENUM('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'),
            allowNull: false
        },
        campaign_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        advertiser_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        metrics: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        },
        calculated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'dashboard_metrics_cache',
        timestamps: false,
        indexes: [
            {
                fields: ['period', 'campaign_id', 'advertiser_id'],
                unique: true
            },
            {
                fields: ['expires_at']
            }
        ]
    });

    return DashboardMetrics;
};