// backend/config/config.js
require('dotenv').config();

/**
 * Configuration สำหรับ Signal School Quiz Generator
 * รวบรวมการตั้งค่าทั้งหมดของระบบ
 * รองรับการตั้งค่าจาก .env ที่ได้รับ
 */

const config = {
    // การตั้งค่าเซิร์ฟเวอร์
    server: {
        port: parseInt(process.env.PORT) || 3001,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        skipAuth: process.env.SKIP_AUTH === 'true',
        logAuth: process.env.LOG_AUTH === 'true',
        apiVersion: process.env.API_VERSION || '2.0.0',
        apiPrefix: process.env.API_PREFIX || '/api',
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            enabled: process.env.ENABLE_CORS !== 'false'
        }
    },

    // การตั้งค่าฐานข้อมูล MySQL
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'quiz_generator',
        charset: 'utf8mb4',
        timezone: '+07:00',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
        reconnect: true
    },

    // การตั้งค่า JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'signal_school_quiz_20250716_cCnMMMgSbj1pDqzq2AUZr9pnNSiYNQEQ',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'Signal School Quiz Generator',
        audience: 'signal-school-users'
    },

    // การตั้งค่า Rate Limiting
    rateLimiter: {
        general: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 นาที
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
            message: 'Too many requests from this IP, please try again later.'
        },
        auth: {
            windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
            max: 10,
            message: 'Too many authentication attempts, please try again later.'
        },
        aiGeneration: {
            windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
            max: 20,
            message: 'Too many AI generation requests, please try again later.'
        }
    },

    // การตั้งค่าการอัปโหลดไฟล์
    upload: {
        maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || parseInt(process.env.MAX_FILE_SIZE) || 10485760,
        allowedTypes: process.env.UPLOAD_ALLOWED_TYPES ? 
            process.env.UPLOAD_ALLOWED_TYPES.split(',') : 
            process.env.ALLOWED_FILE_TYPES ? 
            process.env.ALLOWED_FILE_TYPES.split(',') :
            [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ],
        uploadPath: process.env.UPLOAD_PATH || './uploads/documents'
    },

    // การตั้งค่า Google Gemini AI
    gemini: {
        apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
        model: process.env.AI_MODEL || 'gemini-1.5-pro',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4096,
        temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
        timeout: parseInt(process.env.AI_TIMEOUT) || 30000
    },

    // การตั้งค่า Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'simple',
        file: {
            enabled: process.env.LOG_FILE_ENABLED !== 'false',
            filename: process.env.LOG_FILE_PATH || 'logs/app.log',
            maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 5242880,
            maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5
        },
        console: {
            enabled: true,
            colorize: process.env.NODE_ENV === 'development'
        }
    },

    // การตั้งค่า Security
    security: {
        helmet: {
            contentSecurityPolicy: false,
            hsts: true
        }
    },

    // การตั้งค่าระบบ
    system: {
        requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb',
        urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '10mb',
        apiRequestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT) || 30000
    },

    // การตั้งค่า Development
    development: {
        detailedErrors: process.env.DETAILED_ERRORS === 'true' || process.env.NODE_ENV === 'development',
        enableApiDocs: process.env.ENABLE_API_DOCS === 'true'
    }
};

// ตรวจสอบการตั้งค่าพื้นฐาน
function validateConfig() {
    console.log('✅ Configuration loaded successfully');
    console.log(`   Environment: ${config.server.environment}`);
    console.log(`   Port: ${config.server.port}`);
    console.log(`   Skip Auth: ${config.server.skipAuth}`);
    if (config.gemini.apiKey) {
        console.log('   Google Gemini API: Configured');
    } else {
        console.log('   Google Gemini API: Not configured');
    }
    console.log('');
}

validateConfig();

module.exports = config;