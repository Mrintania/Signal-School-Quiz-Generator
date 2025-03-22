// Input validation utility functions
import { body, param, query, validationResult } from 'express-validator';

// Common validation rules
const commonRules = {
  // Quiz validation rules
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