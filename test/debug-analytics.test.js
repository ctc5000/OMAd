// const path = require('path');
// const fs = require('fs');

// describe('Debug AnalyticsCore', () => {
//     it('should analyze module structure', () => {
//         const modulePath = path.join(__dirname, '../modules/AnalyticsCore');
        
//         // Проверка description.json
//         const descPath = path.join(modulePath, 'description.json');
//         if (fs.existsSync(descPath)) {
//             const desc = require(descPath);
//             console.log('Description:', JSON.stringify(desc, null, 2));
//         }
        
//         // Проверка route файла
//         const routePath = path.join(modulePath, 'AnalyticsCore.route.js');
//         if (fs.existsSync(routePath)) {
//             const routeContent = fs.readFileSync(routePath, 'utf8');
//             console.log('\n=== Route file content (first 500 chars) ===');
//             console.log(routeContent.substring(0, 500));
            
//             // Ищем пути в роутах
//             const routePatterns = routeContent.match(/['"](.*?session.*?)['"]/g) || [];
//             console.log('\nFound route patterns:', routePatterns);
//         }
        
//         // Проверка контроллера
//         const controllerPath = path.join(modulePath, 'Controllers', 'AnalyticsController.js');
//         if (fs.existsSync(controllerPath)) {
//             const controllerContent = fs.readFileSync(controllerPath, 'utf8');
//             console.log('\n=== Controller methods ===');
//             const methodMatches = controllerContent.match(/async\s+(\w+)\s*\(/g) || [];
//             console.log('Methods:', methodMatches);
//         }
        
//         expect(fs.existsSync(modulePath)).toBe(true);
//     });
// });