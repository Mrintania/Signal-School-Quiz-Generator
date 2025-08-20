import QuizService from '../services/quizService.js';
import aiService from '../services/aiService.js';
import { logger } from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';
import { ErrorService } from '../services/errorService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import * as cheerio from 'cheerio';

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
      const {
        topic,
        questionType,
        numberOfQuestions,
        additionalInstructions,
        studentLevel,
        outputLanguage,
        webpageUrl  // ✅ เพิ่มรับ webpageUrl
      } = req.body;

      console.log('=== BACKEND DEBUG ===');
      console.log('Received request body:', req.body);
      console.log('Webpage URL:', webpageUrl);
      console.log('===================');

      // Validate required fields
      if (!questionType || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      let finalTopic = topic;
      let finalInstructions = additionalInstructions || '';

      // ✅ จัดการ webpage URL
      if (webpageUrl) {
        try {
          console.log('Fetching webpage content from:', webpageUrl);

          // Fetch webpage content
          const response = await axios.get(webpageUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Quiz Generator Bot)'
            }
          });

          // Extract text content using cheerio
          const $ = cheerio.load(response.data);

          // Remove script and style elements
          $('script, style, nav, footer, header').remove();

          // Get main content (try different selectors)
          let content = '';
          const contentSelectors = [
            'article',
            'main',
            '.content',
            '.post-content',
            '.entry-content',
            'body'
          ];

          for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
              content = element.text().trim();
              break;
            }
          }

          // Clean up content
          content = content
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim()
            .substring(0, 5000); // Limit content length

          console.log('Extracted content length:', content.length);

          if (content.length > 100) {
            finalTopic = finalTopic || `Content from ${webpageUrl}`;
            finalInstructions = `${finalInstructions}\n\nGenerate questions based on the following webpage content:\n\n${content}`;
          } else {
            throw new Error('Unable to extract sufficient content from webpage');
          }

        } catch (webError) {
          console.error('Webpage fetch error:', webError);
          return res.status(400).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลจากเว็บไซต์ได้ กรุณาตรวจสอบ URL หรือลองใหม่อีกครั้ง'
          });
        }
      }

      // ตรวจสอบว่ามี topic หรือไม่
      if (!finalTopic || finalTopic.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุหัวข้อหรือเนื้อหาที่ต้องการสร้างข้อสอบ'
        });
      }

      // ✅ Normalize language value
      const language = outputLanguage ? outputLanguage.toLowerCase() : 'thai';

      console.log('Final topic:', finalTopic);
      console.log('Final instructions length:', finalInstructions.length);
      console.log('Using language:', language);

      // Generate quiz using AI service
      const quizData = await aiService.generateQuiz({
        topic: finalTopic,
        questionType,
        numberOfQuestions,
        additionalInstructions: finalInstructions,
        studentLevel,
        language
      });

      return res.status(200).json({
        success: true,
        data: quizData
      });

    } catch (error) {
      console.error('Error generating quiz:', error);

      let statusCode = 500;
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างข้อสอบ';

      if (error.message === 'AI generation timed out') {
        statusCode = 504;
        errorMessage = 'การสร้างข้อสอบใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';
      } else if (error.message.includes('AI service')) {
        statusCode = 503;
        errorMessage = 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง';
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage
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
      console.log('=== FILE UPLOAD DEBUG ===');
      console.log('Request body:', req.body);
      console.log('Uploaded file:', req.file);
      console.log('API Key exists:', !!process.env.GOOGLE_GEMINI_API_KEY);
      console.log('========================');

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
        console.log('Parsed settings:', settings);
      } catch (error) {
        console.error('Settings parse error:', error);
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

      // ✅ ตรวจสอบ API Key อย่างละเอียด
      if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error('GOOGLE_GEMINI_API_KEY not found in environment variables');
        return res.status(503).json({
          success: false,
          message: 'ไม่พบการตั้งค่า Google Gemini API Key กรุณาติดต่อผู้ดูแลระบบ'
        });
      }

      // ✅ ตรวจสอบความถูกต้องของ API Key
      if (!process.env.GOOGLE_GEMINI_API_KEY.startsWith('AIza')) {
        console.error('Invalid GOOGLE_GEMINI_API_KEY format');
        return res.status(503).json({
          success: false,
          message: 'รูปแบบ Google Gemini API Key ไม่ถูกต้อง'
        });
      }

      const language = outputLanguage.toLowerCase();
      console.log('Using language:', language);

      // ✅ Initialize Gemini AI with error handling
      let genAI, model;
      try {
        genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
        model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
          }
        });
        console.log('Gemini AI initialized successfully');
      } catch (initError) {
        console.error('Gemini AI initialization error:', initError);
        return res.status(503).json({
          success: false,
          message: 'ไม่สามารถเชื่อมต่อกับบริการ AI ได้ กรุณาลองใหม่อีกครั้ง'
        });
      }

      let promptContent = '';
      let geminiInput = [];

      // ✅ ปรับปรุง prompt สำหรับภาษาไทย
      if (language === 'thai') {
        promptContent = `
วิเคราะห์เอกสารที่แนบมาและสร้างข้อสอบภาษาไทย

**สำคัญที่สุด: ข้อสอบทั้งหมดต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษเด็ดขาด**

รายละเอียด:
- จำนวนข้อ: ${numberOfQuestions} ข้อ
- ประเภทคำถาม: ${questionType}
- ทุกอย่างต้องเป็นภาษาไทย: คำถาม, ตัวเลือก, คำอธิบาย

${additionalInstructions ? `ข้อกำหนดเพิ่มเติม: ${additionalInstructions}` : ''}
${studentLevel ? `ระดับนักเรียน: ${studentLevel}` : ''}

รูปแบบ JSON ที่ต้องการ (กรุณาตอบเป็น JSON เท่านั้น):
{
  "title": "หัวข้อข้อสอบภาษาไทย",
  "questions": [
    {
      "questionText": "คำถามภาษาไทย",
      "options": [
        {"text": "ตัวเลือก ก", "isCorrect": false},
        {"text": "ตัวเลือก ข", "isCorrect": true},
        {"text": "ตัวเลือก ค", "isCorrect": false},
        {"text": "ตัวเลือก ง", "isCorrect": false}
      ],
      "explanation": "คำอธิบายภาษาไทย"
    }
  ]
}`;
      } else {
        promptContent = `
Analyze the attached document and create an English quiz.

**IMPORTANT: All content must be in English only**

Details:
- Number of questions: ${numberOfQuestions}
- Question type: ${questionType}
- All content must be in English: questions, options, explanations

${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ''}
${studentLevel ? `Student level: ${studentLevel}` : ''}

Required JSON format (respond with JSON only):
{
  "title": "Quiz title in English",
  "questions": [
    {
      "questionText": "Question in English",
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Explanation in English"
    }
  ]
}`;
      }

      // ✅ Handle different file types with better error handling
      try {
        if (uploadedFile.mimetype === 'application/pdf') {
          console.log('Processing PDF file...');
          const pdfBuffer = fs.readFileSync(uploadedFile.path);
          const pdfBase64 = pdfBuffer.toString('base64');

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
          console.log('Processing text file...');
          const textContent = fs.readFileSync(uploadedFile.path, 'utf8');
          geminiInput = [
            `${promptContent}\n\nเนื้อหาเอกสาร:\n\n${textContent}`
          ];
        } else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // สำหรับไฟล์ DOCX - อาจต้องใช้ library เพิ่มเติม
          console.log('DOCX files not fully supported yet, converting to text...');
          return res.status(400).json({
            success: false,
            message: 'ขณะนี้รองรับเฉพาะไฟล์ PDF และ TXT เท่านั้น กรุณาแปลงไฟล์ DOCX เป็น PDF'
          });
        } else {
          throw new Error('รองรับเฉพาะไฟล์ PDF และ TXT เท่านั้น');
        }
      } catch (fileError) {
        console.error('File processing error:', fileError);
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถประมวลผลไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์'
        });
      }

      console.log('Sending request to Gemini AI...');

      // ✅ Generate content with better error handling
      let result, response, responseText;
      try {
        // เพิ่ม timeout และ retry logic
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 30000)
        );

        const generatePromise = model.generateContent(geminiInput);
        result = await Promise.race([generatePromise, timeout]);

        response = await result.response;
        responseText = response.text();

        console.log('Gemini response received, length:', responseText.length);
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);

        if (aiError.message.includes('timeout')) {
          return res.status(504).json({
            success: false,
            message: 'การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
          });
        }

        if (aiError.message.includes('API_KEY')) {
          return res.status(503).json({
            success: false,
            message: 'ปัญหาการยืนยันตัวตน Google Gemini API กรุณาติดต่อผู้ดูแลระบบ'
          });
        }

        return res.status(503).json({
          success: false,
          message: 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง'
        });
      }

      // ✅ Clean and parse JSON response
      try {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // ลบ text ที่ไม่ใช่ JSON
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
          responseText = responseText.substring(jsonStart, jsonEnd + 1);
        }

        console.log('Cleaned response for parsing...');

        const quizData = JSON.parse(responseText);
        console.log('Quiz data parsed successfully');

        // Validate quiz structure
        if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
          throw new Error('Invalid quiz structure');
        }

        if (quizData.questions.length === 0) {
          throw new Error('No questions generated');
        }

        // Validate each question
        for (let i = 0; i < quizData.questions.length; i++) {
          const question = quizData.questions[i];
          if (!question.questionText || !question.options || !Array.isArray(question.options)) {
            throw new Error(`Question ${i + 1} has invalid structure`);
          }
        }

        // ✅ Create final quiz object
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
          },
          createdAt: new Date()
        };

        // Clean up uploaded file
        try {
          fs.unlinkSync(filePath);
          console.log('Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary file:', cleanupError);
        }

        // Log the activity
        if (logger && logger.info) {
          logger.info(`Quiz generated from file: ${uploadedFile.originalname} by user ${userId}`);
        }

        console.log('=== SUCCESS ===');
        console.log('Quiz title:', quizToSave.title);
        console.log('Questions count:', quizToSave.questions.length);
        console.log('===============');

        // ✅ Send success response
        return res.status(200).json({
          success: true,
          quiz: quizToSave,
          message: 'สร้างข้อสอบจากไฟล์สำเร็จ'
        });

      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response Text:', responseText?.substring(0, 500));

        return res.status(422).json({
          success: false,
          message: 'ไม่สามารถประมวลผลผลลัพธ์จาก AI ได้ กรุณาลองใหม่อีกครั้ง'
        });
      }

    } catch (error) {
      console.error('=== FILE UPLOAD ERROR ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('========================');

      // Clean up file on error
      if (filePath) {
        try {
          fs.unlinkSync(filePath);
          console.log('Cleaned up file after error');
        } catch (cleanupError) {
          console.warn('Failed to cleanup file on error:', cleanupError);
        }
      }

      // Handle different types of errors
      if (error.message.includes('API') || error.message.includes('Gemini')) {
        return res.status(503).json({
          success: false,
          message: 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง'
        });
      }

      if (error.message.includes('timeout')) {
        return res.status(504).json({
          success: false,
          message: 'การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการสร้างข้อสอบจากไฟล์',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default QuizController;