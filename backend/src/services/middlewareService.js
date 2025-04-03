// backend/src/services/middlewareService.js
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { pool } from '../config/db.js';

/**
 * Service for managing middleware functions
 */
class MiddlewareService {
    /**
     * Create a database activity logging middleware
     * @returns {Function} Express middleware
     */
    static createActivityLogger() {
        return (req, res, next) => {
            // Only log activities for authenticated users
            if (req.user && req.user.userId) {
                // Attach logger to request object
                req.logActivity = async (activityType, description) => {
                    try {
                        await pool.execute(
                            'INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                            [req.user.userId, activityType, description, req.ip, req.headers['user-agent']]
                        );
                    } catch (error) {
                        logger.error('Error logging activity:', error);
                    }
                };
            }

            next();
        };
    }
}

export default MiddlewareService;