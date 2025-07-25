// src/routes/authRoutes.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import {
    login,
    logout,
    checkAuth,
    refreshToken,
    changePassword
} from '../controllers/authController.js';
import { ValidationError } from '../errors/CustomErrors.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        throw new ValidationError('ข้อมูลที่ส่งมาไม่ถูกต้อง', validationErrors);
    }
    next();
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('ไม่พบ token การยืนยันตัวตน');
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'signal-school-secret-key-2024');

        const db = getDatabase();
        const user = await db.get(`
            SELECT id, email, firstName, lastName, role, department, rank
            FROM users 
            WHERE id = ? AND isActive = 1
        `, [decoded.userId]);

        if (!user) {
            throw new AuthenticationError('ไม่พบข้อมูลผู้ใช้');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    เข้าสู่ระบบ
 * @access  Public
 */
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('รูปแบบอีเมลไม่ถูกต้อง')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
], handleValidationErrors, login);

/**
 * @route   POST /api/auth/logout
 * @desc    ออกจากระบบ
 * @access  Private
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    ตรวจสอบสถานะการเข้าสู่ระบบ
 * @access  Private
 */
router.get('/me', checkAuth);

/**
 * @route   POST /api/auth/refresh
 * @desc    รีเฟรช Token
 * @access  Public
 */
router.post('/refresh', [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token เป็นข้อมูลที่จำเป็น')
], handleValidationErrors, refreshToken);

/**
 * @route   PUT /api/auth/change-password
 * @desc    เปลี่ยนรหัสผ่าน
 * @access  Private
 */
router.put('/change-password', authenticateToken, [
    body('currentPassword')
        .notEmpty()
        .withMessage('รหัสผ่านเดิมเป็นข้อมูลที่จำเป็น'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('รหัสผ่านใหม่ต้องประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข')
], handleValidationErrors, changePassword);

/**
 * @route   GET /api/auth/test
 * @desc    ทดสอบ API
 * @access  Public
 */
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authentication API is working!',
        data: {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            endpoints: {
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                me: 'GET /api/auth/me',
                refresh: 'POST /api/auth/refresh',
                changePassword: 'PUT /api/auth/change-password'
            }
        }
    });
});

export default router;