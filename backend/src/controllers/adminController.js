import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

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

export { AdminController };