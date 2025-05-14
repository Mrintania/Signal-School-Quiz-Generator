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
                model: "gemini-2.0-flash", // Use latest available model
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 8192,
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

    /**
 * Generate a quiz based on document content
 * @param {Object} params - พารามิเตอร์สำหรับการสร้าง
 * @param {string} params.fileBase64 - เนื้อหาไฟล์ในรูปแบบ Base64
 * @param {string} params.mimeType - ประเภท MIME ของไฟล์
 * @param {string} params.topic - หัวข้อข้อสอบ
 * @param {string} params.questionType - ประเภทของคำถาม
 * @param {number} params.numberOfQuestions - จำนวนคำถาม
 * @param {string} [params.additionalInstructions] - คำสั่งเพิ่มเติม
 * @param {string} [params.studentLevel] - ระดับของนักเรียน
 * @param {string} [params.language] - ภาษาสำหรับข้อสอบ ('thai' หรือ 'english')
 * @returns {Promise<Object>} ข้อมูลข้อสอบที่สร้าง
 */
    async generateQuizFromDocument(params) {
        // ตรวจสอบว่าบริการ AI พร้อมใช้งานหรือไม่
        if (!this.isAvailable()) {
            logger.error('AI service not available for document processing');
            throw new Error('AI service is currently unavailable');
        }

        const {
            fileBase64,
            mimeType,
            topic,
            questionType,
            numberOfQuestions,
            additionalInstructions,
            studentLevel,
            language
        } = params;

        logger.info(`Starting document processing for quiz generation: ${mimeType}, topic: ${topic}`);

        // สร้างคำสั่งสำหรับ AI ที่รวมคำแนะนำในการดึงเนื้อหาจากเอกสาร
        const prompt = this._createDocumentPrompt(
            topic,
            questionType,
            numberOfQuestions,
            additionalInstructions,
            studentLevel,
            language
        );

        try {
            // เลือกโมเดลและตั้งค่าพารามิเตอร์
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash", // ใช้โมเดลล่าสุดที่มี
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 8192,
                },
            });

            // สร้างส่วนไฟล์สำหรับเอกสาร
            // นี่จะส่งเอกสารไปยัง Gemini โดยตรงโดยไม่ต้องทำ OCR ที่ฝั่งเรา
            const filePart = {
                inlineData: {
                    data: fileBase64,
                    mimeType: mimeType
                }
            };

            // สร้างส่วนข้อความสำหรับคำสั่ง
            const textPart = {
                text: prompt
            };

            logger.debug('Sending document to Gemini API with prompt:', { prompt });

            // ตั้งเวลาหมดเวลาสำหรับคำขอ (90 วินาทีสำหรับการประมวลผลเอกสาร)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AI generation timed out')), 90000);
            });

            // ส่งคำขอการสร้างพร้อมทั้งเอกสารและคำสั่ง
            logger.info('Calling Gemini API to process document...');
            const generationPromise = model.generateContent([filePart, textPart]);
            const result = await Promise.race([generationPromise, timeoutPromise]);
            const responseText = result.response.text();

            logger.info('Received response from Gemini API, parsing response...');

            // แยกวิเคราะห์การตอบสนอง
            const quizData = this._parseResponse(responseText);

            // ตรวจสอบโครงสร้างการตอบสนอง
            if (!quizData.questions || !Array.isArray(quizData.questions)) {
                logger.error('Invalid quiz data structure from AI response:', responseText.substring(0, 500));
                throw new Error('Invalid quiz data structure from AI response');
            }

            logger.info(`Successfully generated ${quizData.questions.length} questions from document`);

            // ส่งคืนข้อมูลสุดท้าย
            return {
                topic,
                questionType,
                studentLevel,
                language,
                questions: quizData.questions
            };

        } catch (error) {
            logger.error('Error generating quiz from document with AI:', error);

            // เพิ่มข้อมูลเพิ่มเติมเกี่ยวกับข้อผิดพลาด
            if (error.message === 'AI generation timed out') {
                logger.error('Document processing timed out (90 seconds limit)');
            } else if (error.message.includes('Invalid quiz data structure')) {
                logger.error('Gemini API returned invalid format for quiz data');
            } else {
                logger.error(`Gemini API error: ${error.message}`);
            }

            throw error;
        }
    }

    /**
     * สร้างคำสั่งสำหรับการสร้างข้อสอบจากเอกสาร
     * @param {string} topic - หัวข้อข้อสอบ
     * @param {string} questionType - ประเภทของคำถาม
     * @param {number} numberOfQuestions - จำนวนคำถาม
     * @param {string} [additionalInstructions] - คำสั่งเพิ่มเติม
     * @param {string} [studentLevel] - ระดับของนักเรียน
     * @param {string} [language] - ภาษาสำหรับข้อสอบ
     * @returns {string} คำสั่งสำหรับ AI
     * @private
     */
    _createDocumentPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language) {
        // กำหนดภาษาสำหรับข้อสอบ
        const languagePrompt = language === 'thai'
            ? "สร้างข้อสอบเป็นภาษาไทย"
            : "Create the quiz in English language.";

        let prompt = `ฉันได้อัปโหลดเอกสาร โปรดวิเคราะห์เนื้อหาและสร้างข้อสอบประเภท ${questionType} จำนวน ${numberOfQuestions} ข้อ จากเนื้อหาในเอกสาร ${languagePrompt}`;

        if (topic) {
            prompt += ` ข้อสอบเกี่ยวกับ "${topic}"`;
        }

        if (studentLevel) {
            prompt += ` ข้อสอบนี้เหมาะสำหรับนักเรียนระดับ ${studentLevel}`;
        }

        // เพิ่มคำสั่งเพิ่มเติม
        if (additionalInstructions) {
            prompt += ` คำสั่งเพิ่มเติม: ${additionalInstructions}`;
        }

        // เพิ่มคำแนะนำรูปแบบตามประเภทคำถาม
        if (questionType === 'Multiple Choice') {
            prompt += ` สำหรับแต่ละคำถาม โปรดระบุ 4 ตัวเลือก (A, B, C, D) ระบุคำตอบที่ถูกต้อง และแนบคำอธิบายสั้นๆ ว่าทำไมคำตอบนี้จึงถูกต้อง`;
            prompt += ` ส่งคืนข้อสอบในรูปแบบ JSON ดังนี้เท่านั้น (ไม่รวมข้อความหรือคำอธิบายอื่นๆ นอก JSON):
{
  "questions": [
    {
      "questionText": "คำถามตรงนี้",
      "options": [
        { "text": "ตัวเลือก A", "isCorrect": false },
        { "text": "ตัวเลือก B", "isCorrect": true },
        { "text": "ตัวเลือก C", "isCorrect": false },
        { "text": "ตัวเลือก D", "isCorrect": false }
      ],
      "explanation": "คำอธิบายของคำตอบที่ถูกต้อง"
    }
  ]
}`;
        } else if (questionType === 'Essay') {
            prompt += ` สำหรับแต่ละคำถาม โปรดให้แนวทางสั้นๆ ว่าคำตอบที่ดีควรรวมอะไรบ้าง`;
            prompt += ` ส่งคืนข้อสอบในรูปแบบ JSON ดังนี้เท่านั้น (ไม่รวมข้อความหรือคำอธิบายอื่นๆ นอก JSON):
{
  "questions": [
    {
      "questionText": "คำถามตรงนี้",
      "explanation": "แนวทางสำหรับคำตอบที่ดี"
    }
  ]
}`;
        }

        return prompt;
    }
}

// Create a singleton instance
const aiService = new AIService();

export default aiService;