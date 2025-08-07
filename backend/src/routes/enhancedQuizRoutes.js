// src/routes/enhancedQuizRoutes.js
import express from 'express';
const router = express.Router();

// Import sanitization utility
import { sanitizeAll } from '../utils/sanitizer.js';

// Import other required modules
import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middlewares/auth.js';
import { commonRules, validate } from '../utils/validator.js';
import QuizService from '../services/quizService.js';

// Apply authentication middleware to protected routes
router.use(authenticateToken);

// GET /api/quizzes - Get all quizzes with optional filtering
router.get('/', async (req, res) => {
  try {
    const filters = sanitizeAll(req.query);
    const quizzes = await QuizService.getAllQuizzes(filters);
    
    res.json({
      success: true,
      data: quizzes,
      message: 'Quizzes retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve quizzes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/quizzes/:id - Get specific quiz
router.get('/:id', async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz ID'
      });
    }

    const quiz = await QuizService.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/quizzes - Create new quiz
router.post('/', commonRules.quizRules.create, validate, async (req, res) => {
  try {
    const sanitizedData = sanitizeAll(req.body);
    const newQuiz = await QuizService.saveQuiz(sanitizedData);
    
    res.status(201).json({
      success: true,
      data: newQuiz,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    logger.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/quizzes/:id - Update quiz
router.put('/:id', commonRules.quizRules.create, validate, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz ID'
      });
    }

    const sanitizedData = sanitizeAll(req.body);
    const updatedQuiz = await QuizService.updateQuiz(quizId, sanitizedData);
    
    if (!updatedQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: updatedQuiz,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    logger.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz ID'
      });
    }

    const deleted = await QuizService.deleteQuiz(quizId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;
