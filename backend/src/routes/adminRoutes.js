import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Apply authorization middleware - only admins can access these routes
router.use(authorizeRoles('admin'));

// Create a new user (admin function)
router.post(
    '/create-user',
    commonRules.authRules.register,
    validate,
    AdminController.createUser
);

// Get all users with pagination and filtering
router.get('/users', AdminController.getAllUsers);

// Get all schools with pagination and filtering
router.get('/schools', AdminController.getAllSchools);

// Update user status (activate/suspend/etc)
router.put(
    '/user-status',
    commonRules.adminRules.updateUserStatus,
    validate,
    AdminController.updateUserStatus
);

// Update user role (system-wide)
router.put(
    '/user-role',
    commonRules.adminRules.updateUserRole,
    validate,
    AdminController.updateUserRole
);

export default router;