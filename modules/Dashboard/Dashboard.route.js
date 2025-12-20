// Dashboard.route.js
const fs = require('fs');
const path = require('path');

module.exports = (app, moduleName, controller, makeHandlerAwareOfAsyncErrors, models) => {
  const apiPrefix = '/api/dashboard';

  console.log(`📊 Регистрация маршрутов для модуля ${moduleName}...`);
  console.log(`📊 API Prefix: ${apiPrefix}`);

  // Основной эндпоинт дашборда
  app.get(`${apiPrefix}/data`,
      makeHandlerAwareOfAsyncErrors(controller.getDashboardData.bind(controller))
  );
  console.log(`✅ Зарегистрирован маршрут: GET ${apiPrefix}/data`);

  // Метрики в реальном времени
  app.get(`${apiPrefix}/realtime`,
      makeHandlerAwareOfAsyncErrors(controller.getRealtimeMetrics.bind(controller))
  );

  // Топ кампаний
  app.get(`${apiPrefix}/top-campaigns`,
      makeHandlerAwareOfAsyncErrors(controller.getTopCampaigns.bind(controller))
  );

  // Воронка конверсий
  app.get(`${apiPrefix}/funnel`,
      makeHandlerAwareOfAsyncErrors(controller.getConversionFunnel.bind(controller))
  );

  // Метрики по часам
  app.get(`${apiPrefix}/hourly`,
      makeHandlerAwareOfAsyncErrors(controller.getHourlyMetrics.bind(controller))
  );

  // Метрики по сегментам ресторанов
  app.get(`${apiPrefix}/segments`,
      makeHandlerAwareOfAsyncErrors(controller.getMetricsByRestaurantSegment.bind(controller))
  );

  // Детализированные метрики кампании
  app.get(`${apiPrefix}/campaign/:id`,
      makeHandlerAwareOfAsyncErrors(async (req, res) => {
          const campaignId = req.params.id;
          const { period = 'today' } = req.query;

          const campaignData = {
              overview: await controller.getOverviewMetrics(period, campaignId),
              funnel: await controller.getConversionFunnel(period, campaignId),
              hourly: await controller.getHourlyMetrics(period),
              details: await controller.getCampaignDetails(campaignId, period)
          };

          res.json({
              success: true,
              data: campaignData
          });
      })
  );

  // Web интерфейс дашборда
  app.get(`${apiPrefix}/web`, (req, res) => {
    try {
      // Путь к файлу шаблона
      const templatePath = path.join(__dirname, 'templates', 'dashboard.template.html');
      
      // Чтение HTML файла
      const htmlContent = fs.readFileSync(templatePath, 'utf8');
      
      // Отправка HTML
      res.send(htmlContent);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки HTML шаблона:', error);
      res.status(500).send('Ошибка загрузки дашборда');
    }
  });
  
  console.log(`✅ Модуль дашборда подключен по адресу: ${apiPrefix}`);
};