// backend/src/config/app.js
/**
 * Application Configuration
 * รวม configuration หลักของ application
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application Configuration Object
 */
const appConfig = {
    // Server settings
    server: {
        port: parseInt(process.env.PORT) || 3001,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development',
        apiVersion: '2.0.0',

        // CORS settings
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }
    },

    // Security settings
    security: {
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Max requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.'
            }
        },

        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            },
            crossOriginEmbedderPolicy: false
        }
    },

    // Request handling
    request: {
        bodyLimit: '10mb',
        uploadLimit: '2mb',
        timeout: 30000 // 30 seconds
    },

    // File upload settings
    upload: {
        directory: './uploads',
        maxFileSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    },

    // Logging settings
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
        file: {
            enabled: process.env.NODE_ENV === 'production',
            filename: 'logs/app.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }
    },

    // AI Integration settings
    ai: {
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 30000
    },

    // Feature flags
    features: {
        skipAuth: process.env.SKIP_AUTH === 'true',
        enableCaching: process.env.ENABLE_CACHING !== 'false',
        enableEmailNotifications: process.env.ENABLE_EMAIL === 'true',
        enableFileUpload: true,
        enableExportFeatures: true
    },

    // API settings
    api: {
        prefix: '/api',
        version: 'v1',
        pagination: {
            defaultLimit: 25,
            maxLimit: 100
        }
    }
};

export default appConfig;