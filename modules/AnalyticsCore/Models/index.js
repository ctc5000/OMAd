const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

module.exports = function initModels(sequelize) {
    const models = {};
    const modelsPath = __dirname;

    console.log(`📁 Загрузка моделей аналитики из ${modelsPath}`);

    // Загружаем все файлы моделей
    fs.readdirSync(modelsPath)
        .filter(file => file.endsWith('.model.js'))
        .forEach(file => {
            try {
                const model = require(path.join(modelsPath, file));
                const modelInstance = model(sequelize, DataTypes);
                models[modelInstance.name] = modelInstance;
                console.log(`✅ Модель ${modelInstance.name} загружена`);
            } catch (error) {
                console.error(`❌ Ошибка загрузки ${file}:`, error.message);
            }
        });

    // Устанавливаем ассоциации
    Object.keys(models).forEach(modelName => {
        if (models[modelName].associate) {
            models[modelName].associate(models);
            console.log(`🔗 Ассоциации для ${modelName} установлены`);
        }
    });

    return models;
};