// backend/src/repositories/UserRepository.js
import BaseRepository from './base/BaseRepository.js';
import logger from '../utils/common/Logger.js';
import { NotFoundError, ValidationError } from '../errors/CustomErrors.js';

/**
 * User Repository
 * จัดการ data access สำหรับ users table
 * ขยายจาก BaseRepository เพื่อเพิ่ม user-specific operations
 */
export class UserRepository extends BaseRepository {
    constructor() {
        super('users', 'id');
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            if (!email || typeof email !== 'string') {
                throw new ValidationError('Email is required');
            }

            const query = `
                SELECT id, username, email, role, school_id, is_active, 
                       profile_image, created_at, updated_at, last_login_at
                FROM ${this.tableName} 
                WHERE email = ? AND deleted_at IS NULL
            `;

            const results = await this.executeQuery(query, [email.toLowerCase()]);
            return results.length > 0 ? results[0] : null;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        try {
            if (!username || typeof username !== 'string') {
                throw new ValidationError('Username is required');
            }

            const query = `
                SELECT id, username, email, role, school_id, is_active, 
                       profile_image, created_at, updated_at, last_login_at
                FROM ${this.tableName} 
                WHERE username = ? AND deleted_at IS NULL
            `;

            const results = await this.executeQuery(query, [username]);
            return results.length > 0 ? results[0] : null;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find user with password (for authentication)
     */
    async findByEmailWithPassword(email) {
        try {
            if (!email || typeof email !== 'string') {
                throw new ValidationError('Email is required');
            }

            const query = `
                SELECT id, username, email, password, role, school_id, is_active,
                       created_at, updated_at, last_login_at
                FROM ${this.tableName} 
                WHERE email = ? AND deleted_at IS NULL
            `;

            const results = await this.executeQuery(query, [email.toLowerCase()]);
            return results.length > 0 ? results[0] : null;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Create new user
     */
    async createUser(userData) {
        try {
            // Validate required fields
            const requiredFields = ['username', 'email', 'password'];
            this.validateRequiredFields(userData, requiredFields);

            // Check for duplicate email
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new ValidationError('Email already exists');
            }

            // Check for duplicate username
            const existingUsername = await this.findByUsername(userData.username);
            if (existingUsername) {
                throw new ValidationError('Username already exists');
            }

            // Prepare user data
            const userToCreate = {
                username: userData.username,
                email: userData.email.toLowerCase(),
                password: userData.password, // Should be hashed before calling this method
                role: userData.role || 'teacher',
                school_id: userData.school_id || null,
                is_active: userData.is_active !== undefined ? userData.is_active : true,
                profile_image: userData.profile_image || null,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Create user
            const newUser = await this.create(userToCreate);

            // Remove password from response
            delete newUser.password;

            logger.business('createUser', {
                userId: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            });

            return newUser;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'createUser',
                email: userData?.email
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, profileData) {
        try {
            // Validate user exists
            const user = await this.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Check email uniqueness if email is being updated
            if (profileData.email && profileData.email !== user.email) {
                const existingUser = await this.findByEmail(profileData.email);
                if (existingUser && existingUser.id !== userId) {
                    throw new ValidationError('Email already exists');
                }
            }

            // Check username uniqueness if username is being updated
            if (profileData.username && profileData.username !== user.username) {
                const existingUser = await this.findByUsername(profileData.username);
                if (existingUser && existingUser.id !== userId) {
                    throw new ValidationError('Username already exists');
                }
            }

            // Prepare update data
            const updateData = {};
            const allowedFields = ['username', 'email', 'profile_image', 'school_id'];

            allowedFields.forEach(field => {
                if (profileData[field] !== undefined) {
                    updateData[field] = field === 'email' ?
                        profileData[field].toLowerCase() :
                        profileData[field];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            updateData.updated_at = new Date();

            // Update user
            const updatedUser = await this.update(userId, updateData);

            logger.business('updateProfile', {
                userId,
                updatedFields: Object.keys(updateData)
            });

            return updatedUser;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateProfile',
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update user password
     */
    async updatePassword(userId, hashedPassword) {
        try {
            const updateData = {
                password: hashedPassword,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);

            logger.business('updatePassword', { userId });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updatePassword',
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update last login time
     */
    async updateLastLogin(userId) {
        try {
            const updateData = {
                last_login_at: new Date(),
                updated_at: new Date()
            };

            await this.update(userId, updateData);

            logger.business('updateLastLogin', { userId });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateLastLogin',
                userId
            });
            // Don't throw error for login time update failures
        }
    }

    /**
     * Activate/Deactivate user
     */
    async setUserStatus(userId, isActive) {
        try {
            const updateData = {
                is_active: isActive,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);

            logger.business('setUserStatus', {
                userId,
                isActive
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'setUserStatus',
                userId,
                isActive
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find users by school ID
     */
    async findBySchoolId(schoolId, options = {}) {
        try {
            const {
                role = null,
                isActive = null,
                limit = 50,
                offset = 0,
                orderBy = 'created_at',
                orderDirection = 'DESC'
            } = options;

            let query = `
                SELECT id, username, email, role, school_id, is_active,
                       profile_image, created_at, updated_at, last_login_at
                FROM ${this.tableName} 
                WHERE school_id = ? AND deleted_at IS NULL
            `;
            const params = [schoolId];

            // Add role filter
            if (role) {
                query += ' AND role = ?';
                params.push(role);
            }

            // Add active status filter
            if (isActive !== null) {
                query += ' AND is_active = ?';
                params.push(isActive);
            }

            // Add ordering
            query += ` ORDER BY ${orderBy} ${orderDirection}`;

            // Add pagination
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);

                if (offset > 0) {
                    query += ' OFFSET ?';
                    params.push(offset);
                }
            }

            return await this.executeQuery(query, params);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Count users by school ID
     */
    async countBySchoolId(schoolId, options = {}) {
        try {
            const { role = null, isActive = null } = options;

            let query = `
                SELECT COUNT(*) as total
                FROM ${this.tableName} 
                WHERE school_id = ? AND deleted_at IS NULL
            `;
            const params = [schoolId];

            if (role) {
                query += ' AND role = ?';
                params.push(role);
            }

            if (isActive !== null) {
                query += ' AND is_active = ?';
                params.push(isActive);
            }

            const results = await this.executeQuery(query, params);
            return results[0].total;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Search users
     */
    async searchUsers(searchTerm, options = {}) {
        try {
            const {
                role = null,
                schoolId = null,
                isActive = null,
                limit = 50,
                offset = 0
            } = options;

            let query = `
                SELECT id, username, email, role, school_id, is_active,
                       profile_image, created_at, updated_at, last_login_at
                FROM ${this.tableName} 
                WHERE deleted_at IS NULL
                AND (username LIKE ? OR email LIKE ?)
            `;

            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern, searchPattern];

            // Add filters
            if (role) {
                query += ' AND role = ?';
                params.push(role);
            }

            if (schoolId) {
                query += ' AND school_id = ?';
                params.push(schoolId);
            }

            if (isActive !== null) {
                query += ' AND is_active = ?';
                params.push(isActive);
            }

            // Add ordering
            query += ' ORDER BY username ASC';

            // Add pagination
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);

                if (offset > 0) {
                    query += ' OFFSET ?';
                    params.push(offset);
                }
            }

            return await this.executeQuery(query, params);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get user statistics
     */
    async getUserStatistics(userId) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    u.last_login_at,
                    COUNT(q.id) as total_quizzes,
                    COUNT(CASE WHEN q.status = 'published' THEN 1 END) as published_quizzes,
                    COUNT(CASE WHEN q.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as quizzes_this_month
                FROM ${this.tableName} u
                LEFT JOIN quizzes q ON u.id = q.user_id AND q.deleted_at IS NULL
                WHERE u.id = ? AND u.deleted_at IS NULL
                GROUP BY u.id
            `;

            const results = await this.executeQuery(query, [userId]);
            return results.length > 0 ? results[0] : null;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Check if email exists
     */
    async emailExists(email, excludeUserId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM ${this.tableName} 
                WHERE email = ? AND deleted_at IS NULL
            `;
            const params = [email.toLowerCase()];

            if (excludeUserId) {
                query += ' AND id != ?';
                params.push(excludeUserId);
            }

            const results = await this.executeQuery(query, params);
            return results[0].count > 0;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Check if username exists
     */
    async usernameExists(username, excludeUserId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM ${this.tableName} 
                WHERE username = ? AND deleted_at IS NULL
            `;
            const params = [username];

            if (excludeUserId) {
                query += ' AND id != ?';
                params.push(excludeUserId);
            }

            const results = await this.executeQuery(query, params);
            return results[0].count > 0;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get active users count by role
     */
    async getActiveUsersByRole() {
        try {
            const query = `
                SELECT 
                    role,
                    COUNT(*) as count
                FROM ${this.tableName} 
                WHERE is_active = 1 AND deleted_at IS NULL
                GROUP BY role
            `;

            return await this.executeQuery(query);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get recent registrations
     */
    async getRecentRegistrations(days = 30, limit = 10) {
        try {
            const query = `
                SELECT id, username, email, role, school_id, created_at
                FROM ${this.tableName} 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) 
                AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT ?
            `;

            return await this.executeQuery(query, [days, limit]);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Validate required fields for user operations
     */
    validateRequiredFields(data, fields) {
        const missing = [];

        fields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                missing.push(field);
            }
        });

        if (missing.length > 0) {
            throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Soft delete user
     */
    async deleteUser(userId) {
        try {
            // Check if user exists
            const user = await this.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Soft delete user
            const result = await this.softDelete(userId);

            logger.business('deleteUser', {
                userId,
                username: user.username,
                email: user.email
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'deleteUser',
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }
}

export default UserRepository;