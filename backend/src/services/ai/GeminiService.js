// backend/src/services/ai/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';
import { AIServiceError } from '../../errors/CustomErrors.js';

/**
 * Gemini AI Service
 * จัดการการเชื่อมต่อและการใช้งาน Google Gemini AI
 */
export class GeminiService {
    constructor() {
        // Initialize Gemini AI
        this.apiKey = process.env.GEMINI_API_KEY;
        this.modelName = process.env.GEMINI_MODEL || 'gemini-pro';

        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });

        // Configuration
        this.config = {
            maxRetries: 3,
            timeoutMs: 60000, // 60 seconds
            maxTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        // Rate limiting
        this.requestCount = 0;
        this.lastResetTime = Date.now();
        this.rateLimit = {
            requestsPerMinute: 20,
            requestsPerHour: 300
        };

        // Request queue for handling rate limits
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Generate quiz content using Gemini AI
     * @param {string} prompt - The prompt for quiz generation
     * @returns {string} Generated quiz content
     */
    async generateQuiz(prompt) {
        const startTime = Date.now();

        try {
            // Validate prompt
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new AIServiceError('Invalid prompt provided');
            }

            if (prompt.length > 10000) {
                throw new AIServiceError('Prompt too long. Maximum 10,000 characters allowed.');
            }

            // Check rate limits
            await this.checkRateLimit();

            // Prepare generation config
            const generationConfig = {
                temperature: this.config.temperature,
                topP: this.config.topP,
                topK: this.config.topK,
                maxOutputTokens: this.config.maxTokens,
            };

            // Log request
            logger.logAI('quiz_generation_request', this.modelName, prompt, null);

            // Generate content
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig,
                safetySettings: this.config.safetySettings
            });

            const response = await result.response;
            const generatedText = response.text();

            // Validate response
            if (!generatedText || generatedText.trim().length === 0) {
                throw new AIServiceError('Empty response from AI service');
            }

            // Check for safety blocks
            if (response.promptFeedback?.blockReason) {
                throw new AIServiceError(`Content blocked: ${response.promptFeedback.blockReason}`);
            }

            const duration = Date.now() - startTime;

            // Log successful response
            logger.logAI('quiz_generation_success', this.modelName, prompt, generatedText, duration);

            // Update request count
            this.incrementRequestCount();

            return generatedText;

        } catch (error) {
            const duration = Date.now() - startTime;

            // Log error
            logger.logAI('quiz_generation_error', this.modelName, prompt, null, duration);
            logger.error('Gemini AI generation error:', {
                error: error.message,
                promptLength: prompt ? prompt.length : 0,
                duration
            });

            // Handle specific errors
            if (error.message.includes('quota')) {
                throw new AIServiceError('AI service quota exceeded. Please try again later.', error);
            }

            if (error.message.includes('safety')) {
                throw new AIServiceError('Content blocked by safety filters. Please modify your input.', error);
            }

            if (error.message.includes('timeout')) {
                throw new AIServiceError('AI service timeout. Please try again.', error);
            }

            // Generic AI service error
            if (error instanceof AIServiceError) {
                throw error;
            }

            throw new AIServiceError(`AI service error: ${error.message}`, error);
        }
    }

    /**
     * Generate questions based on existing content
     * @param {string} content - Content to base questions on
     * @param {Object} options - Generation options
     * @returns {string} Generated questions
     */
    async generateQuestions(content, options = {}) {
        const {
            questionType = 'multiple_choice',
            numberOfQuestions = 5,
            difficulty = 'medium',
            language = 'th'
        } = options;

        const prompt = this.buildQuestionPrompt(content, {
            questionType,
            numberOfQuestions,
            difficulty,
            language
        });

        return await this.generateQuiz(prompt);
    }

    /**
     * Improve existing questions
     * @param {Array} questions - Existing questions
     * @param {Object} options - Improvement options
     * @returns {string} Improved questions
     */
    async improveQuestions(questions, options = {}) {
        const {
            improvementType = 'clarity',
            language = 'th'
        } = options;

        const prompt = this.buildImprovementPrompt(questions, {
            improvementType,
            language
        });

        return await this.generateQuiz(prompt);
    }

    /**
     * Generate quiz rubric/answer key
     * @param {Array} questions - Quiz questions
     * @param {Object} options - Rubric options
     * @returns {string} Generated rubric
     */
    async generateRubric(questions, options = {}) {
        const { language = 'th', includeExplanations = true } = options;

        const prompt = this.buildRubricPrompt(questions, {
            language,
            includeExplanations
        });

        return await this.generateQuiz(prompt);
    }

    /**
     * Check AI service health
     * @returns {Object} Health status
     */
    async healthCheck() {
        try {
            const startTime = Date.now();

            // Simple test prompt
            const testPrompt = "Please respond with exactly: 'Health check successful'";

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 20
                }
            });

            const response = await result.response;
            const responseText = response.text();
            const responseTime = Date.now() - startTime;

            const isHealthy = responseText.includes('Health check successful');

            return {
                status: isHealthy ? 'healthy' : 'degraded',
                responseTime: `${responseTime}ms`,
                model: this.modelName,
                apiVersion: 'v1',
                rateLimit: {
                    requestsPerMinute: this.rateLimit.requestsPerMinute,
                    currentCount: this.requestCount
                },
                lastChecked: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Gemini health check failed:', error);

            return {
                status: 'unhealthy',
                error: error.message,
                model: this.modelName,
                lastChecked: new Date().toISOString()
            };
        }
    }

    /**
     * Get model information
     * @returns {Object} Model information
     */
    getModelInfo() {
        return {
            name: this.modelName,
            provider: 'Google',
            version: 'v1',
            capabilities: [
                'text_generation',
                'quiz_creation',
                'content_analysis',
                'multilingual_support'
            ],
            limits: {
                maxTokens: this.config.maxTokens,
                maxPromptLength: 10000
            }
        };
    }

    /**
     * Estimate token count for text
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokenCount(text) {
        if (!text) return 0;

        // Rough estimation: 1 token ≈ 4 characters for English, 1 token ≈ 2 characters for Thai
        const hasThaiChars = /[\u0E00-\u0E7F]/.test(text);
        const ratio = hasThaiChars ? 2 : 4;

        return Math.ceil(text.length / ratio);
    }

    /**
     * Check if request is within rate limits
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceReset = now - this.lastResetTime;

        // Reset counter every minute
        if (timeSinceReset >= 60000) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }

        // Check if we're over the rate limit
        if (this.requestCount >= this.rateLimit.requestsPerMinute) {
            const waitTime = 60000 - timeSinceReset;

            logger.warn('Rate limit reached, waiting...', {
                currentCount: this.requestCount,
                limit: this.rateLimit.requestsPerMinute,
                waitTime
            });

            // Wait until rate limit resets
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Reset after waiting
            this.requestCount = 0;
            this.lastResetTime = Date.now();
        }
    }

    /**
     * Increment request count
     */
    incrementRequestCount() {
        this.requestCount++;
    }

    /**
     * Build prompt for quiz generation
     * @param {string} content - Base content
     * @param {Object} options - Generation options
     * @returns {string} Generated prompt
     */
    buildQuestionPrompt(content, options) {
        const {
            questionType,
            numberOfQuestions,
            difficulty,
            language
        } = options;

        const languageInstructions = language === 'th'
            ? 'โปรดตอบเป็นภาษาไทย'
            : 'Please respond in English';

        const typeInstructions = {
            multiple_choice: language === 'th'
                ? 'สร้างคำถามแบบเลือกตอบ 4 ตัวเลือก พร้อมระบุคำตอบที่ถูกต้อง'
                : 'Create multiple choice questions with 4 options and indicate the correct answer',
            true_false: language === 'th'
                ? 'สร้างคำถามแบบถูก/ผิด พร้อมระบุคำตอบที่ถูกต้อง'
                : 'Create true/false questions with correct answers',
            essay: language === 'th'
                ? 'สร้างคำถามแบบเรียงความ พร้อมแนวทางการตอบ'
                : 'Create essay questions with answer guidelines',
            short_answer: language === 'th'
                ? 'สร้างคำถามแบบตอบสั้น พร้อมคำตอบที่เป็นไปได้'
                : 'Create short answer questions with possible answers'
        };

        const difficultyInstructions = {
            easy: language === 'th' ? 'ระดับง่าย' : 'Easy level',
            medium: language === 'th' ? 'ระดับปานกลาง' : 'Medium level',
            hard: language === 'th' ? 'ระดับยาก' : 'Hard level'
        };

        return `
${languageInstructions}

สร้างข้อสอบจากเนื้อหาต่อไปนี้:
${content}

ข้อกำหนด:
- จำนวนคำถาม: ${numberOfQuestions} ข้อ
- ประเภทคำถาม: ${typeInstructions[questionType]}
- ระดับความยาก: ${difficultyInstructions[difficulty]}

โปรดส่งคืนข้อมูลในรูปแบบ JSON ดังนี้:
{
  "title": "ชื่อข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "type": "${questionType}",
      ${questionType === 'multiple_choice' ? '"options": ["ตัวเลือก1", "ตัวเลือก2", "ตัวเลือก3", "ตัวเลือก4"],' : ''}
      "correctAnswer": ${questionType === 'multiple_choice' ? '0' : questionType === 'true_false' ? 'true' : '"ตัวอย่างคำตอบ"'}
    }
  ]
}

กรุณาตรวจสอบให้แน่ใจว่า JSON ถูกต้องและสามารถ parse ได้`;
    }

    /**
     * Build prompt for question improvement
     * @param {Array} questions - Questions to improve
     * @param {Object} options - Improvement options
     * @returns {string} Generated prompt
     */
    buildImprovementPrompt(questions, options) {
        const { improvementType, language } = options;

        const languageInstructions = language === 'th'
            ? 'โปรดตอบเป็นภาษาไทย'
            : 'Please respond in English';

        const improvementInstructions = {
            clarity: language === 'th'
                ? 'ปรับปรุงความชัดเจนของคำถาม'
                : 'Improve question clarity',
            difficulty: language === 'th'
                ? 'ปรับระดับความยากของคำถาม'
                : 'Adjust question difficulty',
            grammar: language === 'th'
                ? 'แก้ไขไวยากรณ์และการใช้ภาษา'
                : 'Fix grammar and language usage'
        };

        return `
${languageInstructions}

กรุณา${improvementInstructions[improvementType]}สำหรับคำถามต่อไปนี้:

${JSON.stringify(questions, null, 2)}

โปรดส่งคืนคำถามที่ปรับปรุงแล้วในรูปแบบ JSON เดิม`;
    }

    /**
     * Build prompt for rubric generation
     * @param {Array} questions - Quiz questions
     * @param {Object} options - Rubric options
     * @returns {string} Generated prompt
     */
    buildRubricPrompt(questions, options) {
        const { language, includeExplanations } = options;

        const languageInstructions = language === 'th'
            ? 'โปรดตอบเป็นภาษาไทย'
            : 'Please respond in English';

        const explanationNote = includeExplanations
            ? (language === 'th' ? 'พร้อมคำอธิบาย' : 'with explanations')
            : (language === 'th' ? 'โดยไม่ต้องมีคำอธิบาย' : 'without explanations');

        return `
${languageInstructions}

สร้างเฉลยข้อสอบ ${explanationNote} สำหรับคำถามต่อไปนี้:

${JSON.stringify(questions, null, 2)}

โปรดส่งคืนในรูปแบบ JSON:
{
  "rubric": [
    {
      "questionNumber": 1,
      "correctAnswer": "คำตอบที่ถูกต้อง",
      ${includeExplanations ? '"explanation": "คำอธิบาย",' : ''}
      "points": 1
    }
  ],
  "totalPoints": จำนวนคะแนนรวม
}`;
    }

    /**
     * Validate AI response format
     * @param {string} response - AI response
     * @returns {Object} Validation result
     */
    validateResponse(response) {
        try {
            const parsed = JSON.parse(response);

            // Basic structure validation
            if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
                return {
                    isValid: false,
                    error: 'Invalid response structure'
                };
            }

            // Validate each question
            for (let i = 0; i < parsed.questions.length; i++) {
                const question = parsed.questions[i];

                if (!question.question || !question.type) {
                    return {
                        isValid: false,
                        error: `Invalid question structure at index ${i}`
                    };
                }

                if (question.type === 'multiple_choice' && (!question.options || !Array.isArray(question.options))) {
                    return {
                        isValid: false,
                        error: `Multiple choice question missing options at index ${i}`
                    };
                }
            }

            return {
                isValid: true,
                data: parsed
            };

        } catch (error) {
            return {
                isValid: false,
                error: 'Invalid JSON format'
            };
        }
    }

    /**
     * Clean up and format AI response
     * @param {string} response - Raw AI response
     * @returns {string} Cleaned response
     */
    cleanResponse(response) {
        if (!response) return '';

        // Remove code block markers
        let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Remove any leading/trailing whitespace
        cleaned = cleaned.trim();

        // Try to extract JSON if it's embedded in other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return cleaned;
    }

    /**
     * Get usage statistics
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        return {
            requestCount: this.requestCount,
            rateLimit: this.rateLimit,
            lastResetTime: this.lastResetTime,
            model: this.modelName,
            uptime: Date.now() - this.lastResetTime
        };
    }
}

export default GeminiService;