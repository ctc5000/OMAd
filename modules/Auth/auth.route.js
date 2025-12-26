// Auth.route.js
const { verifyJWT } = require('./Middleware/auth.middleware');

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

    // Валидация токена
    app.get(
        `${apiPrefix}/validate`,
        verifyJWT,
        (req, res) => {
            res.json({
                success: true,
                user: req.user
            });
        }
    );

    console.log(`✅ Модуль аутентификации подключен по адресу: ${apiPrefix}`);
};
