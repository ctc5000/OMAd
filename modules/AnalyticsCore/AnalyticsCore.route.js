module.exports = (app, moduleName, controller, makeHandlerAwareOfAsyncErrors, models) => {
    const apiPrefix = '/api/analytics';

    // Эндпоинты для событий
    app.post(`${apiPrefix}/session-started`,
        makeHandlerAwareOfAsyncErrors(controller.sessionStarted.bind(controller))
    );

    app.post(`${apiPrefix}/ad-impression`,
        makeHandlerAwareOfAsyncErrors(controller.adImpression.bind(controller))
    );

    app.post(`${apiPrefix}/ad-click`,
        makeHandlerAwareOfAsyncErrors(controller.adClick.bind(controller))
    );

    app.post(`${apiPrefix}/ad-conversion`,
        makeHandlerAwareOfAsyncErrors(controller.adConversion.bind(controller))
    );

    // Эндпоинты для метрик
    app.get(`${apiPrefix}/metrics`,
        makeHandlerAwareOfAsyncErrors(controller.getMetrics.bind(controller))
    );

    app.get(`${apiPrefix}/metrics/:campaign_id`,
        makeHandlerAwareOfAsyncErrors(controller.getCampaignMetrics.bind(controller))
    );

    // Эндпоинты для воронки
    app.get(`${apiPrefix}/funnel/:session_id`,
        makeHandlerAwareOfAsyncErrors(controller.getFunnel.bind(controller))
    );

    console.log(`✅ Модуль аналитики подключен по адресу: ${apiPrefix}`);
};