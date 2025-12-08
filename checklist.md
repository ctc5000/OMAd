✔ Чек-лист соответствия проекта ТЗ (Billing + Ads Tracking)
1. Структура событий (обязательные события)
1.1 session_started

 Эндпоинт/обработчик существует

 Событие сохраняется в БД

 Модель session существует

 session_id используется как ключ связи

 Присутствуют атрибуты: session_id, restaurant_id, restaurant_segment, timestamp

1.2 ad_impression

 Эндпоинт/обработчик существует

 Событие сохраняется в БД

 Присутствуют атрибуты: session_id, campaign_id, advertiser_id, banner_placement, timestamp

1.3 ad_click

 Эндпоинт/обработчик существует

 Событие сохраняется в БД

 Присутствуют атрибуты: session_id, campaign_id, advertiser_id, timestamp

1.4 ad_conversion

 Эндпоинт/обработчик существует

 Событие сохраняется в БД

 Присутствуют атрибуты: session_id, campaign_id, advertiser_id, conversion_type, timestamp

2. Связность событий

 Все события связаны через session_id

 Возможна воронка session_started → ad_impression → ad_click → ad_conversion

 Есть валидация наличия session_id для всех событий

 Reach считается по уникальным session_id, у которых есть impression

 UV считается по session_started (уникальные session_id)

3. Метрики (backend рассчитывает или имеет структуру для расчета)
Базовые метрики

 UV (unique visitors)

 Reach (unique impressions)

 Impressions (количество)

 Clicks

 Conversions

Производные метрики

 CTR = clicks / impressions

 CR = conversions / reach

 CPUV = cost / UV

 CPC = cost / clicks

 CPL = cost / conversions

Дополнительно

 Фильтры по ресторану

 Фильтры по сегменту ресторана

 Фильтры по рекламодателю

 Фильтр по дате

4. База данных

 Все нужные таблицы существуют

 Есть индексы по session_id

 Есть индексы по campaign_id

 Все timestamp корректные

 Правильные связи (FK при необходимости)

5. API

 POST /session_started

 POST /ad_impression

 POST /ad_click

 POST /ad_conversion

 GET /stats (или аналог) для получения метрик

 GET /stats/campaign/:id

 Авторизация (токен/ключ/пароль)

6. Очереди / обработка нагрузки

 Проект способен сохранять несколько тысяч событий в минуту

 Логика не блокирует event loop

 Существуют bulk-insert или аналогичные оптимизации (если реализовано)

7. Дашборд

 Отображает UV, Reach, Impressions, Clicks, Conversions

 Задержка данных ≤ 15 минут (или структура для этого)

 Детализация по:

 ресторану

 сегменту

 рекламодателю

 времени

 Графики показов и кликов

 Графики конверсий

8. Автоотчеты

 Есть генерация PDF или Excel

 Есть метрики за период

 Есть графики

 Есть анализ воронки

9. Безопасность

 Парольная или токен авторизация

 Изоляция данных рекламодателей

 Нет лишних открытых эндпоинтов

10. Критерии приемки

 Reach ≤ UV

 Все события сохраняются без потерь

 Все фильтры работают (дата, ресторан, сегмент, рекламодатель)

 Генерация отчетов работает

Конец checklist.md