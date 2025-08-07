// backend/src/utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// โหลด config (ใช้ try-catch เพื่อหลีกเลี่ยงปัญหาการโหลดครั้งแรก)
let config;
try {
    config = require('../../config/config');
} catch (error) {
    // ใช้ค่า default ถ้าโหลด config ไม่ได้
    config = {
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
        }
    };
}

// สร้างโฟลเดอร์ logs ถ้ายังไม่มี
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// กำหนด format สำหรับ log
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// กำหนด format สำหรับ console (development)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        
        // เพิ่มข้อมูลเพิ่มเติมถ้ามี
        if (Object.keys(meta).length > 0) {
            msg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return msg;
    })
);

// สร้าง transports
const transports = [];

// Console transport
if (config.logging.console.enabled) {
    transports.push(
        new winston.transports.Console({
            format: config.logging.console.colorize ? consoleFormat : logFormat
        })
    );
}

// File transport
if (config.logging.file.enabled) {
    transports.push(
        new winston.transports.File({
            filename: config.logging.file.filename,
            format: logFormat,
            maxsize: config.logging.file.maxsize,
            maxFiles: config.logging.file.maxFiles,
            tailable: true
        })
    );
}

// สร้าง logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports,
    // การจัดการ exception และ rejection
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logsDir, 'exceptions.log') 
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logsDir, 'rejections.log') 
        })
    ],
    exitOnError: false
});

// Helper functions สำหรับ logging แบบเฉพาะเจาะจง
const loggerHelpers = {
    /**
     * Log ข้อมูลการเข้าใช้งานระบบ
     */
    logAuth: (action, userId, details = {}) => {
        logger.info('Authentication action', {
            action,
            userId,
            timestamp: new Date().toISOString(),
            ...details
        });
    },

    /**
     * Log ข้อมูลการใช้งาน API
     */
    logAPI: (method, path, statusCode, responseTime, userId = null) => {
        logger.info('API request', {
            method,
            path,
            statusCode,
            responseTime: `${responseTime}ms`,
            userId,
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Log ข้อมูลการใช้งาน AI
     */
    logAI: (action, model, tokens, userId, details = {}) => {
        logger.info('AI service usage', {
            action,
            model,
            tokens,
            userId,
            timestamp: new Date().toISOString(),
            ...details
        });
    },

    /**
     * Log ข้อผิดพลาดระบบ
     */
    logSystemError: (error, context = {}) => {
        logger.error('System error', {
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Log การทำงานของฐานข้อมูล
     */
    logDatabase: (action, table, query, executionTime, userId = null) => {
        logger.debug('Database operation', {
            action,
            table,
            query: query.substring(0, 200), // จำกัดความยาวของ query
            executionTime: `${executionTime}ms`,
            userId,
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Log การอัปโหลดไฟล์
     */
    logFileUpload: (filename, fileSize, mimeType, userId, success = true) => {
        logger.info('File upload', {
            filename,
            fileSize,
            mimeType,
            userId,
            success,
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Log การส่งออกข้อมูล
     */
    logExport: (type, format, recordCount, userId) => {
        logger.info('Data export', {
            type,
            format,
            recordCount,
            userId,
            timestamp: new Date().toISOString()
        });
    }
};

// รวม logger หลักกับ helper functions
const enhancedLogger = Object.assign(logger, loggerHelpers);

// เพิ่ม method สำหรับ request logging middleware
enhancedLogger.requestMiddleware = (req, res, next) => {
    const start = Date.now();
    
    // เก็บ original end function
    const originalEnd = res.end;
    
    // Override end function เพื่อ log response
    res.end = function(...args) {
        const responseTime = Date.now() - start;
        
        // Log API request
        enhancedLogger.logAPI(
            req.method,
            req.originalUrl,
            res.statusCode,
            responseTime,
            req.user?.id
        );
        
        // เรียก original end function
        originalEnd.apply(this, args);
    };
    
    next();
};

// Export logger
module.exports = enhancedLogger;