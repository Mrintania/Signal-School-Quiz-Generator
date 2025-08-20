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
                model: "gemini-2.5-flash", // Use latest available model
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 65536,
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
        console.log('Creating prompt with language:', language);

        // ✅ Debug เพิ่มเติม
        console.log('Language type:', typeof language);
        console.log('Language value:', JSON.stringify(language));

        // ✅ แก้ไขการตรวจสอบภาษา - รองรับทั้ง Thai และ thai
        const isThaiLanguage = language && (
            language.toLowerCase() === 'thai' ||
            language.toLowerCase() === 'ไทย' ||
            language === 'Thai' ||
            language === 'thai'
        );

        console.log('Is Thai Language?', isThaiLanguage);

        let prompt = '';

        if (isThaiLanguage) {
            console.log('Using Thai prompt template');
            prompt = `สร้างข้อสอบภาษาไทยเรื่อง "${topic}"

**สำคัญที่สุด: ข้อสอบทั้งหมดต้องเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษเด็ดขาด**

รายละเอียดการสร้างข้อสอบ:
- หัวข้อ: ${topic}
- จำนวนข้อ: ${numberOfQuestions} ข้อ
- ประเภทคำถาม: ${questionType}
- ทุกอย่างต้องเป็นภาषาไทย: คำถาม, ตัวเลือก, คำอธิบาย

ตัวอย่างรูปแบบที่ต้องการ:
{
  "questions": [
    {
      "questionText": "การรักษาความปลอดภัยไซเบอร์มีวัตถุประสงค์หลักอะไร?",
      "options": [
        {"text": "เพื่อเพิ่มความเร็วในการใช้อินเทอร์เน็ต", "isCorrect": false},
        {"text": "เพื่อปกป้องระบบคอมพิวเตอร์และข้อมูลจากภัยคุกคาม", "isCorrect": true},
        {"text": "เพื่อพัฒนาแอปพลิเคชันใหม่ๆ", "isCorrect": false},
        {"text": "เพื่อสร้างเกมออนไลน์", "isCorrect": false}
      ],
      "explanation": "การรักษาความปลอดภัยไซเบอร์มีจุดประสงค์หลักในการปกป้องระบบคอมพิวเตอร์ เครือข่าย และข้อมูลจากการถูกโจมตี การเข้าถึงโดยไม่ได้รับอนุญาต หรือความเสียหายต่างๆ"
    }
  ]
}

กรุณาสร้างข้อสอบ ${numberOfQuestions} ข้อตามรูปแบบข้างต้น โดยใช้ภาษาไทยทั้งหมด`;
        } else {
            console.log('Using English prompt template');
            prompt = `Create an English quiz about "${topic}"

**IMPORTANT: All content must be in English only**

Details:
- Number of questions: ${numberOfQuestions}
- Type: ${questionType}
- All questions, options, and explanations must be in English

JSON Format:
{
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

        if (additionalInstructions) {
            if (isThaiLanguage) {
                prompt += `\n\nข้อกำหนดเพิ่มเติม: ${additionalInstructions}`;
            } else {
                prompt += `\n\nAdditional requirements: ${additionalInstructions}`;
            }
        }

        if (studentLevel) {
            if (isThaiLanguage) {
                prompt += `\n\nระดับนักเรียน: ${studentLevel}`;
            } else {
                prompt += `\n\nStudent level: ${studentLevel}`;
            }
        }

        console.log('Final prompt:', prompt);
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