// backend/src/utils/validator.js
import { body, param, query, validationResult } from 'express-validator';

// Password validation function
export const validatePassword = (password) => {
  // Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  
  if (!passwordRegex.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    };
  }
  
  return {
    isValid: true
  };
};

// Common validation rules
const commonRules = {
  // Quiz validation rules (kept from original)
  quizRules: {
    create: [
      body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
      body('topic').trim().notEmpty().withMessage('Topic is required').isLength({ max: 200 }).withMessage('Topic cannot exceed 200 characters'),
      body('questionType').isIn(['Multiple Choice', 'Essay']).withMessage('Invalid question type'),
      body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
      body('questions.*.questionText').trim().notEmpty().withMessage('Question text is required'),
      body('questions.*.options').optional().isArray(),
      body('studentLevel').optional().trim().isLength({ max: 100 }).withMessage('Student level cannot exceed 100 characters'),
    ],
    generate: [
      body('topic').trim().notEmpty().withMessage('Topic is required').isLength({ max: 200 }).withMessage('Topic cannot exceed 200 characters'),
      body('questionType').isIn(['Multiple Choice', 'Essay']).withMessage('Invalid question type'),
      body('numberOfQuestions').isInt({ min: 1, max: 50 }).withMessage('Number of questions must be between 1 and 50'),
      body('studentLevel').optional().trim().isLength({ max: 100 }).withMessage('Student level cannot exceed 100 characters'),
      body('additionalInstructions').optional().trim().isLength({ max: 500 }).withMessage('Additional instructions cannot exceed 500 characters'),
      body('language').optional().isIn(['thai', 'english']).withMessage('Invalid language')
    ],
    rename: [
      param('id').isInt().withMessage('Invalid quiz ID'),
      body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    ],
    getById: [
      param('id').isInt().withMessage('Invalid quiz ID')
    ],
    delete: [
      param('id').isInt().withMessage('Invalid quiz ID')
    ],
    updateQuestions: [
      param('id').isInt().withMessage('Invalid quiz ID'),
      body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
      body('questions.*.questionText').trim().notEmpty().withMessage('Question text is required')
    ],
    move: [
      param('id').isInt().withMessage('Invalid quiz ID'),
      body('folderId').trim().notEmpty().withMessage('Folder ID is required')
    ]
  },
  
  // Authentication validation rules
  authRules: {
    register: [
      body('firstName').trim().notEmpty().withMessage('First name is required'),
      body('lastName').trim().notEmpty().withMessage('Last name is required'),
      body('email').trim().isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
      body('schoolName').optional().trim()
    ],
    login: [
      body('email').trim().isEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required')
    ],
    verifyEmail: [
      body('token').notEmpty().withMessage('Verification token is required')
    ],
    resendVerification: [
      body('email').trim().isEmail().withMessage('Valid email is required')
    ],
    forgotPassword: [
      body('email').trim().isEmail().withMessage('Valid email is required')
    ],
    resetPassword: [
      body('token').notEmpty().withMessage('Reset token is required'),
      body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ],
    acceptInvitation: [
      body('token').notEmpty().withMessage('Invitation token is required'),
      body('firstName').trim().notEmpty().withMessage('First name is required'),
      body('lastName').trim().notEmpty().withMessage('Last name is required'),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ],
    googleAuth: [
      body('idToken').notEmpty().withMessage('ID token is required')
    ]
  },
  
  // User validation rules
  userRules: {
    updateProfile: [
      body('firstName').trim().notEmpty().withMessage('First name is required'),
      body('lastName').trim().notEmpty().withMessage('Last name is required'),
      body('position').optional().trim(),
      body('department').optional().trim(),
      body('gradeLevel').optional().trim(),
      body('subjects').optional().trim(),
      body('schoolId').optional().isInt().withMessage('Invalid school ID')
    ],
    updatePassword: [
      body('currentPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    ],
    updateSettings: [
      body('language').optional().isIn(['thai', 'english']).withMessage('Invalid language'),
      body('theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme'),
      body('defaultQuestionCount').optional().isInt({ min: 1, max: 50 }).withMessage('Default question count must be between 1 and 50'),
      body('defaultQuizType').optional().isIn(['Multiple Choice', 'Essay']).withMessage('Invalid quiz type')
    ],
    closeAccount: [
      body('password').optional(),
      body('reason').optional().trim()
    ]
  },
  
  // School validation rules
  schoolRules: {
    createSchool: [
      body('name').trim().notEmpty().withMessage('School name is required'),
      body('address').optional().trim(),
      body('city').optional().trim(),
      body('state').optional().trim(),
      body('postalCode').optional().trim(),
      body('country').optional().trim(),
      body('phone').optional().trim(),
      body('email').optional().trim().isEmail().withMessage('Valid email is required'),
      body('website').optional().trim().isURL().withMessage('Valid URL is required')
    ],
    updateSchool: [
      body('name').optional().trim(),
      body('address').optional().trim(),
      body('city').optional().trim(),
      body('state').optional().trim(),
      body('postalCode').optional().trim(),
      body('country').optional().trim(),
      body('phone').optional().trim(),
      body('email').optional().trim().isEmail().withMessage('Valid email is required'),
      body('website').optional().trim().isURL().withMessage('Valid URL is required')
    ],
    createDepartment: [
      body('schoolId').isInt().withMessage('School ID is required'),
      body('name').trim().notEmpty().withMessage('Department name is required'),
      body('description').optional().trim()
    ],
    updateDepartment: [
      body('name').optional().trim(),
      body('description').optional().trim()
    ],
    inviteUser: [
      body('email').trim().isEmail().withMessage('Valid email is required'),
      body('schoolId').isInt().withMessage('School ID is required'),
      body('role').optional().isIn(['school_admin', 'teacher']).withMessage('Invalid role')
    ],
    updateUserRole: [
      body('userId').isInt().withMessage('User ID is required'),
      body('schoolId').isInt().withMessage('School ID is required'),
      body('role').isIn(['school_admin', 'teacher']).withMessage('Invalid role')
    ],
    removeUser: [
      body('userId').isInt().withMessage('User ID is required'),
      body('schoolId').isInt().withMessage('School ID is required')
    ],
    addUserToDepartment: [
      body('userId').isInt().withMessage('User ID is required'),
      body('departmentId').isInt().withMessage('Department ID is required'),
      body('role').optional().trim()
    ],
    removeUserFromDepartment: [
      body('userId').isInt().withMessage('User ID is required'),
      body('departmentId').isInt().withMessage('Department ID is required')
    ]
  },
  
  // Admin validation rules
  adminRules: {
    updateUserStatus: [
      body('userId').isInt().withMessage('User ID is required'),
      body('status').isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status')
    ],
    updateUserRole: [
      body('userId').isInt().withMessage('User ID is required'),
      body('role').isIn(['admin', 'school_admin', 'teacher']).withMessage('Invalid role')
    ]
  }
};

// Middleware to check for validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Sanitize and trim all inputs
const sanitizeAll = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  
  // Sanitize query params
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    }
  }
  
  next();
};

export { commonRules, validate, sanitizeAll };