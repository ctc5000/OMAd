/**
 * Сервис для сбора аналитических данных для отчётов
 * TODO: Реализовать SQL-запросы для получения данных из БД
 * 
 * Работает с таблицами:
 * - analytics_sessions → UV (уникальные пользователи)
 * - analytics_ad_impressions → Impressions, Reach
 * - analytics_ad_clicks → Clicks
 * - analytics_ad_conversions → Conversions
 * - analytics_campaigns → Cost, метрики стоимости
 */
class ReportsDataService {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize;
        this.Op = sequelize.Op;
    }

    /**
     * Получить сводные метрики по кампании за период
     * TODO: Реализовать полную логику с SQL-запросами
     * 
     * @param {number} campaignId - ID кампании
     * @param {Date} fromDate - начало периода
     * @param {Date} toDate - конец периода
     * @returns {Promise<object>} Объект с метриками:
     *   {
     *     uv: number,                // уникальные посетители
     *     impressions: number,       // всего показов
     *     reach: number,             // уникальных показов
     *     clicks: number,            // всего кликов
     *     conversions: number,       // всего конверсий
     *     cost: number,              // общая стоимость
     *     ctr: number,               // CTR = clicks / impressions
     *     cr: number,                // CR = conversions / clicks
     *     cpc: number,               // CPC = cost / clicks
     *     cpl: number,               // CPL = cost / conversions
     *     cpuv: number               // CPUV = cost / uv
     *   }
     * 
     * TODO: SQL-запросы для каждой метрики:
     * 
     * 1. UV (уникальные сессии):
     *    SELECT COUNT(DISTINCT session_id)
     *    FROM analytics_sessions
     *    WHERE created_at BETWEEN :fromDate AND :toDate
     *    AND session_id IN (
     *      SELECT DISTINCT session_id FROM analytics_ad_impressions
     *      WHERE campaign_id = :campaignId
     *    )
     * 
     * 2. Impressions (всего показов):
     *    SELECT COUNT(*) as impressions
     *    FROM analytics_ad_impressions
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 3. Reach (уникальные показы по session_id):
     *    SELECT COUNT(DISTINCT session_id) as reach
     *    FROM analytics_ad_impressions
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 4. Clicks (всего кликов):
     *    SELECT COUNT(*) as clicks
     *    FROM analytics_ad_clicks
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 5. Conversions (всего конверсий):
     *    SELECT COUNT(*) as conversions
     *    FROM analytics_ad_conversions
     *    WHERE campaign_id = :campaignId
     *    AND status = 'confirmed'
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 6. Cost (сумма стоимостей кликов):
     *    SELECT COALESCE(SUM(cost_per_click), 0) as total_cost
     *    FROM analytics_campaigns
     *    WHERE id = :campaignId
     *    
     *    TODO: Или, если стоимость хранится в click таблице:
     *    SELECT COALESCE(SUM(cost), 0) as total_cost
     *    FROM analytics_ad_clicks
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * TODO: После получения данных рассчитать производные метрики:
     * - ctr = impressions > 0 ? (clicks / impressions * 100) : 0
     * - cr = clicks > 0 ? (conversions / clicks * 100) : 0
     * - cpc = clicks > 0 ? (cost / clicks) : 0
     * - cpl = conversions > 0 ? (cost / conversions) : 0
     * - cpuv = uv > 0 ? (cost / uv) : 0
     */
    async getSummaryMetrics(campaignId, fromDate, toDate) {
        console.log(`📊 Получение сводных метрик: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // Валидация входных параметров
            if (!campaignId || !fromDate || !toDate) {
                throw new Error('Invalid parameters: campaignId, fromDate, toDate are required');
            }

            // Проверить, что fromDate <= toDate
            if (new Date(fromDate) > new Date(toDate)) {
                throw new Error('Invalid date range: fromDate must be before toDate');
            }

            // Получить данные кампании (cost_per_click, cost_per_uv, cost_per_lead)
            const campaign = await this.models.Campaign.findByPk(campaignId);
            if (!campaign) {
                throw new Error(`Campaign ${campaignId} not found`);
            }

            // Выполнить SQL-запросы параллельно
            const [impressionResult, reachResult, clicksResult, conversionsResult] = await Promise.all([
                this.sequelize.query(
                    `SELECT COUNT(*) as count FROM analytics_ad_impressions 
                    WHERE campaign_id = :campaignId AND created_at BETWEEN :fromDate AND :toDate`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                ),
                this.sequelize.query(
                    `SELECT COUNT(DISTINCT session_id) as count FROM analytics_ad_impressions 
                    WHERE campaign_id = :campaignId AND created_at BETWEEN :fromDate AND :toDate`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                ),
                this.sequelize.query(
                    `SELECT COUNT(*) as count FROM analytics_ad_clicks 
                    WHERE campaign_id = :campaignId AND created_at BETWEEN :fromDate AND :toDate`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                ),
                this.sequelize.query(
                    `SELECT COUNT(*) as count FROM analytics_ad_conversions 
                    WHERE campaign_id = :campaignId AND status = 'confirmed' AND created_at BETWEEN :fromDate AND :toDate`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                )
            ]);

            const impressions = parseInt(impressionResult[0]?.count || 0, 10);
            const reach = parseInt(reachResult[0]?.count || 0, 10);
            const clicks = parseInt(clicksResult[0]?.count || 0, 10);
            const conversions = parseInt(conversionsResult[0]?.count || 0, 10);

            // UV = уникальные сессии с impression
            const uv = reach; // Для MVP: UV = Reach

            // Расчет производных метрик
            const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
            const cr = reach > 0 ? parseFloat(((conversions / reach) * 100).toFixed(2)) : 0;
            
            // Стоимостные метрики
            const cpc = campaign.cost_per_click !== null ? parseFloat(campaign.cost_per_click) : null;
            const cpl = campaign.cost_per_lead !== null ? parseFloat(campaign.cost_per_lead) : null;
            const cpuv = campaign.cost_per_uv !== null ? parseFloat(campaign.cost_per_uv) : null;

            const metrics = {
                campaign_name: campaign.name,
                from_date: fromDate,
                to_date: toDate,
                uv,
                impressions,
                reach,
                clicks,
                conversions,
                ctr,
                cr,
                cpc,
                cpl,
                cpuv,
                revenue: conversions * (cpl || 0) // Примерный расчет выручки
            };

            console.log(`✅ Сводные метрики получены:`, metrics);
            return metrics;

        } catch (error) {
            console.error('❌ Ошибка при получении сводных метрик:', error.message);
            throw error;
        }
    }

    /**
     * Получить ежедневные метрики по кампании
     * TODO: Реализовать полную логику с GROUP BY DATE
     * 
     * @param {number} campaignId - ID кампании
     * @param {Date} fromDate - начало периода
     * @param {Date} toDate - конец периода
     * @returns {Promise<Array>} Массив объектов по дням:
     *   [
     *     { date: '2025-01-01', uv: 100, impressions: 450, clicks: 45, conversions: 5, cost: 2250 },
     *     { date: '2025-01-02', uv: 120, impressions: 520, clicks: 52, conversions: 6, cost: 2600 },
     *     ...
     *   ]
     * 
     * TODO: SQL-запросы группировка по дате:
     * 
     * 1. Impressions по дням:
     *    SELECT DATE(created_at) as date, COUNT(*) as impressions
     *    FROM analytics_ad_impressions
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY DATE(created_at)
     *    ORDER BY DATE(created_at) ASC
     * 
     * 2. Clicks по дням:
     *    SELECT DATE(created_at) as date, COUNT(*) as clicks
     *    FROM analytics_ad_clicks
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY DATE(created_at)
     *    ORDER BY DATE(created_at) ASC
     * 
     * 3. Conversions по дням:
     *    SELECT DATE(created_at) as date, COUNT(*) as conversions
     *    FROM analytics_ad_conversions
     *    WHERE campaign_id = :campaignId
     *    AND status = 'confirmed'
     *    AND created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY DATE(created_at)
     *    ORDER BY DATE(created_at) ASC
     * 
     * 4. UV (unique sessions) по дням:
     *    SELECT DATE(s.created_at) as date, COUNT(DISTINCT ai.session_id) as uv
     *    FROM analytics_sessions s
     *    JOIN analytics_ad_impressions ai ON s.session_id = ai.session_id
     *    WHERE ai.campaign_id = :campaignId
     *    AND ai.created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY DATE(s.created_at)
     *    ORDER BY DATE(s.created_at) ASC
     * 
     * TODO: Merge результатов четырёх запросов в единый массив по дате
     * TODO: Каждый день должен содержать все четыре метрики (даже если 0)
     * TODO: Заполнить пропущенные дни в диапазоне (дни без событий = 0 метрик)
     */
    async getDailyMetrics(campaignId, fromDate, toDate) {
        console.log(`📅 Получение ежедневных метрик: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // Валидация входных параметров
            if (!campaignId || !fromDate || !toDate) {
                throw new Error('Invalid parameters: campaignId, fromDate, toDate are required');
            }

            // Выполнить четыре SQL-запроса параллельно
            const [impressionsByDay, clicksByDay, conversionsByDay] = await Promise.all([
                this.sequelize.query(
                    `SELECT DATE(created_at) as date, COUNT(*) as impressions 
                    FROM analytics_ad_impressions 
                    WHERE campaign_id = :campaignId AND created_at BETWEEN :fromDate AND :toDate 
                    GROUP BY DATE(created_at) 
                    ORDER BY DATE(created_at) ASC`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                ),
                this.sequelize.query(
                    `SELECT DATE(created_at) as date, COUNT(*) as clicks 
                    FROM analytics_ad_clicks 
                    WHERE campaign_id = :campaignId AND created_at BETWEEN :fromDate AND :toDate 
                    GROUP BY DATE(created_at) 
                    ORDER BY DATE(created_at) ASC`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                ),
                this.sequelize.query(
                    `SELECT DATE(created_at) as date, COUNT(*) as conversions 
                    FROM analytics_ad_conversions 
                    WHERE campaign_id = :campaignId AND status = 'confirmed' AND created_at BETWEEN :fromDate AND :toDate 
                    GROUP BY DATE(created_at) 
                    ORDER BY DATE(created_at) ASC`,
                    { replacements: { campaignId, fromDate, toDate }, type: this.sequelize.QueryTypes.SELECT }
                )
            ]);

            // Merged результаты в единый массив по дате
            const dailyMetrics = this.mergeDailyData(
                impressionsByDay,
                clicksByDay,
                conversionsByDay,
                fromDate,
                toDate
            );

            console.log(`✅ Ежедневные метрики получены: ${dailyMetrics.length} дней`);
            return dailyMetrics;

        } catch (error) {
            console.error('❌ Ошибка при получении ежедневных метрик:', error.message);
            throw error;
        }
    }

    /**
     * Получить метрики по сегментам ресторанов
     * TODO: Реализовать полную логику с GROUP BY segment и restaurant_id
     * 
     * @param {number} campaignId - ID кампании
     * @param {Date} fromDate - начало периода
     * @param {Date} toDate - конец периода
     * @returns {Promise<Array>} Массив объектов по сегментам:
     *   [
     *     { segmentId: 1, segmentName: 'кофейня', restaurantId: 101, impressions: 450, clicks: 45, conversions: 5, uv: 150 },
     *     { segmentId: 2, segmentName: 'средний', restaurantId: 102, impressions: 520, clicks: 52, conversions: 6, uv: 180 },
     *     ...
     *   ]
     * 
     * TODO: SQL-запросы с GROUP BY segment и restaurant:
     * 
     * 1. Impressions и UV по сегментам:
     *    SELECT 
     *      s.restaurant_segment as segment,
     *      ai.campaign_id,
     *      COUNT(*) as impressions,
     *      COUNT(DISTINCT ai.session_id) as reach,
     *      COUNT(DISTINCT s.session_id) as uv
     *    FROM analytics_ad_impressions ai
     *    JOIN analytics_sessions s ON ai.session_id = s.session_id
     *    WHERE ai.campaign_id = :campaignId
     *    AND ai.created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY s.restaurant_segment, ai.campaign_id
     *    ORDER BY s.restaurant_segment ASC
     * 
     * 2. Clicks по сегментам:
     *    SELECT 
     *      s.restaurant_segment as segment,
     *      COUNT(*) as clicks
     *    FROM analytics_ad_clicks ac
     *    JOIN analytics_sessions s ON ac.session_id = s.session_id
     *    WHERE ac.campaign_id = :campaignId
     *    AND ac.created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY s.restaurant_segment
     *    ORDER BY s.restaurant_segment ASC
     * 
     * 3. Conversions по сегментам:
     *    SELECT 
     *      s.restaurant_segment as segment,
     *      COUNT(*) as conversions
     *    FROM analytics_ad_conversions acnv
     *    JOIN analytics_sessions s ON acnv.session_id = s.session_id
     *    WHERE acnv.campaign_id = :campaignId
     *    AND acnv.status = 'confirmed'
     *    AND acnv.created_at BETWEEN :fromDate AND :toDate
     *    GROUP BY s.restaurant_segment
     *    ORDER BY s.restaurant_segment ASC
     * 
     * TODO: Merge результатов в единый массив по сегментам
     * TODO: Каждый сегмент должен содержать все метрики (impressions, clicks, conversions, uv)
     */
    async getSegmentMetrics(campaignId, fromDate, toDate) {
        console.log(`🏪 Получение метрик по сегментам: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // TODO: Валидация входных параметров
            if (!campaignId || !fromDate || !toDate) {
                throw new Error('Invalid parameters: campaignId, fromDate, toDate are required');
            }

            // TODO: Выполнить три SQL-запроса для сегментов параллельно
            // const [impressionsBySegment, clicksBySegment, conversionsBySegment] = await Promise.all([
            //     this.querySegmentImpressions(campaignId, fromDate, toDate),
            //     this.querySegmentClicks(campaignId, fromDate, toDate),
            //     this.querySegmentConversions(campaignId, fromDate, toDate)
            // ]);

            // TODO: Merge результатов в единый массив
            // const segmentMetrics = this.mergeSegmentData(
            //     impressionsBySegment,
            //     clicksBySegment,
            //     conversionsBySegment
            // );

            // return segmentMetrics;

            throw new Error('Not implemented yet');

        } catch (error) {
            console.error('❌ Ошибка при получении метрик по сегментам:', error.message);
            throw error;
        }
    }

    /**
     * Получить данные воронки конверсий
     * TODO: Реализовать полную логику с расчётом воронки
     * 
     * @param {number} campaignId - ID кампании
     * @param {Date} fromDate - начало периода
     * @param {Date} toDate - конец периода
     * @returns {Promise<object>} Объект с данными воронки:
     *   {
     *     views: 1000,           // всего shows (impressions)
     *     clicks: 100,           // всего clicks
     *     conversions: 20,       // всего conversions
     *     clickRate: 10.0,       // CTR = clicks / views * 100
     *     conversionRate: 20.0   // CR = conversions / clicks * 100
     *   }
     * 
     * TODO: SQL-запросы для воронки:
     * 
     * 1. Views (impressions):
     *    SELECT COUNT(*) as views
     *    FROM analytics_ad_impressions
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 2. Clicks:
     *    SELECT COUNT(*) as clicks
     *    FROM analytics_ad_clicks
     *    WHERE campaign_id = :campaignId
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * 3. Conversions:
     *    SELECT COUNT(*) as conversions
     *    FROM analytics_ad_conversions
     *    WHERE campaign_id = :campaignId
     *    AND status = 'confirmed'
     *    AND created_at BETWEEN :fromDate AND :toDate
     * 
     * TODO: Рассчитать процентные соотношения:
     * - clickRate = views > 0 ? (clicks / views * 100) : 0
     * - conversionRate = clicks > 0 ? (conversions / clicks * 100) : 0
     */
    async getFunnelData(campaignId, fromDate, toDate) {
        console.log(`🔗 Получение данных воронки: кампания ${campaignId}, ${fromDate} - ${toDate}`);

        try {
            // TODO: Валидация входных параметров
            if (!campaignId || !fromDate || !toDate) {
                throw new Error('Invalid parameters: campaignId, fromDate, toDate are required');
            }

            // TODO: Выполнить три SQL-запроса параллельно
            // const [views, clicks, conversions] = await Promise.all([
            //     this.queryFunnelViews(campaignId, fromDate, toDate),
            //     this.queryFunnelClicks(campaignId, fromDate, toDate),
            //     this.queryFunnelConversions(campaignId, fromDate, toDate)
            // ]);

            // TODO: Рассчитать метрики воронки
            // const funnelData = {
            //     views,
            //     clicks,
            //     conversions,
            //     clickRate: views > 0 ? (clicks / views * 100).toFixed(2) : 0,
            //     conversionRate: clicks > 0 ? (conversions / clicks * 100).toFixed(2) : 0
            // };

            // return funnelData;

            throw new Error('Not implemented yet');

        } catch (error) {
            console.error('❌ Ошибка при получении данных воронки:', error.message);
            throw error;
        }
    }

    /**
     * TODO: Вспомогательные методы SQL-запросов (только сигнатуры, реализация позже)
     */

    /**
     * TODO: Получить UV (уникальные сессии) за период
     */
    async queryUV(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryUV');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить Impressions за период
     */
    async queryImpressions(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryImpressions');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить Reach (unique impressions) за период
     */
    async queryReach(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryReach');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить Clicks за период
     */
    async queryClicks(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryClicks');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить Conversions за период
     */
    async queryConversions(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryConversions');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить Cost (сумму затрат) за период
     */
    async queryCost(campaignId, fromDate, toDate) {
        console.log('📊 SQL: queryCost');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить ежедневные Impressions
     */
    async queryDailyImpressions(campaignId, fromDate, toDate) {
        console.log('📅 SQL: queryDailyImpressions');
        // TODO: Реализовать SQL-запрос с GROUP BY DATE(created_at)
        return [];
    }

    /**
     * TODO: Получить ежедневные Clicks
     */
    async queryDailyClicks(campaignId, fromDate, toDate) {
        console.log('📅 SQL: queryDailyClicks');
        // TODO: Реализовать SQL-запрос с GROUP BY DATE(created_at)
        return [];
    }

    /**
     * TODO: Получить ежедневные Conversions
     */
    async queryDailyConversions(campaignId, fromDate, toDate) {
        console.log('📅 SQL: queryDailyConversions');
        // TODO: Реализовать SQL-запрос с GROUP BY DATE(created_at)
        return [];
    }

    /**
     * TODO: Получить ежедневные UV
     */
    async queryDailyUV(campaignId, fromDate, toDate) {
        console.log('📅 SQL: queryDailyUV');
        // TODO: Реализовать SQL-запрос с GROUP BY DATE(created_at)
        return [];
    }

    /**
     * TODO: Получить метрики по сегментам - Impressions
     */
    async querySegmentImpressions(campaignId, fromDate, toDate) {
        console.log('🏪 SQL: querySegmentImpressions');
        // TODO: Реализовать SQL-запрос с GROUP BY restaurant_segment
        return [];
    }

    /**
     * TODO: Получить метрики по сегментам - Clicks
     */
    async querySegmentClicks(campaignId, fromDate, toDate) {
        console.log('🏪 SQL: querySegmentClicks');
        // TODO: Реализовать SQL-запрос с GROUP BY restaurant_segment
        return [];
    }

    /**
     * TODO: Получить метрики по сегментам - Conversions
     */
    async querySegmentConversions(campaignId, fromDate, toDate) {
        console.log('🏪 SQL: querySegmentConversions');
        // TODO: Реализовать SQL-запрос с GROUP BY restaurant_segment
        return [];
    }

    /**
     * TODO: Получить метрики воронки - Views (Impressions)
     */
    async queryFunnelViews(campaignId, fromDate, toDate) {
        console.log('🔗 SQL: queryFunnelViews');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить метрики воронки - Clicks
     */
    async queryFunnelClicks(campaignId, fromDate, toDate) {
        console.log('🔗 SQL: queryFunnelClicks');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * TODO: Получить метрики воронки - Conversions
     */
    async queryFunnelConversions(campaignId, fromDate, toDate) {
        console.log('🔗 SQL: queryFunnelConversions');
        // TODO: Реализовать SQL-запрос
        return 0;
    }

    /**
     * Merge результатов ежедневных метрик в единый массив
     * 
     * Должен:
     * 1. Объединить три массива (impressions, clicks, conversions) по дате
     * 2. Заполнить дни без данных нулями
     * 3. Вернуть отсортированный массив по дате
     */
    mergeDailyData(impressionsByDay, clicksByDay, conversionsByDay, fromDate, toDate) {
        console.log('🔀 Merge ежедневных данных');

        // Создать map для хранения данных по дате
        const dailyMap = {};

        // Заполнить дни из диапазона нулями
        const start = new Date(fromDate);
        const end = new Date(toDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = {
                date: dateStr,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                ctr: 0,
                cr: 0
            };
        }

        // Добавить данные impressions
        impressionsByDay.forEach(row => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (dailyMap[dateStr]) {
                dailyMap[dateStr].impressions = parseInt(row.impressions || 0, 10);
            }
        });

        // Добавить данные clicks
        clicksByDay.forEach(row => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (dailyMap[dateStr]) {
                dailyMap[dateStr].clicks = parseInt(row.clicks || 0, 10);
            }
        });

        // Добавить данные conversions
        conversionsByDay.forEach(row => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (dailyMap[dateStr]) {
                dailyMap[dateStr].conversions = parseInt(row.conversions || 0, 10);
            }
        });

        // Рассчитать CTR и CR
        Object.values(dailyMap).forEach(day => {
            // CTR = (clicks / impressions) * 100
            day.ctr = day.impressions > 0 
                ? parseFloat(((day.clicks / day.impressions) * 100).toFixed(2)) 
                : 0;

            // CR = (conversions / clicks) * 100
            day.cr = day.clicks > 0 
                ? parseFloat(((day.conversions / day.clicks) * 100).toFixed(2)) 
                : 0;
        });

        // Вернуть отсортированный массив
        const result = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        return result;
    }

    /**
     * TODO: Merge результатов метрик по сегментам в единый массив
     * 
     * Должен объединить три массива по сегментам
     */
    mergeSegmentData(impressionsBySegment, clicksBySegment, conversionsBySegment) {
        console.log('🔀 Merge данных по сегментам');
        // TODO: Реализовать логику merge
        return [];
    }
}

module.exports = ReportsDataService;

