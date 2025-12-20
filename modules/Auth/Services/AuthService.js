// AuthService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthService {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize;
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';
    }

    async login(email, password) {
        console.log('🔍 Поиск пользователя:', email);
        
        const user = await this.models.User.findOne({ 
            where: { email },
            include: [{
                model: this.models.Advertiser,
                as: 'advertiser'
            }],
            raw: false // Получаем полный объект модели, а не raw данные
        });

        console.log('📊 Найден пользователь:', user ? 'Да' : 'Нет');
        
        if (!user) {
            throw new Error('User not found');
        }

        console.log('🔐 Проверка пароля...');
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        console.log('✅ Пароль верный');
        
        // Логируем данные пользователя для отладки
        console.log('📊 Данные пользователя:', {
            id: user.id,
            email: user.email,
            role: user.role,
            advertiser_id: user.advertiser_id,
            advertiser: user.advertiser ? user.advertiser.id : 'null'
        });

        return { user, token: this.generateJWT(user) };
    }

    async register(email, password, role = 'ADVERTISER') {
        console.log('📝 Регистрация пользователя:', email);
        
        // Check if user already exists
        const existingUser = await this.models.User.findOne({ 
            where: { email },
            raw: true
        });
        
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash the password
        const passwordHash = await this.hashPassword(password);

        // Create the user
        const user = await this.models.User.create({
            email,
            password_hash: passwordHash,
            role: role
        });

        console.log('✅ Пользователь создан:', user.id);

        // Generate JWT
        const token = this.generateJWT(user);

        return { user, token };
    }

    generateJWT(user) {
        console.log('🔐 Генерация JWT для пользователя:', user.id);
        
        const payload = {
            user_id: user.id,
            role: user.role,
            advertiser_id: user.advertiser_id
        };

        console.log('📦 Полезная нагрузка JWT:', payload);

        return jwt.sign(payload, this.JWT_SECRET, { 
            expiresIn: '24h' 
        });
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }
}

module.exports = AuthService;