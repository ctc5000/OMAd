const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

module.exports = function initModels(sequelize) {
    const models = {};
    const modelsPath = __dirname;

    console.log(`📁 Загрузка моделей аутентификации из ${modelsPath}`);

    // Загружаем все файлы моделей (исправляем фильтр)
    fs.readdirSync(modelsPath)
        .filter(file => {
            // Ищем файлы моделей - либо .model.js, либо .js (но не index.js)
            return (file.endsWith('.model.js') || 
                   (file.endsWith('.js') && !file.endsWith('.test.js') && file !== 'index.js'))
        })
        .forEach(file => {
            try {
                console.log(`🔍 Загрузка файла модели: ${file}`);
                const modelPath = path.join(modelsPath, file);
                
                // Проверяем, что файл существует и является моделью
                const model = require(modelPath);
                
                if (typeof model !== 'function') {
                    console.error(`❌ ${file} не экспортирует функцию`);
                    return;
                }
                
                const modelInstance = model(sequelize, DataTypes);
                
                if (!modelInstance || !modelInstance.name) {
                    console.error(`❌ ${file} не возвращает корректную модель`);
                    return;
                }
                
                models[modelInstance.name] = modelInstance;
                console.log(`✅ Модель ${modelInstance.name} загружена из ${file}`);
            } catch (error) {
                console.error(`❌ Ошибка загрузки ${file}:`, error.message);
                console.error(error.stack);
            }
        });

    console.log(`📊 Загружено моделей: ${Object.keys(models).length}`);
    console.log(`📋 Список моделей: ${Object.keys(models).join(', ')}`);

    // Устанавливаем ассоциации
    Object.keys(models).forEach(modelName => {
        try {
            if (typeof models[modelName].associate === 'function') {
                models[modelName].associate(models);
                console.log(`🔗 Ассоциации для ${modelName} установлены`);
            }
        } catch (error) {
            console.error(`❌ Ошибка установки ассоциаций для ${modelName}:`, error.message);
        }
    });

    return models;
};