// backend/src/services/ai/GeminiService.js
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import logger from '../../utils/common/Logger.js';
import { AIServiceError, ValidationError } from '../../errors/CustomErrors.js';

/**
 * Gemini AI Service
 * จัดการการเชื่อมต่อและใช้งาน Google Gemini AI
 * สำหรับสร้างข้อสอบและประมวลผลเนื้อหา
 */
export class GeminiService {
    constructor(config = {}) {
        // Configuration
        this.config = {
            apiKey: config.apiKey || process.env.GEMINI_API_KEY,
            model: config.model || 'gemini-1.5-flash',
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 2000,
            timeout: config.timeout || 60000,
            maxTokens: config.maxTokens || 8192,
            temperature: config.temperature || 0.7,
            topP: config.topP || 0.8,
            topK: config.topK || 40,
            ...config
        };

        // Validate API key
        if (!this.config.apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }

        // Initialize Gemini client
        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        this.model = null;
        this.isHealthy = false;

        // Initialize the service
        this.initialize();
    }

    /**
     * Initialize Gemini service
     */
    async initialize() {
        try {
            // Configure safety settings
            const safetySettings = [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            ];

            // Configure generation settings
            const generationConfig = {
                temperature: this.config.temperature,
                topP: this.config.topP,
                topK: this.config.topK,
                maxOutputTokens: this.config.maxTokens,
                responseMimeType: "text/plain",
            };

            // Initialize model
            this.model = this.genAI.getGenerativeModel({
                model: this.config.model,
                safetySettings,
                generationConfig
            });

            // Test connection
            await this.healthCheck();

            logger.aiService('gemini', 'initialized', {
                model: this.config.model,
                isHealthy: this.isHealthy
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'initialize',
                service: 'gemini'
            });
            throw new AIServiceError('Failed to initialize Gemini service: ' + error.message);
        }
    }

    /**
     * Generate content using Gemini AI
     */
    async generateContent(prompt, options = {}) {
        try {
            if (!this.model) {
                throw new AIServiceError('Gemini service not initialized');
            }

            const {
                maxRetries = this.config.maxRetries,
                timeout = this.config.timeout,
                temperature = this.config.temperature
            } = options;

            // Validate prompt
            this.validatePrompt(prompt);

            // Log generation request
            logger.aiService('gemini', 'generate-request', {
                promptLength: prompt.length,
                temperature,
                timeout
            });

            // Generate content with retry mechanism
            const result = await this.generateWithRetry(prompt, maxRetries, options);

            // Log success
            logger.aiService('gemini', 'generate-success', {
                responseLength: result.response.text().length,
                finishReason: result.response.candidates?.[0]?.finishReason
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'generateContent',
                service: 'gemini',
                promptLength: prompt?.length || 0
            });

            throw this.handleGeminiError(error);
        }
    }

    /**
     * Generate content with streaming
     */
    async generateContentStream(prompt, onChunk, options = {}) {
        try {
            if (!this.model) {
                throw new AIServiceError('Gemini service not initialized');
            }

            // Validate prompt
            this.validatePrompt(prompt);

            logger.aiService('gemini', 'stream-request', {
                promptLength: prompt.length
            });

            // Generate streaming content
            const result = await this.model.generateContentStream(prompt);

            let fullResponse = '';

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;

                // Call chunk handler
                if (onChunk) {
                    await onChunk(chunkText, fullResponse);
                }
            }

            logger.aiService('gemini', 'stream-success', {
                totalLength: fullResponse.length
            });

            return {
                response: {
                    text: () => fullResponse,
                    candidates: result.response?.candidates
                }
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'generateContentStream',
                service: 'gemini'
            });

            throw this.handleGeminiError(error);
        }
    }

    /**
     * Generate quiz from content
     */
    async generateQuiz(content, options = {}) {
        try {
            const {
                questionType = 'multiple_choice',
                questionCount = 10,
                difficulty = 'medium',
                subject = '',
                language = 'th',
                includeExplanations = false
            } = options;

            // Build quiz generation prompt
            const prompt = this.buildQuizPrompt(content, {
                questionType,
                questionCount,
                difficulty,
                subject,
                language,
                includeExplanations
            });

            // Generate content
            const result = await this.generateContent(prompt, options);

            // Parse and validate response
            const quizData = this.parseQuizResponse(result.response.text());

            return {
                quiz: quizData,
                metadata: {
                    model: this.config.model,
                    generatedAt: new Date().toISOString(),
                    prompt: {
                        questionType,
                        questionCount,
                        difficulty,
                        subject
                    }
                }
            };

        } catch (error) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Analyze content difficulty
     */
    async analyzeDifficulty(content) {
        try {
            const prompt = this.buildDifficultyAnalysisPrompt(content);

            const result = await this.generateContent(prompt);

            return this.parseDifficultyResponse(result.response.text());

        } catch (error) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Extract key concepts from content
     */
    async extractConcepts(content, maxConcepts = 10) {
        try {
            const prompt = `
วิเคราะห์เนื้อหาต่อไปนี้และสกัดแนวคิดหลักออกมา:

${content}

กรุณาระบุแนวคิดหลักสูงสุด ${maxConcepts} แนวคิด ในรูปแบบ JSON:
{
  "concepts": [
    {
      "name": "ชื่อแนวคิด",
      "description": "คำอธิบายสั้นๆ",
      "importance": "high|medium|low",
      "category": "หมวดหมู่"
    }
  ]
}
            `.trim();

            const result = await this.generateContent(prompt);

            return this.parseConceptsResponse(result.response.text());

        } catch (error) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Summarize content
     */
    async summarizeContent(content, maxLength = 200) {
        try {
            const prompt = `
สรุปเนื้อหาต่อไปนี้ให้สั้นและกระชับ ไม่เกิน ${maxLength} คำ:

${content}

กรุณาสรุปเป็นภาษาไทยที่เข้าใจง่าย เน้นจุดสำคัญหลักๆ
            `.trim();

            const result = await this.generateContent(prompt);

            return {
                summary: result.response.text().trim(),
                originalLength: content.length,
                summaryLength: result.response.text().trim().length
            };

        } catch (error) {
            throw this.handleGeminiError(error);
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const testPrompt = "สวัสดี กรุณาตอบว่า 'สวัสดี'";

            const startTime = Date.now();
            const result = await this.model.generateContent(testPrompt);
            const responseTime = Date.now() - startTime;

            const response = result.response.text();
            this.isHealthy = response.includes('สวัสดี');

            logger.aiService('gemini', 'health-check', {
                isHealthy: this.isHealthy,
                responseTime,
                response: response.substring(0, 50)
            });

            return {
                healthy: this.isHealthy,
                responseTime,
                model: this.config.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.isHealthy = false;

            logger.errorWithContext(error, {
                operation: 'healthCheck',
                service: 'gemini'
            });

            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get usage statistics
     */
    async getUsageStats() {
        // Note: This would typically integrate with Google Cloud's usage APIs
        return {
            model: this.config.model,
            isHealthy: this.isHealthy,
            config: {
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
                topP: this.config.topP,
                topK: this.config.topK
            },
            lastHealthCheck: new Date().toISOString()
        };
    }

    /**
     * Private helper methods
     */

    /**
     * Generate with retry mechanism
     */
    async generateWithRetry(prompt, maxRetries, options = {}) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.aiService('gemini', 'generate-attempt', { attempt, maxRetries });

                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
                });

                // Generate content with timeout
                const generatePromise = this.model.generateContent(prompt);
                const result = await Promise.race([generatePromise, timeoutPromise]);

                return result;

            } catch (error) {
                lastError = error;

                logger.aiService('gemini', 'generate-error', {
                    attempt,
                    error: error.message
                });

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    break;
                }

                // Wait before retry
                if (attempt < maxRetries) {
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Build quiz generation prompt
     */
    buildQuizPrompt(content, options) {
        const {
            questionType,
            questionCount,
            difficulty,
            subject,
            language,
            includeExplanations
        } = options;

        return `
คุณเป็นผู้เชี่ยวชาญในการสร้างข้อสอบ กรุณาสร้างข้อสอบจากเนื้อหาต่อไปนี้:

เนื้อหา:
${content}

ข้อกำหนด:
- ประเภทคำถาม: ${questionType}
- จำนวนข้อ: ${questionCount}
- ระดับความยาก: ${difficulty}
- วิชา: ${subject || 'ไม่ระบุ'}
- ภาษา: ${language}
${includeExplanations ? '- รวมคำอธิบายเฉลย' : ''}

กรุณาส่งคืนในรูปแบบ JSON ดังนี้:
{
  "title": "ชื่อข้อสอบ",
  "description": "คำอธิบายข้อสอบ",
  "questions": [
    {
      "question": "ข้อความคำถาม",
      "options": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
      "correct_answer": "คำตอบที่ถูกต้อง",
      "explanation": "${includeExplanations ? 'คำอธิบายเฉลย' : ''}"
    }
  ]
}

หมายเหตุ:
- คำถามต้องมีความเกี่ยวข้องกับเนื้อหาที่ให้มา
- ตัวเลือกต้องสมเหตุสมผลและมีความน่าเชื่อถือ
- คำตอบต้องถูกต้องและชัดเจน
- ใช้ภาษาไทยที่ถูกต้องและเหมาะสม
        `.trim();
    }

    /**
     * Build difficulty analysis prompt
     */
    buildDifficultyAnalysisPrompt(content) {
        return `
วิเคราะห์ระดับความยากของเนื้อหาต่อไปนี้:

${content}

กรุณาส่งคืนในรูปแบบ JSON:
{
  "difficulty_level": "easy|medium|hard|expert",
  "difficulty_score": 1-10,
  "factors": [
    "ปัจจัยที่ทำให้ยาก/ง่าย"
  ],
  "recommendations": [
    "คำแนะนำสำหรับการสอน"
  ],
  "target_audience": "กลุ่มเป้าหมายที่เหมาะสม"
}
        `.trim();
    }

    /**
     * Validate prompt input
     */
    validatePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            throw new ValidationError('Prompt must be a non-empty string');
        }

        if (prompt.length > 30000) {
            throw new ValidationError('Prompt is too long (max 30,000 characters)');
        }

        if (prompt.trim().length === 0) {
            throw new ValidationError('Prompt cannot be empty');
        }
    }

    /**
     * Parse quiz response from AI
     */
    parseQuizResponse(responseText) {
        try {
            // Clean the response
            const cleanedText = responseText
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const quizData = JSON.parse(cleanedText);

            // Validate quiz structure
            if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
                throw new Error('Invalid quiz structure');
            }

            // Validate each question
            quizData.questions.forEach((question, index) => {
                if (!question.question || !question.options || !question.correct_answer) {
                    throw new Error(`Invalid question structure at index ${index}`);
                }
            });

            return quizData;

        } catch (error) {
            throw new ValidationError('Failed to parse quiz response: ' + error.message);
        }
    }

    /**
     * Parse difficulty analysis response
     */
    parseDifficultyResponse(responseText) {
        try {
            const cleanedText = responseText
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const data = JSON.parse(cleanedText);

            return {
                level: data.difficulty_level || 'medium',
                score: data.difficulty_score || 5,
                factors: data.factors || [],
                recommendations: data.recommendations || [],
                targetAudience: data.target_audience || 'ไม่ระบุ'
            };

        } catch (error) {
            throw new ValidationError('Failed to parse difficulty response: ' + error.message);
        }
    }

    /**
     * Parse concepts extraction response
     */
    parseConceptsResponse(responseText) {
        try {
            const cleanedText = responseText
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const data = JSON.parse(cleanedText);

            return {
                concepts: data.concepts || [],
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new ValidationError('Failed to parse concepts response: ' + error.message);
        }
    }

    /**
     * Handle Gemini-specific errors
     */
    handleGeminiError(error) {
        if (error instanceof ValidationError || error instanceof AIServiceError) {
            return error;
        }

        // Map Gemini errors to custom errors
        if (error.message?.includes('API key')) {
            return new AIServiceError('Invalid or missing API key');
        }

        if (error.message?.includes('quota')) {
            return new AIServiceError('API quota exceeded');
        }

        if (error.message?.includes('timeout')) {
            return new AIServiceError('Request timeout');
        }

        if (error.message?.includes('safety')) {
            return new AIServiceError('Content blocked by safety filters');
        }

        return new AIServiceError('Gemini service error: ' + error.message);
    }

    /**
     * Check if error is non-retryable
     */
    isNonRetryableError(error) {
        const nonRetryableErrors = [
            'API key',
            'safety',
            'invalid request',
            'permission denied'
        ];

        return nonRetryableErrors.some(errorType =>
            error.message?.toLowerCase().includes(errorType)
        );
    }

    /**
     * Delay utility for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default GeminiService;