// src/routes/dashboardRoutes.js
import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

// Get dashboard statistics - No caching to ensure fresh data
router.get('/stats', DashboardController.getDashboardStats);

// Get recent content - Short cache time
router.get('/recent', cacheMiddleware(60), DashboardController.getRecentContent);

export default router;