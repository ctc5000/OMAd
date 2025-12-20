const moment = require('moment');
const { Model, DataTypes, Op, Sequelize } = require('sequelize');

class DashboardController {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize;
        this.Sequelize = Sequelize;
        this.Op = Op;
        
        console.log('📊 DashboardController инициализирован с поддержкой изоляции данных');
    }

    async getCampaignIdsByAdvertiser(advertiserId) {
        if (!advertiserId) return null;
        
        try {
            const campaigns = await this.models.Campaign.findAll({
                where: { advertiser_id: advertiserId },
                attributes: ['id'],
                raw: true
            });
            return campaigns.map(c => c.id);
        } catch (error) {
            console.error('Ошибка получения campaign_ids:', error);
            return [];
        }
    }

    // Основные метрики дашборда
    async getDashboardData(req, res) {
        try {
            const { period = 'today', campaign_id } = req.query;
            const advertiserId = req.user.advertiserId; // Из JWT токена
            const userRole = req.user.role;

            console.log(`📊 Запрос дашборда: период=${period}, campaign=${campaign_id || 'все'}, advertiser=${advertiserId || 'все'}, role=${userRole}`);

            // Проверяем наличие необходимых моделей
            const requiredModels = ['Session', 'AdImpression', 'AdClick', 'AdConversion'];
            for (const modelName of requiredModels) {
                if (!this.models || !this.models[modelName]) {
                    return res.status(500).json({
                        success: false,
                        error: `Модель ${modelName} не загружена`,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            console.log('📊 Начинаем сбор данных дашборда...');
            
            // Собираем данные с учетом изоляции
            const dashboardData = {
                overview: await this.getOverviewMetrics(period, campaign_id, advertiserId),
                realtime: await this.getRealtimeMetrics(advertiserId),
                campaigns: await this.getTopCampaigns(period, advertiserId),
                funnel: await this.getConversionFunnel(period, campaign_id, advertiserId),
                hourly: await this.getHourlyMetrics(period, advertiserId),
                segments: await this.getMetricsByRestaurantSegment(period, advertiserId),
                summary: {
                    period: period,
                    start_date: this.getPeriodStartDate(period),
                    end_date: new Date(),
                    total_campaigns: await this.getTotalCampaigns(advertiserId),
                    active_campaigns: await this.getActiveCampaignsCount(advertiserId)
                }
            };

            console.log('✅ Данные дашборда собраны успешно');
            return res.json({
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Ошибка в getDashboardData:', error);
            return res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Метрики обзора
    async getOverviewMetrics(period = 'today', campaign_id, advertiserId, includeChange = true) {
        const dateRange = this.getDateRange(period);

        try {
            // Получаем campaign_ids для данного advertiser
            const campaignIds = advertiserId ? await this.getCampaignIdsByAdvertiser(advertiserId) : null;

            const [
                uv,
                reach,
                impressions,
                clicks,
                conversions,
                campaignsData
            ] = await Promise.all([
                this.calculateUV(dateRange, campaign_id, campaignIds),
                this.calculateReach(dateRange, campaign_id, campaignIds),
                this.calculateImpressions(dateRange, campaign_id, campaignIds),
                this.calculateClicks(dateRange, campaign_id, campaignIds),
                this.calculateConversions(dateRange, campaign_id, campaignIds),
                this.getCampaignCosts(campaign_id, advertiserId)
            ]);

            // Производные метрики
            const ctr = impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0;
            const cr = reach > 0 ? parseFloat((conversions / reach * 100).toFixed(2)) : 0;
            
            // Стоимостные метрики
            let cpuv = null, cpc = null, cpl = null;
            if (campaignsData) {
                cpuv = campaignsData.cost_per_uv ? parseFloat(campaignsData.cost_per_uv) : null;
                cpc = campaignsData.cost_per_click ? parseFloat(campaignsData.cost_per_click) : null;
                cpl = campaignsData.cost_per_lead ? parseFloat(campaignsData.cost_per_lead) : null;
            }

            const result = {
                uv: parseInt(uv) || 0,
                reach: parseInt(reach) || 0,
                impressions: parseInt(impressions) || 0,
                clicks: parseInt(clicks) || 0,
                conversions: parseInt(conversions) || 0,
                ctr: parseFloat(ctr) || 0,
                cr: parseFloat(cr) || 0,
                cpuv: cpuv,
                cpc: cpc,
                cpl: cpl
            };

            // Добавляем изменения если не рекурсивный вызов
            if (includeChange) {
                result.change = await this.getChangeMetrics(period, campaign_id, advertiserId);
            }

            return result;
        } catch (error) {
            console.error('Ошибка расчета overview метрик:', error);
            return this.getFallbackMetrics();
        }
    }

    // Метрики в реальном времени (последний час)
    async getRealtimeMetrics(advertiserId = null) {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const campaignIds = advertiserId ? await this.getCampaignIdsByAdvertiser(advertiserId) : null;

            const realtimeData = {
                current_uv: await this.getRecentSessionsCount(oneHourAgo, campaignIds),
                current_impressions: await this.getRecentImpressionsCount(oneHourAgo, campaignIds),
                current_clicks: await this.getRecentClicksCount(oneHourAgo, campaignIds),
                current_conversions: await this.getRecentConversionsCount(oneHourAgo, campaignIds),
                active_sessions: await this.getActiveSessionsCount(campaignIds),
                peak_hour: await this.getPeakHour(campaignIds),
                timestamp: new Date().toISOString()
            };

            // Рассчитываем средние значения
            realtimeData.avg_ctr = realtimeData.current_impressions > 0
                ? parseFloat((realtimeData.current_clicks / realtimeData.current_impressions * 100).toFixed(2))
                : 0;

            realtimeData.avg_cr = realtimeData.current_uv > 0
                ? parseFloat((realtimeData.current_conversions / realtimeData.current_uv * 100).toFixed(2))
                : 0;

            return realtimeData;
        } catch (error) {
            console.error('Ошибка получения realtime метрик:', error);
            return this.getFallbackRealtimeMetrics();
        }
    }

    // Топ кампаний
    async getTopCampaigns(period = 'today', advertiserId = null, limit = 10) {
        try {
            if (!this.models.Campaign) {
                return [];
            }

            const dateRange = this.getDateRange(period);

            // Базовый запрос для получения топ конверсий
            let query = {
                attributes: [
                    'campaign_id',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'conversions'],
                    [Sequelize.fn('SUM', Sequelize.col('conversion_value')), 'revenue']
                ],
                where: {
                    created_at: {
                        [this.Op.between]: [dateRange.start, dateRange.end]
                    },
                    status: 'confirmed'
                },
                group: ['campaign_id'],
                order: [[Sequelize.literal('conversions'), 'DESC']],
                limit: limit,
                raw: true
            };

            // Если указан advertiser, фильтруем по его кампаниям
            if (advertiserId) {
                const campaignIds = await this.getCampaignIdsByAdvertiser(advertiserId);
                if (campaignIds.length === 0) {
                    return [];
                }
                query.where.campaign_id = { [this.Op.in]: campaignIds };
            }

            const topCampaigns = await this.models.AdConversion.findAll(query);

            // Дополняем информацией о кампаниях
            const campaignsWithDetails = await Promise.all(
                topCampaigns.map(async (campaign) => {
                    let campaignInfo = null;
                    try {
                        campaignInfo = await this.models.Campaign.findByPk(campaign.campaign_id);
                    } catch (error) {
                        console.warn(`Не удалось получить информацию о кампании ${campaign.campaign_id}:`, error.message);
                    }

                    // Проверяем доступ к кампании
                    if (advertiserId && campaignInfo && campaignInfo.advertiser_id != advertiserId) {
                        return null;
                    }

                    const stats = await this.getCampaignStats(campaign.campaign_id, dateRange);

                    return {
                        id: campaign.campaign_id,
                        name: campaignInfo?.name || `Кампания ${campaign.campaign_id}`,
                        conversions: parseInt(campaign.conversions) || 0,
                        revenue: parseFloat(campaign.revenue) || 0,
                        ctr: stats.ctr,
                        cr: stats.cr,
                        cpuv: stats.cpuv,
                        cpc: stats.cpc,
                        cpl: stats.cpl,
                        status: campaignInfo?.status || 'unknown',
                        advertiser_id: campaignInfo?.advertiser_id
                    };
                })
            );

            return campaignsWithDetails.filter(campaign => campaign && campaign.conversions > 0);
        } catch (error) {
            console.error('Ошибка получения топ кампаний:', error);
            return [];
        }
    }

    // Воронка конверсий
    async getConversionFunnel(period = 'today', campaign_id, advertiserId = null) {
        try {
            const dateRange = this.getDateRange(period);
            const campaignIds = advertiserId ? await this.getCampaignIdsByAdvertiser(advertiserId) : null;

            // Если указана конкретная кампания, проверяем доступ
            if (campaign_id && advertiserId) {
                const campaign = await this.models.Campaign.findByPk(campaign_id);
                if (campaign && campaign.advertiser_id != advertiserId) {
                    throw new Error('Доступ к кампании запрещен');
                }
            }

            const funnelData = {
                sessions: await this.getSessionsCount(dateRange, campaign_id, campaignIds),
                impressions: await this.getImpressionsCount(dateRange, campaign_id, campaignIds),
                clicks: await this.getClicksCount(dateRange, campaign_id, campaignIds),
                conversions: await this.getConversionsCount(dateRange, campaign_id, campaignIds),
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
                ? parseFloat((funnelData.impressions / funnelData.sessions * 100).toFixed(2))
                : 0;
            funnelData.rates.click_through_rate = funnelData.impressions > 0
                ? parseFloat((funnelData.clicks / funnelData.impressions * 100).toFixed(2))
                : 0;
            funnelData.rates.conversion_rate = funnelData.clicks > 0
                ? parseFloat((funnelData.conversions / funnelData.clicks * 100).toFixed(2))
                : 0;

            return funnelData;
        } catch (error) {
            console.error('Ошибка получения воронки:', error);
            return this.getFallbackFunnel();
        }
    }

    // Метрики по часам
    async getHourlyMetrics(period = 'today', advertiserId = null) {
        try {
            const dateRange = this.getDateRange(period);
            const campaignIds = advertiserId ? await this.getCampaignIdsByAdvertiser(advertiserId) : null;

            const now = new Date();
            const hourPromises = [];

            for (let i = 23; i >= 0; i--) {
                (() => {
                    const hourStart = new Date(now);
                    hourStart.setHours(now.getHours() - i, 0, 0, 0);

                    const hourEnd = new Date(hourStart);
                    hourEnd.setHours(hourStart.getHours() + 1);

                    const hourValue = hourStart.getHours();

                    hourPromises.push(
                        Promise.all([
                            this.getImpressionsInPeriod(hourStart, hourEnd, campaignIds),
                            this.getClicksInPeriod(hourStart, hourEnd, campaignIds),
                            this.getConversionsInPeriod(hourStart, hourEnd, campaignIds)
                        ]).then(([impressions, clicks, conversions]) => ({
                            hour: hourValue,
                            label: `${hourValue}:00`,
                            impressions,
                            clicks,
                            conversions,
                            ctr: impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0
                        }))
                    );
                })();
            }

            const hourlyData = await Promise.all(hourPromises);
            return hourlyData;
        } catch (error) {
            console.error('Ошибка получения hourly метрик:', error);
            return this.generateMockHourlyData();
        }
    }


    // Метрики по сегментам ресторанов
    async getMetricsByRestaurantSegment(period = 'today', advertiserId = null) {
        try {
            const dateRange = this.getDateRange(period);
            const segments = ['кофейня', 'средний', 'премиум'];
            const campaignIds = advertiserId ? await this.getCampaignIdsByAdvertiser(advertiserId) : null;

            const segmentMetrics = [];

            for (const segment of segments) {
                // Получаем сессии для сегмента
                const sessionWhere = {
                    restaurant_segment: segment,
                    created_at: {
                        [this.Op.between]: [dateRange.start, dateRange.end]
                    }
                };

                // Если есть campaignIds, фильтруем сессии по импрессиям этих кампаний
                if (campaignIds && campaignIds.length > 0) {
                    const impressions = await this.models.AdImpression.findAll({
                        attributes: ['session_id'],
                        where: {
                            campaign_id: { [this.Op.in]: campaignIds },
                            created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                        },
                        raw: true
                    });
                    
                    const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
                    if (sessionIds.length === 0) {
                        sessionWhere.id = { [this.Op.in]: [] }; // Нет сессий
                    } else {
                        sessionWhere.session_id = { [this.Op.in]: sessionIds };
                    }
                }

                const sessions = await this.models.Session.findAll({
                    attributes: ['session_id'],
                    where: sessionWhere,
                    raw: true
                });

                const sessionIdList = sessions.map(s => s.session_id);

                let uv = 0;
                let impressions = 0;
                let clicks = 0;
                let conversions = 0;

                if (sessionIdList.length > 0) {
                    uv = sessionIdList.length;
                    
                    [impressions, clicks, conversions] = await Promise.all([
                        this.models.AdImpression.count({
                            where: {
                                session_id: { [this.Op.in]: sessionIdList },
                                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                            }
                        }),
                        this.models.AdClick.count({
                            where: {
                                session_id: { [this.Op.in]: sessionIdList },
                                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                            }
                        }),
                        this.models.AdConversion.count({
                            where: {
                                session_id: { [this.Op.in]: sessionIdList },
                                status: 'confirmed',
                                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                            }
                        })
                    ]);
                }

                const metrics = {
                    segment: segment,
                    uv: uv,
                    impressions: impressions,
                    clicks: clicks,
                    conversions: conversions,
                    ctr: impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
                    cr: uv > 0 ? parseFloat((conversions / uv * 100).toFixed(2)) : 0
                };

                segmentMetrics.push(metrics);
            }

            return segmentMetrics;
        } catch (error) {
            console.error('Ошибка получения метрик по сегментам:', error);
            return this.getFallbackSegmentMetrics();
        }
    }

    // Вспомогательные методы для расчетов
    async calculateUV(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: {
                [this.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: campaign_id,
                    created_at: {
                        [this.Op.between]: [dateRange.start, dateRange.end]
                    }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        } else if (campaignIds && campaignIds.length > 0) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: { [this.Op.in]: campaignIds },
                    created_at: {
                        [this.Op.between]: [dateRange.start, dateRange.end]
                    }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        }

        return await this.models.Session.count({ where });
    }

    async calculateReach(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: {
                [this.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        const sequelizeInstance = this.sequelize || this.Sequelize;
        const result = await this.models.AdImpression.findAll({
            attributes: [
                [sequelizeInstance.fn('COUNT', sequelizeInstance.fn('DISTINCT', sequelizeInstance.col('session_id'))), 'reach']
            ],
            where,
            raw: true
        });

        return result[0]?.reach || 0;
    }

    async calculateImpressions(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: {
                [this.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdImpression.count({ where });
    }

    async calculateClicks(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: {
                [this.Op.between]: [dateRange.start, dateRange.end]
            }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdClick.count({ where });
    }

    async calculateConversions(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: {
                [this.Op.between]: [dateRange.start, dateRange.end]
            },
            status: 'confirmed'
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdConversion.count({ where });
    }

    // Получение изменений по сравнению с предыдущим периодом
    async getChangeMetrics(period, campaign_id, advertiserId) {
        const [current, previous] = await Promise.all([
            this.getOverviewMetrics(period, campaign_id, advertiserId, false),
            this.getOverviewMetrics(this.getPreviousPeriod(period), campaign_id, advertiserId, false)
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
        let start, end;

        switch(period) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
                end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
                break;
            case 'this_week':
                const firstDayOfWeek = new Date(now);
                firstDayOfWeek.setDate(now.getDate() - now.getDay());
                start = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate(), 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'last_week':
                const firstDayOfLastWeek = new Date(now);
                firstDayOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
                start = new Date(firstDayOfLastWeek.getFullYear(), firstDayOfLastWeek.getMonth(), firstDayOfLastWeek.getDate(), 0, 0, 0, 0);
                end = new Date(firstDayOfLastWeek.getFullYear(), firstDayOfLastWeek.getMonth(), firstDayOfLastWeek.getDate() + 6, 23, 59, 59, 999);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        return { start, end };
    }

    getPreviousPeriod(period) {
        const map = {
            'today': 'yesterday',
            'yesterday': 'today',
            'this_week': 'last_week',
            'last_week': 'this_week',
            'this_month': 'last_month',
            'last_month': 'this_month'
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

    async getTotalCampaigns(advertiserId = null) {
        const where = {};
        if (advertiserId) {
            where.advertiser_id = advertiserId;
        }
        return await this.models.Campaign.count({ where });
    }

    async getActiveCampaignsCount(advertiserId = null) {
        const where = { status: 'active' };
        if (advertiserId) {
            where.advertiser_id = advertiserId;
        }
        return await this.models.Campaign.count({ where });
    }


    // Методы для получения реальных данных
    async getRecentSessionsCount(since, campaignIds = null) {
        const where = {
            created_at: { [this.Op.gte]: since }
        };

        if (campaignIds && campaignIds.length > 0) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: { [this.Op.in]: campaignIds },
                    created_at: { [this.Op.gte]: since }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        }

        return await this.models.Session.count({ where });
    }

    async getRecentImpressionsCount(since, campaignIds = null) {
        const where = {
            created_at: { [this.Op.gte]: since }
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdImpression.count({ where });
    }

    async getRecentClicksCount(since, campaignIds = null) {
        const where = {
            created_at: { [this.Op.gte]: since }
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdClick.count({ where });
    }

    async getRecentConversionsCount(since, campaignIds = null) {
        const where = {
            created_at: { [this.Op.gte]: since },
            status: 'confirmed'
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdConversion.count({ where });
    }

    async getActiveSessionsCount(campaignIds = null) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const where = {
            created_at: { [this.Op.gte]: fiveMinutesAgo }
        };

        if (campaignIds && campaignIds.length > 0) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: { [this.Op.in]: campaignIds },
                    created_at: { [this.Op.gte]: fiveMinutesAgo }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        }

        return await this.models.Session.count({ where });
    }

    async getPeakHour(campaignIds = null) {
        try {
            const where = {};
            if (campaignIds && campaignIds.length > 0) {
                where.campaign_id = { [this.Op.in]: campaignIds };
            }

            const result = await this.models.AdImpression.findAll({
                attributes: [
                    [Sequelize.fn('HOUR', Sequelize.col('created_at')), 'hour'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: {
                    created_at: {
                        [this.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    },
                    ...where
                },
                group: ['hour'],
                order: [[Sequelize.literal('count'), 'DESC']],
                limit: 1,
                raw: true
            });

            if (result.length > 0) {
                return {
                    hour: result[0].hour,
                    impressions: result[0].count
                };
            }

            return {
                hour: new Date().getHours(),
                impressions: await this.getImpressionsInLastHour(campaignIds)
            };
        } catch (error) {
            return {
                hour: new Date().getHours(),
                impressions: 0
            };
        }
    }

    async getImpressionsInLastHour(campaignIds = null) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const where = {
            created_at: { [this.Op.gte]: oneHourAgo }
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdImpression.count({ where });
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
            cpuv: null,
            cpc: null,
            cpl: null,
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
            const sequelizeInstance = this.sequelize || this.Sequelize;
            
            const [impressions, clicks, conversions, reachResult, campaignData] = await Promise.all([
                this.models.AdImpression.count({
                    where: {
                        campaign_id,
                        created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                    }
                }),
                this.models.AdClick.count({
                    where: {
                        campaign_id,
                        created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                    }
                }),
                this.models.AdConversion.count({
                    where: {
                        campaign_id,
                        status: 'confirmed',
                        created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                    }
                }),
                // Расчет reach как уникальные session_id с impression
                this.models.AdImpression.findAll({
                    attributes: [
                        [sequelizeInstance.fn('COUNT', sequelizeInstance.fn('DISTINCT', sequelizeInstance.col('session_id'))), 'reach']
                    ],
                    where: {
                        campaign_id,
                        created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                    },
                    raw: true
                }),
                // Получаем данные кампании для стоимостных метрик
                this.models.Campaign ? this.models.Campaign.findByPk(campaign_id, { raw: true }) : Promise.resolve(null)
            ]);

            const reach = parseInt(reachResult[0]?.reach || 0);

            // Производная метрика: CTR = clicks / impressions
            const ctr = impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0;
            // Производная метрика: CR = conversions / reach
            const cr = reach > 0 ? (conversions / reach * 100).toFixed(2) : 0;
            
            // Расчет стоимостных метрик (это уже стоимости за единицу, не нужно умножать)
            // CPUV = cost_per_uv (стоимость за одного посетителя)
            let cpuv = null;
            if (campaignData && campaignData.cost_per_uv) {
                cpuv = parseFloat(campaignData.cost_per_uv);
            }
            
            // CPC = cost_per_click (стоимость за один клик)
            let cpc = null;
            if (campaignData && campaignData.cost_per_click) {
                cpc = parseFloat(campaignData.cost_per_click);
            }
            
            // CPL = cost_per_lead (стоимость за одну конверсию)
            let cpl = null;
            if (campaignData && campaignData.cost_per_lead) {
                cpl = parseFloat(campaignData.cost_per_lead);
            }

            return {
                impressions,
                clicks,
                conversions,
                ctr: parseFloat(ctr),
                cr: parseFloat(cr),
                cpuv: cpuv,
                cpc: cpc,
                cpl: cpl
            };
        } catch (error) {
            console.error('Ошибка получения статистики кампании:', error);
            return { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cr: 0, cpuv: null, cpc: null, cpl: null };
        }
    }

    // Получить стоимостные параметры кампании для расчета CPUV, CPC, CPL
    async getCampaignCosts(campaign_id, advertiser_id) {
        try {
            if (!campaign_id && !advertiser_id) {
                return null;
            }

            const where = {};
            if (campaign_id) {
                where.id = campaign_id;
            } else if (advertiser_id) {
                where.advertiser_id = advertiser_id;
            }

            // Получаем кампанию с данными о стоимостях
            const campaign = await this.models.Campaign.findOne({
                attributes: ['cost_per_uv', 'cost_per_click', 'cost_per_lead'],
                where,
                raw: true
            });

            return campaign;
        } catch (error) {
            console.error('Ошибка получения стоимостей кампании:', error);
            return null;
        }
    }

    // Дополнительные методы для детализированных запросов
    async getSessionsCount(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: campaign_id,
                    created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        } else if (campaignIds && campaignIds.length > 0) {
            const impressions = await this.models.AdImpression.findAll({
                attributes: ['session_id'],
                where: {
                    campaign_id: { [this.Op.in]: campaignIds },
                    created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
                },
                raw: true
            });
            
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
            if (sessionIds.length > 0) {
                where.session_id = { [this.Op.in]: sessionIds };
            } else {
                return 0;
            }
        }

        return await this.models.Session.count({ where });
    }

    async getImpressionsCount(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdImpression.count({ where });
    }

    async getClicksCount(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdClick.count({ where });
    }

    async getConversionsCount(dateRange, campaign_id, campaignIds) {
        const where = {
            created_at: { [this.Op.between]: [dateRange.start, dateRange.end] },
            status: 'confirmed'
        };

        if (campaign_id) {
            where.campaign_id = campaign_id;
        } else if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdConversion.count({ where });
    }

    async getImpressionsInPeriod(start, end, campaignIds = null) {
        const where = {
            created_at: { [this.Op.between]: [start, end] }
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdImpression.count({ where });
    }

    async getClicksInPeriod(start, end, campaignIds = null) {
        const where = {
            created_at: { [this.Op.between]: [start, end] }
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdClick.count({ where });
    }

    async getConversionsInPeriod(start, end, campaignIds = null) {
        const where = {
            created_at: { [this.Op.between]: [start, end] },
            status: 'confirmed'
        };

        if (campaignIds && campaignIds.length > 0) {
            where.campaign_id = { [this.Op.in]: campaignIds };
        }

        return await this.models.AdConversion.count({ where });
    }

    async getUVBySegment(dateRange, segment) {
        return await this.models.Session.count({
            where: {
                restaurant_segment: segment,
                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
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
                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
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
                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] }
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
                created_at: { [this.Op.between]: [dateRange.start, dateRange.end] },
                status: 'confirmed'
            }
        });
    }
}

module.exports = DashboardController;