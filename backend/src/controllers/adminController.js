import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { validatePassword } from '../utils/validator.js';
import { sendEmail } from '../utils/emailService.js';

class AdminController {
    // Create User (Admin function)
    static async createUser(req, res) {
        try {
            // Check if requester is an admin
            if (req.user.role !== 'admin' && req.user.role !== 'school_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Administrator privileges required.'
                });
            }

            const { firstName, lastName, email, password, role, status, schoolId } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Required fields are missing'
                });
            }

            // Validate password strength
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: passwordValidation.message
                });
            }

            // Check if email already exists
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already registered'
                });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create database connection
            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Insert user with specified status and role
                const [userResult] = await connection.execute(
                    `INSERT INTO users 
                    (first_name, last_name, email, password_hash, role, status, email_verified) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        firstName, 
                        lastName, 
                        email, 
                        passwordHash, 
                        role || 'teacher',
                        status || 'active',
                        status === 'active' ? 1 : 0 // Email is verified if status is active
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

                // If school ID is provided, associate user with school
                if (schoolId) {
                    const [schoolExists] = await connection.execute(
                        'SELECT id FROM schools WHERE id = ?',
                        [schoolId]
                    );

                    if (schoolExists.length > 0) {
                        await connection.execute(
                            'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
                            [userId, schoolId]
                        );
                    }
                }

                await connection.commit();

                // Log the user creation
                logger.info(`User created by admin: ${email} (ID: ${userId}), Role: ${role}, Status: ${status}`);

                // Record creation in admin activity
                await pool.execute(
                    'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
                    [req.user.userId, 'user_creation', `Created user: ${email} (ID: ${userId})`]
                );

                // Send welcome email to the user
                try {
                    await sendEmail({
                        to: email,
                        subject: 'Welcome to Signal School Quiz Generator',
                        html: `
                            <h2>Welcome to Signal School Quiz Generator!</h2>
                            <p>Hello ${firstName},</p>
                            <p>Your account has been created by an administrator.</p>
                            <p>Your login details:</p>
                            <ul>
                                <li>Email: ${email}</li>
                                <li>Password: ${password}</li>
                            </ul>
                            <p>Please log in and change your password as soon as possible.</p>
                            <p><a href="${process.env.FRONTEND_URL}/login">Log in to your account</a></p>
                        `
                    });
                } catch (emailError) {
                    logger.error(`Failed to send welcome email to ${email}:`, emailError);
                    // We don't want to fail the user creation if the email fails
                }

                // Return the created user (without sensitive data)
                return res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    user: {
                        id: userId,
                        firstName,
                        lastName,
                        email,
                        role,
                        status
                    }
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error creating user:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while creating the user',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

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

export { AdminController };