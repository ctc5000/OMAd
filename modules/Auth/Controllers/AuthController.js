// AuthController.js
const AuthService = require('../services/AuthService');

class AuthController {
    constructor(models, sequelize) {
        console.log('🚀 Инициализация AuthController');
        console.log('📦 Доступные модели:', Object.keys(models));
        
        this.models = models;
        this.sequelize = sequelize;
        
        // Инициализировать AuthService
        this.authService = new AuthService(models, sequelize);
    }

    async login(req, res) {
        const { email, password } = req.body;

        console.log('🔐 Запрос на логин:', { email });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        try {
            const { user, token } = await this.authService.login(email, password);
            
            console.log('✅ Логин успешен:', { 
                userId: user.id, 
                role: user.role,
                advertiserId: user.advertiser_id 
            });
            
            return res.status(200).json({
                success: true,
                token,
                role: user.role,
                userId: user.id,
                advertiserId: user.advertiser_id // Используем правильное поле
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(401).json({
                success: false,
                error: error.message
            });
        }
    }

    async register(req, res) {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        try {
            const { user, token } = await this.authService.register(email, password, role);
            
            return res.status(201).json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                token
            });
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = AuthController;