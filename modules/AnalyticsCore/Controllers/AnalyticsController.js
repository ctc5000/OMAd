class AnalyticsController {
    constructor(models) {
        this.models = models;
    }

    // Событие: начало сессии
    async sessionStarted(req, res) {
        try {
            const { session_id, restaurant_id, restaurant_segment, user_agent, ip_address } = req.body;

            const session = await this.models.Session.create({
                session_id,
                restaurant_id,
                restaurant_segment,
                user_agent,
                ip_address
            });

            return res.status(201).json({
                success: true,
                data: session,
                message: 'Сессия зафиксирована'
            });
        } catch (error) {
            console.error('Error in sessionStarted:', error);
            return res.status(500).json({
                success: false,
                error: error.message
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
    async getMetrics(req, res) {
        try {
            const { campaign_id, start_date, end_date } = req.query;

            // Пример расчета метрик
            const sessions = await this.models.Session.findAll({
                where: {
                    ...(campaign_id && {
                        id: {
                            [this.models.Sequelize.Op.in]: this.models.Sequelize.literal(`
                SELECT DISTINCT session_id 
                FROM analytics_ad_impressions 
                WHERE campaign_id = ${campaign_id}
              `)
                        }
                    }),
                    ...(start_date && end_date && {
                        created_at: {
                            [this.models.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
                        }
                    })
                }
            });

            const metrics = {
                uv: sessions.length,
                reach: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                ctr: 0,
                cr: 0,
                cpu_v: 0,
                cpc: 0,
                cpl: 0
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
}

module.exports = AnalyticsController;