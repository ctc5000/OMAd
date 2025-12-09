module.exports = (app, moduleName, controller, makeHandlerAwareOfAsyncErrors, models) => {
    const apiPrefix = '/api/reports';

    console.log(`📊 Регистрация маршрутов для модуля ${moduleName}...`);
    console.log(`📊 API Prefix: ${apiPrefix}`);

    // Генерация PDF отчёта по кампании
    app.get(`${apiPrefix}/campaign/:id/pdf`,
        makeHandlerAwareOfAsyncErrors(controller.generatePdfReport.bind(controller))
    );
    console.log(`✅ Зарегистрирован маршрут: GET ${apiPrefix}/campaign/:id/pdf`);

    // Генерация Excel отчёта по кампании
    app.get(`${apiPrefix}/campaign/:id/excel`,
        makeHandlerAwareOfAsyncErrors(controller.generateExcelReport.bind(controller))
    );
    console.log(`✅ Зарегистрирован маршрут: GET ${apiPrefix}/campaign/:id/excel`);

    console.log(`✅ Модуль ${moduleName} успешно подключен`);
};

