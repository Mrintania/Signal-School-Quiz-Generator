// src/middlewares/index.js
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { uploadSingleFile, uploadMultipleFiles, validateUploadedFile, validateQuizFile, multerErrorHandler } from './validation/FileValidation.js';

// CORS Middleware
export const corsMiddleware = cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// Security Middleware
export const securityMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
});

// Rate Limiting Middleware
export const rateLimitMiddleware = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'การร้องขอมากเกินไป กรุณาลองใหม่ภายหลัง'
    }
});

// API Rate Limiting สำหรับ Gemini AI
export const aiRateLimitMiddleware = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 AI requests per minute
    message: {
        success: false,
        message: 'การใช้งาน AI เกินขีดจำกัด กรุณารอสักครู่'
    }
});

// Authentication Middleware
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'ไม่พบ Access Token'
        });
    }

    // ถ้าใช้ JWT
    if (process.env.JWT_SECRET) {
        try {
            const jwt = await import('jsonwebtoken');
            const user = jwt.verify(token, process.env.JWT_SECRET);
            req.user = user;
            next();
        } catch (error) {
            return res.status(403).json({
                success: false,
                message: 'Token ไม่ถูกต้อง'
            });
        }
    } else {
        // Simple token validation for development
        if (token === 'development-token') {
            req.user = { id: 1, username: 'developer' };
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Token ไม่ถูกต้อง'
            });
        }
    }
};

// Validation Middleware สำหรับข้อมูลข้อสอบ
export const validateQuizData = (req, res, next) => {
    const { title, subject, level, questionCount } = req.body;

    const errors = [];

    if (!title || title.trim().length < 3) {
        errors.push('ชื่อข้อสอบต้องมีอย่างน้อย 3 ตัวอักษร');
    }

    if (!subject || subject.trim().length < 2) {
        errors.push('ชื่อวิชาต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    if (!level || !['ประถม', 'มัธยม', 'ปวช', 'ปวส', 'อุดม', 'ทหาร'].includes(level)) {
        errors.push('ระดับชั้นไม่ถูกต้อง');
    }

    if (!questionCount || questionCount < 5 || questionCount > 50) {
        errors.push('จำนวนข้อสอบต้องอยู่ระหว่าง 5-50 ข้อ');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            errors
        });
    }

    next();
};

// Error Handler Middleware
export const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);

    // Multer errors
    if (error.code && error.code.startsWith('LIMIT_')) {
        return multerErrorHandler(error, req, res, next);
    }

    // Database errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            error: error.message
        });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้อง'
        });
    }

    // Default error
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดภายในระบบ',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

// 404 Handler
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'ไม่พบ API Endpoint ที่ร้องขอ'
    });
};

// File Validation Middlewares (re-export)
export {
    uploadSingleFile,
    uploadMultipleFiles,
    validateUploadedFile,
    validateQuizFile,
    multerErrorHandler
};

// ส่งออก middleware ทั้งหมดเป็น default
export default {
    corsMiddleware,
    securityMiddleware,
    rateLimitMiddleware,
    aiRateLimitMiddleware,
    authenticateToken,
    validateQuizData,
    errorHandler,
    notFoundHandler,
    uploadSingleFile,
    uploadMultipleFiles,
    validateUploadedFile,
    validateQuizFile,
    multerErrorHandler
};