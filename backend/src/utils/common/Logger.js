// backend/src/utils/common/Logger.js
import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Logger Configuration
 * ใช้ Winston สำหรับ logging system
 */

// สร้าง logs directory ถ้ายังไม่มี
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format สำหรับ log
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format สำหรับ development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // แสดง metadata ถ้ามี
        if (Object.keys(meta).length > 0) {
            msg += '\n' + JSON.stringify(meta, null, 2);
        }

        return msg;
    })
);

// Transport สำหรับไฟล์
const fileTransports = [
    // All logs
    new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat
    }),

    // Error logs
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat
    }),

    // Quiz generation logs
    new winston.transports.File({
        filename: path.join(logsDir, 'quiz-generation.log'),
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        format: customFormat,
        filter: (info) => info.category === 'quiz-generation'
    }),

    // API access logs
    new winston.transports.File({
        filename: path.join(logsDir, 'api-access.log'),
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        format: customFormat,
        filter: (info) => info.category === 'api-access'
    })
];

// Console transport สำหรับ development
const consoleTransport = new winston.transports.Console({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: consoleFormat
});

// สร้าง logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: {
        service: 'signal-school-quiz-generator',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        ...fileTransports,
        ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : [])
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

/**
 * Enhanced Logger Class
 * เพิ่ม functionality พิเศษสำหรับ application
 */
class EnhancedLogger {
    constructor(winstonLogger) {
        this.winston = winstonLogger;
    }

    // Basic logging methods
    error(message, meta = {}) {
        this.winston.error(message, meta);
    }

    warn(message, meta = {}) {
        this.winston.warn(message, meta);
    }

    info(message, meta = {}) {
        this.winston.info(message, meta);
    }

    debug(message, meta = {}) {
        this.winston.debug(message, meta);
    }

    verbose(message, meta = {}) {
        this.winston.verbose(message, meta);
    }

    // Specialized logging methods

    /**
     * Log API access
     */
    apiAccess(req, res, responseTime) {
        this.info('API Access', {
            category: 'api-access',
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.userId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log quiz generation events
     */
    quizGeneration(event, data = {}) {
        this.info(`Quiz Generation: ${event}`, {
            category: 'quiz-generation',
            event,
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log authentication events
     */
    auth(event, userId, details = {}) {
        this.info(`Auth: ${event}`, {
            category: 'authentication',
            event,
            userId,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log database operations
     */
    database(operation, table, details = {}) {
        this.debug(`Database: ${operation}`, {
            category: 'database',
            operation,
            table,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log cache operations
     */
    cache(operation, key, details = {}) {
        this.debug(`Cache: ${operation}`, {
            category: 'cache',
            operation,
            key,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log AI service calls
     */
    aiService(provider, operation, details = {}) {
        this.info(`AI Service: ${provider} ${operation}`, {
            category: 'ai-service',
            provider,
            operation,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log performance metrics
     */
    performance(metric, value, unit = 'ms', context = {}) {
        this.info(`Performance: ${metric}`, {
            category: 'performance',
            metric,
            value,
            unit,
            ...context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log security events
     */
    security(event, details = {}) {
        this.warn(`Security: ${event}`, {
            category: 'security',
            event,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log business events
     */
    business(event, details = {}) {
        this.info(`Business: ${event}`, {
            category: 'business',
            event,
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Create child logger with default metadata
     */
    child(defaultMeta) {
        const childLogger = this.winston.child(defaultMeta);
        return new EnhancedLogger(childLogger);
    }

    /**
     * Log error with context
     */
    errorWithContext(error, context = {}) {
        this.error(error.message || 'Unknown error', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                statusCode: error.statusCode,
                details: error.details
            },
            context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Start timing for performance measurement
     */
    startTimer(label) {
        const start = process.hrtime.bigint();

        return {
            end: () => {
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000; // Convert to milliseconds

                this.performance(label, duration, 'ms');
                return duration;
            }
        };
    }

    /**
     * Log with structured metadata
     */
    structured(level, message, metadata = {}) {
        this.winston.log(level, message, {
            ...metadata,
            timestamp: new Date().toISOString()
        });
    }
}

// Export enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger);

export default enhancedLogger;

// Export logger types สำหรับ testing
export { EnhancedLogger, logger as winstonLogger };