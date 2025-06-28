import QuizService from '../services/quizService.js';
import aiService from '../services/aiService.js';
import { logger } from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';
import { ErrorService } from '../services/errorService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

/**
 * Controller for handling quiz-related endpoints
 */
class QuizController {
  /**
   * Generate a new quiz using AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateQuiz(req, res) {
    try {
      const { topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language } = req.body;

      // Validate required fields
      if (!topic || !questionType || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing: topic, questionType, and numberOfQuestions are required'
        });
      }

      // Check if AI service is available
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'AI service is currently unavailable'
        });
      }

      // Generate quiz using AI service
      const quizData = await aiService.generateQuiz({
        topic, 
        questionType, 
        numberOfQuestions, 
        additionalInstructions, 
        studentLevel, 
        language
      });

      // Update user's AI generation count if available
      if (req.user?.userId) {
        try {
          // This would typically be handled by a UserService in a full implementation
          await QuizService.incrementUserAIGenerationCount(req.user.userId);
          
          // Log activity if middleware available
          if (req.logActivity) {
            await req.logActivity(
              'quiz_generate', 
              `Generated ${numberOfQuestions} ${questionType} questions about "${topic}"`
            );
          }
        } catch (error) {
          // Non-critical error, just log it
          logger.warn(`Failed to update AI generation count for user ${req.user.userId}:`, error);
        }
      }

      // Return successful response
      return res.status(200).json({
        success: true,
        data: quizData
      });
    } catch (error) {
      logger.error('Error generating quiz:', error);

      // Determine appropriate error message and status code
      let statusCode = 500;
      let errorMessage = 'An error occurred while generating the quiz';
      
      if (error.message === 'AI generation timed out') {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'Quiz generation timed out. Please try again with a simpler request.';
      } else if (error.message === 'AI service is currently unavailable') {
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('Invalid quiz data')) {
        statusCode = 500;
        errorMessage = 'Failed to generate valid quiz data. Please try again with different parameters.';
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Save a quiz to the database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async saveQuiz(req, res) {
    try {
      const quizData = req.body;

      // Validate required fields
      if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing: title and questions are required'
        });
      }

      // Get user ID from auth token
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication is required to save quizzes'
        });
      }
      
      quizData.userId = userId;

      // Check for duplicate title and get suggested title if needed
      const titleCheck = await QuizService.checkDuplicateTitle(quizData.title);
      if (titleCheck.isDuplicate) {
        quizData.title = titleCheck.suggestedTitle;
      }

      // Save quiz to database
      const result = await QuizService.saveQuiz(quizData);

      if (result.success) {
        // Log success
        logger.info(`Quiz saved successfully: ${quizData.title} (ID: ${result.quizId})`);
        
        // Invalidate relevant cache entries
        cacheService.delete(`quizCount:user:${userId}`);
        cacheService.invalidateByPattern(`quizzes:user:${userId}`);
        
        // If this is an activity logger middleware, log it
        if (req.logActivity) {
          await req.logActivity('quiz_create', `Created quiz: ${quizData.title} (ID: ${result.quizId})`);
        }

        return res.status(201).json({
          success: true,
          message: 'Quiz saved successfully',
          quizId: result.quizId,
          title: quizData.title,
          isDuplicateTitle: titleCheck.isDuplicate
        });
      } else {
        logger.error('Failed to save quiz:', result.error);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to save quiz',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error saving quiz:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while saving the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all quizzes with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllQuizzes(req, res) {
    try {
      logger.info('Fetching all quizzes');
      
      // Get pagination and filter parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      const search = req.query.search || null;
      const folder = req.query.folder || null;
      const sortBy = req.query.sortBy || 'created_at';
      const sortOrder = req.query.sortOrder || 'desc';
      
      // Get user ID from auth token if available
      const userId = req.user?.userId;
      
      // Generate cache key
      const cacheKey = `quizzes:${userId || 'public'}:page${page}:limit${limit}:search${search || ''}:folder${folder || ''}:sort${sortBy}${sortOrder}`;
      
      // Try to get from cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached quiz list: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }
      
      // Fetch quizzes from database
      const result = await QuizService.getAllQuizzes({
        limit,
        offset,
        userId,
        search,
        folder,
        sortBy,
        sortOrder
      });
      
      // Build response with pagination
      const response = {
        success: true,
        data: result.quizzes,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      };
      
      // Cache the response
      cacheService.set(cacheKey, response, 300); // Cache for 5 minutes
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching quizzes:', error);
      
      // Return empty results rather than error for better UX
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        },
        error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      });
    }
  }
  
  /**
   * Get a quiz by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Generate cache key
      const cacheKey = `quiz:${id}`;
      
      // Try to get from cache first
      const cachedQuiz = cacheService.get(cacheKey);
      if (cachedQuiz) {
        logger.debug(`Using cached quiz: ${cacheKey}`);
        return res.status(200).json({
          success: true,
          data: cachedQuiz
        });
      }

      // Get quiz from database
      const quiz = await QuizService.getQuizById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has access to the quiz if it's not public
      // If userId is available and not matching quiz creator, check permissions
      const userId = req.user?.userId;
      if (userId && quiz.user_id !== userId) {
        const hasAccess = await QuizService.checkQuizAccess(id, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this quiz'
          });
        }
      }
      
      // Cache the result
      cacheService.set(cacheKey, quiz, 600); // Cache for 10 minutes
      
      // Log view activity
      if (userId && req.logActivity) {
        await req.logActivity('quiz_view', `Viewed quiz: ${quiz.title} (ID: ${id})`);
      }

      return res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      logger.error('Error fetching quiz by ID:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete a quiz
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to delete this quiz
      if (quiz.user_id !== userId) {
        // Check if user is an admin
        const isAdmin = await QuizService.isUserAdmin(userId);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this quiz'
          });
        }
      }

      // Delete quiz from database
      const result = await QuizService.deleteQuiz(id);

      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.delete(`quiz:${id}`);
        cacheService.delete(`quizCount:user:${userId}`);
        cacheService.invalidateByPattern(`quizzes:${userId || 'public'}`);
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity('quiz_delete', `Deleted quiz: ${quiz.title} (ID: ${id})`);
        }

        return res.status(200).json({
          success: true,
          message: 'Quiz deleted successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete quiz',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error deleting quiz:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while deleting the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Rename a quiz
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async renameQuiz(req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.userId;

      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'New title is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to rename this quiz
      if (quiz.user_id !== userId) {
        // Check if user is an admin
        const isAdmin = await QuizService.isUserAdmin(userId);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to rename this quiz'
          });
        }
      }

      // Check for duplicate title
      const titleCheck = await QuizService.checkDuplicateTitle(title);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : title;

      // Rename quiz in database
      const result = await QuizService.renameQuiz(id, finalTitle);

      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.delete(`quiz:${id}`);
        cacheService.invalidateByPattern(`quizzes:${userId || 'public'}`);
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity('quiz_rename', `Renamed quiz from "${quiz.title}" to "${finalTitle}" (ID: ${id})`);
        }

        return res.status(200).json({
          success: true,
          message: 'Quiz renamed successfully',
          title: finalTitle,
          isDuplicateTitle: titleCheck.isDuplicate
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to rename quiz',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error renaming quiz:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while renaming the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update quiz questions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateQuizQuestions(req, res) {
    try {
      const { id } = req.params;
      const { questions } = req.body;
      const userId = req.user?.userId;

      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Questions array is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to update this quiz
      if (quiz.user_id !== userId) {
        // Check if user is an admin or has collaborator access
        const hasAccess = await QuizService.checkQuizEditAccess(id, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to update this quiz'
          });
        }
      }

      // Update questions in database
      const result = await QuizService.updateQuizQuestions(id, questions);

      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.delete(`quiz:${id}`);
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity('quiz_update', `Updated questions for quiz: ${quiz.title} (ID: ${id})`);
        }

        return res.status(200).json({
          success: true,
          message: 'Quiz questions updated successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to update quiz questions',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error updating quiz questions:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while updating quiz questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Move quiz to a folder
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async moveQuiz(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;
      const userId = req.user?.userId;

      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to move this quiz
      if (quiz.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move this quiz'
        });
      }
      
      // Check if folder exists and belongs to the user
      const folderExists = await QuizService.checkFolderAccess(folderId, userId);
      if (!folderExists) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found or you do not have access to it'
        });
      }

      // Move quiz in database
      const result = await QuizService.moveQuiz(id, folderId);

      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.delete(`quiz:${id}`);
        cacheService.invalidateByPattern(`quizzes:${userId}`);
        cacheService.invalidateByPattern(`folder:${folderId}`);
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity('quiz_move', `Moved quiz: ${quiz.title} (ID: ${id}) to folder (ID: ${folderId})`);
        }

        return res.status(200).json({
          success: true,
          message: 'Quiz moved successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to move quiz',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error moving quiz:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while moving the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if a quiz title is already in use
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkTitleAvailability(req, res) {
    try {
      const { title } = req.query;
      const userId = req.user?.userId;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      // Check title availability
      const result = await QuizService.checkDuplicateTitle(title, userId);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error checking title availability:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while checking title availability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get quiz statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getQuizStatistics(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      // Check if quiz exists
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to view quiz statistics
      if (quiz.user_id !== userId) {
        const hasAccess = await QuizService.checkQuizAccess(id, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view statistics for this quiz'
          });
        }
      }
      
      // Generate cache key
      const cacheKey = `quiz:${id}:stats`;
      
      // Try to get from cache first
      const cachedStats = cacheService.get(cacheKey);
      if (cachedStats) {
        logger.debug(`Using cached quiz statistics: ${cacheKey}`);
        return res.status(200).json({
          success: true,
          data: cachedStats
        });
      }
      
      // Get quiz statistics
      const statistics = await QuizService.getQuizStatistics(id);
      
      // Cache the result
      cacheService.set(cacheKey, statistics, 600); // Cache for 10 minutes
      
      return res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error fetching quiz statistics:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching quiz statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Create a new folder
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createFolder(req, res) {
    try {
      const { name, parentId } = req.body;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
      }
      
      // Check if parent folder exists and user has access (if provided)
      if (parentId) {
        const hasAccess = await QuizService.checkFolderAccess(parentId, userId);
        if (!hasAccess) {
          return res.status(404).json({
            success: false,
            message: 'Parent folder not found or you do not have access to it'
          });
        }
      }
      
      // Create folder
      const result = await QuizService.createFolder(name, userId, parentId);
      
      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.invalidateByPattern(`folders:${userId}`);
        if (parentId) {
          cacheService.invalidateByPattern(`folder:${parentId}`);
        }
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity('folder_create', `Created folder: ${name} (ID: ${result.folderId})`);
        }
        
        return res.status(201).json({
          success: true,
          message: 'Folder created successfully',
          folderId: result.folderId
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to create folder',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error creating folder:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while creating the folder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get all folders for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getFolders(req, res) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication is required to access folders'
        });
      }
      
      // Generate cache key
      const cacheKey = `folders:${userId}`;
      
      // Try to get from cache first
      const cachedFolders = cacheService.get(cacheKey);
      if (cachedFolders) {
        logger.debug(`Using cached folders: ${cacheKey}`);
        return res.status(200).json({
          success: true,
          data: cachedFolders
        });
      }
      
      // Get folders
      const folders = await QuizService.getUserFolders(userId);
      
      // Cache the result
      cacheService.set(cacheKey, folders, 600); // Cache for 10 minutes
      
      return res.status(200).json({
        success: true,
        data: folders
      });
    } catch (error) {
      logger.error('Error fetching folders:', error);

      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching folders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get quizzes in a folder
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getFolderQuizzes(req, res) {
    try {
      const { folderId } = req.params;
      const userId = req.user?.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      
      // Validate folder ID
      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
      }
      
      // Check if user has access to the folder
      const hasAccess = await QuizService.checkFolderAccess(folderId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this folder'
        });
      }
      
      // Generate cache key
      const cacheKey = `folder:${folderId}:quizzes:page${page}:limit${limit}`;
      
      // Try to get from cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached folder quizzes: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }
      
      // Get folder quizzes
      const result = await QuizService.getFolderQuizzes(folderId, { limit, offset });
      
      // Build response with pagination
      const response = {
        success: true,
        data: result.quizzes,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      };
      
      // Cache the response
      cacheService.set(cacheKey, response, 300); // Cache for 5 minutes
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching folder quizzes:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching folder quizzes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Share a quiz with other users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async shareQuiz(req, res) {
    try {
      const { id } = req.params;
      const { emails, permissions } = req.body;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one email address is required'
        });
      }
      
      // Check if permissions is valid
      if (!permissions || !['view', 'edit'].includes(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Valid permissions are required (view or edit)'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to share this quiz
      if (quiz.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to share this quiz'
        });
      }
      
      // Share quiz with each email
      const results = await QuizService.shareQuiz(id, emails, permissions);
      
      // Invalidate relevant cache entries
      cacheService.delete(`quiz:${id}`);
      cacheService.invalidateByPattern(`quiz:${id}:shares`);
      
      // Log activity if middleware available
      if (req.logActivity) {
        await req.logActivity(
          'quiz_share', 
          `Shared quiz: ${quiz.title} (ID: ${id}) with ${results.successful.length} users`
        );
      }
      
      return res.status(200).json({
        success: true,
        message: `Quiz shared successfully with ${results.successful.length} users`,
        data: results
      });
    } catch (error) {
      logger.error('Error sharing quiz:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while sharing the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get list of users a quiz is shared with
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getQuizShares(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to view shares
      if (quiz.user_id !== userId) {
        // Check if user is an admin
        const isAdmin = await QuizService.isUserAdmin(userId);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view shares for this quiz'
          });
        }
      }
      
      // Generate cache key
      const cacheKey = `quiz:${id}:shares`;
      
      // Try to get from cache first
      const cachedShares = cacheService.get(cacheKey);
      if (cachedShares) {
        logger.debug(`Using cached quiz shares: ${cacheKey}`);
        return res.status(200).json({
          success: true,
          data: cachedShares
        });
      }
      
      // Get shares
      const shares = await QuizService.getQuizShares(id);
      
      // Cache the result
      cacheService.set(cacheKey, shares, 600); // Cache for 10 minutes
      
      return res.status(200).json({
        success: true,
        data: shares
      });
    } catch (error) {
      logger.error('Error fetching quiz shares:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching quiz shares',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Remove share access for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async removeQuizShare(req, res) {
    try {
      const { id } = req.params;
      const { email } = req.body;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to remove shares
      if (quiz.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove shares for this quiz'
        });
      }
      
      // Remove share
      const result = await QuizService.removeQuizShare(id, email);
      
      // Invalidate relevant cache entries
      cacheService.delete(`quiz:${id}`);
      cacheService.invalidateByPattern(`quiz:${id}:shares`);
      
      // Log activity if middleware available
      if (req.logActivity) {
        await req.logActivity(
          'quiz_unshare',
          `Removed share access for quiz: ${quiz.title} (ID: ${id}) from ${email}`
        );
      }
      
      return res.status(200).json({
        success: true,
        message: 'Share access removed successfully'
      });
    } catch (error) {
      logger.error('Error removing quiz share:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while removing share access',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Update sharing permissions for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateQuizShare(req, res) {
    try {
      const { id } = req.params;
      const { email, permissions } = req.body;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      // Check if permissions is valid
      if (!permissions || !['view', 'edit'].includes(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Valid permissions are required (view or edit)'
        });
      }
      
      // Check if user is the owner of the quiz
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Verify user has permission to update shares
      if (quiz.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update shares for this quiz'
        });
      }
      
      // Update share
      const result = await QuizService.updateQuizShare(id, email, permissions);
      
      // Invalidate relevant cache entries
      cacheService.delete(`quiz:${id}`);
      cacheService.invalidateByPattern(`quiz:${id}:shares`);
      
      // Log activity if middleware available
      if (req.logActivity) {
        await req.logActivity(
          'quiz_share_update',
          `Updated share permissions for quiz: ${quiz.title} (ID: ${id}) for ${email} to ${permissions}`
        );
      }
      
      return res.status(200).json({
        success: true,
        message: 'Share permissions updated successfully'
      });
    } catch (error) {
      logger.error('Error updating quiz share permissions:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while updating share permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Clone a quiz
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async cloneQuiz(req, res) {
    try {
      const { id } = req.params;
      const { title, folderId } = req.body;
      const userId = req.user?.userId;
      
      // Validate inputs
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }
      
      // Check if quiz exists
      const quiz = await QuizService.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Check if user has access to the quiz
      if (quiz.user_id !== userId) {
        const hasAccess = await QuizService.checkQuizAccess(id, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to clone this quiz'
          });
        }
      }
      
      // Check if folder exists and user has access (if provided)
      if (folderId) {
        const hasAccess = await QuizService.checkFolderAccess(folderId, userId);
        if (!hasAccess) {
          return res.status(404).json({
            success: false,
            message: 'Folder not found or you do not have access to it'
          });
        }
      }
      
      // Generate new title if not provided
      let newTitle = title;
      if (!newTitle) {
        newTitle = `Copy of ${quiz.title}`;
      }
      
      // Check for duplicate title
      const titleCheck = await QuizService.checkDuplicateTitle(newTitle, userId);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : newTitle;
      
      // Clone quiz
      const result = await QuizService.cloneQuiz(id, userId, finalTitle, folderId);
      
      if (result.success) {
        // Invalidate relevant cache entries
        cacheService.delete(`quizCount:user:${userId}`);
        cacheService.invalidateByPattern(`quizzes:${userId}`);
        if (folderId) {
          cacheService.invalidateByPattern(`folder:${folderId}`);
        }
        
        // Log activity if middleware available
        if (req.logActivity) {
          await req.logActivity(
            'quiz_clone',
            `Cloned quiz: ${quiz.title} (ID: ${id}) to create new quiz: ${finalTitle} (ID: ${result.quizId})`
          );
        }
        
        return res.status(201).json({
          success: true,
          message: 'Quiz cloned successfully',
          quizId: result.quizId,
          title: finalTitle,
          isDuplicateTitle: titleCheck.isDuplicate
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to clone quiz',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error cloning quiz:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while cloning the quiz',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get user's shared quizzes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getSharedQuizzes(req, res) {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication is required to access shared quizzes'
        });
      }
      
      // Generate cache key
      const cacheKey = `shared-quizzes:${userId}:page${page}:limit${limit}`;
      
      // Try to get from cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached shared quizzes: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }
      
      // Get shared quizzes
      const result = await QuizService.getSharedQuizzes(userId, { limit, offset });
      
      // Build response with pagination
      const response = {
        success: true,
        data: result.quizzes,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      };
      
      // Cache the response
      cacheService.set(cacheKey, response, 300); // Cache for 5 minutes
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching shared quizzes:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching shared quizzes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get recent quizzes for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getRecentQuizzes(req, res) {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit) || 5;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication is required to access recent quizzes'
        });
      }
      
      // Generate cache key
      const cacheKey = `recent-quizzes:${userId}:limit${limit}`;
      
      // Try to get from cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached recent quizzes: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }
      
      // Get recent quizzes
      const quizzes = await QuizService.getRecentQuizzes(userId, limit);
      
      // Build response
      const response = {
        success: true,
        data: quizzes
      };
      
      // Cache the response
      cacheService.set(cacheKey, response, 300); // Cache for 5 minutes
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching recent quizzes:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching recent quizzes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Search for quizzes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchQuizzes(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user?.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      
      // Validate inputs
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      // Search quizzes
      const result = await QuizService.searchQuizzes(query, userId, { limit, offset });
      
      // Build response with pagination
      const response = {
        success: true,
        data: result.quizzes,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      };
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error searching quizzes:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while searching quizzes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get user's quiz dashboard stats
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getQuizDashboardStats(req, res) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication is required to access quiz dashboard'
        });
      }
      
      // Generate cache key
      const cacheKey = `quiz-dashboard:${userId}`;
      
      // Try to get from cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Using cached quiz dashboard stats: ${cacheKey}`);
        return res.status(200).json({
          success: true,
          data: cachedData
        });
      }
      
      // Get stats - perform all queries in parallel for better performance
      const [
        totalQuizzes,
        quizzesByType,
        recentActivity,
        folderStats,
        aiUsageStats
      ] = await Promise.all([
        QuizService.getTotalQuizCount(userId),
        QuizService.getQuizzesByType(userId),
        QuizService.getRecentQuizActivity(userId, 5),
        QuizService.getFolderStats(userId),
        QuizService.getAIUsageStats(userId)
      ]);
      
      // Build dashboard data
      const dashboardData = {
        totalQuizzes,
        quizzesByType,
        recentActivity,
        folderStats,
        aiUsageStats
      };
      
      // Cache the data
      cacheService.set(cacheKey, dashboardData, 600); // Cache for 10 minutes
      
      return res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Error fetching quiz dashboard stats:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching quiz dashboard stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /**
   * Generate quiz from uploaded file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateQuizFromFile(req, res) {
    let filePath = null;
    
    try {
      const userId = req.user?.userId;
      const uploadedFile = req.file;
      
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัพโหลด'
        });
      }

      filePath = uploadedFile.path;

      // Parse settings from request
      let settings = {};
      try {
        settings = JSON.parse(req.body.settings || '{}');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบการตั้งค่าไม่ถูกต้อง'
        });
      }

      const {
        questionType = 'Multiple Choice',
        numberOfQuestions = 10,
        additionalInstructions = '',
        studentLevel = '',
        outputLanguage = 'Thai'
      } = settings;

      // Check if Gemini API key exists
      if (!process.env.GOOGLE_GEMINI_API_KEY) {
        throw new Error('Google Gemini API key not configured');
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let promptContent = '';
      let geminiInput = [];

      // Handle different file types
      if (uploadedFile.mimetype === 'application/pdf') {
        // For PDF files, send directly to Gemini Vision API
        const pdfBuffer = fs.readFileSync(uploadedFile.path);
        const pdfBase64 = pdfBuffer.toString('base64');

        promptContent = `
          วิเคราะห์เอกสาร PDF นี้และสร้างข้อสอบ ${numberOfQuestions} ข้อ
          
          รูปแบบข้อสอบ: ${questionType}
          ภาษา: ${outputLanguage === 'Thai' ? 'ไทย' : 'English'}
          ระดับนักเรียน: ${studentLevel || 'ปานกลาง'}
          คำแนะนำเพิ่มเติม: ${additionalInstructions}
          
          สร้างข้อสอบจากเนื้อหาที่สำคัญในเอกสาร โดยให้ผลลัพธ์ในรูปแบบ JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม:
          {
            "title": "ชื่อข้อสอบตามเนื้อหา",
            "questions": [
              {
                "questionText": "คำถาม",
                "options": [
                  {"text": "ตัวเลือก A", "isCorrect": false},
                  {"text": "ตัวเลือก B", "isCorrect": true},
                  {"text": "ตัวเลือก C", "isCorrect": false},
                  {"text": "ตัวเลือก D", "isCorrect": false}
                ],
                "explanation": "คำอธิบาย"
              }
            ]
          }
        `;

        geminiInput = [
          promptContent,
          {
            inlineData: {
              data: pdfBase64,
              mimeType: 'application/pdf'
            }
          }
        ];
      } else if (uploadedFile.mimetype === 'text/plain') {
        // For text files, read content and send as text
        const textContent = fs.readFileSync(uploadedFile.path, 'utf8');
        
        promptContent = `
          สร้างข้อสอบ ${numberOfQuestions} ข้อ จากเนื้อหาต่อไปนี้:
          
          เนื้อหา:
          ${textContent}
          
          รูปแบบข้อสอบ: ${questionType}
          ภาษา: ${outputLanguage === 'Thai' ? 'ไทย' : 'English'}
          ระดับนักเรียน: ${studentLevel || 'ปานกลาง'}
          คำแนะนำเพิ่มเติม: ${additionalInstructions}
          
          ให้ผลลัพธ์ในรูปแบบ JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม:
          {
            "title": "ชื่อข้อสอบ",
            "questions": [
              {
                "questionText": "คำถาม",
                "options": [
                  {"text": "ตัวเลือก A", "isCorrect": false},
                  {"text": "ตัวเลือก B", "isCorrect": true},
                  {"text": "ตัวเลือก C", "isCorrect": false},
                  {"text": "ตัวเลือก D", "isCorrect": false}
                ],
                "explanation": "คำอธิบาย"
              }
            ]
          }
        `;

        geminiInput = [promptContent];
      } else {
        // For DOCX files - basic text extraction (would need mammoth.js for full support)
        throw new Error('DOCX files not yet supported. Please use PDF or TXT files.');
      }

      // Generate content with Gemini
      const result = await model.generateContent(geminiInput);
      const response = await result.response;
      let responseText = response.text();

      // Clean and parse JSON response
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let quizData;
      try {
        quizData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response Text:', responseText);
        throw new Error('ไม่สามารถประมวลผลผลลัพธ์จาก AI ได้');
      }

      // Validate quiz structure
      if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('รูปแบบข้อมูลข้อสอบไม่ถูกต้อง');
      }

      // Create quiz object for saving (adapt based on your existing QuizService structure)
      const quizToSave = {
        title: quizData.title,
        description: `Generated from file: ${uploadedFile.originalname}`,
        topic: quizData.title,
        questionType: questionType,
        questions: quizData.questions,
        userId: userId,
        settings: {
          sourceType: 'file',
          fileName: uploadedFile.originalname,
          fileSize: uploadedFile.size,
          numberOfQuestions,
          outputLanguage,
          studentLevel,
          additionalInstructions
        }
      };

      // Save to database (replace with your actual save method)
      // const savedQuiz = await QuizService.createQuiz(quizToSave);

      // For now, return the generated quiz (you can save it on the frontend)
      const savedQuiz = {
        id: Date.now(), // Temporary ID
        ...quizToSave,
        createdAt: new Date()
      };

      // Log the file upload activity
      logger.info(`Quiz generated from file: ${uploadedFile.originalname} by user ${userId}`);

      res.status(200).json({
        success: true,
        quiz: savedQuiz,
        message: 'สร้างข้อสอบจากไฟล์สำเร็จ'
      });

    } catch (error) {
      console.error('File Quiz Generation Error:', error);
      
      // Handle specific errors
      if (error.message.includes('API')) {
        return res.status(503).json({
          success: false,
          message: 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง'
        });
      }

      if (error.message.includes('JSON') || error.message.includes('ประมวลผล')) {
        return res.status(422).json({
          success: false,
          message: 'ไม่สามารถประมวลผลเอกสารได้ กรุณาตรวจสอบรูปแบบไฟล์'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการสร้างข้อสอบจากไฟล์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Clean up uploaded file
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    }
  }
}

export default QuizController;