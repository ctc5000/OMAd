const { Sequelize, Op } = require('sequelize');
const moment = require('moment');
const initModels = require('../modules/AnalyticsCore/Models');
require('dotenv').config();


async function fixTestUser() {
    try {
        await sequelize.authenticate();
        console.log('✅ Подключение к БД успешно');
        
        // Сначала проверим существующих пользователей
        const existingUsers = await models.User.findAll({
            include: [{
                model: models.Advertiser,
                as: 'advertiser'
            }]
        });
        
        console.log('📊 Существующие пользователи:');
        existingUsers.forEach(user => {
            console.log(`   ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Advertiser ID: ${user.advertiser_id}`);
        });
        
        // Проверим модель User
        console.log('\n🔍 Проверка модели User:');
        console.log('   Атрибуты:', Object.keys(models.User.rawAttributes));
        console.log('   Тип role:', models.User.rawAttributes.role.type.key);
        
        // Создаем тестового рекламодателя, если его нет
        let advertiser = await models.Advertiser.findOne({
            where: { email: 'test_advertiser@example.com' }
        });
        
        if (!advertiser) {
            advertiser = await models.Advertiser.create({
                name: 'Test Advertiser',
                email: 'test_advertiser@example.com',
                status: 'active'
            });
            console.log('✅ Создан новый рекламодатель:', advertiser.id);
        } else {
            console.log('📊 Используем существующего рекламодателя:', advertiser.id);
        }
        
        // Проверим есть ли пользователь
        let user = await models.User.findOne({
            where: { email: 'test@example.com' }
        });
        
        if (!user) {
            // Создаем тестового пользователя
            const passwordHash = await bcrypt.hash('test123', 10);
            user = await models.User.create({
                email: 'test@example.com',
                password_hash: passwordHash,
                role: 'ADMIN',
                advertiser_id: advertiser.id
            });
            console.log('✅ Создан новый пользователь:', user.id);
        } else {
            // Обновляем существующего пользователя
            const passwordHash = await bcrypt.hash('test123', 10);
            await user.update({
                password_hash: passwordHash,
                role: 'ADMIN',
                advertiser_id: advertiser.id
            });
            console.log('✅ Обновлен существующий пользователь:', user.id);
        }
        
        // Проверим что все сохранилось правильно
        const testUser = await models.User.findOne({
            where: { email: 'test@example.com' },
            include: [{
                model: models.Advertiser,
                as: 'advertiser'
            }],
            raw: false
        });
        
        console.log('\n✅ Тестовый пользователь готов:');
        console.log('   ID:', testUser.id);
        console.log('   Email:', testUser.email);
        console.log('   Role:', testUser.role);
        console.log('   Advertiser ID:', testUser.advertiser_id);
        console.log('   Has advertiser:', !!testUser.advertiser);
        
        // Проверим что можем получить advertiser
        if (testUser.advertiser) {
            console.log('   Advertiser name:', testUser.advertiser.name);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

fixTestUser();