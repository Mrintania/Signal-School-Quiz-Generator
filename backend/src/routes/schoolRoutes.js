// backend/src/routes/schoolRoutes.js
import express from 'express';
import SchoolController from '../controllers/schoolController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate, commonRules } from '../utils/validator.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply general rate limiter to all routes
router.use(generalLimiter);

// All routes require authentication
router.use(authenticateToken);

// Create School - Any user can create a school
router.post(
  '/',
  commonRules.schoolRules.createSchool,
  validate,
  SchoolController.createSchool
);

// Get School Details
router.get(
  '/:schoolId',
  SchoolController.getSchool
);

// Update School - Only system admins and school admins can update
router.put(
  '/:schoolId',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.updateSchool,
  validate,
  SchoolController.updateSchool
);

// Get School Departments
router.get(
  '/:schoolId/departments',
  SchoolController.getSchoolDepartments
);

// Create Department
router.post(
  '/departments',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.createDepartment,
  validate,
  SchoolController.createDepartment
);

// Update Department
router.put(
  '/departments/:departmentId',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.updateDepartment,
  validate,
  SchoolController.updateDepartment
);

// Delete Department
router.delete(
  '/departments/:departmentId',
  authorizeRoles('admin', 'school_admin'),
  SchoolController.deleteDepartment
);

// Add User to Department
router.post(
  '/departments/members',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.addUserToDepartment,
  validate,
  SchoolController.addUserToDepartment
);

// Remove User from Department
router.delete(
  '/departments/members',
  authorizeRoles('admin', 'school_admin'),
  commonRules.schoolRules.removeUserFromDepartment,
  validate,
  SchoolController.removeUserFromDepartment
);

// Get Department Members
router.get(
  '/departments/:departmentId/members',
  SchoolController.getDepartmentMembers
);

export default router;