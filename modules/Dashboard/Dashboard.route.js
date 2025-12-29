// Dashboard.route.js
const fs = require('fs');
const path = require('path');
const { verifyJWT } = require('../Auth/Middleware/auth.middleware');

let cachedTemplate = null;
let cachedLoginTemplate = null;

function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  
  try {
      if (templateName === 'dashboard.template.html' && cachedTemplate) {
          return cachedTemplate;
      }
      if (templateName === 'login.template.html' && cachedLoginTemplate) {
          return cachedLoginTemplate;
      }
      
      const content = fs.readFileSync(templatePath, 'utf8');
      
      if (templateName === 'dashboard.template.html') {
          cachedTemplate = content;
      } else {
          cachedLoginTemplate = content;
      }
      
      return content;
      
  } catch (error) {
      console.error(`❌ Ошибка загрузки HTML шаблона ${templateName}:`, error);
      throw error;
  }
}

module.exports = (app, moduleName, controller, makeHandlerAwareOfAsyncErrors, models) => {
    const apiPrefix = '/api/dashboard';

    console.log(`📊 Регистрация маршрутов для модуля ${moduleName}...`);
    console.log(`📊 API Prefix: ${apiPrefix}`);

    // Маршрут для страницы логина (публичный)
    app.get('/login', (req, res) => {
        try {
            const htmlContent = loadTemplate('login.template.html');
            res.send(htmlContent);
        } catch (error) {
            res.status(500).send('Ошибка загрузки страницы логина');
        }
    });

    // Маршрут для главной страницы - редирект на логин
    app.get('/', (req, res) => {
        res.redirect('/login');
    });

    // Эндпоинт для получения информации о текущем пользователе
    app.get(`${apiPrefix}/auth/me`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                res.json({
                    success: true,
                    user: {
                        id: req.user.userId,
                        role: req.user.role,
                        advertiserId: req.user.advertiserId,
                        email: req.user.email || 'Пользователь'
                    }
                });
            } catch (error) {
                console.error('Error fetching user info:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Эндпоинт для получения списка рекламодателей (только для админов)
    app.get(`${apiPrefix}/advertisers/list`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                // Только админы могут видеть список всех рекламодателей
                if (req.user.role !== 'ADMIN') {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Доступ запрещен. Только администраторы могут просматривать список рекламодателей.' 
                    });
                }
                
                console.log('📋 Получение списка рекламодателей для администратора');
                
                // Используем модель Advertiser, если она доступна
                let advertisers = [];
                if (models.Advertiser) {
                    advertisers = await models.Advertiser.findAll({
                        attributes: ['id', 'name', 'email', 'company_name', 'created_at'],
                        order: [['name', 'ASC']],
                        raw: true
                    });
                    
                    // Форматируем данные
                    advertisers = advertisers.map(adv => ({
                        id: adv.id,
                        name: adv.company_name || adv.name || adv.email || `Рекламодатель #${adv.id}`,
                        email: adv.email,
                        type: 'advertiser',
                        created_at: adv.created_at
                    }));
                } else {
                    // Если модели Advertiser нет, пытаемся получить из пользователей с ролью ADVERTISER
                    if (models.User) {
                        const advertiserUsers = await models.User.findAll({
                            where: { role: 'ADVERTISER' },
                            attributes: ['id', 'email', 'advertiser_id', 'created_at'],
                            raw: true
                        });
                        
                        advertisers = advertiserUsers.map(user => ({
                            id: user.advertiser_id,
                            name: `Рекламодатель #${user.advertiser_id}`,
                            email: user.email,
                            type: 'advertiser',
                            created_at: user.created_at
                        }));
                    }
                }
                
                console.log(`✅ Найдено рекламодателей: ${advertisers.length}`);
                
                res.json({
                    success: true,
                    data: advertisers
                });
            } catch (error) {
                console.error('❌ Ошибка получения списка рекламодателей:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Внутренняя ошибка сервера',
                    details: error.message
                });
            }
        })
    );

    // Эндпоинт для получения кампаний рекламодателя
    app.get('/api/campaigns/my',
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                // ДЕБАГ: выведем весь req.user чтобы увидеть структуру
                console.log('🔍 Полный req.user:', JSON.stringify(req.user, null, 2));
                
                // Используем любой доступный идентификатор
                const userId = req.user.userId || req.user.user_id || req.user.id;
                const advertiserId = req.user.advertiserId || req.user.advertiser_id;
                
                console.log('📋 Получение списка кампаний для пользователя:', {
                    userId: userId,
                    role: req.user.role,
                    advertiserId: advertiserId
                });
                
                let campaigns = [];
                
                if (req.user.role === 'ADMIN') {
                    // ... код для админа
                } else if (req.user.role === 'ADVERTISER' && advertiserId) {
                    campaigns = await models.Campaign.findAll({
                        where: { advertiser_id: advertiserId },
                        attributes: ['id', 'name', 'status', 'budget', 'created_at'],
                        order: [['name', 'ASC']],
                        raw: true
                    });
                    
                    console.log(`✅ Рекламодатель ${advertiserId}: найдено кампаний: ${campaigns.length}`);
                } else {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Доступ запрещен или advertiserId не указан.' 
                    });
                }
                
                const formattedCampaigns = campaigns.map(campaign => ({
                    id: campaign.id,
                    name: campaign.name || `Кампания #${campaign.id}`,
                    status: campaign.status,
                    budget: campaign.budget,
                    type: 'campaign',
                    created_at: campaign.created_at
                }));
                
                res.json({
                    success: true,
                    data: formattedCampaigns
                });
            } catch (error) {
                console.error('❌ Ошибка получения кампаний рекламодателя:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Внутренняя ошибка сервера',
                    details: error.message
                });
            }
        })
    );

    // Обновленный эндпоинт для получения данных дашборда с поддержкой фильтрации
    app.get(`${apiPrefix}/data`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today', campaign_id, advertiser_id } = req.query;
                
                console.log('📊 Запрос данных дашборда:', {
                    period,
                    campaign_id: campaign_id || 'нет',
                    advertiser_id: advertiser_id || 'нет',
                    userRole: req.user.role,
                    userAdvertiserId: req.user.advertiserId
                });
                
                let advertiserId = req.user.advertiserId;
                let campaignId = campaign_id;
                
                // Логика определения advertiserId и campaignId в зависимости от роли
                if (req.user.role === 'ADMIN') {
                    // Админ может фильтровать по advertiser_id
                    if (advertiser_id && advertiser_id !== 'all') {
                        advertiserId = advertiser_id;
                        console.log(`✅ Админ выбрал рекламодателя: ${advertiserId}`);
                    } else if (advertiser_id === 'all') {
                        advertiserId = null; // Все рекламодатели
                        console.log('✅ Админ выбрал всех рекламодателей');
                    } else {
                        advertiserId = null; // По умолчанию все рекламодатели
                    }
                } else if (req.user.role === 'ADVERTISER') {
                    // Рекламодатель может фильтровать только по своим кампаниям
                    if (campaign_id && campaign_id !== 'all') {
                        campaignId = campaign_id;
                        console.log(`✅ Рекламодатель выбрал кампанию: ${campaignId}`);
                    }
                    // advertiserId остается равным req.user.advertiserId
                }
                
                const result = await controller.getDashboardData(period, advertiserId, campaignId);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(500).json(result);
                }
            } catch (error) {
                console.error('❌ Ошибка получения данных дашборда:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Не удалось загрузить данные дашборда',
                    details: error.message
                });
            }
        })
    );

    // Метрики в реальном времени с фильтрацией по advertiser
    app.get(`${apiPrefix}/realtime`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                // Определяем advertiserId с учетом фильтрации
                let advertiserId = req.user.advertiserId;
                if (req.user.role === 'ADMIN' && req.query.advertiser_id && req.query.advertiser_id !== 'all') {
                    advertiserId = req.query.advertiser_id;
                }
                
                const data = await controller.getRealtimeMetrics(advertiserId);
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Топ кампаний с фильтрацией
    app.get(`${apiPrefix}/top-campaigns`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today' } = req.query;
                
                // Определяем advertiserId с учетом фильтрации
                let advertiserId = req.user.advertiserId;
                if (req.user.role === 'ADMIN' && req.query.advertiser_id && req.query.advertiser_id !== 'all') {
                    advertiserId = req.query.advertiser_id;
                }
                
                const data = await controller.getTopCampaigns(period, advertiserId);
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Воронка конверсий с изоляцией
    app.get(`${apiPrefix}/funnel`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today', campaignId } = req.query;
                
                // Определяем advertiserId с учетом фильтрации
                let advertiserId = req.user.advertiserId;
                if (req.user.role === 'ADMIN' && req.query.advertiser_id && req.query.advertiser_id !== 'all') {
                    advertiserId = req.query.advertiser_id;
                }
                
                const data = await controller.getConversionFunnel(
                    period, 
                    campaignId, 
                    advertiserId
                );
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Метрики по часам с изоляцией
    app.get(`${apiPrefix}/hourly`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today' } = req.query;
                
                // Определяем advertiserId с учетом фильтрации
                let advertiserId = req.user.advertiserId;
                if (req.user.role === 'ADMIN' && req.query.advertiser_id && req.query.advertiser_id !== 'all') {
                    advertiserId = req.query.advertiser_id;
                }
                
                const data = await controller.getHourlyMetrics(period, advertiserId);
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Метрики по сегментам ресторанов с изоляцией
    app.get(`${apiPrefix}/segments`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today' } = req.query;
                
                // Определяем advertiserId с учетом фильтрации
                let advertiserId = req.user.advertiserId;
                if (req.user.role === 'ADMIN' && req.query.advertiser_id && req.query.advertiser_id !== 'all') {
                    advertiserId = req.query.advertiser_id;
                }
                
                const data = await controller.getMetricsByRestaurantSegment(
                    period, 
                    advertiserId
                );
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Детализированные метрики кампании с проверкой доступа
    app.get(`${apiPrefix}/campaign/:id`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const campaignId = req.params.id;
                const { period = 'today' } = req.query;
                const advertiserId = req.user.advertiserId;

                // Проверяем, что кампания принадлежит advertiser (кроме админа)
                if (req.user.role !== 'ADMIN') {
                    const campaign = await models.Campaign.findOne({
                        where: { 
                            id: campaignId,
                            advertiser_id: advertiserId 
                        }
                    });

                    if (!campaign) {
                        return res.status(403).json({
                            success: false,
                            error: 'Доступ к этой кампании запрещен'
                        });
                    }
                }

                // Получаем данные кампании
                const campaignData = {
                    overview: await controller.getOverviewMetrics(
                        period, 
                        campaignId, 
                        advertiserId
                    ),
                    funnel: await controller.getConversionFunnel(
                        period, 
                        campaignId, 
                        advertiserId
                    ),
                    hourly: await controller.getHourlyMetrics(period, advertiserId),
                    details: campaign // Возвращаем информацию о кампании
                };

                res.json({
                    success: true,
                    data: campaignData
                });
            } catch (error) {
                console.error('Error fetching campaign data:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Эндпоинт для генерации отчетов
    app.get(`${apiPrefix}/reports/campaign/:id/:format`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const campaignId = req.params.id;
                const format = req.params.format; // pdf или excel
                const { period = 'today' } = req.query;
                
                console.log(`📄 Генерация отчета для кампании ${campaignId} в формате ${format}, период: ${period}`);

                // Проверяем доступ к кампании
                const campaign = await models.Campaign.findOne({
                    where: { id: campaignId }
                });

                if (!campaign) {
                    return res.status(404).json({
                        success: false,
                        error: 'Кампания не найдена'
                    });
                }

                // Проверяем права доступа
                if (req.user.role === 'ADVERTISER' && campaign.advertiser_id !== req.user.advertiserId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Доступ к отчету запрещен'
                    });
                }

                // Здесь должна быть логика генерации отчета
                // Пока возвращаем заглушку
                res.json({
                    success: true,
                    message: `Отчет для кампании ${campaignId} в формате ${format} за период ${period}`,
                    data: {
                        campaignId,
                        format,
                        period,
                        campaignName: campaign.name,
                        generated_at: new Date().toISOString()
                    }
                });
            } catch (error) {
                console.error('Error generating report:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Web интерфейс дашборда (проверка токена на клиенте)
    app.get('/dashboard',
        (req, res) => {
            try {
                console.log('📊 Dashboard page requested');
                
                const htmlContent = loadTemplate('dashboard.template.html');
                res.send(htmlContent);
            } catch (error) {
                console.error('❌ Ошибка загрузки дашборда:', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).send('Ошибка загрузки дашборда');
            }
        }
    );

    // Для обратной совместимости
    app.get(`${apiPrefix}/web`,
        verifyJWT,
        (req, res) => {
            try {
                const htmlContent = loadTemplate('dashboard.template.html');
                res.send(htmlContent);
            } catch (error) {
                res.status(500).send('Ошибка загрузки дашборда');
            }
        }
    );

    console.log(`✅ Модуль дашборда подключен по адресу: ${apiPrefix}`);
    console.log(`✅ Добавлены новые эндпоинты:
  - GET ${apiPrefix}/auth/me - информация о текущем пользователе
  - GET ${apiPrefix}/advertisers/list - список рекламодателей (только для админов)
  - GET ${apiPrefix}/campaigns/my - список кампаний
  - GET ${apiPrefix}/reports/campaign/:id/:format - генерация отчетов`);

  app.get('/api/campaigns/my',
    verifyJWT,
    makeHandlerAwareOfAsyncErrors(async (req, res) => {
        try {
            console.log('📋 Получение списка кампаний для пользователя:', {
                userId: req.user.user_id || req.user.userId, // Оба варианта
                role: req.user.role,
                advertiserId: req.user.advertiser_id || req.user.advertiserId
            });
            
            let campaigns = [];
            let advertiserId = req.user.advertiser_id || req.user.advertiserId;
            
            if (req.user.role === 'ADMIN') {
                // ... остальной код для админа
            } else if (req.user.role === 'ADVERTISER' && advertiserId) {
                campaigns = await models.Campaign.findAll({
                    where: { advertiser_id: advertiserId },
                    attributes: ['id', 'name', 'status', 'budget', 'created_at'],
                    order: [['name', 'ASC']],
                    raw: true
                });
                
                console.log(`✅ Рекламодатель ${advertiserId}: найдено кампаний: ${campaigns.length}`);
            } else {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Доступ запрещен или advertiserId не указан.' 
                });
            }
            
            const formattedCampaigns = campaigns.map(campaign => ({
                id: campaign.id,
                name: campaign.name || `Кампания #${campaign.id}`,
                status: campaign.status,
                budget: campaign.budget,
                type: 'campaign',
                created_at: campaign.created_at
            }));
            
            res.json({
                success: true,
                data: formattedCampaigns
            });
        } catch (error) {
            console.error('❌ Ошибка получения кампаний рекламодателя:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Внутренняя ошибка сервера',
                details: error.message
            });
        }
    })
);

app.get('/api/auth/me',
    verifyJWT,
    (req, res) => {
        try {
            res.json({
                success: true,
                user: {
                    id: req.user.user_id || req.user.userId, // Оба варианта
                    role: req.user.role,
                    advertiserId: req.user.advertiser_id || req.user.advertiserId,
                    email: req.user.email || 'Пользователь'
                }
            });
        } catch (error) {
            console.error('Error fetching user info:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
);

app.get('/api/advertisers/list',
    verifyJWT,
    makeHandlerAwareOfAsyncErrors(async (req, res) => {
        try {
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Доступ запрещен. Только администраторы.' 
                });
            }
            
            console.log('📋 Получение списка рекламодателей для администратора');
            
            // ВАЖНО: Сначала проверим, какие поля доступны в модели
            console.log('🔍 Проверяем поля модели Advertiser:', Object.keys(models.Advertiser.rawAttributes || {}));
            
            let advertisers = [];
            
            // Попробуем получить данные из таблицы Advertiser
            if (models.Advertiser) {
                try {
                    // Сначала попробуем простой запрос без указания полей
                    advertisers = await models.Advertiser.findAll({
                        order: [['name', 'ASC']],
                        raw: true
                    });
                    
                    console.log('📦 Получены данные рекламодателей:', advertisers);
                    
                    // Обработаем данные
                    advertisers = advertisers.map(adv => {
                        // Ищем email в разных возможных полях
                        const email = adv.email || adv.Email || adv.EMAIL || adv.user_email || '';
                        const name = adv.company_name || adv.name || adv.Name || adv.companyName || 
                                    `Рекламодатель #${adv.id}`;
                        
                        return {
                            id: adv.id,
                            name: name,
                            email: email,
                            type: 'advertiser',
                            created_at: adv.created_at,
                            status: adv.status || 'active'
                        };
                    });
                    
                } catch (dbError) {
                    console.error('❌ Ошибка при запросе Advertiser:', dbError);
                    
                    // Fallback: попробуем через User
                    if (models.User) {
                        console.log('🔄 Используем fallback через User таблицу');
                        const advertiserUsers = await models.User.findAll({
                            where: { role: 'ADVERTISER' },
                            attributes: ['id', 'email', 'advertiser_id', 'created_at'],
                            raw: true
                        });
                        
                        advertisers = advertiserUsers.map(user => ({
                            id: user.advertiser_id || user.id,
                            name: `Рекламодатель #${user.advertiser_id || user.id}`,
                            email: user.email,
                            type: 'advertiser',
                            created_at: user.created_at,
                            status: 'active'
                        }));
                    }
                }
            }
            
            console.log(`✅ Найдено рекламодателей: ${advertisers.length}`);
            
            res.json({
                success: true,
                data: advertisers
            });
        } catch (error) {
            console.error('❌ Ошибка получения списка рекламодателей:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Внутренняя ошибка сервера',
                details: error.message
            });
        }
    })
);

console.log(`✅ Добавлены роуты для совместимости:
  - /api/campaigns/my
  - /api/auth/me
  - /api/advertisers/list`);

};