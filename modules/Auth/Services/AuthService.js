const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthService {
    constructor(models, sequelize) {
        this.models = models;
        this.sequelize = sequelize;
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';
    }

    async login(email, password) {
        const user = await this.models.User.findOne({ 
            where: { email },
            include: ['advertiser']
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        return this.generateJWT(user);
    }

    async register(email, password, role = 'ADVERTISER') {
        // Check if user already exists
        const existingUser = await this.models.User.findOne({ where: { email } });
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

        // Generate JWT
        const token = this.generateJWT(user);

        return { user, token };
    }

    generateJWT(user) {
        const payload = {
            user_id: user.id,
            role: user.role,
            advertiser_id: user.advertiser_id
        };

        return jwt.sign(payload, this.JWT_SECRET, { 
            expiresIn: '24h' 
        });
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }
}

module.exports = AuthService;