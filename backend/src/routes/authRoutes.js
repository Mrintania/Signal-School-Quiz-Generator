// backend/src/routes/authRoutes.js
import express from 'express';
import AuthController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.js';
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

// Email verification route
router.post(
    '/verify-email',
    commonRules.authRules.verifyEmail,
    validate,
    AuthController.verifyEmail
);

// Resend verification email route
router.post(
    '/resend-verification',
    commonRules.authRules.resendVerification,
    validate,
    AuthController.resendVerification
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