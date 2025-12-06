import express from 'express';

const router = express.Router();

// Главная страница дашборда
router.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Дашборд Order Master Analytics</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Order Master Analytics Dashboard</h1>
        <p>Система аналитики рекламных кампаний</p>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value" id="uv">0</div>
          <div class="metric-label">Уникальные посетители</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="reach">0</div>
          <div class="metric-label">Охват</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="clicks">0</div>
          <div class="metric-label">Клики</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" id="conversions">0</div>
          <div class="metric-label">Конверсии</div>
        </div>
      </div>
      
      <script>
        // Загрузка метрик при загрузке страницы
        async function loadMetrics() {
          try {
            const response = await fetch('/api/metrics/1');
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('uv').textContent = data.data.uv;
              document.getElementById('reach').textContent = data.data.reach;
              document.getElementById('clicks').textContent = data.data.clicks;
              document.getElementById('conversions').textContent = data.data.conversions;
            }
          } catch (error) {
            console.error('Ошибка загрузки метрик:', error);
          }
        }
        
        // Обновление метрик каждые 30 секунд
        loadMetrics();
        setInterval(loadMetrics, 30000);
      </script>
    </body>
    </html>
  `);
});

export default router;