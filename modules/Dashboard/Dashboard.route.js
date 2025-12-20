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

    // Защищенные API маршруты с изоляцией данных
    app.get(`${apiPrefix}/data`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today', campaign_id } = req.query;
                const advertiserId = req.user.advertiserId;
                
                const result = await controller.getDashboardData(period, advertiserId, campaign_id);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(500).json(result);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch dashboard data',
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
                const data = await controller.getRealtimeMetrics(req.user.advertiserId);
                res.json(data);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        })
    );

    // Топ кампаний для конкретного advertiser
    app.get(`${apiPrefix}/top-campaigns`,
        verifyJWT,
        makeHandlerAwareOfAsyncErrors(async (req, res) => {
            try {
                const { period = 'today' } = req.query;
                const data = await controller.getTopCampaigns(period, req.user.advertiserId);
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
                const data = await controller.getConversionFunnel(
                    period, 
                    campaignId, 
                    req.user.advertiserId
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
                const data = await controller.getHourlyMetrics(period, req.user.advertiserId);
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
                const data = await controller.getMetricsByRestaurantSegment(
                    period, 
                    req.user.advertiserId
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

                // Проверяем, что кампания принадлежит advertiser
                const campaign = await models.Campaign.findOne({
                    where: { 
                        id: campaignId,
                        advertiser_id: advertiserId 
                    }
                });

                if (!campaign && req.user.role !== 'ADMIN') {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied to this campaign'
                    });
                }

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
                    details: await controller.getCampaignDetails(
                        campaignId, 
                        period, 
                        advertiserId
                    )
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
};