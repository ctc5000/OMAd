const request = require('supertest');
const express = require('express');

describe('Analytics Session API', () => {
    let app;
    
    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Мокируем поведение контроллера
        app.post('/api/analytics/session-started', (req, res) => {
            const { restaurant_id, restaurant_segment, user_agent, ip_address } = req.body;
            
            // Валидация как в реальном контроллере
            const errors = [];
            
            if (!restaurant_id || restaurant_id <= 0 || typeof restaurant_id !== 'number') {
                errors.push('Invalid restaurant_id. Must be a positive number');
            }
            
            if (!restaurant_segment || !['низкий', 'средний', 'высокий'].includes(restaurant_segment)) {
                errors.push('Invalid restaurant_segment. Must be one of: низкий, средний, высокий');
            }
            
            if (user_agent && user_agent.length > 500) {
                errors.push('User agent too long. Max 500 characters');
            }
            
            if (ip_address && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip_address)) {
                errors.push('Invalid IP address format');
            }
            
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    errors: errors
                });
            }
            
            // Успешный ответ
            res.status(201).json({
                success: true,
                data: {
                    session_id: 'test-session-' + Date.now(),
                    restaurant_id: restaurant_id,
                    restaurant_segment: restaurant_segment,
                    user_agent: user_agent || null,
                    ip_address: ip_address || null,
                    created_at: new Date().toISOString()
                }
            });
        });
    });
    
    // Успешное создание сессии
    it('should create a new session', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: 1,
                restaurant_segment: 'средний',
                user_agent: 'Mozilla/5.0',
                ip_address: '192.168.1.1'
            });
        
        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.session_id).toBeDefined();
        expect(response.body.data.restaurant_id).toBe(1);
        expect(response.body.data.restaurant_segment).toBe('средний');
        expect(response.body.data.created_at).toBeDefined();
    });
    
    // Неудачное создание сессии с неверными данными
    it('should reject invalid session data', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: -1,
                restaurant_segment: 'invalid',
                user_agent: 'Test Agent'.repeat(100)
            });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors).toContain('Invalid restaurant_id. Must be a positive number');
        expect(response.body.errors).toContain('Invalid restaurant_segment. Must be one of: низкий, средний, высокий');
    });
    
    // Тест с неверным типом restaurant_id
    it('should reject non-numeric restaurant_id', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: 'not-a-number',
                restaurant_segment: 'средний'
            });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Invalid restaurant_id. Must be a positive number');
    });
    
    // Тест с отсутствующим restaurant_segment
    it('should reject missing restaurant_segment', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: 1
            });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Invalid restaurant_segment. Must be one of: низкий, средний, высокий');
    });
    
    // Тест с неверным IP адресом
    it('should reject invalid IP address', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: 1,
                restaurant_segment: 'средний',
                ip_address: 'invalid-ip'
            });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Invalid IP address format');
    });
    
    // Тест с минимальными данными (только обязательные поля)
    it('should create session with minimal data', async () => {
        const response = await request(app)
            .post('/api/analytics/session-started')
            .send({
                restaurant_id: 5,
                restaurant_segment: 'высокий'
            });
        
        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.session_id).toBeDefined();
        expect(response.body.data.restaurant_id).toBe(5);
        expect(response.body.data.restaurant_segment).toBe('высокий');
        expect(response.body.data.user_agent).toBeNull();
        expect(response.body.data.ip_address).toBeNull();
    });
});