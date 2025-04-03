import express, { Request, Response, NextFunction } from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Apply authentication middleware conditionally
const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth check if SKIP_AUTH is true
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        // Set a default user in development mode
        (req as AuthRequest).user = { 
            userId: 1, 
            email: 'admin@example.com', 
            role: 'admin' 
        };
        return next();
    }

    // Try to authenticate, but continue even if no token
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return next(); // Continue without authentication
    }

    // Normal auth flow
    authenticateToken(req, res, next);
};

// Apply optional authentication to all dashboard routes
router.use(optionalAuth);

// Dashboard statistics
router.get('/stats', DashboardController.getDashboardStats);

// Recent activities - available to all authenticated users
router.get('/activities', DashboardController.getRecentActivities);

// System status - only available to admins
router.get('/system-status',
    authorizeRoles('admin'),
    DashboardController.getSystemStatus
);

export default router;