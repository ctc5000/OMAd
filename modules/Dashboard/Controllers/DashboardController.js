const moment = require('moment');

class DashboardController {
    constructor(models) {
        this.models = models;
        console.log('📊 DashboardController инициализирован');
    }

    // Основные метрики дашборда
    async getDashboardData(req, res) {
        try {
            const { period = 'today', campaign_id, advertiser_id } = req.query;

            console.log(`📊 Запрос дашборда: период=${period}, campaign=${campaign_id || 'все'}`);

            // Получаем данные для разных периодов
            const dashboardData = {
                overview: await this.getOverviewMetrics(period, campaign_id, advertiser_id),
                realtime: await this.getRealtimeMetrics(),
                campaigns: await this.getTopCampaigns(period),
                funnel: await this.getConversionFunnel(period, campaign_id),
                hourly: await this.getHourlyMetrics(period),
                segments: await this.getMetricsByRestaurantSegment(period),
                summary: {
                    period: period,
                    start_date: this.getPeriodStartDate(period),
                    end_date: new Date(),
                    total_campaigns: await this.getTotalCampaigns(),
                    active_campaigns: await this.getActiveCampaignsCount()
                }
            };

            return res.json({
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Ошибка в getDashboardData:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Метрики обзора
    async getOverviewMetrics(period = 'today', campaign_id, advertiser_id) {
        const dateRange = this.getDateRange(period);

        try {
            // Базовые метрики
            const [
                uv,
                reach,
                impressions,
                clicks,
                conversions
            ] = await Promise.all([
                this.calculateUV(dateRange, campaign_id, advertiser_id),
                this.calculateReach(dateRange, campaign_id, advertiser_id),
                this.calculateImpressions(dateRange, campaign_id, advertiser_id),
                this.calculateClicks(dateRange, campaign_id, advertiser_id),
                this.calculateConversions(dateRange, campaign_id, advertiser_id)
            ]);

            const ctr = impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0;
            const cr = reach > 0 ? (conversions / reach * 100).toFixed(2) : 0;
            const cpu_v = uv > 0 ? 0 : 0; // Здесь будет реальный расчет стоимости
            const cpc = clicks > 0 ? 0 : 0;
            const cpl = conversions > 0 ? 0 : 0;

            return {
                uv: parseInt(uv),
                reach: parseInt(reach),
                impressions: parseInt(impressions),
                clicks: parseInt(clicks),
                conversions: parseInt(conversions),
                ctr: parseFloat(ctr),
                cr: parseFloat(cr),
                cpu_v: parseFloat(cpu_v),
                cpc: parseFloat(cpc),
                cpl: parseFloat(cpl),
                change: await this.getChangeMetrics(period, campaign_id, advertiser_id)
            };
        } catch (error) {
            console.error('Ошибка расчета overview метрик:', error);
            return this.getFallbackMetrics();
        }
    }

    // Метрики в реальном времени (последний час)
    async getRealtimeMetrics() {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const realtimeData = {
                current_uv: await this.getRecentSessionsCount(oneHourAgo),
                current_impressions: await this.getRecentImpressionsCount(oneHourAgo),
                current_clicks: await this.getRecentClicksCount(oneHourAgo),
                current_conversions: await this.getRecentConversionsCount(oneHourAgo),
                active_sessions: await this.getActiveSessionsCount(),
                peak_hour: await this.getPeakHour(),
                timestamp: new Date().toISOString()
            };

            // Рассчитываем средние значения
            realtimeData.avg_ctr = realtimeData.current_impressions > 0
                ? (realtimeData.current_clicks / realtimeData.current_impressions * 100).toFixed(2)
                : 0;

            realtimeData.avg_cr = realtimeData.current_uv > 0
                ? (realtimeData.current_conversions / realtimeData.current_uv * 100).toFixed(2)
                : 0;

            return realtimeData;
        } catch (error) {
            console.error('Ошибка получения realtime метрик:', error);
            return this.getFallbackRealtimeMetrics();
        }
    }

    // Топ кампаний
    async getTopCampaigns(period = 'today', limit = 10) {
        try {
            const dateRange = this.getDateRange(period);

            // Получаем топ кампаний по конверсиям
            const topCampaigns = await this.models.AdConversion.findAll({
                attributes: [
                    'campaign_id',
                    [this.models.sequelize.fn('COUNT', this.models.sequelize.col('id')), 'conversions'],
                    [this.models.sequelize.fn('SUM', this.models.sequelize.col('conversion_value')), 'revenue']
                ],
                where: {
                    created_at: {
                        [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
                    },
                    status: 'confirmed'
                },
                group: ['campaign_id'],
                order: [[this.models.sequelize.literal('conversions'), 'DESC']],
                limit: limit,
                raw: true
            });

            // Дополняем информацией о кампаниях
            const campaignsWithDetails = await Promise.all(
                topCampaigns.map(async (campaign) => {
                    const campaignInfo = await this.models.Campaign.findByPk(campaign.campaign_id);
                    const stats = await this.getCampaignStats(campaign.campaign_id, dateRange);

                    return {
                        id: campaign.campaign_id,
                        name: campaignInfo?.name || `Кампания ${campaign.campaign_id}`,
                        conversions: parseInt(campaign.conversions),
                        revenue: parseFloat(campaign.revenue || 0),
                        ctr: stats.ctr,
                        cr: stats.cr,
                        cpu_v: stats.cpu_v,
                        status: campaignInfo?.status || 'unknown'
                    };
                })
            );

            return campaignsWithDetails;
        } catch (error) {
            console.error('Ошибка получения топ кампаний:', error);
            return [];
        }
    }

    // Воронка конверсий
    async getConversionFunnel(period = 'today', campaign_id) {
        try {
            const dateRange = this.getDateRange(period);

            const funnelData = {
                sessions: await this.getSessionsCount(dateRange, campaign_id),
                impressions: await this.getImpressionsCount(dateRange, campaign_id),
                clicks: await this.getClicksCount(dateRange, campaign_id),
                conversions: await this.getConversionsCount(dateRange, campaign_id),
                dropoffs: {
                    sessions_to_impressions: 0,
                    impressions_to_clicks: 0,
                    clicks_to_conversions: 0
                },
                rates: {
                    impression_rate: 0,
                    click_through_rate: 0,
                    conversion_rate: 0
                }
            };

            // Рассчитываем отсевы
            funnelData.dropoffs.sessions_to_impressions = funnelData.sessions - funnelData.impressions;
            funnelData.dropoffs.impressions_to_clicks = funnelData.impressions - funnelData.clicks;
            funnelData.dropoffs.clicks_to_conversions = funnelData.clicks - funnelData.conversions;

            // Рассчитываем проценты
            funnelData.rates.impression_rate = funnelData.sessions > 0
                ? (funnelData.impressions / funnelData.sessions * 100).toFixed(2)
                : 0;
            funnelData.rates.click_through_rate = funnelData.impressions > 0
                ? (funnelData.clicks / funnelData.impressions * 100).toFixed(2)
                : 0;
            funnelData.rates.conversion_rate = funnelData.clicks > 0
                ? (funnelData.conversions / funnelData.clicks * 100).toFixed(2)
                : 0;

            return funnelData;
        } catch (error) {
            console.error('Ошибка получения воронки:', error);
            return this.getFallbackFunnel();
        }
    }

    // Метрики по часам
    async getHourlyMetrics(period = 'today') {
        try {
            const dateRange = this.getDateRange(period);

            // Получаем данные по часам за последние 24 часа
            const hourlyData = [];
            const now = new Date();

            for (let i = 23; i >= 0; i--) {
                const hourStart = new Date(now);
                hourStart.setHours(now.getHours() - i, 0, 0, 0);

                const hourEnd = new Date(hourStart);
                hourEnd.setHours(hourStart.getHours() + 1);

                const hourMetrics = {
                    hour: hourStart.getHours(),
                    label: `${hourStart.getHours()}:00`,
                    impressions: await this.getImpressionsInPeriod(hourStart, hourEnd),
                    clicks: await this.getClicksInPeriod(hourStart, hourEnd),
                    conversions: await this.getConversionsInPeriod(hourStart, hourEnd),
                    ctr: 0
                };

                hourMetrics.ctr = hourMetrics.impressions > 0
                    ? (hourMetrics.clicks / hourMetrics.impressions * 100).toFixed(2)
                    : 0;

                hourlyData.push(hourMetrics);
            }

            return hourlyData;
        } catch (error) {
            console.error('Ошибка получения hourly метрик:', error);
            return this.generateMockHourlyData();
        }
    }

    // Метрики по сегментам ресторанов
    async getMetricsByRestaurantSegment(period = 'today') {
        try {
            const dateRange = this.getDateRange(period);

            const segments = ['кофейня', 'средний', 'премиум'];
            const segmentMetrics = [];

            for (const segment of segments) {
                const metrics = {
                    segment: segment,
                    uv: await this.getUVBySegment(dateRange, segment),
                    impressions: await this.getImpressionsBySegment(dateRange, segment),
                    clicks: await this.getClicksBySegment(dateRange, segment),
                    conversions: await this.getConversionsBySegment(dateRange, segment),
                    ctr: 0,
                    cr: 0
                };

                metrics.ctr = metrics.impressions > 0
                    ? (metrics.clicks / metrics.impressions * 100).toFixed(2)
                    : 0;

                metrics.cr = metrics.uv > 0
                    ? (metrics.conversions / metrics.uv * 100).toFixed(2)
                    : 0;

                segmentMetrics.push(metrics);
            }

            return segmentMetrics;
        } catch (error) {
            console.error('Ошибка получения метрик по сегментам:', error);
            return this.getFallbackSegmentMetrics();
        }
    }

    // Вспомогательные методы для расчетов
    async calculateUV(dateRange, campaign_id, advertiser_id) {
        const where = {
            created_at: {
                [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.id = {
                [this.models.Sequelize.Op.in]: this.models.sequelize.literal(`
          SELECT DISTINCT session_id 
          FROM analytics_ad_impressions 
          WHERE campaign_id = ${campaign_id}
        `)
            };
        }

        return await this.models.Session.count({ where });
    }

    async calculateReach(dateRange, campaign_id, advertiser_id) {
        const where = {
            created_at: {
                [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        if (advertiser_id) {
            where.advertiser_id = advertiser_id;
        }

        const result = await this.models.AdImpression.findAll({
            attributes: [
                [this.models.sequelize.fn('COUNT', this.models.sequelize.fn('DISTINCT', this.models.sequelize.col('session_id'))), 'reach']
            ],
            where,
            raw: true
        });

        return result[0]?.reach || 0;
    }

    async calculateImpressions(dateRange, campaign_id, advertiser_id) {
        const where = {
            created_at: {
                [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        if (advertiser_id) {
            where.advertiser_id = advertiser_id;
        }

        return await this.models.AdImpression.count({ where });
    }

    async calculateClicks(dateRange, campaign_id, advertiser_id) {
        const where = {
            created_at: {
                [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        if (advertiser_id) {
            where.advertiser_id = advertiser_id;
        }

        return await this.models.AdClick.count({ where });
    }

    async calculateConversions(dateRange, campaign_id, advertiser_id) {
        const where = {
            created_at: {
                [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end]
            },
            status: 'confirmed'
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        if (advertiser_id) {
            where.advertiser_id = advertiser_id;
        }

        return await this.models.AdConversion.count({ where });
    }

    // Получение изменений по сравнению с предыдущим периодом
    async getChangeMetrics(period, campaign_id, advertiser_id) {
        const currentPeriod = this.getDateRange(period);
        const previousPeriod = this.getDateRange(this.getPreviousPeriod(period));

        const [current, previous] = await Promise.all([
            this.getOverviewMetrics(period, campaign_id, advertiser_id),
            this.getOverviewMetrics(this.getPreviousPeriod(period), campaign_id, advertiser_id)
        ]);

        return {
            uv_change: this.calculateChange(current.uv, previous.uv),
            impressions_change: this.calculateChange(current.impressions, previous.impressions),
            clicks_change: this.calculateChange(current.clicks, previous.clicks),
            conversions_change: this.calculateChange(current.conversions, previous.conversions),
            ctr_change: this.calculateChange(current.ctr, previous.ctr),
            cr_change: this.calculateChange(current.cr, previous.cr)
        };
    }

    // Вспомогательные методы
    getDateRange(period) {
        const now = new Date();
        let start, end = now;

        switch(period) {
            case 'today':
                start = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'yesterday':
                start = new Date(now.setDate(now.getDate() - 1));
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                break;
            case 'this_week':
                start = new Date(now.setDate(now.getDate() - now.getDay()));
                start.setHours(0, 0, 0, 0);
                break;
            case 'last_week':
                start = new Date(now.setDate(now.getDate() - now.getDay() - 7));
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                start = new Date(now.setHours(0, 0, 0, 0));
        }

        return { start, end };
    }

    getPreviousPeriod(period) {
        const map = {
            'today': 'yesterday',
            'yesterday': 'today', // для упрощения
            'this_week': 'last_week',
            'last_week': 'this_week', // для упрощения
            'this_month': 'last_month',
            'last_month': 'this_month' // для упрощения
        };

        return map[period] || 'today';
    }

    calculateChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(2);
    }

    getPeriodStartDate(period) {
        return this.getDateRange(period).start;
    }

    async getTotalCampaigns() {
        return await this.models.Campaign.count();
    }

    async getActiveCampaignsCount() {
        return await this.models.Campaign.count({
            where: { status: 'active' }
        });
    }

    // Методы для получения реальных данных (нужно будет адаптировать под вашу БД)
    async getRecentSessionsCount(since) {
        return await this.models.Session.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: since }
            }
        });
    }

    async getRecentImpressionsCount(since) {
        return await this.models.AdImpression.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: since }
            }
        });
    }

    async getRecentClicksCount(since) {
        return await this.models.AdClick.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: since }
            }
        });
    }

    async getRecentConversionsCount(since) {
        return await this.models.AdConversion.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: since },
                status: 'confirmed'
            }
        });
    }

    async getActiveSessionsCount() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return await this.models.Session.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: fiveMinutesAgo }
            }
        });
    }

    async getPeakHour() {
        // Простая реализация - возвращаем текущий час
        return {
            hour: new Date().getHours(),
            impressions: await this.getImpressionsInLastHour()
        };
    }

    async getImpressionsInLastHour() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return await this.models.AdImpression.count({
            where: {
                created_at: { [this.models.Sequelize.Op.gte]: oneHourAgo }
            }
        });
    }

    // Fallback методы (для тестирования)
    getFallbackMetrics() {
        return {
            uv: 1245,
            reach: 1100,
            impressions: 4500,
            clicks: 450,
            conversions: 45,
            ctr: 10.0,
            cr: 4.1,
            cpu_v: 25.5,
            cpc: 120.0,
            cpl: 1200.0,
            change: {
                uv_change: 12.5,
                impressions_change: 8.3,
                clicks_change: 15.2,
                conversions_change: 22.1,
                ctr_change: 6.3,
                cr_change: 18.7
            }
        };
    }

    getFallbackRealtimeMetrics() {
        return {
            current_uv: 45,
            current_impressions: 180,
            current_clicks: 18,
            current_conversions: 2,
            active_sessions: 8,
            peak_hour: 14,
            avg_ctr: 10.0,
            avg_cr: 4.4,
            timestamp: new Date().toISOString()
        };
    }

    getFallbackFunnel() {
        return {
            sessions: 1000,
            impressions: 800,
            clicks: 120,
            conversions: 24,
            dropoffs: {
                sessions_to_impressions: 200,
                impressions_to_clicks: 680,
                clicks_to_conversions: 96
            },
            rates: {
                impression_rate: 80.0,
                click_through_rate: 15.0,
                conversion_rate: 20.0
            }
        };
    }

    getFallbackSegmentMetrics() {
        return [
            {
                segment: 'кофейня',
                uv: 450,
                impressions: 1600,
                clicks: 160,
                conversions: 16,
                ctr: 10.0,
                cr: 3.6
            },
            {
                segment: 'средний',
                uv: 520,
                impressions: 1850,
                clicks: 185,
                conversions: 19,
                ctr: 10.0,
                cr: 3.7
            },
            {
                segment: 'премиум',
                uv: 275,
                impressions: 1050,
                clicks: 105,
                conversions: 10,
                ctr: 10.0,
                cr: 3.6
            }
        ];
    }

    generateMockHourlyData() {
        const data = [];
        const now = new Date();

        for (let i = 23; i >= 0; i--) {
            const hour = (now.getHours() - i + 24) % 24;
            const baseImpressions = Math.floor(Math.random() * 50) + 100;

            data.push({
                hour: hour,
                label: `${hour}:00`,
                impressions: baseImpressions,
                clicks: Math.floor(baseImpressions * (0.08 + Math.random() * 0.04)),
                conversions: Math.floor(baseImpressions * (0.008 + Math.random() * 0.004)),
                ctr: (8 + Math.random() * 4).toFixed(2)
            });
        }

        return data;
    }

    // Методы для получения статистики кампании
    async getCampaignStats(campaign_id, dateRange) {
        try {
            const [impressions, clicks, conversions] = await Promise.all([
                this.models.AdImpression.count({
                    where: {
                        campaign_id,
                        created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
                    }
                }),
                this.models.AdClick.count({
                    where: {
                        campaign_id,
                        created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
                    }
                }),
                this.models.AdConversion.count({
                    where: {
                        campaign_id,
                        status: 'confirmed',
                        created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
                    }
                })
            ]);

            return {
                impressions,
                clicks,
                conversions,
                ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0,
                cr: clicks > 0 ? (conversions / clicks * 100).toFixed(2) : 0,
                cpu_v: 0 // Заглушка для реального расчета
            };
        } catch (error) {
            console.error('Ошибка получения статистики кампании:', error);
            return { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cr: 0, cpu_v: 0 };
        }
    }

    // Дополнительные методы для детализированных запросов
    async getSessionsCount(dateRange, campaign_id) {
        const where = {
            created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            where.id = {
                [this.models.Sequelize.Op.in]: this.models.sequelize.literal(`
          SELECT DISTINCT session_id 
          FROM analytics_ad_impressions 
          WHERE campaign_id = ${campaign_id}
        `)
            };
        }

        return await this.models.Session.count({ where });
    }

    async getImpressionsCount(dateRange, campaign_id) {
        const where = {
            created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        return await this.models.AdImpression.count({ where });
    }

    async getClicksCount(dateRange, campaign_id) {
        const where = {
            created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        return await this.models.AdClick.count({ where });
    }

    async getConversionsCount(dateRange, campaign_id) {
        const where = {
            created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] },
            status: 'confirmed'
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        }

        return await this.models.AdConversion.count({ where });
    }

    async getImpressionsInPeriod(start, end) {
        return await this.models.AdImpression.count({
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [start, end] }
            }
        });
    }

    async getClicksInPeriod(start, end) {
        return await this.models.AdClick.count({
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [start, end] }
            }
        });
    }

    async getConversionsInPeriod(start, end) {
        return await this.models.AdConversion.count({
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [start, end] },
                status: 'confirmed'
            }
        });
    }

    async getUVBySegment(dateRange, segment) {
        return await this.models.Session.count({
            where: {
                restaurant_segment: segment,
                created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
            }
        });
    }

    async getImpressionsBySegment(dateRange, segment) {
        return await this.models.AdImpression.count({
            include: [{
                model: this.models.Session,
                as: 'session',
                where: { restaurant_segment: segment }
            }],
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
            }
        });
    }

    async getClicksBySegment(dateRange, segment) {
        return await this.models.AdClick.count({
            include: [{
                model: this.models.Session,
                as: 'session',
                where: { restaurant_segment: segment }
            }],
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] }
            }
        });
    }

    async getConversionsBySegment(dateRange, segment) {
        return await this.models.AdConversion.count({
            include: [{
                model: this.models.Session,
                as: 'session',
                where: { restaurant_segment: segment }
            }],
            where: {
                created_at: { [this.models.Sequelize.Op.between]: [dateRange.start, dateRange.end] },
                status: 'confirmed'
            }
        });
    }
}

module.exports = DashboardController;