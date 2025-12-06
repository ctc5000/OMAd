module.exports = (sequelize, DataTypes) => {
    const AdClick = sequelize.define('AdClick', {
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
        impression_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        click_position_x: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        click_position_y: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'analytics_ad_clicks',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    AdClick.associate = function(models) {
        // Связь с сессией
        AdClick.belongsTo(models.Session, {
            foreignKey: 'session_id',
            targetKey: 'session_id',
            as: 'session'
        });

        // Связь с показом (опциональная)
        AdClick.belongsTo(models.AdImpression, {
            foreignKey: 'impression_id',
            as: 'impression'
        });

        // Связь с конверсиями
        AdClick.hasMany(models.AdConversion, {
            foreignKey: 'click_id',
            as: 'conversions'
        });
    };

    return AdClick;
};