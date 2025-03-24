import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import Quiz from '../models/quiz.js';

// Initialize Google Gemini API with error handling
let genAI;
try {
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    logger.info('Google Gemini API initialized successfully');
  } else {
    logger.warn('Google Gemini API key not found in environment variables');
  }
} catch (error) {
  logger.error('Error initializing Google Gemini API:', error);
}

// Helper function to handle API errors consistently
const handleApiError = (res, error, message = 'An error occurred') => {
  logger.error(`API Error: ${message}`, error);
  return res.status(500).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

class QuizController {
  // Generate a new quiz using Google Gemini API
  static async generateQuiz(req, res) {
    try {
      const { topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language } = req.body;

      // Validate required fields
      if (!topic || !questionType || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // Check if Google Gemini API is initialized
      if (!genAI) {
        return res.status(503).json({
          success: false,
          message: 'AI service is currently unavailable'
        });
      }

      // Create prompt for Google Gemini API
      const prompt = QuizController.createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language);

      // Select model and set parameters
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Use specified model
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 8192,
        },
      });

      // Request generation with timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timed out')), 30000); // 30 seconds timeout
      });
      
      const generationPromise = model.generateContent(prompt);
      const result = await Promise.race([generationPromise, timeoutPromise]);
      const responseText = result.response.text();
      
      // Parse response
      let quizData;
      try {
        if (responseText.includes('```json') && responseText.includes('```')) {
          const jsonString = responseText.split('```json')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else if (responseText.includes('```') && responseText.includes('```')) {
          const jsonString = responseText.split('```')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else {
          quizData = JSON.parse(responseText);
        }
      } catch (error) {
        logger.error('Error parsing Gemini response:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to parse quiz data from AI response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          rawResponse: process.env.NODE_ENV === 'development' ? responseText.substring(0, 500) + '...' : undefined
        });
      }

      // Validate response structure
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        return res.status(500).json({
          success: false,
          message: 'Invalid quiz data structure from AI response',
          details: 'The questions array is missing or invalid'
        });
      }

      // Return successful response
      return res.status(200).json({
        success: true,
        data: {
          topic,
          questionType,
          studentLevel,
          language,
          questions: quizData.questions
        }
      });
    } catch (error) {
      return handleApiError(res, error, 'Error generating quiz');
    }
  }

  // Save a quiz to the database
  static async saveQuiz(req, res) {
    try {
      const quizData = req.body;

      // Validate required fields
      if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // Get user ID from auth token if available
      const userId = req.user?.userId || 1; // Default to user ID 1 if not authenticated
      quizData.userId = userId;

      // Check for duplicate title and get suggested title if needed
      const titleCheck = await Quiz.checkDuplicateTitle(quizData.title);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : quizData.title;

      // Update title if a duplicate was found
      if (titleCheck.isDuplicate) {
        quizData.title = finalTitle;
      }

      // Save quiz to database
      const result = await Quiz.saveQuiz(quizData);

      if (result.success) {
        logger.info(`Quiz saved successfully: ${finalTitle} (ID: ${result.quizId})`);
        return res.status(201).json({
          success: true,
          message: 'Quiz saved successfully',
          quizId: result.quizId,
          title: finalTitle,
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
      return handleApiError(res, error, 'Error saving quiz');
    }
  }

  // Get all quizzes with optional pagination
  static async getAllQuizzes(req, res) {
    try {
      logger.info('Fetching all quizzes');
      
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      
      // Get user ID from auth token if available
      const userId = req.user?.userId;
      
      // Build query parameters
      let queryParams = [];
      let query = 'SELECT * FROM quizzes';
      let countQuery = 'SELECT COUNT(*) as total FROM quizzes';
      
      // Filter by user ID if available
      if (userId) {
        query += ' WHERE user_id = ?';
        countQuery += ' WHERE user_id = ?';
        queryParams.push(userId);
      }
      
      // Add ordering and pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      // Execute queries with error handling
      try {
        // Get total count
        const [countRows] = await pool.execute(countQuery, userId ? [userId] : []);
        const total = countRows[0].total;
        
        // Get paginated data
        const [rows] = await pool.execute(query, queryParams);
        
        logger.info(`Retrieved ${rows.length} quizzes out of ${total} total`);
        
        return res.status(200).json({
          success: true,
          data: rows,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (dbError) {
        logger.error('Database error in getAllQuizzes:', dbError);
        
        // Return empty results rather than error for better UX
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          },
          error: process.env.NODE_ENV === 'development' ? dbError.message : 'Database error'
        });
      }
    } catch (error) {
      logger.error('Error in getAllQuizzes:', error);
      
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

  // Get a quiz by ID
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

      // Get quiz from database
      const quiz = await Quiz.getQuizById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      return handleApiError(res, error, 'Error fetching quiz by ID');
    }
  }

  // Delete a quiz
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Delete quiz from database
      const result = await Quiz.deleteQuiz(id);

      if (result.success) {
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
      return handleApiError(res, error, 'Error deleting quiz');
    }
  }

  // Rename a quiz
  static async renameQuiz(req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;

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

      // Check for duplicate title
      const titleCheck = await Quiz.checkDuplicateTitle(title);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : title;

      // Rename quiz in database
      const result = await Quiz.renameQuiz(id, finalTitle);

      if (result.success) {
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
      return handleApiError(res, error, 'Error renaming quiz');
    }
  }

  // Update quiz questions
  static async updateQuizQuestions(req, res) {
    try {
      const { id } = req.params;
      const { questions } = req.body;

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

      // Update questions in database
      const result = await Quiz.updateQuizQuestions(id, questions);

      if (result.success) {
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
      return handleApiError(res, error, 'Error updating quiz questions');
    }
  }

  // Move quiz to a folder
  static async moveQuiz(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;

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

      // Move quiz in database
      const result = await Quiz.moveQuiz(id, folderId);

      if (result.success) {
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
      return handleApiError(res, error, 'Error moving quiz');
    }
  }

  // Check if a quiz title is already in use
  static async checkTitleAvailability(req, res) {
    try {
      const { title } = req.query;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      const result = await Quiz.checkDuplicateTitle(title);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return handleApiError(res, error, 'Error checking title availability');
    }
  }

  // Create prompt for Google Gemini API
  static createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language) {
    // Set language for quiz
    const languagePrompt = language === 'thai'
      ? "Create the quiz in Thai language."
      : "Create the quiz in English language.";

    let prompt = `Create a ${questionType} quiz about "${topic}" with ${numberOfQuestions} questions. ${languagePrompt}`;

    if (studentLevel) {
      prompt += ` The quiz is intended for ${studentLevel} level students.`;
    }

    // Add any additional instructions
    if (additionalInstructions) {
      prompt += ` Additional instructions: ${additionalInstructions}`;

      // Emphasize avoiding duplication if requested
      if (additionalInstructions.includes("avoid duplication") ||
        additionalInstructions.includes("different questions")) {
        prompt += ` IMPORTANT: Please make sure to generate completely new and different questions that do not duplicate any previous questions on this topic.`;
      }
    }

    // Add format instructions based on question type
    if (questionType === 'Multiple Choice') {
      prompt += ` For each question, provide 4 options (A, B, C, D), indicate the correct answer, and include a brief explanation of why the answer is correct.`;
      prompt += ` Return the quiz in the following JSON format ONLY (do not include any other text or explanations outside the JSON):
      {
        "questions": [
          {
            "questionText": "Question text here",
            "options": [
              { "text": "Option A", "isCorrect": false },
              { "text": "Option B", "isCorrect": true },
              { "text": "Option C", "isCorrect": false },
              { "text": "Option D", "isCorrect": false }
            ],
            "explanation": "Explanation of the correct answer"
          }
        ]
      }`;
    } else if (questionType === 'Essay') {
      prompt += ` For each question, provide a brief guideline on what a good answer should include.`;
      prompt += ` Return the quiz in the following JSON format ONLY (do not include any other text or explanations outside the JSON):
      {
        "questions": [
          {
            "questionText": "Question text here",
            "explanation": "Guidelines for a good answer"
          }
        ]
      }`;
    }

    return prompt;
  }
}

export default QuizController;