// backend/src/routes/authRoutes.js
import express from 'express';
import AuthController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';

// Log available methods for debugging
console.log('Available methods in AuthController:', Object.keys(AuthController));

const router = express.Router();

// Apply rate limiter for auth routes to prevent brute force attempts
router.use(authLimiter);

// Create a helper function to safely use controller methods
function safeController(method, fallback) {
    return (req, res, next) => {
        if (typeof AuthController[method] === 'function') {
            return AuthController[method](req, res, next);
        } else {
            console.warn(`Warning: AuthController.${method} is not defined, using fallback`);
            return fallback(req, res);
        }
    };
}

// Fallback handler
const notImplemented = (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'This feature is not implemented yet'
    });
};

// Basic routes
router.post('/register', safeController('register', notImplemented));
router.post('/login', safeController('login', notImplemented));

// Additional routes with safe controller usage
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
    '/resend-verification',
    commonRules.authRules.resendVerification,
    validate,
    safeController('resendVerification', notImplemented)
);

router.post(
    '/accept-invitation',
    commonRules.authRules.acceptInvitation,
    validate,
    safeController('acceptInvitation', notImplemented)
);

router.post(
    '/google',
    commonRules.authRules.googleAuth,
    validate,
    safeController('googleAuth', notImplemented)
);

// Admin routes
router.post(
    '/verify-user/:userId',
    authenticateToken,
    authorizeRoles('admin', 'school_admin'),
    safeController('verifyUser', notImplemented)
);

router.get(
    '/pending-users',
    authenticateToken,
    authorizeRoles('admin', 'school_admin'),
    safeController('getPendingUsers', notImplemented)
);

// Check authentication status
router.get('/status', authenticateToken, (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Authenticated',
        user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Test route
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth routes are working'
    });
});

export default router;