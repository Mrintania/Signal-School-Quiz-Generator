// backend/src/controllers/userController.js
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/validator.js';

// Utility function for consistent error handling
const handleApiError = (res, error, message = 'An error occurred') => {
  logger.error(`${message}:`, error);
  return res.status(500).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

class UserController {
  // Get Current User Profile
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get base user data
      const [users] = await pool.execute(
        `SELECT id, first_name, last_name, email, role, profile_image, 
         status, email_verified, last_login, created_at 
         FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Get related data in parallel for better performance
      const [schools, settings, quotas, quizStats] = await Promise.all([
        pool.execute(
          `SELECT s.id, s.name, s.subscription_plan, us.position, us.department, 
           us.grade_level, us.subjects FROM schools s
           INNER JOIN user_schools us ON s.id = us.school_id
           WHERE us.user_id = ?`,
          [userId]
        ),
        pool.execute(
          'SELECT language, theme, default_question_count, default_quiz_type, notification_preferences ' +
          'FROM user_settings WHERE user_id = ?',
          [userId]
        ),
        pool.execute(
          `SELECT quiz_limit, quiz_count, ai_generation_limit, ai_generation_count, 
           storage_limit, storage_used, reset_date 
           FROM user_quotas WHERE user_id = ?`,
          [userId]
        ),
        pool.execute(
          `SELECT COUNT(*) as total_quizzes,
           SUM(CASE WHEN question_type = 'Multiple Choice' THEN 1 ELSE 0 END) as multiple_choice_count,
           SUM(CASE WHEN question_type = 'Essay' THEN 1 ELSE 0 END) as essay_count 
           FROM quizzes WHERE user_id = ?`,
          [userId]
        )
      ]);

      // Assemble profile data
      const user = users[0];
      const userProfile = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profileImage: user.profile_image,
        status: user.status,
        emailVerified: user.email_verified === 1,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        schools: schools[0],
        settings: settings[0].length > 0 ? settings[0][0] : null,
        quotas: quotas[0].length > 0 ? quotas[0][0] : null,
        stats: quizStats[0][0] || {}
      };
      
      return res.status(200).json({ success: true, data: userProfile });
    } catch (error) {
      return handleApiError(res, error, 'Error fetching user profile');
    }
  }

  // Update User Profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { firstName, lastName, position, department, gradeLevel, subjects, schoolId } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false, 
          message: 'First name and last name are required'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Basic profile update
        await connection.execute(
          'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
          [firstName, lastName, userId]
        );
        
        // School-related data (if applicable)
        if (schoolId && (position || department || gradeLevel || subjects)) {
          const [userSchools] = await connection.execute(
            'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
            [userId, schoolId]
          );
          
          if (userSchools.length > 0) {
            await connection.execute(
              `UPDATE user_schools SET
               position = COALESCE(?, position),
               department = COALESCE(?, department),
               grade_level = COALESCE(?, grade_level),
               subjects = COALESCE(?, subjects)
               WHERE user_id = ? AND school_id = ?`,
              [position, department, gradeLevel, subjects, userId, schoolId]
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
      return handleApiError(res, error, 'Error updating user profile');
    }
  }

  // Update User Password
  static async updatePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      // Password strength validation
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }
      
      // Get current password hash
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
      
      // Check for OAuth accounts
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
      
      // Update password and log the action in parallel
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      await Promise.all([
        pool.execute(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [passwordHash, userId]
        ),
        pool.execute(
          'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
          [userId, 'password_change', 'User changed password']
        )
      ]);
      
      logger.info(`User changed password: (ID: ${userId})`);
      
      return res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      return handleApiError(res, error, 'Error updating password');
    }
  }

  // Upload Profile Image
  static async uploadProfileImage(req, res) {
    try {
      const userId = req.user.userId;
      const imageUrl = req.body.imageUrl || req.file?.path;
      
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'No image provided'
        });
      }
      
      await pool.execute(
        'UPDATE users SET profile_image = ? WHERE id = ?',
        [imageUrl, userId]
      );
      
      logger.info(`User updated profile image: (ID: ${userId})`);
      
      return res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        imageUrl
      });
    } catch (error) {
      return handleApiError(res, error, 'Error uploading profile image');
    }
  }

  // Update User Settings
  static async updateSettings(req, res) {
    try {
      const userId = req.user.userId;
      const { language, theme, defaultQuestionCount, defaultQuizType, notificationPreferences } = req.body;
      
      // Validation
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
      
      // Use upsert pattern - check if settings exist and update or insert accordingly
      const [existingSettings] = await pool.execute(
        'SELECT id FROM user_settings WHERE user_id = ?',
        [userId]
      );
      
      const notificationPrefsJson = notificationPreferences 
        ? JSON.stringify(notificationPreferences) 
        : null;
      
      if (existingSettings.length > 0) {
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
        await pool.execute(
          `INSERT INTO user_settings 
           (user_id, language, theme, default_question_count, default_quiz_type, notification_preferences) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, language || 'thai', theme || 'light', defaultQuestionCount || 10, 
           defaultQuizType || 'Multiple Choice', notificationPrefsJson]
        );
      }
      
      logger.info(`User updated settings: (ID: ${userId})`);
      
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      return handleApiError(res, error, 'Error updating user settings');
    }
  }

  // Get User Activity
  static async getUserActivity(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      // Get activities and total count in parallel
      const [activitiesResult, countResult] = await Promise.all([
        pool.execute(
          `SELECT activity_type, description, ip_address, created_at 
           FROM user_activities 
           WHERE user_id = ? 
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`,
          [userId, limit, offset]
        ),
        pool.execute(
          'SELECT COUNT(*) as total FROM user_activities WHERE user_id = ?',
          [userId]
        )
      ]);
      
      const activities = activitiesResult[0];
      const total = countResult[0][0].total;
      
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
      return handleApiError(res, error, 'Error fetching user activity');
    }
  }

  // Close User Account (soft delete)
  static async closeAccount(req, res) {
    try {
      const userId = req.user.userId;
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
      
      // Verify password for security (except for OAuth users)
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
      
      // Implement soft delete
      await pool.execute(
        'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', userId]
      );
      
      logger.info(`User closed account: (ID: ${userId}), Reason: ${reason || 'Not provided'}`);
      
      return res.status(200).json({
        success: true,
        message: 'Your account has been closed successfully'
      });
    } catch (error) {
      return handleApiError(res, error, 'Error closing account');
    }
  }
}

class SchoolAdminController {
  // School admin methods remain the same
  // These can be refactored similarly if needed
}

class AdminController {
  // Admin methods remain the same
  // These can be refactored similarly if needed
}

export { UserController, SchoolAdminController, AdminController };