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
    // Web интерфейс дашборда
app.get(`${apiPrefix}/web`, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📊 Order Master Analytics Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: white;
      padding: 20px;
    }
    
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    
    .period-selector {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
    }
    
    .period-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .period-btn:hover,
    .period-btn.active {
      background: rgba(255, 255, 255, 0.4);
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.3s;
    }
    
    .metric-card:hover {
      transform: translateY(-5px);
    }
    
    .metric-value {
      font-size: 2.2rem;
      font-weight: bold;
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .metric-change {
      font-size: 0.9rem;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-block;
    }
    
    .positive {
      background: rgba(46, 204, 113, 0.3);
      color: #2ecc71;
    }
    
    .negative {
      background: rgba(231, 76, 60, 0.3);
      color: #e74c3c;
    }
    
    .metric-label {
      font-size: 0.9rem;
      opacity: 0.8;
      margin-top: 5px;
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .chart-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .chart-title {
      font-size: 1.2rem;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .chart-container {
      height: 300px;
      position: relative;
    }
    
    .table-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    th {
      font-weight: 600;
      opacity: 0.8;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .status-active {
      background: rgba(46, 204, 113, 0.3);
      color: #2ecc71;
    }
    
    .status-paused {
      background: rgba(241, 196, 15, 0.3);
      color: #f1c40f;
    }

    .reports-section {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin: 30px 0;
    }

    .reports-title {
      font-size: 1.3rem;
      font-weight: bold;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .reports-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .report-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .report-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .report-btn:active {
      transform: translateY(0);
    }

    .report-btn.pdf {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .report-btn.pdf:hover {
      box-shadow: 0 8px 20px rgba(245, 87, 108, 0.4);
    }

    .report-btn.excel {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .report-btn.excel:hover {
      box-shadow: 0 8px 20px rgba(79, 172, 254, 0.4);
    }

    .report-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .report-btn-loading::after {
      content: '';
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .reports-info {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-top: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      padding: 20px;
      opacity: 0.7;
      font-size: 0.9rem;
    }
    
    .loading {
      text-align: center;
      padding: 50px;
      font-size: 1.2rem;
    }
    
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      
      .metric-card {
        padding: 15px;
      }
      
      .metric-value {
        font-size: 1.8rem;
      }
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <h1><i class="fas fa-chart-line"></i> Order Master Analytics Dashboard</h1>
      <p>Система аналитики рекламных кампаний в реальном времени</p>
      
      <div class="period-selector">
        <button class="period-btn active" data-period="today">Сегодня</button>
        <button class="period-btn" data-period="yesterday">Вчера</button>
        <button class="period-btn" data-period="this_week">Эта неделя</button>
        <button class="period-btn" data-period="this_month">Этот месяц</button>
      </div>
      
      <div style="margin-top: 20px; font-size: 0.9rem; opacity: 0.8;">
        <i class="fas fa-sync-alt"></i> Данные обновляются каждые 30 секунд
      </div>
    </div>
    
    <div id="loading" class="loading">
      <i class="fas fa-spinner fa-spin"></i> Загрузка данных...
    </div>
    
    <div id="dashboard-content" style="display: none;">
      <!-- Метрики будут вставлены здесь -->
    </div>

    <!-- Секция для генерации отчётов -->
    <div class="reports-section">
      <div class="reports-title">
        <i class="fas fa-file-export"></i> Экспорт отчётов (MVP Тест)
      </div>
      <div class="reports-buttons">
        <button class="report-btn pdf" id="generate-pdf-btn" onclick="generateReport('pdf')">
          <i class="fas fa-file-pdf"></i> Скачать PDF
        </button>
        <button class="report-btn excel" id="generate-excel-btn" onclick="generateReport('excel')">
          <i class="fas fa-file-excel"></i> Скачать Excel
        </button>
      </div>
       <div class="reports-info">
         <i class="fas fa-info-circle"></i> 
         Кликните на строку в таблице кампаний ниже, чтобы выбрать кампанию для отчёта (или будет использована первая кампания по умолчанию).
         Период: последние 7 дней.
       </div>
    </div>
    
    <div class="footer">
      <p>Order Master Analytics System v1.0.0 | Данные обновлены: <span id="last-update">--:--:--</span></p>
      <p>© 2024 Order Master. Все права защищены.</p>
    </div>
  </div>
  
  <script>
    let currentPeriod = 'today';
    let refreshInterval;
    let selectedCampaignId = null;
    
    // Загрузка данных
    async function loadDashboardData(period = 'today') {
      try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';
        
        const response = await fetch('/api/dashboard/data?period=' + period);
        const result = await response.json();
        
        if (result.success) {
          renderDashboard(result.data);
          document.getElementById('loading').style.display = 'none';
          document.getElementById('dashboard-content').style.display = 'block';
          updateLastUpdateTime();
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        document.getElementById('loading').innerHTML = 
          '<i class="fas fa-exclamation-triangle"></i> Ошибка загрузки данных';
      }
    }
    
    // Рендеринг дашборда
    function renderDashboard(data) {
      const container = document.getElementById('dashboard-content');
      
      // Основные метрики
      const overview = data.overview;
      const metricsHtml = 
        '<div class="metrics-grid">' +
          '<div class="metric-card">' +
            '<div class="metric-label"><i class="fas fa-users"></i> Уникальные посетители (UV)</div>' +
            '<div class="metric-value">' +
              overview.uv.toLocaleString('ru-RU') +
              '<span class="metric-change ' + (overview.change.uv_change >= 0 ? 'positive' : 'negative') + '">' +
                (overview.change.uv_change >= 0 ? '+' : '') + overview.change.uv_change + '%' +
              '</span>' +
            '</div>' +
            '<div class="metric-label">Охват: ' + overview.reach.toLocaleString('ru-RU') + '</div>' +
          '</div>' +
          
          '<div class="metric-card">' +
            '<div class="metric-label"><i class="fas fa-eye"></i> Показы</div>' +
            '<div class="metric-value">' +
              overview.impressions.toLocaleString('ru-RU') +
              '<span class="metric-change ' + (overview.change.impressions_change >= 0 ? 'positive' : 'negative') + '">' +
                (overview.change.impressions_change >= 0 ? '+' : '') + overview.change.impressions_change + '%' +
              '</span>' +
            '</div>' +
            '<div class="metric-label">Клики: ' + overview.clicks.toLocaleString('ru-RU') + '</div>' +
          '</div>' +
          
          '<div class="metric-card">' +
            '<div class="metric-label"><i class="fas fa-mouse-pointer"></i> CTR</div>' +
            '<div class="metric-value">' +
              overview.ctr + '%' +
              '<span class="metric-change ' + (overview.change.ctr_change >= 0 ? 'positive' : 'negative') + '">' +
                (overview.change.ctr_change >= 0 ? '+' : '') + overview.change.ctr_change + '%' +
              '</span>' +
            '</div>' +
            '<div class="metric-label">Конверсии: ' + overview.conversions.toLocaleString('ru-RU') + '</div>' +
          '</div>' +
          
          '<div class="metric-card">' +
            '<div class="metric-label"><i class="fas fa-chart-pie"></i> CR</div>' +
            '<div class="metric-value">' +
              overview.cr + '%' +
              '<span class="metric-change ' + (overview.change.cr_change >= 0 ? 'positive' : 'negative') + '">' +
                (overview.change.cr_change >= 0 ? '+' : '') + overview.change.cr_change + '%' +
              '</span>' +
            '</div>' +
            '<div class="metric-label">' +
              'CPUV: ' + (overview.cpuv !== null ? overview.cpuv.toFixed(2) + ' ₽' : '—') + ' | ' +
              'CPC: ' + (overview.cpc !== null ? overview.cpc.toFixed(2) + ' ₽' : '—') + ' | ' +
              'CPL: ' + (overview.cpl !== null ? overview.cpl.toFixed(2) + ' ₽' : '—') +
            '</div>' +
          '</div>' +
        '</div>';
      
      // Топ кампаний
      let campaignsHtml = '';
      if (data.campaigns && data.campaigns.length > 0) {
        campaignsHtml = 
          '<div class="table-card">' +
            '<h2 class="chart-title"><i class="fas fa-trophy"></i> Топ кампаний по конверсиям</h2>' +
            '<table>' +
              '<thead>' +
                '<tr>' +
                  '<th>Кампания</th>' +
                  '<th>Конверсии</th>' +
                  '<th>Выручка</th>' +
                  '<th>CTR</th>' +
                  '<th>CR</th>' +
                  '<th>CPUV</th>' +
                  '<th>CPC</th>' +
                  '<th>CPL</th>' +
                  '<th>Статус</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                data.campaigns.map(campaign => 
                  '<tr data-campaign-id="' + campaign.id + '" style="cursor: pointer;" onclick="selectCampaign(' + campaign.id + ')" title="Кликните для выбора кампании">' +
                    '<td><strong>' + campaign.name + '</strong></td>' +
                    '<td>' + campaign.conversions + '</td>' +
                    '<td>' + (campaign.revenue ? campaign.revenue.toFixed(2) + ' ₽' : '—') + '</td>' +
                    '<td>' + campaign.ctr + '%</td>' +
                    '<td>' + campaign.cr + '%</td>' +
                    '<td>' + (campaign.cpuv !== null ? campaign.cpuv.toFixed(2) + ' ₽' : '—') + '</td>' +
                    '<td>' + (campaign.cpc !== null ? campaign.cpc.toFixed(2) + ' ₽' : '—') + '</td>' +
                    '<td>' + (campaign.cpl !== null ? campaign.cpl.toFixed(2) + ' ₽' : '—') + '</td>' +
                    '<td>' +
                      '<span class="status-badge ' + (campaign.status === 'active' ? 'status-active' : 'status-paused') + '">' +
                        (campaign.status === 'active' ? 'Активна' : 'На паузе') +
                      '</span>' +
                    '</td>' +
                  '</tr>'
                ).join('') +
              '</tbody>' +
            '</table>' +
          '</div>';
      }
      
      // Воронка конверсий
      const funnel = data.funnel;
      const funnelHtml = 
        '<div class="charts-grid">' +
          '<div class="chart-card">' +
            '<h2 class="chart-title"><i class="fas fa-filter"></i> Воронка конверсий</h2>' +
            '<div class="chart-container">' +
              '<div style="display: flex; flex-direction: column; gap: 20px; height: 100%;">' +
                ['Сессии', 'Показы', 'Клики', 'Конверсии'].map(function(stage, index) {
                  const values = [funnel.sessions, funnel.impressions, funnel.clicks, funnel.conversions];
                  const percentages = [100, funnel.rates.impression_rate, funnel.rates.click_through_rate, funnel.rates.conversion_rate];
                  const dropoffs = [0, funnel.dropoffs.sessions_to_impressions, funnel.dropoffs.impressions_to_clicks, funnel.dropoffs.clicks_to_conversions];
                  
                  return (
                    '<div style="display: flex; align-items: center; gap: 15px;">' +
                      '<div style="flex: 0 0 100px; font-weight: 600;">' + stage + '</div>' +
                      '<div style="flex: 1; background: rgba(255,255,255,0.1); height: 40px; border-radius: 8px; overflow: hidden; position: relative;">' +
                        '<div style="width: ' + percentages[index] + '%; height: 100%; background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);"></div>' +
                        '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-weight: 600;">' +
                          values[index].toLocaleString('ru-RU') + ' (' + percentages[index].toFixed(1) + '%)' +
                        '</div>' +
                      '</div>' +
                      (dropoffs[index] > 0 ? 
                        '<div style="flex: 0 0 80px; text-align: right; font-size: 0.9rem; opacity: 0.7;">' +
                          '- ' + dropoffs[index] +
                        '</div>' 
                      : '') +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          
          '<div class="chart-card">' +
            '<h2 class="chart-title"><i class="fas fa-chart-bar"></i> Активность по часам</h2>' +
            '<div class="chart-container">' +
              '<div style="display: flex; height: 100%; align-items: flex-end; gap: 4px;">' +
                data.hourly.slice(-12).map(hour => 
                  '<div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">' +
                    '<div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">' +
                      '<div style="width: 100%; background: linear-gradient(0deg, #4facfe 0%, #00f2fe 100%); border-radius: 4px 4px 0 0; height: ' + (hour.impressions / 300 * 100) + '%;"></div>' +
                    '</div>' +
                    '<div style="padding-top: 8px; font-size: 0.8rem; opacity: 0.8;">' + hour.label + '</div>' +
                    '<div style="font-size: 0.7rem; opacity: 0.6; margin-top: 2px;">' + hour.impressions + '</div>' +
                  '</div>'
                ).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      
      // Сводка
      const summaryHtml = 
        '<div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0; font-size: 0.9rem;">' +
          '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">' +
            '<div><i class="fas fa-calendar"></i> Период: ' + (data.summary.period === 'today' ? 'Сегодня' : data.summary.period) + '</div>' +
            '<div><i class="fas fa-rocket"></i> Активных кампаний: ' + data.summary.active_campaigns + ' из ' + data.summary.total_campaigns + '</div>' +
            '<div><i class="fas fa-clock"></i> Пиковый час: ' + data.realtime.peak_hour.hour + ':00 (' + data.realtime.peak_hour.impressions + ' показов)</div>' +
            '<div><i class="fas fa-users"></i> Активных сессий: ' + data.realtime.active_sessions + '</div>' +
          '</div>' +
        '</div>';
      
      container.innerHTML = metricsHtml + summaryHtml + funnelHtml + campaignsHtml;
    }
    
    // Обновление времени последнего обновления
    function updateLastUpdateTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('last-update').textContent = timeString;
    }
    
    // Инициализация
    document.addEventListener('DOMContentLoaded', function() {
      // Загрузка данных при загрузке страницы
      loadDashboardData(currentPeriod);
      
      // Обработчики кнопок периода
      document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentPeriod = this.dataset.period;
          loadDashboardData(currentPeriod);
        });
      });
      
      // Автообновление каждые 30 секунд
      refreshInterval = setInterval(() => {
        loadDashboardData(currentPeriod);
      }, 30000);
    });
    
    // Очистка интервала при закрытии страницы
    window.addEventListener('beforeunload', function() {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    });

    // Функция для выбора кампании
    function selectCampaign(campaignId) {
      selectedCampaignId = campaignId;
      // Убрать выделение со всех строк
      document.querySelectorAll('tr[data-campaign-id]').forEach(row => {
        row.style.background = '';
      });
      // Выделить выбранную строку
      const selectedRow = document.querySelector('tr[data-campaign-id="' + campaignId + '"]');
      if (selectedRow) {
        selectedRow.style.background = 'rgba(102, 126, 234, 0.3)';
      }
      console.log('✅ Выбрана кампания: ' + campaignId);
    }

    // Функция для генерации отчёта
    async function generateReport(format) {
      const btnId = 'generate-' + format + '-btn';
      const btn = document.getElementById(btnId);
      btn.disabled = true;
      btn.classList.add('report-btn-loading');
      
      try {
        // Получить ID кампании
        let campaignId = selectedCampaignId;
        
        // Если кампания не выбрана, попробовать взять первую из таблицы
        if (!campaignId) {
          const firstCampaignRow = document.querySelector('tr[data-campaign-id]');
          if (firstCampaignRow) {
            campaignId = firstCampaignRow.getAttribute('data-campaign-id');
            // Автоматически выбрать первую кампанию
            selectCampaign(campaignId);
          }
        }
        
        // Если всё ещё нет ID, попросить ввести
        if (!campaignId) {
          campaignId = prompt('Введите ID кампании:');
        }

        if (!campaignId || isNaN(campaignId)) {
          alert('⚠️ Пожалуйста, выберите кампанию из таблицы ниже или укажите ID кампании вручную.');
          btn.disabled = false;
          btn.classList.remove('report-btn-loading');
          return;
        }

        // Вычислить дату начала (7 дней назад)
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const fromDate = sevenDaysAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];

        const url = '/api/reports/campaign/' + campaignId + '/' + format + '?from=' + fromDate + '&to=' + toDate;
        
        console.log('📥 Загрузка ' + format.toUpperCase() + ' отчёта...');
        console.log('   URL: ' + url);
        console.log('   Период: ' + fromDate + ' - ' + toDate);

        // Загрузить файл
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка ' + response.status + ': ' + response.statusText);
        }

        // Получить blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'report_campaign_' + campaignId + '_' + fromDate + '_to_' + toDate + '.' + (format === 'pdf' ? 'pdf' : 'xlsx');
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);

        console.log('✅ Отчёт успешно загружен!');
        alert('✅ Отчёт ' + format.toUpperCase() + ' для кампании ' + campaignId + ' успешно загружен!');
      } catch (error) {
        console.error('❌ Ошибка при генерации ' + format.toUpperCase() + ' отчёта:', error);
        alert('❌ Ошибка: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.classList.remove('report-btn-loading');
      }
    }
  </script>
</body>
</html>
`);
});
    console.log(`✅ Модуль дашборда подключен по адресу: ${apiPrefix}`);
};