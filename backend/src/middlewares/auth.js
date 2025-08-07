// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const logger = require('../utils/logger');

/**
 * Middleware สำหรับการยืนยันตัวตน
 * รองรับการข้าม authentication ในโหมด development
 */

/**
 * ยืนยันตัวตนผู้ใช้
 */
const authenticateUser = async (req, res, next) => {
    try {
        // ตรวจสอบว่าเป็นโหมด skip auth หรือไม่
        if (config.server.skipAuth) {
            // สร้าง mock user สำหรับ development
            req.user = {
                id: 1,
                email: 'dev@signalschool.army.mi.th',
                name: 'Development User',
                role: 'teacher',
                department: 'Signal Department',
                rank: 'Captain',
                is_active: true
            };
            
            if (config.server.logAuth) {
                logger.logAuth('skip_auth_mode', req.user.id, {
                    path: req.path,
                    method: req.method,
                    ip: req.ip
                });
            }
            
            return next();
        }

        // ดึง token จาก header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
                error: 'MISSING_TOKEN'
            });
        }

        // ตรวจสอบและ decode token
        const decoded = jwt.verify(token, config.jwt.secret, {
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        // ดึงข้อมูลผู้ใช้จากฐานข้อมูล (จำลอง)
        const user = await getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User account is inactive',
                error: 'ACCOUNT_INACTIVE'
            });
        }

        // เพิ่มข้อมูลผู้ใช้ใน request
        req.user = user;

        // Log การใช้งาน
        if (config.server.logAuth) {
            logger.logAuth('token_verified', user.id, {
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        next();
    } catch (error) {
        logger.error('Authentication failed', {
            error: error.message,
            path: req.path,
            method: req.method,
            ip: req.ip,
            token: req.headers.authorization ? 'present' : 'missing'
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                error: 'INVALID_TOKEN'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                error: 'TOKEN_EXPIRED'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: 'AUTH_ERROR'
        });
    }
};

/**
 * ตรวจสอบสิทธิ์ตามบทบาท
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'NOT_AUTHENTICATED'
            });
        }

        const userRole = req.user.role;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(userRole)) {
            logger.warn('Access denied - insufficient role', {
                userId: req.user.id,
                userRole,
                requiredRoles: roles,
                path: req.path,
                method: req.method
            });

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                error: 'INSUFFICIENT_ROLE'
            });
        }

        next();
    };
};

/**
 * ตรวจสอบว่าเป็น admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * ตรวจสอบว่าเป็น teacher หรือ admin
 */
const requireTeacher = requireRole(['teacher', 'admin']);

/**
 * Middleware สำหรับ optional authentication
 * ไม่บังคับให้มี token แต่ถ้ามีจะ verify
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            // ไม่มี token ก็ผ่านไปได้
            return next();
        }

        // มี token ให้ verify
        const decoded = jwt.verify(token, config.jwt.secret, {
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        const user = await getUserById(decoded.userId);
        
        if (user && user.is_active) {
            req.user = user;
        }

        next();
    } catch (error) {
        // ถ้า token ไม่ถูกต้อง ให้ผ่านไปแต่ไม่มี user
        next();
    }
};

/**
 * ดึงข้อมูลผู้ใช้จากฐานข้อมูล (จำลอง)
 * ในการใช้งานจริงจะเชื่อมต่อกับฐานข้อมูล
 */
async function getUserById(userId) {
    // จำลองข้อมูลผู้ใช้
    const mockUsers = {
        1: {
            id: 1,
            email: 'teacher@signalschool.army.mi.th',
            name: 'อาจารย์ทดสอบ',
            role: 'teacher',
            department: 'Signal Department',
            rank: 'Captain',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        2: {
            id: 2,
            email: 'admin@signalschool.army.mi.th',
            name: 'ผู้ดูแลระบบ',
            role: 'admin',
            department: 'Signal Department',
            rank: 'Major',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }
    };

    return mockUsers[userId] || null;
}

/**
 * สร้าง JWT token
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
    });
}

/**
 * สร้าง refresh token
 */
function generateRefreshToken(user) {
    const payload = {
        userId: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
    });
}

/**
 * ตรวจสอบ refresh token
 */
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, config.jwt.secret, {
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    authenticateUser,
    requireRole,
    requireAdmin,
    requireTeacher,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    getUserById
};