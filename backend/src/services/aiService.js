// backend/src/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

/**
 * Service for AI-powered quiz generation
 */
class AIService {
    constructor() {
        this._initializeAI();
    }

    /**
     * Initialize AI service with proper error handling
     * @private
     */
    _initializeAI() {
        try {
            if (process.env.GOOGLE_GEMINI_API_KEY) {
                this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
                logger.info('Google Gemini API initialized successfully');
            } else {
                logger.warn('Google Gemini API key not found in environment variables');
                this.genAI = null;
            }
        } catch (error) {
            logger.error('Error initializing Google Gemini API:', error);
            this.genAI = null;
        }
    }

    /**
     * Check if AI service is available
     * @returns {boolean} True if available
     */
    isAvailable() {
        return !!this.genAI;
    }

    /**
     * Generate a quiz based on parameters
     * @param {Object} params - Generation parameters
     * @param {string} params.topic - Quiz topic
     * @param {string} params.questionType - Type of questions ('Multiple Choice' or 'Essay')
     * @param {number} params.numberOfQuestions - Number of questions to generate
     * @param {string} [params.additionalInstructions] - Additional generation instructions
     * @param {string} [params.studentLevel] - Target student level
     * @param {string} [params.language] - Language for quiz ('thai' or 'english')
     * @returns {Promise<Object>} Generated quiz data
     */
    async generateQuiz(params) {
        // Check if AI service is available
        if (!this.isAvailable()) {
            throw new Error('AI service is currently unavailable');
        }

        const { topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language } = params;

        // Calculate cache key for this generation
        const cacheKey = this._generateCacheKey(params);

        // Check cache first
        const cachedQuiz = cacheService.get(cacheKey);
        if (cachedQuiz) {
            logger.info(`Using cached quiz for topic: ${topic}`);
            return cachedQuiz;
        }

        // Create prompt for AI
        const prompt = this._createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language);

        try {
            // Select model and set parameters
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite-preview-06-17", // Use latest available model
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 64000,
                },
            });

            // Set timeout for request
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AI generation timed out')), 30000); // 30 seconds timeout
            });

            // Request generation
            const generationPromise = model.generateContent(prompt);
            const result = await Promise.race([generationPromise, timeoutPromise]);
            const responseText = result.response.text();

            // Parse response
            const quizData = this._parseResponse(responseText);

            // Validate response structure
            if (!quizData.questions || !Array.isArray(quizData.questions)) {
                throw new Error('Invalid quiz data structure from AI response');
            }

            // Cache the result
            const finalData = {
                topic,
                questionType,
                studentLevel,
                language,
                questions: quizData.questions
            };

            cacheService.set(cacheKey, finalData, 3600); // Cache for 1 hour

            return finalData;

        } catch (error) {
            logger.error('Error generating quiz with AI:', error);
            throw error;
        }
    }

    /**
     * Create a cache key for a set of generation parameters
     * @param {Object} params - Generation parameters
     * @returns {string} Cache key
     * @private
     */
    _generateCacheKey(params) {
        const { topic, questionType, numberOfQuestions, studentLevel, language } = params;
        return `quiz_gen:${topic}:${questionType}:${numberOfQuestions}:${studentLevel || 'any'}:${language || 'english'}`;
    }

    /**
     * Create prompt for AI model
     * @param {string} topic - Quiz topic
     * @param {string} questionType - Type of questions
     * @param {number} numberOfQuestions - Number of questions to generate
     * @param {string} [additionalInstructions] - Additional generation instructions
     * @param {string} [studentLevel] - Target student level
     * @param {string} [language] - Language for quiz
     * @returns {string} Prompt for AI
     * @private
     */
    _createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language) {
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

    /**
     * Parse response from AI model
     * @param {string} responseText - Response text from AI
     * @returns {Object} Parsed quiz data
     * @private
     */
    _parseResponse(responseText) {
        try {
            // Handle different response formats
            if (responseText.includes('```json') && responseText.includes('```')) {
                // JSON in code block with language tag
                const jsonString = responseText.split('```json')[1].split('```')[0].trim();
                return JSON.parse(jsonString);
            } else if (responseText.includes('```') && responseText.includes('```')) {
                // JSON in generic code block
                const jsonString = responseText.split('```')[1].split('```')[0].trim();
                return JSON.parse(jsonString);
            } else {
                // Plain JSON
                return JSON.parse(responseText);
            }
        } catch (error) {
            logger.error('Error parsing AI response:', error);

            // Try a more lenient approach
            try {
                // Find anything that looks like JSON
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (innerError) {
                // If still fails, throw original error
                throw error;
            }

            // If all attempts fail
            throw error;
        }
    }
}

// Create a singleton instance
const aiService = new AIService();

export default aiService;