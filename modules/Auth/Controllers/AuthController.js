const AuthService = require('../services/AuthService');

class AuthController {
    constructor(models, sequelize) {
        console.log('🚀 Инициализация AuthController');
        console.log('📦 Доступные модели:', Object.keys(models));
        console.log('📊 Sequelize:', !!sequelize);

        this.models = models;
        this.sequelize = sequelize;
        
        // Инициализировать AuthService
        this.authService = new AuthService(models, sequelize);
    }

    async login(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        try {
            const token = await this.authService.login(email, password);
            
            return res.status(200).json({
                success: true,
                token
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
