import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
        (info) => {
            const { timestamp, level, message, ...args } = info;
            const ts = timestamp.slice(0, 19).replace('T', ' ');
            return `${ts} [${level.toUpperCase()}]: ${message} ${Object.keys(args).length ? JSON.stringify(args) : ''
                }`;
        }
    )
);

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            format
        ),
    }),

    // File transport for errors
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        format,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),

    // File transport for all logs
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        format,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false,
});

// Create stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

// Enhanced logger methods
logger.logRequest = (req) => {
    logger.http('Incoming Request', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        timestamp: new Date().toISOString(),
    });
};

logger.logResponse = (req, res, responseTime) => {
    logger.http('Outgoing Response', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.userId,
        timestamp: new Date().toISOString(),
    });
};

logger.logError = (error, req = null) => {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        url: req?.originalUrl,
        method: req?.method,
        ip: req?.ip,
        userId: req?.user?.userId,
        timestamp: new Date().toISOString(),
    });
};

logger.logActivity = (action, details = {}) => {
    logger.info('User Activity', {
        action,
        ...details,
        timestamp: new Date().toISOString(),
    });
};

// Database operation logging
logger.logDatabase = (operation, query, params = [], duration = null) => {
    logger.debug('Database Operation', {
        operation,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        paramCount: params.length,
        duration: duration ? `${duration}ms` : null,
        timestamp: new Date().toISOString(),
    });
};

// AI service logging
logger.logAI = (operation, model, prompt, response, duration = null) => {
    logger.info('AI Service Operation', {
        operation,
        model,
        promptLength: prompt ? prompt.length : 0,
        responseLength: response ? response.length : 0,
        duration: duration ? `${duration}ms` : null,
        timestamp: new Date().toISOString(),
    });
};

// Performance logging
logger.logPerformance = (operation, duration, metadata = {}) => {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug';

    logger[level]('Performance Metric', {
        operation,
        duration: `${duration}ms`,
        ...metadata,
        timestamp: new Date().toISOString(),
    });
};

// Security logging
logger.logSecurity = (event, details = {}) => {
    logger.warn('Security Event', {
        event,
        ...details,
        timestamp: new Date().toISOString(),
    });
};

// System monitoring
logger.logSystemHealth = (metrics) => {
    logger.info('System Health', {
        ...metrics,
        timestamp: new Date().toISOString(),
    });
};

// Create httpLogger for backward compatibility
const httpLogger = logger;

// Export both default and named exports for compatibility
export default logger;
export { logger, httpLogger };
