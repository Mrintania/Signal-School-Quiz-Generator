import express, { Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import AuthController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Apply rate limiter
router.use(authLimiter);

// Safely execute controller methods
function safeController(
    method: string, 
    fallback: (req: Request, res: Response) => void
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const controllerMethod = (AuthController as any)[method];
        
        if (typeof controllerMethod === 'function') {
            return controllerMethod(req, res, next);
        } else {
            console.warn(`Warning: AuthController.${method} is not defined, using fallback`);
            return fallback(req, res);
        }
    };
}

// Fallback handler
const notImplemented = (req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        message: 'This feature is not implemented yet'
    });
};

// Basic routes
router.post('/register', safeController('register', notImplemented));
router.post('/login', safeController('login', notImplemented));

// Detailed routes with validation
router.post(
    '/forgot-password',
    commonRules.authRules.forgotPassword,
    validate,
    safeController('forgotPassword', notImplemented)
);

router.post(
    '/reset-password',
    commonRules.authRules.resetPassword,
    validate,
    safeController('resetPassword', notImplemented)
);

router.post(
    '/verify-email',
    commonRules.authRules.verifyEmail,
    validate,
    safeController('verifyEmail', notImplemented)
);

router.post(
    '/accept-invitation',
    commonRules.authRules.acceptInvitation,
    validate,
    safeController('acceptInvitation', notImplemented)
);

// Verify user route with explicit parameter validation
router.post(
    '/verify-user/:userId',
    param('userId')
        .isInt()
        .withMessage('User ID must be a valid integer'),
    validate,
    authenticateToken,
    authorizeRoles('admin', 'school_admin'),
    safeController('verifyUser', notImplemented)
);

// Authentication status route
router.get('/status', authenticateToken, (req: AuthRequest, res: Response) => {
    return res.status(200).json({
        success: true,
        message: 'Authenticated',
        user: {
            id: req.user?.userId,
            email: req.user?.email,
            role: req.user?.role
        }
    });
});

// Test route
router.get('/test', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Auth routes are working'
    });
});

export default router;