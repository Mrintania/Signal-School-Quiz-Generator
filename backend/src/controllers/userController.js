// backend/src/controllers/userController.js
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/validator.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

class UserController {
    // Get Current User Profile
    static async getCurrentUser(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware

            // Get user data
            const [users] = await pool.execute(
                `SELECT id, first_name, last_name, email, role, profile_image, status, email_verified, last_login, created_at 
         FROM users WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            // Get user schools/organizations
            const [schools] = await pool.execute(
                `SELECT s.id, s.name, s.subscription_plan, us.position, us.department, us.grade_level, us.subjects 
         FROM schools s
         INNER JOIN user_schools us ON s.id = us.school_id
         WHERE us.user_id = ?`,
                [userId]
            );

            // Get user settings
            const [settings] = await pool.execute(
                'SELECT language, theme, default_question_count, default_quiz_type, notification_preferences FROM user_settings WHERE user_id = ?',
                [userId]
            );

            // Get user quotas
            const [quotas] = await pool.execute(
                `SELECT quiz_limit, quiz_count, ai_generation_limit, ai_generation_count, 
         storage_limit, storage_used, reset_date 
         FROM user_quotas 
         WHERE user_id = ?`,
                [userId]
            );

            const userSettings = settings.length > 0 ? settings[0] : null;
            const userQuotas = quotas.length > 0 ? quotas[0] : null;

            // Get user quiz stats
            const [quizStats] = await pool.execute(
                `SELECT 
           COUNT(*) as total_quizzes,
           SUM(CASE WHEN question_type = 'Multiple Choice' THEN 1 ELSE 0 END) as multiple_choice_count,
           SUM(CASE WHEN question_type = 'Essay' THEN 1 ELSE 0 END) as essay_count 
         FROM quizzes 
         WHERE user_id = ?`,
                [userId]
            );

            // Prepare response object
            const userProfile = {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role,
                profileImage: user.profile_image,
                status: user.status,
                emailVerified: user.email_verified === 1, // Convert to boolean
                lastLogin: user.last_login,
                createdAt: user.created_at,
                schools: schools,
                settings: userSettings,
                quotas: userQuotas,
                stats: quizStats[0] || {}
            };

            return res.status(200).json({
                success: true,
                data: userProfile
            });
        } catch (error) {
            logger.error('Error fetching user profile:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching user profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Profile
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware
            const { firstName, lastName, position, department, gradeLevel, subjects } = req.body;

            // Validate required fields
            if (!firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    message: 'First name and last name are required'
                });
            }

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Update user basic info
                await connection.execute(
                    'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
                    [firstName, lastName, userId]
                );

                // Update school-related info if provided
                if (req.body.schoolId && (position || department || gradeLevel || subjects)) {
                    // Check if user is associated with this school
                    const [userSchools] = await connection.execute(
                        'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                        [userId, req.body.schoolId]
                    );

                    if (userSchools.length > 0) {
                        // Update existing association
                        await connection.execute(
                            `UPDATE user_schools SET
               position = COALESCE(?, position),
               department = COALESCE(?, department),
               grade_level = COALESCE(?, grade_level),
               subjects = COALESCE(?, subjects)
               WHERE user_id = ? AND school_id = ?`,
                            [position, department, gradeLevel, subjects, userId, req.body.schoolId]
                        );
                    }
                }

                await connection.commit();

                logger.info(`User profile updated: (ID: ${userId})`);

                return res.status(200).json({
                    success: true,
                    message: 'Profile updated successfully'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error updating user profile:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Password
    static async updatePassword(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware
            const { currentPassword, newPassword } = req.body;

            // Validate input
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            // Validate password strength
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: passwordValidation.message
                });
            }

            // Get current user data
            const [users] = await pool.execute(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user authenticated with OAuth
            if (users[0].password_hash === 'GOOGLE_AUTH') {
                return res.status(400).json({
                    success: false,
                    message: 'Password cannot be changed for accounts that use Google to sign in'
                });
            }

            // Verify current password
            const passwordMatch = await bcrypt.compare(currentPassword, users[0].password_hash);

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            await pool.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [passwordHash, userId]
            );

            // Log password change
            logger.info(`User changed password: (ID: ${userId})`);

            // Record password change activity
            await pool.execute(
                'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
                [userId, 'password_change', 'User changed password']
            );

            return res.status(200).json({
                success: true,
                message: 'Password updated successfully'
            });
        } catch (error) {
            logger.error('Error updating password:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating password',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Upload Profile Image
    static async uploadProfileImage(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware

            // In a production environment, this would handle file upload to a storage service
            // and then store the URL of the uploaded image
            const imageUrl = req.body.imageUrl || req.file?.path;

            if (!imageUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'No image provided'
                });
            }

            // Update user profile image
            await pool.execute(
                'UPDATE users SET profile_image = ? WHERE id = ?',
                [imageUrl, userId]
            );

            logger.info(`User updated profile image: (ID: ${userId})`);

            return res.status(200).json({
                success: true,
                message: 'Profile image updated successfully',
                imageUrl: imageUrl
            });
        } catch (error) {
            logger.error('Error uploading profile image:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while uploading profile image',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Settings
    static async updateSettings(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware
            const { language, theme, defaultQuestionCount, defaultQuizType, notificationPreferences } = req.body;

            // Validate settings
            if (defaultQuestionCount && (defaultQuestionCount < 1 || defaultQuestionCount > 50)) {
                return res.status(400).json({
                    success: false,
                    message: 'Default question count must be between 1 and 50'
                });
            }

            if (defaultQuizType && !['Multiple Choice', 'Essay'].includes(defaultQuizType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid quiz type'
                });
            }

            // Check if settings exist
            const [existingSettings] = await pool.execute(
                'SELECT id FROM user_settings WHERE user_id = ?',
                [userId]
            );

            // Parse notification preferences if provided
            let notificationPrefsJson = null;
            if (notificationPreferences) {
                notificationPrefsJson = JSON.stringify(notificationPreferences);
            }

            if (existingSettings.length > 0) {
                // Update existing settings
                await pool.execute(
                    `UPDATE user_settings SET
           language = COALESCE(?, language),
           theme = COALESCE(?, theme),
           default_question_count = COALESCE(?, default_question_count),
           default_quiz_type = COALESCE(?, default_quiz_type),
           notification_preferences = COALESCE(?, notification_preferences),
           updated_at = NOW()
           WHERE user_id = ?`,
                    [language, theme, defaultQuestionCount, defaultQuizType, notificationPrefsJson, userId]
                );
            } else {
                // Create new settings
                await pool.execute(
                    `INSERT INTO user_settings 
           (user_id, language, theme, default_question_count, default_quiz_type, notification_preferences) 
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, language || 'thai', theme || 'light', defaultQuestionCount || 10, defaultQuizType || 'Multiple Choice', notificationPrefsJson]
                );
            }

            logger.info(`User updated settings: (ID: ${userId})`);

            return res.status(200).json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            logger.error('Error updating user settings:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating settings',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get User Activity
    static async getUserActivity(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;

            // Get user activity with pagination
            const [activities] = await pool.execute(
                `SELECT activity_type, description, ip_address, created_at 
         FROM user_activities 
         WHERE user_id = ? 
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );

            // Get total count for pagination
            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM user_activities WHERE user_id = ?',
                [userId]
            );

            const total = countResult[0].total;

            return res.status(200).json({
                success: true,
                data: activities,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        } catch (error) {
            logger.error('Error fetching user activity:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching user activity',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Close User Account
    static async closeAccount(req, res) {
        try {
            const userId = req.user.userId; // From JWT auth middleware
            const { password, reason } = req.body;

            // Get user data
            const [users] = await pool.execute(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify password for added security
            if (users[0].password_hash !== 'GOOGLE_AUTH') {
                if (!password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password is required to close your account'
                    });
                }

                const passwordMatch = await bcrypt.compare(password, users[0].password_hash);

                if (!passwordMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Incorrect password'
                    });
                }
            }

            // In a production environment, you might want to implement a "soft delete"
            // rather than permanently deleting the user data
            await pool.execute(
                'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
                ['inactive', userId]
            );

            // Log account closure
            logger.info(`User closed account: (ID: ${userId}), Reason: ${reason || 'Not provided'}`);

            return res.status(200).json({
                success: true,
                message: 'Your account has been closed successfully'
            });
        } catch (error) {
            logger.error('Error closing account:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while closing your account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export { UserController };