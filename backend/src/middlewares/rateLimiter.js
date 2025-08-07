// backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const config = require('../../config/config');
const logger = require('../utils/logger');

/**
 * Rate Limiter สำหรับ Signal School Quiz Generator
 * จำกัดการใช้งาน API เพื่อป้องกันการใช้งานเกินขีดจำกัด
 */

/**
 * General Rate Limiter
 * สำหรับ API ทั่วไปของระบบ
 */
const generalLimiter = rateLimit({
    windowMs: config.rateLimiter.general.windowMs, // 15 นาที
    max: config.rateLimiter.general.max, // จำกัด 100 requests ต่อ windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimiter.general.windowMs / 1000),
        type: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // ส่ง rate limit info ใน headers
    legacyHeaders: false, // ปิด X-RateLimit-* headers แบบเก่า
    handler: (req, res) => {
        logger.warn('General rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method
        });
        
        res.status(429).json({
            success: false,
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(config.rateLimiter.general.windowMs / 1000),
            type: 'RATE_LIMIT_EXCEEDED'
        });
    },
    skip: (req) => {
        // ข้าม rate limiting สำหรับ health check
        return req.path === '/health' || req.path === '/api/health';
    }
});

/**
 * Authentication Rate Limiter
 * สำหรับการ login, register, และ password reset
 */
const authLimiter = rateLimit({
    windowMs: config.rateLimiter.auth.windowMs, // 1 ชั่วโมง
    max: config.rateLimiter.auth.max, // จำกัด 10 attempts ต่อ windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimiter.auth.windowMs / 1000),
        type: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // ไม่นับ request ที่สำเร็จ
    skipFailedRequests: false, // นับ request ที่ล้มเหลว
    handler: (req, res) => {
        logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            body: req.body ? { email: req.body.email } : null
        });
        
        res.status(429).json({
            success: false,
            error: 'Too many authentication attempts from this IP, please try again later.',
            retryAfter: Math.ceil(config.rateLimiter.auth.windowMs / 1000),
            type: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
    }
});

/**
 * AI Generation Rate Limiter
 * สำหรับการใช้งาน AI ในการสร้างข้อสอบ
 */
const aiGenerationLimiter = rateLimit({
    windowMs: config.rateLimiter.aiGeneration.windowMs, // 1 ชั่วโมง
    max: config.rateLimiter.aiGeneration.max, // จำกัด 20 requests ต่อ windowMs
    message: {
        success: false,
        error: 'Too many AI generation requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimiter.aiGeneration.windowMs / 1000),
        type: 'AI_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('AI generation rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            userId: req.user?.id
        });
        
        res.status(429).json({
            success: false,
            error: 'Too many AI generation requests from this IP, please try again later.',
            retryAfter: Math.ceil(config.rateLimiter.aiGeneration.windowMs / 1000),
            type: 'AI_RATE_LIMIT_EXCEEDED',
            suggestion: 'Please wait before making more AI requests or consider upgrading your plan.'
        });
    },
    keyGenerator: (req) => {
        // ใช้ user ID ถ้ามี login, ไม่งั้นใช้ IP
        return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    }
});

/**
 * File Upload Rate Limiter
 * สำหรับการอัปโหลดไฟล์
 */
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 10, // จำกัด 10 uploads ต่อ 15 นาที
    message: {
        success: false,
        error: 'Too many file uploads from this IP, please try again later.',
        retryAfter: 15 * 60, // 15 นาที
        type: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('File upload rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            userId: req.user?.id
        });
        
        res.status(429).json({
            success: false,
            error: 'Too many file uploads from this IP, please try again later.',
            retryAfter: 15 * 60,
            type: 'UPLOAD_RATE_LIMIT_EXCEEDED'
        });
    }
});

/**
 * Export Rate Limiter
 * สำหรับการส่งออกข้อมูล
 */
const exportLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 นาที
    max: 5, // จำกัด 5 exports ต่อ 5 นาที
    message: {
        success: false,
        error: 'Too many export requests from this IP, please try again later.',
        retryAfter: 5 * 60, // 5 นาที
        type: 'EXPORT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Export rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            userId: req.user?.id
        });
        
        res.status(429).json({
            success: false,
            error: 'Too many export requests from this IP, please try again later.',
            retryAfter: 5 * 60,
            type: 'EXPORT_RATE_LIMIT_EXCEEDED'
        });
    }
});

/**
 * Custom Rate Limiter Factory
 * สร้าง rate limiter แบบกำหนดเอง
 */
const createCustomLimiter = ({ windowMs, max, message, skipSuccessfulRequests = false }) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: message,
            retryAfter: Math.ceil(windowMs / 1000),
            type: 'CUSTOM_RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        handler: (req, res) => {
            logger.warn('Custom rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                userId: req.user?.id,
                windowMs,
                max
            });
            
            res.status(429).json({
                success: false,
                error: message,
                retryAfter: Math.ceil(windowMs / 1000),
                type: 'CUSTOM_RATE_LIMIT_EXCEEDED'
            });
        }
    });
};

/**
 * Rate Limiter สำหรับ API ที่เฉพาะเจาะจง
 */
const strictLimiter = createCustomLimiter({
    windowMs: 1 * 60 * 1000, // 1 นาที
    max: 5, // 5 requests ต่อนาที
    message: 'Too many requests to this endpoint, please slow down.'
});

/**
 * Middleware สำหรับการรีเซ็ต rate limit (สำหรับ admin)
 */
const resetRateLimit = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        // Admin สามารถข้าม rate limiting ได้
        return next();
    }
    next();
};

module.exports = {
    generalLimiter,
    authLimiter,
    aiGenerationLimiter,
    uploadLimiter,
    exportLimiter,
    strictLimiter,
    createCustomLimiter,
    resetRateLimit
};