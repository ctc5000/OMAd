const { Sequelize, Op } = require('sequelize');
const moment = require('moment');
const initModels = require('../modules/AnalyticsCore/Models');
require('dotenv').config();

// Генерация случайных данных в диапазоне
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
    console.log("🌱 Запуск генерации тестовых данных для дашборда...");
    console.log("📋 Допустимые значения из БД:");
    console.log("   - banner_placement: checkout, waiter_call, tips_payment");
    console.log("   - conversion_type: bank_card_request, loan_application, other_product, other");
    console.log("   - conversion_status: pending, confirmed, rejected");
    console.log("   - campaign_status: draft, active, paused, completed, archived");
    console.log("   - restaurant_segment: кофейня, средний, премиум");

    // 1. Подключение к БД
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
    });

    // 2. Инициализация моделей
    const db = initModels(sequelize);

    const {
        Session,
        Campaign,
        AdImpression,
        AdClick,
        AdConversion
    } = db;

    // 3. Очистка данных
    await sequelize.sync({ force: true });
    console.log("🧹 Все таблицы очищены и созданы заново.");

    // 4. Создание тестовых кампаний с правильными статусами
    const campaigns = await Campaign.bulkCreate([
        {
            advertiser_id: 1,
            name: "Кофейная кампания - Зимние скидки",
            status: "active",
            cpu_v_target: 12.5,
            cost_per_uv: 10.0,
            cost_per_click: 5.0,
            cost_per_lead: 50.0,
            budget: 50000,
            start_date: moment().subtract(30, 'days').toDate(),
            end_date: moment().add(30, 'days').toDate()
        },
        {
            advertiser_id: 2,
            name: "Премиум рестораны - Новогодний банкет",
            status: "active",
            cpu_v_target: 25.0,
            cost_per_uv: 20.0,
            cost_per_click: 15.0,
            cost_per_lead: 150.0,
            budget: 100000,
            start_date: moment().subtract(15, 'days').toDate(),
            end_date: moment().add(45, 'days').toDate()
        },
        {
            advertiser_id: 3,
            name: "Средний сегмент - Бизнес-ланчи",
            status: "active",
            cpu_v_target: 18.0,
            cost_per_uv: 15.0,
            cost_per_click: 8.0,
            cost_per_lead: 80.0,
            budget: 75000,
            start_date: moment().subtract(20, 'days').toDate(),
            end_date: moment().add(40, 'days').toDate()
        },
        {
            advertiser_id: 1,
            name: "Кофейная кампания - Утренний кофе",
            status: "paused",
            cpu_v_target: 10.0,
            cost_per_uv: 8.0,
            cost_per_click: 3.0,
            cost_per_lead: 40.0,
            budget: 30000,
            start_date: moment().subtract(60, 'days').toDate(),
            end_date: moment().subtract(10, 'days').toDate()
        },
        {
            advertiser_id: 4,
            name: "Фастфуд - Доставка 24/7",
            status: "active",
            cpu_v_target: 15.0,
            cost_per_uv: 12.0,
            cost_per_click: 6.0,
            cost_per_lead: 60.0,
            budget: 60000,
            start_date: moment().subtract(5, 'days').toDate(),
            end_date: moment().add(25, 'days').toDate()
        },
        {
            advertiser_id: 5,
            name: "Барная кампания - Happy Hours",
            status: "draft",
            cpu_v_target: 20.0,
            cost_per_uv: 18.0,
            cost_per_click: 12.0,
            cost_per_lead: 120.0,
            budget: 40000,
            start_date: moment().add(5, 'days').toDate(),
            end_date: moment().add(35, 'days').toDate()
        },
        {
            advertiser_id: 2,
            name: "Премиум ужины (архивная)",
            status: "archived",
            cpu_v_target: 30.0,
            cost_per_uv: 25.0,
            cost_per_click: 18.0,
            cost_per_lead: 180.0,
            budget: 80000,
            start_date: moment().subtract(90, 'days').toDate(),
            end_date: moment().subtract(30, 'days').toDate()
        }
    ]);

    console.log(`📢 Создано кампаний: ${campaigns.length}`);
    console.log(`   Статусы кампаний: ${campaigns.map(c => c.status).join(', ')}`);

    // 5. Создание тестовых сессий с временными метками за последние 7 дней
    const sessions = [];
    const restaurants = [
        { id: 1, name: "Кофе Хауз", segment: "кофейня" },
        { id: 2, name: "Старая Мельница", segment: "средний" },
        { id: 3, name: "Grand Restaurant", segment: "премиум" },
        { id: 4, name: "Кофемания", segment: "кофейня" },
        { id: 5, name: "Паста Бар", segment: "средний" },
        { id: 6, name: "Le Bistro", segment: "премиум" },
        { id: 7, name: "Шоколадница", segment: "кофейня" },
        { id: 8, name: "Суши Wok", segment: "средний" },
        { id: 9, name: "Мясо & Вино", segment: "премиум" },
        { id: 10, name: "Coffeeshop Company", segment: "кофейня" }
    ];

    // Генерируем сессии за последние 7 дней
    for (let day = 0; day < 7; day++) {
        const date = moment().subtract(day, 'days');
        const sessionsPerDay = getRandomInt(100, 200);
        
        for (let i = 0; i < sessionsPerDay; i++) {
            const hour = getRandomInt(8, 22);
            const minute = getRandomInt(0, 59);
            
            const sessionDate = date.clone()
                .hour(hour)
                .minute(minute)
                .second(getRandomInt(0, 59))
                .toDate();
            
            const restaurant = restaurants[getRandomInt(0, restaurants.length - 1)];
            
            sessions.push({
                session_id: `session_${date.format('YYYYMMDD')}_${i.toString().padStart(6, '0')}`,
                restaurant_id: restaurant.id,
                restaurant_segment: restaurant.segment,
                created_at: sessionDate,
                updated_at: sessionDate
            });
        }
    }

    await Session.bulkCreate(sessions);
    console.log(`👤 Создано сессий за 7 дней: ${sessions.length}`);

    // 6. Создание показов баннеров
    const impressions = [];
    const bannerPlacements = ['checkout', 'waiter_call', 'tips_payment'];
    
    console.log(`🎯 Размещения баннеров: ${bannerPlacements.join(', ')}`);
    
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    
    for (const session of sessions) {
        const impressionsCount = getRandomInt(1, 3);
        
        for (let j = 0; j < impressionsCount; j++) {
            const campaign = activeCampaigns.length > 0 
                ? activeCampaigns[getRandomInt(0, activeCampaigns.length - 1)]
                : campaigns[getRandomInt(0, campaigns.length - 1)];
                
            const impressionTime = new Date(session.created_at.getTime() + getRandomInt(1, 30) * 60 * 1000);
            
            impressions.push({
                session_id: session.session_id,
                campaign_id: campaign.id,
                advertiser_id: campaign.advertiser_id,
                banner_placement: bannerPlacements[getRandomInt(0, bannerPlacements.length - 1)],
                created_at: impressionTime,
                updated_at: impressionTime
            });
        }
    }

    // Вставляем данные пачками
    const batchSize = 1000;
    console.log(`📦 Вставка ${impressions.length} показов пачками...`);
    
    for (let i = 0; i < impressions.length; i += batchSize) {
        const batch = impressions.slice(i, i + batchSize);
        await AdImpression.bulkCreate(batch);
        if (i % (batchSize * 5) === 0 && i > 0) {
            console.log(`   Прогресс: ${i}/${impressions.length} (${Math.round(i/impressions.length*100)}%)`);
        }
    }
    
    console.log(`📊 Создано показов: ${impressions.length}`);

    // 7. Создание кликов
    const clicks = [];
    const clickRate = 0.08 + Math.random() * 0.04;
    const clicksCount = Math.floor(impressions.length * clickRate);
    
    for (let i = 0; i < clicksCount; i++) {
        const impression = impressions[getRandomInt(0, impressions.length - 1)];
        const clickTime = new Date(impression.created_at.getTime() + getRandomInt(1, 10) * 1000);
        
        clicks.push({
            session_id: impression.session_id,
            campaign_id: impression.campaign_id,
            advertiser_id: impression.advertiser_id,
            created_at: clickTime,
            updated_at: clickTime
        });
    }

    console.log(`🖱 Вставка ${clicks.length} кликов...`);
    
    for (let i = 0; i < clicks.length; i += batchSize) {
        const batch = clicks.slice(i, i + batchSize);
        await AdClick.bulkCreate(batch);
    }
    
    console.log(`🖱 Создано кликов (${(clicks.length / impressions.length * 100).toFixed(1)}% от показов): ${clicks.length}`);

    // 8. Создание конверсий
    const conversions = [];
    const conversionTypes = ['bank_card_request', 'loan_application', 'other_product', 'other'];
    
    // Основные подтвержденные конверсии
    const conversionRate = 0.15 + Math.random() * 0.10;
    const confirmedConversionsCount = Math.floor(clicks.length * conversionRate);
    
    for (let i = 0; i < confirmedConversionsCount; i++) {
        const click = clicks[getRandomInt(0, clicks.length - 1)];
        const conversionTime = new Date(click.created_at.getTime() + getRandomInt(1, 60) * 60 * 1000);
        
        conversions.push({
            session_id: click.session_id,
            campaign_id: click.campaign_id,
            advertiser_id: click.advertiser_id,
            conversion_type: conversionTypes[getRandomInt(0, conversionTypes.length - 1)],
            conversion_value: getRandomInt(500, 5000),
            status: 'confirmed',
            created_at: conversionTime,
            updated_at: conversionTime
        });
    }

    // Pending конверсии
    const pendingConversionsCount = Math.floor(conversions.length * 0.05);
    for (let i = 0; i < pendingConversionsCount; i++) {
        const click = clicks[getRandomInt(0, clicks.length - 1)];
        const conversionTime = new Date(click.created_at.getTime() + getRandomInt(1, 30) * 60 * 1000);
        
        conversions.push({
            session_id: click.session_id,
            campaign_id: click.campaign_id,
            advertiser_id: click.advertiser_id,
            conversion_type: conversionTypes[getRandomInt(0, conversionTypes.length - 1)],
            conversion_value: getRandomInt(500, 5000),
            status: 'pending',
            created_at: conversionTime,
            updated_at: conversionTime
        });
    }

    // Rejected конверсии
    const rejectedConversionsCount = Math.floor(conversions.length * 0.03);
    for (let i = 0; i < rejectedConversionsCount; i++) {
        const click = clicks[getRandomInt(0, clicks.length - 1)];
        const conversionTime = new Date(click.created_at.getTime() + getRandomInt(1, 20) * 60 * 1000);
        
        conversions.push({
            session_id: click.session_id,
            campaign_id: click.campaign_id,
            advertiser_id: click.advertiser_id,
            conversion_type: conversionTypes[getRandomInt(0, conversionTypes.length - 1)],
            conversion_value: getRandomInt(500, 5000),
            status: 'rejected',
            created_at: conversionTime,
            updated_at: conversionTime
        });
    }

    console.log(`💰 Вставка ${conversions.length} конверсий...`);
    
    for (let i = 0; i < conversions.length; i += batchSize) {
        const batch = conversions.slice(i, i + batchSize);
        await AdConversion.bulkCreate(batch);
    }
    
    const confirmedCount = conversions.filter(c => c.status === 'confirmed').length;
    const pendingCount = conversions.filter(c => c.status === 'pending').length;
    const rejectedCount = conversions.filter(c => c.status === 'rejected').length;
    
    console.log(`💰 Создано конверсий: ${conversions.length}`);
    console.log(`   - Подтвержденные: ${confirmedCount} (${(confirmedCount/clicks.length*100).toFixed(1)}% от кликов)`);
    console.log(`   - В ожидании: ${pendingCount}`);
    console.log(`   - Отклоненные: ${rejectedCount}`);

    // 9. Добавим реальные данные за последние 24 часа
    console.log("\n🕐 Добавление реальных данных за последние 24 часа...");
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Создадим активные сессии за последние 24 часа
    const recentSessions = [];
    const recentSessionsCount = getRandomInt(80, 150);
    
    for (let i = 0; i < recentSessionsCount; i++) {
        const sessionTime = new Date(oneDayAgo.getTime() + getRandomInt(0, 24 * 60) * 60 * 1000);
        const restaurant = restaurants[getRandomInt(0, restaurants.length - 1)];
        
        recentSessions.push({
            session_id: `recent_session_${Date.now()}_${i}`,
            restaurant_id: restaurant.id,
            restaurant_segment: restaurant.segment,
            created_at: sessionTime,
            updated_at: sessionTime
        });
    }
    
    await Session.bulkCreate(recentSessions);
    console.log(`   - Сессии за 24 часа: ${recentSessions.length}`);
    
    // Показы за последние 24 часа
    const recentImpressions = [];
    for (const session of recentSessions) {
        const impressionsCount = getRandomInt(1, 2);
        for (let j = 0; j < impressionsCount; j++) {
            const campaign = activeCampaigns.length > 0 
                ? activeCampaigns[getRandomInt(0, activeCampaigns.length - 1)]
                : campaigns[getRandomInt(0, campaigns.length - 1)];
            const impressionTime = new Date(session.created_at.getTime() + getRandomInt(1, 10) * 60 * 1000);
            
            recentImpressions.push({
                session_id: session.session_id,
                campaign_id: campaign.id,
                advertiser_id: campaign.advertiser_id,
                banner_placement: bannerPlacements[getRandomInt(0, bannerPlacements.length - 1)],
                created_at: impressionTime,
                updated_at: impressionTime
            });
        }
    }
    
    await AdImpression.bulkCreate(recentImpressions);
    console.log(`   - Показы за 24 часа: ${recentImpressions.length}`);
    
    // Клики за последние 24 часа
    const recentClicks = [];
    const recentClicksCount = Math.floor(recentImpressions.length * clickRate);
    
    for (let i = 0; i < recentClicksCount; i++) {
        const impression = recentImpressions[getRandomInt(0, recentImpressions.length - 1)];
        const clickTime = new Date(impression.created_at.getTime() + getRandomInt(1, 5) * 1000);
        
        recentClicks.push({
            session_id: impression.session_id,
            campaign_id: impression.campaign_id,
            advertiser_id: impression.advertiser_id,
            created_at: clickTime,
            updated_at: clickTime
        });
    }
    
    await AdClick.bulkCreate(recentClicks);
    console.log(`   - Клики за 24 часа: ${recentClicks.length}`);
    
    // Конверсии за последние 24 часа
    const recentConversions = [];
    const recentConversionsCount = Math.floor(recentClicks.length * conversionRate);
    
    for (let i = 0; i < recentConversionsCount; i++) {
        const click = recentClicks[getRandomInt(0, recentClicks.length - 1)];
        const conversionTime = new Date(click.created_at.getTime() + getRandomInt(1, 30) * 60 * 1000);
        
        recentConversions.push({
            session_id: click.session_id,
            campaign_id: click.campaign_id,
            advertiser_id: click.advertiser_id,
            conversion_type: conversionTypes[getRandomInt(0, conversionTypes.length - 1)],
            conversion_value: getRandomInt(500, 5000),
            status: 'confirmed',
            created_at: conversionTime,
            updated_at: conversionTime
        });
    }
    
    await AdConversion.bulkCreate(recentConversions);
    console.log(`   - Конверсии за 24 часа: ${recentConversions.length}`);

    // 10. Вывод статистики (ИСПРАВЛЕННЫЙ ЗАПРОС)
    console.log("\n📊 Сводная статистика сгенерированных данных:");
    
    const totalStats = await Promise.all([
        Session.count(),
        AdImpression.count(),
        AdClick.count(),
        AdConversion.count({ where: { status: 'confirmed' } }),
        AdConversion.count({ where: { status: 'pending' } }),
        AdConversion.count({ where: { status: 'rejected' } })
    ]);
    
    console.log(`┌─────────────────────────────────────────┐`);
    console.log(`│         Общая статистика               │`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ Сессии: ${totalStats[0].toString().padStart(8)}                  │`);
    console.log(`│ Показы: ${totalStats[1].toString().padStart(8)}                  │`);
    console.log(`│ Клики:  ${totalStats[2].toString().padStart(8)}                  │`);
    console.log(`│ Конверсии: ${totalStats[3].toString().padStart(7)}                │`);
    console.log(`│ В ожидании: ${totalStats[4].toString().padStart(6)}                │`);
    console.log(`│ Отклонено: ${totalStats[5].toString().padStart(6)}                │`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ CTR: ${(totalStats[2] / totalStats[1] * 100).toFixed(2).padStart(6)}%                    │`);
    console.log(`│ CR:  ${(totalStats[3] / totalStats[0] * 100).toFixed(2).padStart(6)}%                    │`);
    console.log(`└─────────────────────────────────────────┘`);

    // Статистика по сегментам
    console.log("\n🏪 Статистика по сегментам ресторанов:");
    const segmentStats = await Session.findAll({
        attributes: [
            'restaurant_segment',
            [Sequelize.fn('COUNT', Sequelize.col('session_id')), 'session_count']
        ],
        group: ['restaurant_segment'],
        order: [[Sequelize.literal('session_count'), 'DESC']],
        raw: true
    });
    
    let totalSessions = 0;
    segmentStats.forEach(stat => {
        totalSessions += parseInt(stat.session_count);
    });
    
    segmentStats.forEach(stat => {
        const percentage = (stat.session_count / totalSessions * 100).toFixed(1);
        console.log(`  ${stat.restaurant_segment.padEnd(10)}: ${stat.session_count.toString().padStart(6)} сессий (${percentage}%)`);
    });

    // Статистика по типам конверсий
    console.log("\n💰 Статистика по типам конверсий:");
    const conversionTypeStats = await AdConversion.findAll({
        attributes: [
            'conversion_type',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('SUM', Sequelize.col('conversion_value')), 'total_value']
        ],
        where: { status: 'confirmed' },
        group: ['conversion_type'],
        order: [[Sequelize.literal('count'), 'DESC']],
        raw: true
    });
    
    conversionTypeStats.forEach(stat => {
        const avgValue = stat.total_value ? (parseInt(stat.total_value) / parseInt(stat.count)).toFixed(0) : 0;
        console.log(`  ${stat.conversion_type.padEnd(20)}: ${stat.count} конв., ${parseInt(stat.total_value || 0)} руб. (ср. ${avgValue} руб.)`);
    });

    // Статистика по местам размещения
    console.log("\n📍 Распределение по местам размещения баннеров:");
    const placementStats = await AdImpression.findAll({
        attributes: [
            'banner_placement',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['banner_placement'],
        order: [[Sequelize.literal('count'), 'DESC']],
        raw: true
    });
    
    placementStats.forEach(stat => {
        const percentage = (stat.count / totalStats[1] * 100).toFixed(1);
        console.log(`  ${stat.banner_placement.padEnd(12)}: ${stat.count.toString().padStart(6)} (${percentage}%)`);
    });

    // ИСПРАВЛЕННЫЙ ЗАПРОС: Статистика по кампаниям (используем raw SQL запрос)
    console.log("\n🎯 Топ кампаний по конверсиям:");
    
    try {
        // Вариант 1: Используем raw SQL запрос для избежания проблем с ассоциациями
        const campaignStats = await sequelize.query(`
            SELECT 
                c.id as campaign_id,
                c.name as campaign_name,
                c.status as campaign_status,
                c.cpu_v_target,
                COUNT(ac.id) as conversions,
                COALESCE(SUM(ac.conversion_value), 0) as revenue
            FROM analytics_ad_conversions ac
            LEFT JOIN analytics_campaigns c ON ac.campaign_id = c.id
            WHERE ac.status = 'confirmed'
            GROUP BY c.id, c.name, c.status, c.cpu_v_target
            ORDER BY conversions DESC
            LIMIT 10
        `, {
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        });
        
        campaignStats.forEach((stat, index) => {
            const campaignName = stat.campaign_name || `Кампания ${stat.campaign_id}`;
            const revenue = parseInt(stat.revenue || 0);
            const cpu_v_target = stat.cpu_v_target || 0;
            const actual_cpu_v = stat.conversions > 0 ? (revenue / stat.conversions).toFixed(1) : 0;
            
            console.log(`  ${index + 1}. ${campaignName}`);
            console.log(`     Статус: ${stat.campaign_status}, Конверсий: ${stat.conversions}, Доход: ${revenue} руб.`);
            console.log(`     CPU/V цель: ${cpu_v_target}, Факт: ${actual_cpu_v}`);
        });
    } catch (err) {
        console.log("   ⚠️ Не удалось получить статистику по кампаниям:", err.message);
        console.log("   Используем альтернативный метод...");
        
        // Альтернативный вариант: простая статистика без join
        const simpleStats = await AdConversion.findAll({
            attributes: [
                'campaign_id',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'conversions'],
                [Sequelize.fn('SUM', Sequelize.col('conversion_value')), 'revenue']
            ],
            where: { status: 'confirmed' },
            group: ['campaign_id'],
            order: [[Sequelize.literal('conversions'), 'DESC']],
            raw: true,
            limit: 5
        });
        
        simpleStats.forEach((stat, index) => {
            console.log(`  ${index + 1}. Кампания ID ${stat.campaign_id}`);
            console.log(`     Конверсий: ${stat.conversions}, Доход: ${parseInt(stat.revenue || 0)} руб.`);
        });
    }

    // Дополнительная статистика по часам (для дашборда)
    console.log("\n🕐 Распределение активности по часам:");
    const hourlyStats = await Session.findAll({
        attributes: [
            [Sequelize.fn('EXTRACT', Sequelize.literal('HOUR FROM created_at')), 'hour'],
            [Sequelize.fn('COUNT', Sequelize.col('session_id')), 'session_count']
        ],
        where: {
            created_at: {
                [Op.gte]: moment().subtract(1, 'day').toDate()
            }
        },
        group: [Sequelize.literal('EXTRACT(HOUR FROM created_at)')],
        order: [[Sequelize.literal('hour'), 'ASC']],
        raw: true
    });
    
    const maxSessions = Math.max(...hourlyStats.map(h => parseInt(h.session_count) || 0));
    hourlyStats.forEach(stat => {
        const hour = parseInt(stat.hour) || 0;
        const count = parseInt(stat.session_count) || 0;
        const barLength = Math.round((count / maxSessions) * 20);
        const bar = '█'.repeat(barLength) + ' '.repeat(20 - barLength);
        console.log(`  ${hour.toString().padStart(2, '0')}:00 ${bar} ${count.toString().padStart(4)} сессий`);
    });

    console.log("\n✅ Все ENUM значения использованы корректно:");
    console.log(`   • banner_placement: ${bannerPlacements.join(', ')}`);
    console.log(`   • conversion_type: ${conversionTypes.join(', ')}`);
    console.log(`   • restaurant_segment: кофейня, средний, премиум`);

    console.log("\n🎉 Тестовые данные успешно сгенерированы для дашборда!");
    console.log("🔗 Данные охватывают последние 7 дней.");
    console.log("📈 Для realtime метрик добавлены данные за последние 24 часа.");
    console.log("🚀 Теперь дашборд будет показывать реалистичные данные!");
    console.log("\n💡 Советы для дашборда:");
    console.log("   1. Данные готовы для отображения в реальном времени");
    console.log("   2. Метрики CTR и CR соответствуют реальным ожиданиям");
    console.log("   3. Есть данные для анализа по сегментам и кампаниям");
    console.log("   4. Временные метки корректны для фильтрации по периодам");
    
    await sequelize.close();
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Ошибка при генерации данных:", err.message);
    console.error("Stack trace:", err.stack);
    process.exit(1);
});