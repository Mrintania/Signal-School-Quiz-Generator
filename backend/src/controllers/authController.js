// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/database.js';
import {
    AuthenticationError,
    ValidationError,
    NotFoundError
} from '../errors/CustomErrors.js';

// สร้าง JWT Token
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || 'signal-school-secret-key-2024',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// สร้าง Session Token
const generateSessionToken = () => {
    return uuidv4();
};

/**
 * เข้าสู่ระบบ
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // ตรวจสอบข้อมูลที่ส่งมา
        if (!email || !password) {
            throw new ValidationError('กรุณากรอกอีเมลและรหัสผ่าน', [
                { field: 'email', message: 'อีเมลเป็นข้อมูลที่จำเป็น' },
                { field: 'password', message: 'รหัสผ่านเป็นข้อมูลที่จำเป็น' }
            ]);
        }

        const db = getDatabase();

        // ค้นหาผู้ใช้จากฐานข้อมูล
        const user = await db.get(`
            SELECT id, email, password, firstName, lastName, role, department, rank, isActive
            FROM users 
            WHERE email = ? AND isActive = 1
        `, [email]);

        if (!user) {
            throw new AuthenticationError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AuthenticationError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }

        // สร้าง JWT Token
        const token = generateToken(user.id, user.email);

        // สร้าง Session Token
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 วัน

        // บันทึก session ลงฐานข้อมูล
        await db.run(`
            INSERT INTO user_sessions (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `, [user.id, sessionToken, expiresAt]);

        // อัพเดทเวลาเข้าสู่ระบบล่าสุด
        await db.run(`
            UPDATE users 
            SET lastLogin = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [user.id]);

        // ส่งข้อมูลกลับ (ไม่รวมรหัสผ่าน)
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                user: {
                    ...userWithoutPassword,
                    fullName: `${user.firstName} ${user.lastName}`
                },
                token,
                sessionToken,
                expiresAt
            }
        });

        console.log(`✅ User logged in: ${user.email}`);

    } catch (error) {
        next(error);
    }
};

/**
 * ออกจากระบบ
 */
export const logout = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            const db = getDatabase();
            // ลบ session จากฐานข้อมูล
            await db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
        }

        res.status(200).json({
            success: true,
            message: 'ออกจากระบบสำเร็จ'
        });

        console.log('✅ User logged out');

    } catch (error) {
        next(error);
    }
};

/**
 * ตรวจสอบสถานะการเข้าสู่ระบบ
 */
export const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('ไม่พบ token การยืนยันตัวตน');
        }

        const token = authHeader.replace('Bearer ', '');

        // ตรวจสอบ JWT Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'signal-school-secret-key-2024');

        const db = getDatabase();

        // ตรวจสอบผู้ใช้ในฐานข้อมูล
        const user = await db.get(`
            SELECT id, email, firstName, lastName, role, department, rank, isActive
            FROM users 
            WHERE id = ? AND isActive = 1
        `, [decoded.userId]);

        if (!user) {
            throw new AuthenticationError('ไม่พบข้อมูลผู้ใช้');
        }

        // ตรวจสอบ session
        const session = await db.get(`
            SELECT expires_at FROM user_sessions 
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
        `, [user.id]);

        if (!session) {
            throw new AuthenticationError('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
        }

        res.status(200).json({
            success: true,
            message: 'ยืนยันตัวตนสำเร็จ',
            data: {
                user: {
                    ...user,
                    fullName: `${user.firstName} ${user.lastName}`
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AuthenticationError('Token ไม่ถูกต้อง'));
        } else if (error.name === 'TokenExpiredError') {
            next(new AuthenticationError('Token หมดอายุ'));
        } else {
            next(error);
        }
    }
};

/**
 * รีเฟรช Token
 */
export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new ValidationError('ไม่พบ refresh token');
        }

        const db = getDatabase();

        // ตรวจสอบ refresh token
        const session = await db.get(`
            SELECT us.user_id, u.email, u.firstName, u.lastName, u.role, u.department, u.rank
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.token = ? AND us.expires_at > CURRENT_TIMESTAMP AND u.isActive = 1
        `, [refreshToken]);

        if (!session) {
            throw new AuthenticationError('Refresh token ไม่ถูกต้องหรือหมดอายุ');
        }

        // สร้าง token ใหม่
        const newToken = generateToken(session.user_id, session.email);
        const newSessionToken = generateSessionToken();
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // อัพเดท session
        await db.run(`
            UPDATE user_sessions 
            SET token = ?, expires_at = ?
            WHERE user_id = ? AND token = ?
        `, [newSessionToken, newExpiresAt, session.user_id, refreshToken]);

        res.status(200).json({
            success: true,
            message: 'รีเฟรช token สำเร็จ',
            data: {
                token: newToken,
                sessionToken: newSessionToken,
                expiresAt: newExpiresAt
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * เปลี่ยนรหัสผ่าน
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // จาก auth middleware

        if (!currentPassword || !newPassword) {
            throw new ValidationError('กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่');
        }

        if (newPassword.length < 8) {
            throw new ValidationError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        }

        const db = getDatabase();

        // ตรวจสอบรหัสผ่านเดิม
        const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            throw new AuthenticationError('รหัสผ่านเดิมไม่ถูกต้อง');
        }

        // เข้ารหัสรหัสผ่านใหม่
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // อัพเดทรหัสผ่าน
        await db.run(`
            UPDATE users 
            SET password = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [hashedNewPassword, userId]);

        res.status(200).json({
            success: true,
            message: 'เปลี่ยนรหัสผ่านสำเร็จ'
        });

        console.log(`✅ Password changed for user ID: ${userId}`);

    } catch (error) {
        next(error);
    }
};

export default {
    login,
    logout,
    checkAuth,
    refreshToken,
    changePassword
};