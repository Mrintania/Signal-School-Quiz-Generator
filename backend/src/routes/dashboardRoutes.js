// src/routes/dashboardRoutes.js
import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Apply authentication middleware conditionally
const optionalAuth = (req, res, next) => {
    // Skip auth check if SKIP_AUTH is true
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        // Set a default user in development mode
        req.user = { userId: 1, email: 'admin@example.com', role: 'admin' };
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

// Recent quizzes for homepage
router.get('/recent-quizzes', DashboardController.getRecentQuizzes);

export default router;