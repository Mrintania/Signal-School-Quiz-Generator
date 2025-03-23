import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// Set log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Create custom format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => {
        const { timestamp, level, message, ...rest } = info;
        let formattedRest = '';

        if (Object.keys(rest).length > 0) {
            // Format additional data
            formattedRest = ' | ' + JSON.stringify(rest);
        }

        // Clean stack traces for better readability
        let formattedMessage = message;
        if (typeof message === 'string' && message.includes('\n')) {
            formattedMessage = message
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .join('\n    ');
        }

        return `[${timestamp}] ${level.toUpperCase()}: ${formattedMessage}${formattedRest}`;
    })
);

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            format
        )
    }),

    // Error log file transport
    new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: format
    }),

    // Combined log file transport
    new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        format: format
    })
];

// Create logger
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports
});

// Add colors to Winston
winston.addColors(colors);

// HTTP request logger
const httpLogger = (req, res, next) => {
    const { method, url, ip } = req;

    // Log request start
    logger.http(`${method} ${url} - Request received from ${ip}`);

    // Calculate response time
    const start = Date.now();

    // Log response information when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        const logLevel = statusCode >= 500 ? 'error' :
            statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel](
            `${method} ${url} - Response: ${statusCode} - ${duration}ms`,
            {
                statusCode,
                duration,
                method,
                url,
                ip,
                userAgent: req.headers['user-agent']
            }
        );
    });

    next();
};

// Log uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Give time to log the error before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});

// ตรวจสอบและสร้างโฟลเดอร์ logs ถ้ายังไม่มี
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

export { logger, httpLogger };