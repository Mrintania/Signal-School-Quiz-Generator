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

class SchoolAdminController {
    // Invite User to School
    static async inviteUser(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { email, role, schoolId, department, position, gradeLevel } = req.body;

            // Validate input
            if (!email || !schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and school ID are required'
                });
            }

            // Validate role
            if (role && !['school_admin', 'teacher'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either "school_admin" or "teacher"'
                });
            }

            // Check if admin has permission to invite users to this school
            const [adminSchools] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminSchools[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
                    [adminId, schoolId]
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to invite users to this school'
                    });
                }
            }

            // Check if the email is already registered with this school
            const [existingUsers] = await pool.execute(
                `SELECT u.id FROM users u
         JOIN user_schools us ON u.id = us.user_id
         WHERE u.email = ? AND us.school_id = ?`,
                [email, schoolId]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already registered with this school'
                });
            }

            // Check if there's an existing pending invitation for this email and school
            const [existingInvitations] = await pool.execute(
                'SELECT id FROM school_invitations WHERE email = ? AND school_id = ? AND status = ?',
                [email, schoolId, 'pending']
            );

            if (existingInvitations.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'There is already a pending invitation for this email'
                });
            }

            // Get school name
            const [schools] = await pool.execute(
                'SELECT name FROM schools WHERE id = ?',
                [schoolId]
            );

            if (schools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });
            }

            // Generate invitation token
            const invitationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date();
            tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

            // Create invitation
            await pool.execute(
                `INSERT INTO school_invitations 
         (email, school_id, role, invitation_token, expires_at, invited_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [email, schoolId, role || 'teacher', invitationToken, tokenExpires, adminId]
            );

            // Send invitation email
            const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
            await sendEmail({
                to: email,
                subject: `Invitation to join ${schools[0].name} on Signal School Quiz Generator`,
                html: `
          <h2>You've been invited to join ${schools[0].name}</h2>
          <p>You have been invited to join Signal School Quiz Generator as a ${role || 'teacher'} for ${schools[0].name}.</p>
          <p>Click the link below to accept the invitation:</p>
          <p><a href="${invitationLink}">Accept Invitation</a></p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you did not expect this invitation, you can ignore this email.</p>
        `
            });

            logger.info(`Invitation sent to ${email} for school ID: ${schoolId} by admin ID: ${adminId}`);

            return res.status(200).json({
                success: true,
                message: `Invitation sent to ${email}`
            });
        } catch (error) {
            logger.error('Error sending invitation:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while sending the invitation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get School Users
    static async getSchoolUsers(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { schoolId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            // Check if admin has permission to view users in this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
                    [adminId, schoolId]
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to view users in this school'
                    });
                }
            }

            // Get users with pagination
            const [users] = await pool.execute(
                `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, 
          u.profile_image, u.last_login, u.created_at,
          us.position, us.department, us.grade_level, us.subjects,
          us.join_date
         FROM users u
         JOIN user_schools us ON u.id = us.user_id
         WHERE us.school_id = ?
         ORDER BY u.last_name, u.first_name
         LIMIT ? OFFSET ?`,
                [schoolId, limit, offset]
            );

            // Get total count for pagination
            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM users u JOIN user_schools us ON u.id = us.user_id WHERE us.school_id = ?',
                [schoolId]
            );

            const total = countResult[0].total;

            // Get pending invitations for this school
            const [invitations] = await pool.execute(
                `SELECT i.id, i.email, i.role, i.status, i.created_at, i.expires_at,
          u.first_name as invited_by_first_name, u.last_name as invited_by_last_name
         FROM school_invitations i
         JOIN users u ON i.invited_by = u.id
         WHERE i.school_id = ? AND i.status = ?
         ORDER BY i.created_at DESC`,
                [schoolId, 'pending']
            );

            return res.status(200).json({
                success: true,
                data: {
                    users,
                    invitations
                },
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        } catch (error) {
            logger.error('Error fetching school users:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching school users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Role in School
    static async updateUserRole(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { userId, schoolId, role } = req.body;

            // Validate input
            if (!userId || !schoolId || !role) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, school ID, and role are required'
                });
            }

            // Validate role
            if (!['school_admin', 'teacher'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either "school_admin" or "teacher"'
                });
            }

            // Check if admin has permission to update roles in this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to update user roles in this school'
                    });
                }
            }

            // Check if user exists and is part of the school
            const [userSchools] = await pool.execute(
                'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                [userId, schoolId]
            );

            if (userSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found in this school'
                });
            }

            // Update user role
            if (role === 'school_admin') {
                // If promoting to school_admin, update user role in main users table
                await pool.execute(
                    'UPDATE users SET role = ? WHERE id = ?',
                    [role, userId]
                );
            } else {
                // If demoting to teacher, need to check if user is school_admin for other schools
                const [otherSchoolAdmin] = await pool.execute(
                    `SELECT COUNT(*) as count FROM user_schools us
           JOIN users u ON us.user_id = u.id
           WHERE us.user_id = ? AND us.school_id != ? AND u.role = ?`,
                    [userId, schoolId, 'school_admin']
                );

                // If not a school_admin for other schools, update to teacher
                if (otherSchoolAdmin[0].count === 0) {
                    await pool.execute(
                        'UPDATE users SET role = ? WHERE id = ?',
                        ['teacher', userId]
                    );
                }
            }

            logger.info(`User role updated: User ID ${userId} in School ID ${schoolId} to ${role} by Admin ID ${adminId}`);

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role}`
            });
        } catch (error) {
            logger.error('Error updating user role:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating user role',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Remove User from School
    static async removeUser(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { userId, schoolId } = req.body;

            // Validate input
            if (!userId || !schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and school ID are required'
                });
            }

            // Check if admin has permission to remove users from this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to remove users from this school'
                    });
                }
            }

            // Check if user exists and is part of the school
            const [userSchools] = await pool.execute(
                'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                [userId, schoolId]
            );

            if (userSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found in this school'
                });
            }

            // Get user info for logging
            const [users] = await pool.execute(
                'SELECT email, role FROM users WHERE id = ?',
                [userId]
            );

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Remove user from school
                await connection.execute(
                    'DELETE FROM user_schools WHERE user_id = ? AND school_id = ?',
                    [userId, schoolId]
                );

                // Update user role if needed
                if (users[0].role === 'school_admin') {
                    // Check if user is still school_admin in other schools
                    const [otherSchoolAdmin] = await connection.execute(
                        'SELECT COUNT(*) as count FROM user_schools WHERE user_id = ? AND school_id != ?',
                        [userId, schoolId]
                    );

                    // If not associated with other schools, update to teacher
                    if (otherSchoolAdmin[0].count === 0) {
                        await connection.execute(
                            'UPDATE users SET role = ? WHERE id = ?',
                            ['teacher', userId]
                        );
                    }
                }

                await connection.commit();

                logger.info(`User removed from school: User ID ${userId} (${users[0].email}) from School ID ${schoolId} by Admin ID ${adminId}`);

                return res.status(200).json({
                    success: true,
                    message: 'User removed from school successfully'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error removing user from school:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while removing user from school',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Cancel Invitation
    static async cancelInvitation(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { invitationId } = req.params;

            // Get invitation details
            const [invitations] = await pool.execute(
                'SELECT email, school_id FROM school_invitations WHERE id = ?',
                [invitationId]
            );

            if (invitations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invitation not found'
                });
            }

            const invitation = invitations[0];

            // Check if admin has permission to cancel invitations for this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, invitation.school_id, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to cancel invitations for this school'
                    });
                }
            }

            // Delete the invitation
            await pool.execute(
                'DELETE FROM school_invitations WHERE id = ?',
                [invitationId]
            );

            logger.info(`Invitation cancelled: ID ${invitationId} for ${invitation.email} by Admin ID ${adminId}`);

            return res.status(200).json({
                success: true,
                message: 'Invitation cancelled successfully'
            });
        } catch (error) {
            logger.error('Error cancelling invitation:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while cancelling the invitation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

class AdminController {
    // Get All Users (for system admin)
    static async getAllUsers(req, res) {
        try {
            // Check if requester is system admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. System administrator privileges required.'
                });
            }

            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search || '';
            const filter = req.query.filter || '';

            let query = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, 
        u.email_verified, u.profile_image, u.last_login, u.created_at
        FROM users u
      `;

            let countQuery = 'SELECT COUNT(*) as total FROM users u';

            const queryParams = [];

            // Add search condition if provided
            if (search) {
                query += ' WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
                countQuery += ' WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';

                const searchPattern = `%${search}%`;
                queryParams.push(searchPattern, searchPattern, searchPattern);
            }

            // Add filter condition if provided
            if (filter) {
                const whereOrAnd = search ? ' AND' : ' WHERE';

                switch (filter) {
                    case 'admin':
                        query += `${whereOrAnd} u.role = 'admin'`;
                        countQuery += `${whereOrAnd} u.role = 'admin'`;
                        break;
                    case 'school_admin':
                        query += `${whereOrAnd} u.role = 'school_admin'`;
                        countQuery += `${whereOrAnd} u.role = 'school_admin'`;
                        break;
                    case 'teacher':
                        query += `${whereOrAnd} u.role = 'teacher'`;
                        countQuery += `${whereOrAnd} u.role = 'teacher'`;
                        break;
                    case 'active':
                        query += `${whereOrAnd} u.status = 'active'`;
                        countQuery += `${whereOrAnd} u.status = 'active'`;
                        break;
                    case 'pending':
                        query += `${whereOrAnd} u.status = 'pending'`;
                        countQuery += `${whereOrAnd} u.status = 'pending'`;
                        break;
                    case 'suspended':
                        query += `${whereOrAnd} u.status = 'suspended'`;
                        countQuery += `${whereOrAnd} u.status = 'suspended'`;
                        break;
                    default:
                        break;
                }
            }

            // Add ordering and pagination
            query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute queries
            const [users] = await pool.execute(query, queryParams);

            const [countResult] = await pool.execute(
                countQuery,
                search ? [
                    `%${search}%`,
                    `%${search}%`,
                    `%${search}%`
                ] : []
            );

            const total = countResult[0].total;

            return res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        } catch (error) {
            logger.error('Error fetching all users:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get All Schools (for system admin)
    static async getAllSchools(req, res) {
        try {
            // Check if requester is system admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. System administrator privileges required.'
                });
            }

            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search || '';

            let query = `
        SELECT s.*, COUNT(DISTINCT us.user_id) as user_count
        FROM schools s
        LEFT JOIN user_schools us ON s.id = us.school_id
      `;

            let countQuery = 'SELECT COUNT(*) as total FROM schools s';

            const queryParams = [];

            // Add search condition if provided
            if (search) {
                query += ' WHERE s.name LIKE ?';
                countQuery += ' WHERE s.name LIKE ?';
                queryParams.push(`%${search}%`);
            }

            // Add grouping, ordering and pagination
            query += ' GROUP BY s.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute queries
            const [schools] = await pool.execute(query, queryParams);

            const [countResult] = await pool.execute(
                countQuery,
                search ? [`%${search}%`] : []
            );

            const total = countResult[0].total;

            return res.status(200).json({
                success: true,
                data: schools,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        } catch (error) {
            logger.error('Error fetching all schools:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching schools',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Status (activate/suspend/etc)
    static async updateUserStatus(req, res) {
        try {
            // Check if requester is system admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. System administrator privileges required.'
                });
            }

            const { userId, status } = req.body;

            // Validate input
            if (!userId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and status are required'
                });
            }

            // Validate status value
            if (!['active', 'suspended', 'inactive'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be one of: active, suspended, inactive'
                });
            }

            // Check if user exists
            const [users] = await pool.execute(
                'SELECT email FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update user status
            await pool.execute(
                'UPDATE users SET status = ? WHERE id = ?',
                [status, userId]
            );

            logger.info(`User status updated: User ID ${userId} (${users[0].email}) set to ${status} by Admin ID ${req.user.userId}`);

            return res.status(200).json({
                success: true,
                message: `User status updated to ${status}`
            });
        } catch (error) {
            logger.error('Error updating user status:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating user status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Role (system-wide)
    static async updateUserRole(req, res) {
        try {
            // Check if requester is system admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. System administrator privileges required.'
                });
            }

            const { userId, role } = req.body;

            // Validate input
            if (!userId || !role) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and role are required'
                });
            }

            // Validate role value
            if (!['admin', 'school_admin', 'teacher'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be one of: admin, school_admin, teacher'
                });
            }

            // Check if user exists
            const [users] = await pool.execute(
                'SELECT email FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update user role
            await pool.execute(
                'UPDATE users SET role = ? WHERE id = ?',
                [role, userId]
            );

            logger.info(`User role updated: User ID ${userId} (${users[0].email}) set to ${role} by Admin ID ${req.user.userId}`);

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role}`
            });
        } catch (error) {
            logger.error('Error updating user role:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating user role',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export { UserController, SchoolAdminController, AdminController };