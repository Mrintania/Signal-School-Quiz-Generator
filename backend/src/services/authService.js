// backend/src/services/authService.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/validator.js';

/**
 * Authentication service for user management
 */
class AuthService {
    /**
     * Create a JWT token for a user
     * @param {Object} user - User data
     * @returns {string} JWT token
     */
    static createToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );
    }

    /**
     * Hash a password
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify if a password matches a hash
     * @param {string} password - Plain text password
     * @param {string} hash - Password hash
     * @returns {Promise<boolean>} True if password matches hash
     */
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate a random token
     * @param {number} bytes - Number of bytes for token (default: 32)
     * @returns {string} Hexadecimal token
     */
    static generateToken(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }

    /**
     * Create a new user in the database
     * @param {Object} userData - User data
     * @param {string} passwordHash - Hashed password
     * @returns {Promise<number>} User ID
     */
    static async createUser(userData, passwordHash) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [userResult] = await connection.execute(
                `INSERT INTO users 
        (first_name, last_name, email, password_hash, status, role) 
        VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userData.firstName,
                    userData.lastName,
                    userData.email,
                    passwordHash,
                    userData.status || 'pending',
                    userData.role || 'teacher'
                ]
            );

            const userId = userResult.insertId;

            // Create user settings
            await connection.execute(
                'INSERT INTO user_settings (user_id) VALUES (?)',
                [userId]
            );

            // Create user quotas
            await connection.execute(
                'INSERT INTO user_quotas (user_id) VALUES (?)',
                [userId]
            );

            // If school name is provided
            if (userData.schoolName) {
                const schoolId = await this.getOrCreateSchool(connection, userData.schoolName);

                // Associate user with school
                await connection.execute(
                    'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
                    [userId, schoolId]
                );
            }

            await connection.commit();
            return userId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get a school by name or create if it doesn't exist
     * @param {Object} connection - Database connection
     * @param {string} schoolName - Name of the school
     * @returns {Promise<number>} School ID
     */
    static async getOrCreateSchool(connection, schoolName) {
        // Check if school exists
        const [existingSchools] = await connection.execute(
            'SELECT id FROM schools WHERE name = ?',
            [schoolName]
        );

        if (existingSchools.length > 0) {
            return existingSchools[0].id;
        }

        // Create new school
        const [schoolResult] = await connection.execute(
            'INSERT INTO schools (name) VALUES (?)',
            [schoolName]
        );

        return schoolResult.insertId;
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User data or null if not found
     */
    static async getUserByEmail(email) {
        const [users] = await pool.execute(
            'SELECT id, first_name, last_name, email, password_hash, role, status FROM users WHERE email = ?',
            [email]
        );

        return users.length ? users[0] : null;
    }

    /**
     * Get user by ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} User data or null if not found
     */
    static async getUserById(userId) {
        const [users] = await pool.execute(
            'SELECT id, first_name, last_name, email, role, status FROM users WHERE id = ?',
            [userId]
        );

        return users.length ? users[0] : null;
    }

    /**
     * Update user's verification status
     * @param {number} userId - User ID
     * @param {string} status - New status
     * @param {boolean} emailVerified - Email verified status
     * @returns {Promise<void>}
     */
    static async updateUserStatus(userId, status, emailVerified = false) {
        await pool.execute(
            'UPDATE users SET status = ?, email_verified = ?, updated_at = NOW() WHERE id = ?',
            [status, emailVerified, userId]
        );
    }

    /**
     * Record login attempt
     * @param {string} email - User email
     * @param {string} ipAddress - IP address
     * @param {boolean} success - Whether login was successful
     * @returns {Promise<void>}
     */
    static async recordLoginAttempt(email, ipAddress, success = false) {
        await pool.execute(
            'INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)',
            [email, ipAddress, success]
        );

        if (success) {
            await pool.execute(
                'UPDATE login_attempts SET success = TRUE WHERE email = ? ORDER BY id DESC LIMIT 1',
                [email]
            );
        }
    }

    /**
     * Get login attempt count for an IP address
     * @param {string} ipAddress - IP address 
     * @param {number} minutes - Time window in minutes
     * @returns {Promise<number>} Number of failed attempts
     */
    static async getFailedLoginAttempts(ipAddress, minutes = 15) {
        const [attempts] = await pool.execute(
            'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL ? MINUTE) AND success = FALSE',
            [ipAddress, minutes]
        );

        return attempts[0].count;
    }

    /**
     * Update user's last login time
     * @param {number} userId - User ID 
     * @returns {Promise<void>}
     */
    static async updateLastLogin(userId) {
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [userId]
        );
    }

    /**
     * Get user's schools
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Schools data
     */
    static async getUserSchools(userId) {
        const [schools] = await pool.execute(
            `SELECT s.id, s.name, us.position, us.department 
      FROM schools s
      INNER JOIN user_schools us ON s.id = us.school_id
      WHERE us.user_id = ?`,
            [userId]
        );

        return schools;
    }

    /**
     * Get user's settings
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} User settings or null if not found
     */
    static async getUserSettings(userId) {
        const [settings] = await pool.execute(
            'SELECT language, theme, default_question_count, default_quiz_type FROM user_settings WHERE user_id = ?',
            [userId]
        );

        return settings.length ? settings[0] : null;
    }

    /**
     * Set password reset token for a user
     * @param {number} userId - User ID
     * @param {string} token - Reset token
     * @param {number} expiryHours - Hours until token expires
     * @returns {Promise<void>}
     */
    static async setPasswordResetToken(userId, token, expiryHours = 1) {
        const tokenExpires = new Date();
        tokenExpires.setHours(tokenExpires.getHours() + expiryHours);

        await pool.execute(
            'UPDATE users SET reset_password_token = ?, reset_token_expires_at = ? WHERE id = ?',
            [token, tokenExpires, userId]
        );
    }

    /**
     * Find user by password reset token
     * @param {string} token - Reset token
     * @returns {Promise<Object|null>} User data or null if not found
     */
    static async getUserByResetToken(token) {
        const [users] = await pool.execute(
            'SELECT id, email, reset_token_expires_at FROM users WHERE reset_password_token = ?',
            [token]
        );

        return users.length ? users[0] : null;
    }

    /**
     * Update user password
     * @param {number} userId - User ID
     * @param {string} passwordHash - New password hash
     * @returns {Promise<void>}
     */
    static async updatePassword(userId, passwordHash) {
        await pool.execute(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
            [passwordHash, userId]
        );
    }

    /**
     * Record user activity
     * @param {number} userId - User ID
     * @param {string} activityType - Activity type
     * @param {string} description - Activity description
     * @param {string} ipAddress - IP address (optional)
     * @param {string} userAgent - User agent (optional)
     * @returns {Promise<void>}
     */
    static async recordActivity(userId, activityType, description, ipAddress = null, userAgent = null) {
        await pool.execute(
            'INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, activityType, description, ipAddress, userAgent]
        );
    }
}

/**
 * Email service specific to authentication
 */
class AuthEmailService {
    /**
     * Send account verification email
     * @param {string} email - User email
     * @param {string} firstName - User first name
     * @param {string} verificationToken - Verification token
     * @returns {Promise<void>}
     */
    static async sendVerificationEmail(email, firstName, verificationToken) {
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: email,
            subject: 'Verify Your Signal School Quiz Generator Account',
            html: `
        <h2>Welcome to Signal School Quiz Generator!</h2>
        <p>Hello ${firstName},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}">Verify Email Address</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create this account, please ignore this email.</p>
      `
        });

        logger.info(`Verification email sent to: ${email}`);
    }

    /**
     * Send password reset email
     * @param {string} email - User email
     * @param {string} firstName - User first name
     * @param {string} resetToken - Reset token
     * @returns {Promise<void>}
     */
    static async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: email,
            subject: 'Reset Your Signal School Quiz Generator Password',
            html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `
        });

        logger.info(`Password reset email sent to: ${email}`);
    }

    /**
     * Send account verification notification to user
     * @param {string} email - User email
     * @param {string} firstName - User first name
     * @returns {Promise<void>}
     */
    static async sendAccountVerificationEmail(email, firstName) {
        await sendEmail({
            to: email,
            subject: 'Your Account Has Been Verified',
            html: `
        <h2>Welcome to Signal School Quiz Generator!</h2>
        <p>Hello ${firstName},</p>
        <p>We're pleased to inform you that your account has been verified by an administrator and is now active.</p>
        <p>You can now log in and start using our platform.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
        <p>If you have any questions or need assistance, please contact our support team.</p>
      `
        });

        logger.info(`Account verification email sent to: ${email}`);
    }

    /**
     * Notify administrators about new user registration
     * @param {number} userId - User ID
     * @param {string} email - User email
     * @param {string} firstName - User first name
     * @param {string} lastName - User last name
     * @returns {Promise<void>}
     */
    static async notifyAdminsAboutNewUser(userId, email, firstName, lastName) {
        try {
            // Get admin emails
            const [admins] = await pool.execute(
                'SELECT email FROM users WHERE role = ? OR role = ?',
                ['admin', 'school_admin']
            );

            if (admins.length === 0) {
                logger.warn('No administrators found to notify about new user registration');
                return;
            }

            const adminEmails = admins.map(admin => admin.email);

            await sendEmail({
                to: adminEmails.join(','),
                subject: 'New User Registration Requires Verification',
                html: `
          <h2>New User Registration</h2>
          <p>A new user has registered and requires verification:</p>
          <ul>
            <li><strong>User ID:</strong> ${userId}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          </ul>
          <p>Please log in to the admin panel to verify this user.</p>
          <a href="${process.env.FRONTEND_URL}/admin/users" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Go to Admin Panel</a>
        `
            });

            logger.info(`Admin notification sent for new user registration: ${email} (ID: ${userId})`);
        } catch (error) {
            logger.error('Error sending admin notification:', error);
        }
    }
}

export { AuthService, AuthEmailService };