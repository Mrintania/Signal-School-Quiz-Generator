import express from 'express';
import { HealthController } from '../controllers/healthController.js';

const router = express.Router();

// Basic health check
router.get('/health', HealthController.healthCheck);

// Detailed system status
router.get('/status', HealthController.systemStatus);

// Ping endpoint
router.get('/ping', (req, res) => {
    res.json({
        message: 'pong',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export { router as healthRoutes };