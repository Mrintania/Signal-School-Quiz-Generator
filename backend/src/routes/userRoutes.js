// backend/src/routes/userRoutes.js
import express from 'express';
import { UserController, SchoolAdminController, AdminController } from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../uploads/profile-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + '.' + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB limit
  },
  fileFilter: fileFilter
});

const router = express.Router();

// Apply general rate limiter to all routes
router.use(generalLimiter);

// All routes require authentication
router.use(authenticateToken);

// Regular user routes
router.get(
  '/profile',
  UserController.getCurrentUser
);

router.put(
  '/profile',
  commonRules.userRules.updateProfile,
  validate,
  UserController.updateProfile
);

router.put(
  '/password',
  commonRules.userRules.updatePassword,
  validate,
  UserController.updatePassword
);

router.post(
  '/profile-image',
  upload.single('profileImage'),
  UserController.uploadProfileImage
);

router.put(
  '/settings',
  commonRules.userRules.updateSettings,
  validate,
  UserController.updateSettings
);

router.get(
  '/activity',
  UserController.getUserActivity
);

router.post(
  '/close-account',
  commonRules.userRules.closeAccount,
  validate,
  UserController.closeAccount
);

// School Admin routes
router.post(
  '/invite',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.inviteUser,
  validate,
  SchoolAdminController.inviteUser
);

router.get(
  '/school/:schoolId/users',
  authorizeRoles('admin', 'school_admin'),
  SchoolAdminController.getSchoolUsers
);

router.put(
  '/school/role',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.updateUserRole,
  validate,
  SchoolAdminController.updateUserRole
);

router.delete(
  '/school/user',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.removeUser,
  validate,
  SchoolAdminController.removeUser
);

router.delete(
  '/invitation/:invitationId',
  authorizeRoles('admin', 'school_admin'),
  SchoolAdminController.cancelInvitation
);

// System Admin routes
router.get(
  '/admin/users',
  authorizeRoles('admin'),
  AdminController.getAllUsers
);

router.get(
  '/admin/schools',
  authorizeRoles('admin'),
  AdminController.getAllSchools
);

router.put(
  '/admin/user-status',
  authorizeRoles('admin'),
  commonRules.adminRules.updateUserStatus,
  validate,
  AdminController.updateUserStatus
);

router.put(
  '/admin/user-role',
  authorizeRoles('admin'),
  commonRules.adminRules.updateUserRole,
  validate,
  AdminController.updateUserRole
);

// School department management routes
router.get(
  '/school/:schoolId/departments',
  SchoolAdminController.getSchoolDepartments
);

router.post(
  '/school/departments',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.createDepartment,
  validate,
  SchoolAdminController.createDepartment
);

router.put(
  '/school/departments/:departmentId',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.updateDepartment,
  validate,
  SchoolAdminController.updateDepartment
);

router.delete(
  '/school/departments/:departmentId',
  authorizeRoles('admin', 'school_admin'),
  SchoolAdminController.deleteDepartment
);

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum file size is 2MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
});

export default router;