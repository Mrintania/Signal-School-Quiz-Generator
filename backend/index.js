// backend/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// โหลด configuration
const config = require('./config/config');
const logger = require('./src/utils/logger');

// โหลด middleware
const { generalLimiter } = require('./src/middleware/rateLimiter');

// โหลด routes
const quizRoutes = require('./src/routes/quizRoutes');
// const authRoutes = require('./src/routes/authRoutes');
// const userRoutes = require('./src/routes/userRoutes');

/**
 * Signal School Quiz Generator
 * Main Application Entry Point
 */

const app = express();

// ===== MIDDLEWARE SETUP =====

// Security middleware
app.use(helmet({
    contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
    hsts: config.security.helmet.hsts
}));

// CORS setup
app.use(cors({
    origin: config.server.cors.origin,
    credentials: config.server.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ 
    limit: config.system.requestSizeLimit 
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: config.system.urlEncodedLimit 
}));

// Request logging middleware
app.use(logger.requestMiddleware);

// Rate limiting
app.use(generalLimiter);

// Static files (สำหรับเสิร์ฟไฟล์ที่อัปโหลด)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== HEALTH CHECK =====

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Signal School Quiz Generator is running',
        timestamp: new Date().toISOString(),
        version: config.server.apiVersion,
        environment: config.server.environment,
        uptime: process.uptime()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        services: {
            database: 'connected', // จะเปลี่ยนเป็น actual status ภายหลัง
            ai: config.gemini.apiKey ? 'configured' : 'not_configured',
            cache: config.cache.strategy,
            email: config.email.enabled ? 'enabled' : 'disabled'
        },
        timestamp: new Date().toISOString()
    });
});

// ===== API ROUTES =====

// API base route
app.get(config.server.apiPrefix, (req, res) => {
    res.json({
        success: true,
        message: 'Signal School Quiz Generator API',
        version: config.server.apiVersion,
        documentation: config.development.enableApiDocs ? `${req.protocol}://${req.get('host')}/api/docs` : null,
        endpoints: {
            health: '/api/health',
            quizzes: '/api/quizzes',
            auth: '/api/auth',
            users: '/api/users'
        }
    });
});

// Quiz routes
app.use(`${config.server.apiPrefix}/quizzes`, quizRoutes);

// Authentication routes (เมื่อสร้างแล้ว)
// app.use(`${config.server.apiPrefix}/auth`, authRoutes);

// User routes (เมื่อสร้างแล้ว)
// app.use(`${config.server.apiPrefix}/users`, userRoutes);

// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.logSystemError(error, {
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        userId: req.user?.id,
        ip: req.ip
    });

    // ส่ง error response
    const statusCode = error.status || error.statusCode || 500;
    const response = {
        success: false,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    };

    // เพิ่มรายละเอียด error ในโหมด development
    if (config.development.detailedErrors && config.server.environment === 'development') {
        response.error = {
            stack: error.stack,
            name: error.name
        };
    }

    res.status(statusCode).json(response);
});

// ===== GRACEFUL SHUTDOWN =====

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// ===== START SERVER =====

const startServer = async () => {
    try {
        // ตรวจสอบการเชื่อมต่อฐานข้อมูล (เพิ่มภายหลัง)
        // await initializeDatabase();
        
        // ตรวจสอบ AI service
        if (config.gemini.apiKey) {
            logger.info('✅ Google Gemini API configured');
        } else {
            logger.warn('⚠️  Google Gemini API key not configured');
        }

        // เริ่มเซิร์ฟเวอร์
        const server = app.listen(config.server.port, config.server.host, () => {
            logger.info('🚀 Signal School Quiz Generator started successfully');
            logger.info(`📡 Server running on http://${config.server.host}:${config.server.port}`);
            logger.info(`🌐 API available at http://${config.server.host}:${config.server.port}${config.server.apiPrefix}`);
            logger.info(`💻 Frontend URL: ${config.server.frontendUrl}`);
            logger.info(`🔧 Environment: ${config.server.environment}`);
            
            if (config.server.skipAuth) {
                logger.warn('⚠️  Authentication is DISABLED - Development mode only!');
            }
            
            console.log('\n🎓 Signal School Quiz Generator');
            console.log('📚 โรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร');
            console.log('🇹🇭 Royal Thai Army Signal Department');
            console.log('');
            console.log('✅ Server is ready to accept connections');
            console.log(`📍 Health Check: http://${config.server.host}:${config.server.port}/health`);
            console.log('');
        });

        // กำหนด timeout สำหรับ server
        server.timeout = config.system.apiRequestTimeout;

        return server;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// เริ่มแอปพลิเคชัน
if (require.main === module) {
    startServer().catch((error) => {
        logger.error('Startup error:', error);
        process.exit(1);
    });
}

module.exports = app;