import express from 'express';
import { body, validationResult } from 'express-validator';
import Session from '../models/Session.js';
import AdImpression from '../models/AdImpression.js';
import AdClick from '../models/AdClick.js';
import AdConversion from '../models/AdConversion.js';
import logger from '../config/logger.js';

const router = express.Router();

// Валидация событий
const validateSessionStarted = [
    body('session_id').isString().notEmpty(),
    body('restaurant_id').isInt(),
    body('restaurant_segment').isIn(['кофейня', 'средний', 'премиум'])
];

const validateAdImpression = [
    body('session_id').isString().notEmpty(),
    body('campaign_id').isInt(),
    body('advertiser_id').isInt(),
    body('banner_placement').isIn(['checkout', 'waiter_call', 'tips_payment'])
];

// 1. Начало сессии
router.post('/session-started', validateSessionStarted, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { session_id, restaurant_id, restaurant_segment } = req.body;

        const session = await Session.create({
            session_id,
            restaurant_id,
            restaurant_segment
        });

        logger.info(`Сессия создана: ${session_id}`);
        res.status(201).json({ success: true, data: session });
    } catch (error) {
        logger.error('Ошибка создания сессии:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Показ баннера
router.post('/ad-impression', validateAdImpression, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const impression = await AdImpression.create(req.body);
        logger.info(`Показ зафиксирован: ${req.body.session_id}`);
        res.status(201).json({ success: true, data: impression });
    } catch (error) {
        logger.error('Ошибка фиксации показа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 3. Клик по баннеру
router.post('/ad-click', async (req, res) => {
    try {
        const { session_id, campaign_id, advertiser_id } = req.body;

        const click = await AdClick.create({
            session_id,
            campaign_id,
            advertiser_id
        });

        logger.info(`Клик зафиксирован: ${session_id}`);
        res.status(201).json({ success: true, data: click });
    } catch (error) {
        logger.error('Ошибка фиксации клика:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 4. Конверсия
router.post('/ad-conversion', async (req, res) => {
    try {
        const { session_id, campaign_id, advertiser_id, conversion_type } = req.body;

        const conversion = await AdConversion.create({
            session_id,
            campaign_id,
            advertiser_id,
            conversion_type: conversion_type || 'bank_card_request'
        });

        logger.info(`Конверсия зафиксирована: ${session_id}`);
        res.status(201).json({ success: true, data: conversion });
    } catch (error) {
        logger.error('Ошибка фиксации конверсии:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 5. Получение метрик
router.get('/metrics/:campaign_id', async (req, res) => {
    try {
        const { campaign_id } = req.params;
        const { start_date, end_date } = req.query;

        // Здесь будет сложная логика расчета метрик
        const metrics = {
            uv: 0,
            reach: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
            cr: 0,
            cpuv: 0,
            cpc: 0,
            cpl: 0
        };

        res.json({ success: true, data: metrics });
    } catch (error) {
        logger.error('Ошибка получения метрик:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;