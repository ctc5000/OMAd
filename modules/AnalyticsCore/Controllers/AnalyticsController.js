const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

class AnalyticsController {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize; // <-- Сохраняем sequelize
        this.Sequelize = sequelize.Sequelize || sequelize; // <-- Сохраняем Sequelize
        this.MAX_SESSIONS_PER_RESTAURANT = 100; // Ограничение сессий
    }

    // Валидаторы
    getValidationRules() {
        return {
            sessionStarted: [
                body('restaurant_id')
                    .isInt({ min: 1 }).withMessage('Некорректный restaurant_id'),
                body('restaurant_segment')
                    .isIn(['кофейня', 'средний', 'премиум'])
                    .withMessage('Некорректный restaurant_segment'),
                body('user_agent')
                    .optional()
                    .isLength({ max: 500 })
                    .withMessage('Слишком длинный user_agent'),
                body('ip_address')
                    .optional()
                    .custom(value => validator.isIP(value))
                    .withMessage('Некорректный IP-адрес')
            ],
            adImpression: [
                body('session_id')
                    .notEmpty().withMessage('session_id обязателен'),
                body('campaign_id')
                    .isInt({ min: 1 }).withMessage('Некорректный campaign_id'),
                body('advertiser_id')
                    .isInt({ min: 1 }).withMessage('Некорректный advertiser_id'),
                body('banner_placement')
                    .isIn(['checkout', 'waiter_call', 'tips_payment'])
                    .withMessage('Некорректное место размещения баннера')
            ]
        };
    }

    // Валидация данных сессии
    validateSessionData(data) {
        const errors = [];

        // Проверка restaurant_id
        if (!data.restaurant_id || !validator.isInt(String(data.restaurant_id), { min: 1 })) {
            errors.push('Некорректный restaurant_id');
        }

        // Проверка restaurant_segment
        const validSegments = ['кофейня', 'средний', 'премиум'];
        if (!data.restaurant_segment || !validSegments.includes(data.restaurant_segment)) {
            errors.push('Некорректный restaurant_segment');
        }

        // Опциональная валидация user_agent и ip_address
        if (data.user_agent && data.user_agent.length > 500) {
            errors.push('Слишком длинный user_agent');
        }

        if (data.ip_address && !validator.isIP(data.ip_address)) {
            errors.push('Некорректный IP-адрес');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Проверка лимита сессий для ресторана
    async checkSessionsLimit(restaurant_id) {
        const sessionsCount = await this.models.Session.count({
            where: { 
                restaurant_id,
                created_at: {
                    [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
                }
            }
        });

        return sessionsCount >= this.MAX_SESSIONS_PER_RESTAURANT;
    }

    // Событие: начало сессии
    async sessionStarted(req, res) {
        try {
            // Деструктуризация и подготовка данных
            const { 
                session_id: providedSessionId, 
                restaurant_id, 
                restaurant_segment, 
                user_agent, 
                ip_address 
            } = req.body;

            // Валидация входящих данных
            const validationResult = this.validateSessionData(req.body);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.errors
                });
            }

            // Проверка лимита сессий
            const limitExceeded = await this.checkSessionsLimit(restaurant_id);
            if (limitExceeded) {
                return res.status(429).json({
                    success: false,
                    message: 'Превышен лимит сессий для ресторана'
                });
            }

            // Генерация session_id, если не предоставлен
            const session_id = providedSessionId || uuidv4();

            // Сохранение сессии
            const session = await this.models.Session.create({
                session_id,
                restaurant_id,
                restaurant_segment,
                user_agent,
                ip_address
            });

            return res.status(201).json({
                success: true,
                data: {
                    session_id: session.session_id,
                    restaurant_id: session.restaurant_id
                },
                message: 'Сессия успешно зафиксирована'
            });
        } catch (error) {
            console.error('Ошибка при создании сессии:', error);
            
            // Обработка уникальных ошибок
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    success: false,
                    error: 'Сессия с таким ID уже существует'
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Внутренняя ошибка сервера'
            });
        }
    }

    // Событие: показ рекламы
    async adImpression(req, res) {
        try {
            const impression = await this.models.AdImpression.create(req.body);

            return res.status(201).json({
                success: true,
                data: impression,
                message: 'Показ зафиксирован'
            });
        } catch (error) {
            console.error('Error in adImpression:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Событие: клик по рекламе
    async adClick(req, res) {
        try {
            const click = await this.models.AdClick.create(req.body);

            return res.status(201).json({
                success: true,
                data: click,
                message: 'Клик зафиксирован'
            });
        } catch (error) {
            console.error('Error in adClick:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Событие: конверсия
    async adConversion(req, res) {
        try {
            const conversion = await this.models.AdConversion.create({
                ...req.body,
                conversion_type: req.body.conversion_type || 'bank_card_request'
            });

            return res.status(201).json({
                success: true,
                data: conversion,
                message: 'Конверсия зафиксирована'
            });
        } catch (error) {
            console.error('Error in adConversion:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Получение метрик
    // Получение метрик
async getMetrics(req, res) {
    try {
        const { campaign_id, start_date, end_date } = req.query;

        // Базовый where для сессий
        let sessionWhere = {};
        
        // Если передан campaign_id, фильтруем сессии по этому campaign_id
        if (campaign_id) {
            // Находим все session_id, связанные с этой кампанией через impressions
            const impressions = await this.models.AdImpression.findAll({
                where: { campaign_id },
                attributes: ['session_id'],
                raw: true
            });
            
            const sessionIds = impressions.map(imp => imp.session_id);
            
            if (sessionIds.length > 0) {
                sessionWhere.session_id = {
                    [Op.in]: sessionIds
                };
            } else {
                // Если нет impressions для этой кампании, возвращаем пустые метрики
                return res.json({
                    success: true,
                    data: {
                        uv: 0,
                        reach: 0,
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        ctr: 0,
                        cr: 0,
                        cpu_v: 0,
                        cpc: 0,
                        cpl: 0
                    }
                });
            }
        }
        
        // Добавляем фильтр по датам если указаны
        if (start_date && end_date) {
            sessionWhere.created_at = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        // Получаем сессии
        const sessions = await this.models.Session.findAll({
            where: sessionWhere
        });

        // Получаем статистику по событиям
        const [impressionsCount, clicksCount, conversionsCount] = await Promise.all([
            this.models.AdImpression.count({
                where: {
                    ...(campaign_id && { campaign_id }),
                    ...(start_date && end_date && {
                        created_at: {
                            [Op.between]: [new Date(start_date), new Date(end_date)]
                        }
                    })
                }
            }),
            this.models.AdClick.count({
                where: {
                    ...(campaign_id && { campaign_id }),
                    ...(start_date && end_date && {
                        created_at: {
                            [Op.between]: [new Date(start_date), new Date(end_date)]
                        }
                    })
                }
            }),
            this.models.AdConversion.count({
                where: {
                    ...(campaign_id && { campaign_id }),
                    ...(start_date && end_date && {
                        created_at: {
                            [Op.between]: [new Date(start_date), new Date(end_date)]
                        }
                    })
                }
            })
        ]);

        // Рассчитываем метрики
        const uv = sessions.length;
        const ctr = impressionsCount > 0 ? (clicksCount / impressionsCount) * 100 : 0;
        const cr = clicksCount > 0 ? (conversionsCount / clicksCount) * 100 : 0;

        const metrics = {
            uv: uv,
            reach: uv, // Для простоты считаем reach = UV
            impressions: impressionsCount,
            clicks: clicksCount,
            conversions: conversionsCount,
            ctr: parseFloat(ctr.toFixed(2)),
            cr: parseFloat(cr.toFixed(2)),
            cpu_v: 0, // Заглушка - нужно считать из данных кампаний
            cpc: 0,   // Заглушка
            cpl: 0    // Заглушка
        };

        return res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Error in getMetrics:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

    // Получение метрик по конкретной кампании
    async getCampaignMetrics(req, res) {
        try {
            const { campaign_id } = req.params;
            const { start_date, end_date } = req.query;
    
            // Валидация campaign_id
            if (!campaign_id || isNaN(parseInt(campaign_id))) {
                return res.status(400).json({
                    success: false,
                    error: 'Некорректный campaign_id'
                });
            }
    
            const numericCampaignId = parseInt(campaign_id);
    
            // Формируем базовые условия для фильтрации по датам
            const dateFilter = start_date && end_date ? {
                created_at: {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                }
            } : {};
    
            // Получаем все session_id, связанные с этой кампанией через impressions
            const impressions = await this.models.AdImpression.findAll({
                where: {
                    campaign_id: numericCampaignId,
                    ...dateFilter
                },
                attributes: ['session_id'],
                raw: true
            });
    
            // Извлекаем уникальные session_id
            const sessionIds = [...new Set(impressions.map(imp => imp.session_id))];
    
            let sessions = [];
            if (sessionIds.length > 0) {
                // Получаем сессии по найденным session_id
                sessions = await this.models.Session.findAll({
                    where: {
                        session_id: {
                            [Op.in]: sessionIds
                        },
                        ...dateFilter
                    }
                });
            }
    
            // Получаем статистику по событиям с фильтрацией по датам
            const [impressionsCount, clicksCount, conversionsCount] = await Promise.all([
                this.models.AdImpression.count({
                    where: {
                        campaign_id: numericCampaignId,
                        ...dateFilter
                    }
                }),
                this.models.AdClick.count({
                    where: {
                        campaign_id: numericCampaignId,
                        ...dateFilter
                    }
                }),
                this.models.AdConversion.count({
                    where: {
                        campaign_id: numericCampaignId,
                        ...dateFilter
                    }
                })
            ]);
    
            // Рассчитываем производные метрики
            const uniqueVisitors = sessions.length;
            const ctr = impressionsCount > 0 ? (clicksCount / impressionsCount) * 100 : 0;
            const cr = impressionsCount > 0 ? (conversionsCount / impressionsCount) * 100 : 0;
            const conversionRate = clicksCount > 0 ? (conversionsCount / clicksCount) * 100 : 0;
    
            // Получаем информацию о кампании (если есть модель Campaign)
            let campaignInfo = {};
            if (this.models.Campaign) {
                const campaign = await this.models.Campaign.findOne({
                    where: { id: numericCampaignId },
                    raw: true
                });
                if (campaign) {
                    campaignInfo = {
                        name: campaign.name,
                        advertiser_id: campaign.advertiser_id,
                        status: campaign.status,
                        total_budget: campaign.total_budget,
                        daily_budget: campaign.daily_budget
                    };
                }
            }
    
            // Рассчитываем стоимостные метрики (если есть данные)
            let cpu_v = 0, cpc = 0, cpl = 0;
            
            if (campaignInfo.total_budget && impressionsCount > 0) {
                // Стоимость за 1000 показов (CPM/CPU_v)
                cpu_v = campaignInfo.total_budget / impressionsCount * 1000;
            }
            
            if (campaignInfo.total_budget && clicksCount > 0) {
                // Стоимость за клик (CPC)
                cpc = campaignInfo.total_budget / clicksCount;
            }
            
            if (campaignInfo.total_budget && conversionsCount > 0) {
                // Стоимость за лид (CPL)
                cpl = campaignInfo.total_budget / conversionsCount;
            }
    
            const metrics = {
                campaign: {
                    id: numericCampaignId,
                    ...campaignInfo
                },
                period: start_date && end_date ? {
                    start: start_date,
                    end: end_date
                } : 'all_time',
                basic_metrics: {
                    unique_visitors: uniqueVisitors,
                    impressions: impressionsCount,
                    clicks: clicksCount,
                    conversions: conversionsCount
                },
                performance_rates: {
                    ctr: parseFloat(ctr.toFixed(2)),          // Click-through rate (%)
                    cr: parseFloat(cr.toFixed(2)),            // Conversion rate от impressions (%)
                    conversion_rate: parseFloat(conversionRate.toFixed(2)) // Conversion rate от clicks (%)
                },
                cost_metrics: {
                    cpu_v: parseFloat(cpu_v.toFixed(2)),      // Cost per 1000 views
                    cpc: parseFloat(cpc.toFixed(2)),          // Cost per click
                    cpl: parseFloat(cpl.toFixed(2)),          // Cost per lead/conversion
                    estimated_total_cost: parseFloat((cpu_v * impressionsCount / 1000).toFixed(2))
                },
                session_details: {
                    total_sessions: sessions.length,
                    sessions_by_segment: sessions.reduce((acc, session) => {
                        const segment = session.restaurant_segment || 'unknown';
                        acc[segment] = (acc[segment] || 0) + 1;
                        return acc;
                    }, {}),
                    sample_sessions: sessions.slice(0, 5).map(s => ({
                        session_id: s.session_id,
                        restaurant_id: s.restaurant_id,
                        segment: s.restaurant_segment,
                        created_at: s.created_at
                    }))
                }
            };
    
            return res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            console.error('Error in getCampaignMetrics:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

// Также добавьте метод getFunnel, который тоже используется в роутах:
async getFunnel(req, res) {
    try {
        const { session_id } = req.params;

        // Получаем все события для сессии
        const session = await this.models.Session.findOne({
            where: { session_id },
            include: [
                {
                    model: this.models.AdImpression,
                    as: 'adImpressions'
                },
                {
                    model: this.models.AdClick,
                    as: 'adClicks'
                },
                {
                    model: this.models.AdConversion,
                    as: 'adConversions'
                }
            ]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Сессия не найдена'
            });
        }

        const funnel = {
            session: {
                id: session.session_id,
                restaurant_id: session.restaurant_id,
                segment: session.restaurant_segment,
                started_at: session.created_at
            },
            impressions: session.adImpressions || [],
            clicks: session.adClicks || [],
            conversions: session.adConversions || [],
            funnel_stages: {
                impression: session.adImpressions.length,
                click: session.adClicks.length,
                conversion: session.adConversions.length
            }
        };

        return res.json({
            success: true,
            data: funnel
        });
    } catch (error) {
        console.error('Error in getFunnel:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
}

module.exports = AnalyticsController;