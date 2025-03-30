// backend/src/routes/authRoutes.js
import express from 'express';
import AuthController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';

const router = express.Router();

// Apply rate limiter for auth routes to prevent brute force attempts
router.use(authLimiter);

// Registration route
router.post(
    '/register',
    commonRules.authRules.register,
    validate,
    AuthController.register
);

// Login route
router.post(
    '/login',
    commonRules.authRules.login,
    validate,
    AuthController.login
);

// Forgot password route
router.post(
    '/forgot-password',
    commonRules.authRules.forgotPassword,
    validate,
    AuthController.forgotPassword
);

// Reset password route
router.post(
    '/reset-password',
    commonRules.authRules.resetPassword,
    validate,
    AuthController.resetPassword
);

// Accept invitation route
router.post(
    '/accept-invitation',
    commonRules.authRules.acceptInvitation,
    validate,
    AuthController.acceptInvitation
);

// Google authentication route
router.post(
    '/google',
    commonRules.authRules.googleAuth,
    validate,
    AuthController.googleAuth
);

// New route: Admin verification of user accounts
router.post(
    '/verify-user/:userId',
    authenticateToken,
    authorizeRoles('admin', 'school_admin'),
    AuthController.verifyUser
);

// Get pending users route (for admin panel)
router.get(
    '/pending-users',
    authenticateToken,
    authorizeRoles('admin', 'school_admin'),
    AuthController.getPendingUsers
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

export default router;