// backend/src/utils/logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// กำหนด log level ตาม environment
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// สร้าง custom format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// สร้าง logger instance
const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'signal-school-quiz-generator' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),

        // File transport for errors
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // File transport for all logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],

    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/exceptions.log')
        })
    ],

    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/rejections.log')
        })
    ]
});

// สร้าง stream สำหรับ Morgan (HTTP request logging)
const morganStream = {
    write: (message) => {
        // ลบ newline ออกจาก message
        logger.info(message.trim());
    }
};

// Helper functions
const loggers = {
    info: (message, meta = {}) => logger.info(message, meta),
    error: (message, meta = {}) => logger.error(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),

    // สำหรับ log API requests
    apiRequest: (req, message = '') => {
        logger.info(`API Request: ${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            message
        });
    },

    // สำหรับ log API responses
    apiResponse: (req, res, responseTime, message = '') => {
        logger.info(`API Response: ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            message
        });
    },

    // สำหรับ log database operations
    database: (operation, table, message = '') => {
        logger.info(`Database ${operation}: ${table}`, {
            operation,
            table,
            message
        });
    },

    // สำหรับ log AI/Gemini operations
    ai: (operation, model, message = '') => {
        logger.info(`AI Operation: ${operation} with ${model}`, {
            operation,
            model,
            message
        });
    },

    // สำหรับ log authentication
    auth: (action, userId, message = '') => {
        logger.info(`Auth: ${action}`, {
            action,
            userId,
            message
        });
    }
};

// Export เฉพาะสิ่งที่จำเป็น (ไม่ซ้ำ)
export default logger;
export { morganStream, loggers };