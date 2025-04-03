// backend/src/services/middlewareService.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { pool } from '../config/db.js';
import { AuthRequest } from '../types/index.js';

/**
 * Service for managing middleware functions
 */
class MiddlewareService {
    /**
     * Create a database activity logging middleware
     * @returns {Function} Express middleware
     */
    static createActivityLogger() {
        return (req: Request, res: Response, next: NextFunction): void => {
            // Only log activities for authenticated users
            if ((req as AuthRequest).user?.userId) {
                // Attach logger to request object
                (req as AuthRequest).logActivity = async (activityType: string, description: string): Promise<void> => {
                    try {
                        if (!pool) {
                            throw new Error('Database connection not available');
                        }
                        
                        await pool.execute(
                            'INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                            [(req as AuthRequest).user?.userId, activityType, description, req.ip, req.headers['user-agent']]
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