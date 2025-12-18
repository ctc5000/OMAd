module.exports = (app, moduleName, controller, makeHandlerAwareOfAsyncErrors) => {
    const apiPrefix = '/api/auth';

    // Login endpoint
    app.post(
        `${apiPrefix}/login`, 
        makeHandlerAwareOfAsyncErrors(controller.login.bind(controller))
    );

    // Registration endpoint
    app.post(
        `${apiPrefix}/register`, 
        makeHandlerAwareOfAsyncErrors(controller.register.bind(controller))
    );

    console.log(`✅ Модуль аутентификации подключен по адресу: ${apiPrefix}`);
};