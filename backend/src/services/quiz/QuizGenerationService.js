// backend/src/services/quiz/QuizGenerationService.js
import { GeminiService } from '../ai/GeminiService.js';
import { FileService } from '../common/FileService.js';
import { CacheService } from '../common/CacheService.js';
import { QuizRepository } from '../../repositories/QuizRepository.js';
import { UserRepository } from '../../repositories/UserRepository.js';
import { PromptBuilder } from '../../utils/ai/PromptBuilder.js';
import { ResponseParser } from '../../utils/ai/ResponseParser.js';
import { QuizValidator } from '../../utils/quiz/QuizValidator.js';
import { QuizFormatter } from '../../utils/quiz/QuizFormatter.js';
import logger from '../../utils/logger.js';
import { ValidationError, AIServiceError, NotFoundError, BusinessLogicError } from '../../errors/CustomErrors.js';

/**
 * Quiz Generation Service
 * จัดการ business logic ของการสร้างข้อสอบ
 * ใช้ AI service, file processing, และ validation
 * แยกออกมาจาก controller เพื่อ separation of concerns
 */
export class QuizGenerationService {
    constructor(dependencies = {}) {
        // Inject dependencies (for DI Container)
        this.geminiService = dependencies.geminiService || new GeminiService();
        this.fileService = dependencies.fileService || new FileService();
        this.cacheService = dependencies.cacheService || new CacheService();
        this.quizRepository = dependencies.quizRepository || new QuizRepository();
        this.userRepository = dependencies.userRepository || new UserRepository();
        this.promptBuilder = dependencies.promptBuilder || new PromptBuilder();
        this.responseParser = dependencies.responseParser || new ResponseParser();
        this.quizValidator = dependencies.quizValidator || new QuizValidator();
        this.quizFormatter = dependencies.quizFormatter || new QuizFormatter();

        // Configuration
        this.config = {
            maxRetries: 3,
            retryDelay: 2000,
            maxContentLength: 15000,
            minContentLength: 10,
            defaultQuestionCount: 5,
            maxQuestionCount: 100,
            maxQuestionsPerQuiz: 100,
            supportedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            cacheExpiry: 3600, // 1 hour
            quotaResetHour: 0, // Reset at midnight
        };

        // Active generations tracking
        this.activeGenerations = new Map();
    }

    /**
     * สร้างข้อสอบจาก text input
     * @param {Object} params - Generation parameters
     * @returns {Object} Generated quiz
     */
    async generateFromText(params) {
        const generationId = this.generateId();
        const timer = logger.startTimer('quiz-generation-from-text');

        try {
            const {
                content,
                topic,
                questionType,
                numberOfQuestions,
                questionCount,
                difficulty,
                language,
                subject,
                userId,
                source = 'text',
                fileName = null,
                options = {}
            } = params;

            // Use numberOfQuestions for backward compatibility, fallback to questionCount
            const finalQuestionCount = numberOfQuestions || questionCount || this.config.defaultQuestionCount;

            // Track generation start
            this.activeGenerations.set(generationId, {
                userId,
                startTime: Date.now(),
                status: 'starting',
                params
            });

            // Validate input
            this.validateGenerationInput({
                ...params,
                content: content || topic,
                questionCount: finalQuestionCount
            });

            // Validate user exists and has quota
            await this.validateUserQuota(userId);

            // Check cache first
            const cacheKey = this.generateCacheKey('text', content || topic, questionType, finalQuestionCount);
            const cachedResult = await this.cacheService.get(cacheKey);
            
            if (cachedResult && !options.skipCache) {
                logger.logActivity('quiz_generation_cache_hit', { userId, cacheKey });
                this.activeGenerations.delete(generationId);
                return cachedResult;
            }

            // Update generation status
            this.updateGenerationStatus(generationId, 'building_prompt');

            // Log generation start
            logger.logActivity('quiz_generation_started', {
                generationId,
                userId,
                type: 'text',
                questionType,
                questionCount: finalQuestionCount,
                contentLength: (content || topic).length
            });

            // Build AI prompt
            const prompt = await this.buildPrompt({
                content: content || topic,
                questionType,
                numberOfQuestions: finalQuestionCount,
                difficulty,
                language,
                subject
            });

            // Update generation status
            this.updateGenerationStatus(generationId, 'generating');

            // Generate quiz using AI with retry logic
            const aiResponse = await this.generateWithRetry(prompt, generationId, userId);

            // Update generation status
            this.updateGenerationStatus(generationId, 'parsing');

            // Process and validate response
            const processedQuiz = await this.processAIResponse(aiResponse, {
                questionType,
                questionCount: finalQuestionCount,
                userId,
                generationId,
                source,
                fileName
            });

            // Cache result
            await this.cacheService.set(cacheKey, processedQuiz, this.config.cacheExpiry);

            // Update generation status
            this.updateGenerationStatus(generationId, 'completed');

            // Log generation success
            logger.logActivity('quiz_generated', {
                generationId,
                userId,
                title: processedQuiz.title,
                questionCount: processedQuiz.questions.length,
                questionType,
                source,
                duration: Date.now() - this.activeGenerations.get(generationId).startTime
            });

            // Update user's generation count
            await this.incrementUserGenerationCount(userId);

            // Remove from active generations
            this.activeGenerations.delete(generationId);

            return processedQuiz;

        } catch (error) {
            // Update generation status to failed
            if (this.activeGenerations.has(generationId)) {
                this.updateGenerationStatus(generationId, 'failed', error.message);
            }

            logger.error('Quiz generation failed:', {
                generationId,
                error: error.message,
                userId: params.userId,
                duration: this.activeGenerations.get(generationId)?.startTime ?
                    Date.now() - this.activeGenerations.get(generationId).startTime : 0
            });

            // Clean up
            this.activeGenerations.delete(generationId);

            if (error instanceof AIServiceError || error instanceof ValidationError) {
                throw error;
            }

            throw new BusinessLogicError(`Quiz generation failed: ${error.message}`);
        }
    }

    /**
     * สร้างข้อสอบจากไฟล์
     * @param {Object} params - Generation parameters with file
     * @returns {Object} Generated quiz
     */
    async generateFromFile(params) {
        const generationId = this.generateId();
        const timer = logger.startTimer('quiz-generation-from-file');
        let extractedContent = null;

        try {
            const { 
                file, 
                questionType, 
                questionCount, 
                numberOfQuestions,
                difficulty,
                subject,
                language,
                userId,
                options = {}
            } = params;

            // Use numberOfQuestions for backward compatibility, fallback to questionCount
            const finalQuestionCount = numberOfQuestions || questionCount || this.config.defaultQuestionCount;

            // Track generation start
            this.activeGenerations.set(generationId, {
                userId,
                startTime: Date.now(),
                status: 'file_processing',
                params: {
                    ...params,
                    fileName: file.originalname
                }
            });

            // Validate file
            this.validateFileInput(file);

            // Validate user quota
            await this.validateUserQuota(userId);

            // Log file processing start
            logger.logActivity('file_processing_started', {
                generationId,
                userId,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            });

            // Extract content from file
            this.updateGenerationStatus(generationId, 'extracting_content');
            extractedContent = await this.fileService.extractText(file);
            
            if (!extractedContent || extractedContent.trim().length === 0) {
                throw new ValidationError('ไม่สามารถแยกข้อความจากไฟล์ได้');
            }

            // Log content extraction success
            logger.logActivity('content_extracted', {
                generationId,
                userId,
                contentLength: extractedContent.length
            });

            // Generate quiz from extracted content
            this.updateGenerationStatus(generationId, 'generating_from_content');
            const quiz = await this.generateFromText({
                content: extractedContent,
                questionType,
                questionCount: finalQuestionCount,
                difficulty,
                subject,
                language,
                userId,
                source: 'file',
                fileName: file.originalname,
                options: {
                    ...options,
                    skipCache: true // Skip cache for file uploads to ensure fresh generation
                }
            });

            // Add file metadata to quiz
            quiz.sourceFile = {
                name: file.originalname,
                size: file.size,
                type: file.mimetype,
                extractedAt: new Date().toISOString(),
                contentLength: extractedContent.length
            };

            this.updateGenerationStatus(generationId, 'completed');

            logger.logActivity('file_generation_completed', {
                generationId,
                userId,
                fileName: file.originalname,
                questionCount: quiz.questions.length,
                duration: Date.now() - this.activeGenerations.get(generationId).startTime
            });

            this.activeGenerations.delete(generationId);
            return quiz;

        } catch (error) {
            if (this.activeGenerations.has(generationId)) {
                this.updateGenerationStatus(generationId, 'failed', error.message);
            }

            logger.error('File generation failed:', {
                generationId,
                error: error.message,
                userId: params.userId,
                fileName: params.file?.originalname
            });

            this.activeGenerations.delete(generationId);

            if (error instanceof ValidationError || error instanceof AIServiceError) {
                throw error;
            }

            throw new BusinessLogicError(`File quiz generation failed: ${error.message}`);
        }
    }

    /**
     * สร้างคำถามเพิ่มเติมสำหรับข้อสอบที่มีอยู่
     * @param {string} quizId - Quiz ID
     * @param {Object} params - Additional generation parameters
     * @returns {Array} New questions
     */
    async generateAdditionalQuestions(quizId, params) {
        const generationId = this.generateId();

        try {
            const { questionCount, numberOfQuestions, userId } = params;
            const finalQuestionCount = numberOfQuestions || questionCount || this.config.defaultQuestionCount;

            // Track generation
            this.activeGenerations.set(generationId, {
                type: 'additional_questions',
                quizId,
                userId,
                startTime: Date.now(),
                status: 'starting'
            });

            // Get existing quiz
            const existingQuiz = await this.quizRepository.findById(quizId);
            if (!existingQuiz || existingQuiz.deleted_at) {
                throw new NotFoundError('Quiz');
            }

            // Check permission
            const hasPermission = await this.checkQuizPermission(quizId, userId);
            if (!hasPermission) {
                throw new ValidationError('ไม่มีสิทธิ์แก้ไขข้อสอบนี้');
            }

            // Validate user quota
            await this.validateUserQuota(userId);

            this.updateGenerationStatus(generationId, 'building_prompt');

            // Generate new questions based on existing content
            const prompt = await this.promptBuilder.buildAdditionalQuestionsPrompt({
                existingQuestions: JSON.parse(existingQuiz.questions || '[]'),
                questionType: existingQuiz.question_type,
                questionCount: finalQuestionCount,
                topic: existingQuiz.title,
                difficulty: existingQuiz.difficulty
            });

            this.updateGenerationStatus(generationId, 'generating');
            const aiResponse = await this.generateWithRetry(prompt, generationId, userId);

            this.updateGenerationStatus(generationId, 'processing');
            const newQuestions = await this.processAdditionalQuestions(aiResponse, {
                existingQuestions: JSON.parse(existingQuiz.questions || '[]'),
                questionType: existingQuiz.question_type
            });

            this.updateGenerationStatus(generationId, 'completed');

            logger.logActivity('additional_questions_generated', {
                generationId,
                userId,
                quizId,
                newQuestionCount: newQuestions.length
            });

            this.activeGenerations.delete(generationId);
            return newQuestions;

        } catch (error) {
            if (this.activeGenerations.has(generationId)) {
                this.updateGenerationStatus(generationId, 'failed', error.message);
            }

            logger.error('Additional questions generation failed:', {
                generationId,
                quizId,
                error: error.message,
                userId: params.userId
            });

            this.activeGenerations.delete(generationId);

            if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AIServiceError) {
                throw error;
            }

            throw new BusinessLogicError(`Additional questions generation failed: ${error.message}`);
        }
    }

    /**
     * ประเมินความยากของเนื้อหา
     * @param {string} content - Content to analyze
     * @returns {Object} Difficulty analysis
     */
    async analyzeDifficulty(content) {
        try {
            const prompt = this.promptBuilder.buildDifficultyAnalysisPrompt(content);
            const response = await this.geminiService.generateContent(prompt);
            
            return this.parseDifficultyResponse(response);
        } catch (error) {
            logger.error('Failed to analyze difficulty:', error.message);
            throw new AIServiceError('ไม่สามารถวิเคราะห์ความยากได้');
        }
    }

    /**
     * ตรวจสอบคุณภาพของข้อสอบ
     * @param {Object} quiz - Quiz to validate
     * @returns {Object} Quality report
     */
    async validateQuizQuality(quiz) {
        try {
            const validationResult = await this.quizValidator.validateQuiz(quiz);
            
            if (!validationResult.isValid) {
                throw new ValidationError('ข้อสอบไม่ผ่านการตรวจสอบคุณภาพ', validationResult.errors);
            }

            return validationResult;
        } catch (error) {
            logger.error('Quiz quality validation failed:', error.message);
            throw error;
        }
    }

    /**
     * สร้างคำถามใหม่สำหรับข้อสอบที่มีอยู่ (regenerate existing questions)
     * @param {string} quizId - Quiz ID
     * @param {Array} questionIndices - Indices of questions to regenerate
     * @param {Object} params - Generation parameters
     * @returns {Object} Updated quiz
     */
    async regenerateQuestions(quizId, questionIndices, params) {
        const regenerationId = this.generateId();

        try {
            // Get existing quiz
            const existingQuiz = await this.quizRepository.findById(quizId);
            if (!existingQuiz || existingQuiz.deleted_at) {
                throw new NotFoundError('Quiz');
            }

            // Check permission
            const hasPermission = await this.checkQuizPermission(quizId, params.userId);
            if (!hasPermission) {
                throw new ValidationError('No permission to modify this quiz');
            }

            const questions = JSON.parse(existingQuiz.questions || '[]');

            // Validate question indices
            if (!this.validateQuestionIndices(questionIndices, questions.length)) {
                throw new ValidationError('Invalid question indices');
            }

            // Track regeneration
            this.activeGenerations.set(regenerationId, {
                type: 'regeneration',
                quizId,
                userId: params.userId,
                startTime: Date.now(),
                status: 'starting'
            });

            // Get questions to regenerate
            const questionsToRegenerate = questionIndices.map(index => questions[index]);

            // Build regeneration prompt
            this.updateGenerationStatus(regenerationId, 'building_prompt');
            const prompt = await this.buildRegenerationPrompt(existingQuiz, questionsToRegenerate, params);

            // Generate new questions
            this.updateGenerationStatus(regenerationId, 'generating');
            const aiResponse = await this.generateWithRetry(prompt, regenerationId);

            this.updateGenerationStatus(regenerationId, 'parsing');
            const newQuestions = await this.responseParser.parseQuestionsResponse(aiResponse);

            // Validate new questions
            for (const question of newQuestions) {
                const validation = this.quizValidator.validateQuestion(question);
                if (!validation.isValid) {
                    throw new ValidationError(`Generated question validation failed: ${validation.errors.join(', ')}`);
                }
            }

            // Replace questions in quiz
            this.updateGenerationStatus(regenerationId, 'updating');
            const updatedQuestions = [...questions];
            questionIndices.forEach((index, i) => {
                if (newQuestions[i]) {
                    updatedQuestions[index] = newQuestions[i];
                }
            });

            // Update quiz in database
            await this.quizRepository.updateQuestions(quizId, updatedQuestions);

            // Invalidate cache
            await this.cacheService.delete(`quiz:${quizId}`);
            await this.cacheService.invalidatePattern(`quiz:${quizId}:*`);

            // Get updated quiz
            const updatedQuiz = await this.quizRepository.findById(quizId);

            this.updateGenerationStatus(regenerationId, 'completed');

            logger.logActivity('quiz_questions_regenerated', {
                regenerationId,
                quizId,
                userId: params.userId,
                regeneratedCount: questionIndices.length,
                duration: Date.now() - this.activeGenerations.get(regenerationId).startTime
            });

            this.activeGenerations.delete(regenerationId);

            return {
                ...updatedQuiz,
                questions: updatedQuestions
            };

        } catch (error) {
            if (this.activeGenerations.has(regenerationId)) {
                this.updateGenerationStatus(regenerationId, 'failed', error.message);
            }

            logger.error('Question regeneration failed:', {
                regenerationId,
                quizId,
                error: error.message,
                userId: params.userId
            });

            this.activeGenerations.delete(regenerationId);
            throw new Error(`Question regeneration failed: ${error.message}`);
        }
    }

    /**
     * สร้าง prompt สำหรับ AI (enhanced version)
     * @param {Object} params - Prompt parameters
     * @returns {string} Generated prompt
     */
    async buildPrompt(params) {
        const cacheKey = `prompt:${this.generateCacheKey('prompt', JSON.stringify(params), '', 0)}`;

        // Try cache first
        const cachedPrompt = await this.cacheService.get(cacheKey);
        if (cachedPrompt) {
            return cachedPrompt;
        }

        const prompt = await this.promptBuilder.buildQuizGenerationPrompt(params);

        // Cache for reuse
        await this.cacheService.set(cacheKey, prompt, 1800); // 30 minutes

        return prompt;
    }

    /**
     * Generate with retry mechanism (enhanced version)
     * @param {string} prompt - AI prompt
     * @param {string} generationId - Generation tracking ID
     * @param {string} userId - User ID for logging
     * @returns {string} AI response
     */
    async generateWithRetry(prompt, generationId = null, userId = null) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Update status if tracking
                if (generationId && this.activeGenerations.has(generationId)) {
                    this.updateGenerationStatus(generationId, 'generating', `Attempt ${attempt}/${this.config.maxRetries}`);
                }

                logger.logActivity('ai_request', { userId, generationId, attempt });

                const startTime = Date.now();
                const response = await this.geminiService.generateContent(prompt);
                const duration = Date.now() - startTime;

                // Log AI interaction
                logger.logActivity('ai_response_success', { 
                    userId, 
                    generationId, 
                    attempt, 
                    duration,
                    model: this.geminiService.getModelInfo?.() || 'gemini-pro'
                });

                return response;
            } catch (error) {
                lastError = error;

                logger.warn(`AI generation attempt ${attempt} failed:`, {
                    generationId,
                    userId,
                    error: error.message,
                    attempt,
                    maxRetries: this.config.maxRetries
                });

                // Don't retry on certain errors
                if (error.code === 'INVALID_PROMPT' || error.code === 'QUOTA_EXCEEDED') {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new AIServiceError(`AI service failed after ${this.config.maxRetries} attempts: ${lastError.message}`, lastError);
    }

    /**
     * Process AI response and format quiz (new enhanced method)
     * @param {string} aiResponse - Raw AI response
     * @param {Object} context - Processing context
     * @returns {Object} Processed quiz
     */
    async processAIResponse(aiResponse, context) {
        try {
            // Parse JSON response
            const rawQuiz = this.parseAIResponse(aiResponse);
            
            // Validate structure
            this.validateQuizStructure(rawQuiz);
            
            // Format and enhance quiz
            const formattedQuiz = await this.enhanceQuizMetadata(rawQuiz, context);
            
            // Final validation
            const validation = this.quizValidator.validateGeneratedQuiz(formattedQuiz);
            if (!validation.isValid) {
                throw new ValidationError(`Generated quiz validation failed: ${validation.errors.join(', ')}`);
            }
            
            return formattedQuiz;

        } catch (error) {
            throw new ValidationError(`Failed to process AI response: ${error.message}`);
        }
    }

    /**
     * Parse AI response text to JSON (new method)
     * @param {string|Object} response - AI response
     * @returns {Object} Parsed quiz object
     */
    parseAIResponse(response) {
        try {
            let responseText = response.text ? response.text() : response;
            
            // Clean response
            responseText = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            return JSON.parse(responseText);
        } catch (error) {
            throw new ValidationError('ไม่สามารถประมวลผลผลลัพธ์จาก AI ได้');
        }
    }

    /**
     * Validate generation input parameters (new method)
     * @param {Object} params - Input parameters
     */
    validateGenerationInput(params) {
        const { content, questionType, questionCount, userId } = params;

        if (!content || content.trim().length === 0) {
            throw new ValidationError('เนื้อหาสำหรับสร้างข้อสอบไม่สามารถเป็นค่าว่างได้');
        }

        if (!questionType) {
            throw new ValidationError('ต้องระบุประเภทของคำถาม');
        }

        if (!userId) {
            throw new ValidationError('ต้องระบุ user ID');
        }

        if (questionCount && (questionCount < 1 || questionCount > this.config.maxQuestionsPerQuiz)) {
            throw new ValidationError(`จำนวนคำถามต้องอยู่ระหว่าง 1-${this.config.maxQuestionsPerQuiz}`);
        }

        if (content.length > 50000) {
            throw new ValidationError('เนื้อหายาวเกินไป (สูงสุด 50,000 ตัวอักษร)');
        }
    }

    /**
     * Validate file input (new method)
     * @param {Object} file - File object
     */
    validateFileInput(file) {
        if (!file) {
            throw new ValidationError('ต้องระบุไฟล์');
        }

        if (file.size > this.config.maxFileSize) {
            throw new ValidationError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)');
        }

        const fileExtension = this.fileService.getFileExtension(file.originalname);
        if (!this.config.supportedFileTypes.includes(fileExtension)) {
            throw new ValidationError(`ประเภทไฟล์ไม่รองรับ รองรับเฉพาะ: ${this.config.supportedFileTypes.join(', ')}`);
        }
    }

    /**
     * Validate quiz structure from AI (new method)
     * @param {Object} quiz - Quiz object to validate
     */
    validateQuizStructure(quiz) {
        if (!quiz.title || !quiz.questions || !Array.isArray(quiz.questions)) {
            throw new ValidationError('รูปแบบข้อมูลข้อสอบไม่ถูกต้อง');
        }

        if (quiz.questions.length === 0) {
            throw new ValidationError('ไม่พบคำถามในข้อสอบ');
        }

        // Validate each question
        quiz.questions.forEach((question, index) => {
            if (!question.question || !question.options || !question.correct_answer) {
                throw new ValidationError(`คำถามที่ ${index + 1} มีรูปแบบไม่ถูกต้อง`);
            }
        });
    }

    /**
     * Process additional questions response (new method)
     * @param {string} aiResponse - AI response
     * @param {Object} context - Processing context
     * @returns {Array} Processed questions
     */
    async processAdditionalQuestions(aiResponse, context) {
        const rawResponse = this.parseAIResponse(aiResponse);
        
        if (!rawResponse.questions || !Array.isArray(rawResponse.questions)) {
            throw new ValidationError('ไม่สามารถสร้างคำถามเพิ่มเติมได้');
        }

        // Validate and format new questions
        const formattedQuestions = rawResponse.questions.map((question, index) => {
            // Basic validation
            if (!question.question || !question.options || !question.correct_answer) {
                throw new ValidationError(`คำถามเพิ่มเติมที่ ${index + 1} มีรูปแบบไม่ถูกต้อง`);
            }

            return {
                ...question,
                id: this.generateQuestionId(),
                createdAt: new Date().toISOString()
            };
        });

        return formattedQuestions;
    }

    /**
     * Parse difficulty analysis response (new method)
     * @param {string} response - AI response
     * @returns {Object} Difficulty analysis
     */
    parseDifficultyResponse(response) {
        try {
            const rawResponse = this.parseAIResponse(response);
            
            return {
                level: rawResponse.difficulty_level || 'medium',
                score: rawResponse.difficulty_score || 5,
                factors: rawResponse.factors || [],
                recommendations: rawResponse.recommendations || []
            };
        } catch (error) {
            throw new ValidationError('ไม่สามารถวิเคราะห์ความยากได้');
        }
    }

    /**
     * Generate cache key (enhanced version)
     * @param {string} type - Cache type
     * @param {string} content - Content to hash
     * @param {string} questionType - Question type
     * @param {number} questionCount - Question count
     * @returns {string} Cache key
     */
    generateCacheKey(type, content, questionType, questionCount) {
        const contentHash = this.hashString(content);
        return `quiz:${type}:${contentHash}:${questionType}:${questionCount}`;
    }

    /**
     * Simple hash function for cache keys (new method)
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate question ID (new method)
     * @returns {string} Question ID
     */
    generateQuestionId() {
        return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * ประมาณการเวลาและต้นทุนการสร้างข้อสอบ
     * @param {Object} params - Generation parameters
     * @returns {Object} Estimation details
     */
    async estimateGeneration(params) {
        const {
            content,
            numberOfQuestions,
            questionType,
            difficulty
        } = params;

        // Calculate content complexity
        const contentLength = content ? content.length : 0;
        const complexity = this.calculateContentComplexity(content, questionType, difficulty);

        // Estimate generation time (in seconds)
        const baseTime = 5; // Base time for simple generation
        const questionMultiplier = numberOfQuestions * 2; // 2 seconds per question
        const complexityMultiplier = complexity * 3; // Additional time for complexity
        const difficultyMultiplier = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 2 : 0;

        const estimatedTime = baseTime + questionMultiplier + complexityMultiplier + difficultyMultiplier;

        // Estimate token usage (approximate)
        const inputTokens = Math.ceil(contentLength / 4); // Rough estimation
        const outputTokens = numberOfQuestions * this.getTokensPerQuestion(questionType); // Tokens per question type

        // Cost estimation (example rates)
        const inputCostPerToken = 0.00001; // $0.00001 per input token
        const outputCostPerToken = 0.00003; // $0.00003 per output token
        const estimatedCost = (inputTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);

        return {
            estimatedTime: Math.min(estimatedTime, 180), // Max 3 minutes
            estimatedTokens: {
                input: inputTokens,
                output: outputTokens,
                total: inputTokens + outputTokens
            },
            estimatedCost: {
                amount: estimatedCost,
                currency: 'USD',
                breakdown: {
                    inputCost: inputTokens * inputCostPerToken,
                    outputCost: outputTokens * outputCostPerToken
                }
            },
            complexity: complexity,
            recommendations: this.getGenerationRecommendations(params)
        };
    }

    /**
     * ตรวจสอบ quota ของ user
     * @param {string} userId - User ID
     */
    async validateUserQuota(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new ValidationError('User not found');
        }

        // Check daily generation quota
        const dailyQuota = await this.getDailyGenerationQuota(userId);
        const dailyUsage = await this.getDailyGenerationUsage(userId);

        if (dailyUsage >= dailyQuota) {
            throw new ValidationError(`Daily quiz generation quota exceeded. Limit: ${dailyQuota}, Used: ${dailyUsage}`);
        }

        // Check if user account is active
        if (user.status !== 'active') {
            throw new ValidationError('User account is not active');
        }

        return true;
    }

    /**
     * ตรวจสอบสิทธิ์การแก้ไขข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @returns {boolean} Has permission
     */
    async checkQuizPermission(quizId, userId) {
        const cacheKey = `quiz:permission:${quizId}:${userId}`;

        // Check cache first
        const cachedPermission = await this.cacheService.get(cacheKey);
        if (cachedPermission !== null) {
            return cachedPermission;
        }

        const quiz = await this.quizRepository.findById(quizId);
        if (!quiz || quiz.deleted_at) {
            return false;
        }

        let hasPermission = false;

        // Owner has full permission
        if (quiz.user_id === userId) {
            hasPermission = true;
        } else {
            // Check if user is collaborator
            hasPermission = await this.quizRepository.checkCollaborator(quizId, userId);
        }

        // Cache permission for 5 minutes
        await this.cacheService.set(cacheKey, hasPermission, 300);

        return hasPermission;
    }

    /**
     * Generate with retry logic
     * @param {string} prompt - AI prompt
     * @param {string} generationId - Generation tracking ID
     * @returns {string} AI response
     */
    async generateWithRetry(prompt, generationId = null) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Update status if tracking
                if (generationId && this.activeGenerations.has(generationId)) {
                    this.updateGenerationStatus(generationId, 'generating', `Attempt ${attempt}/${this.config.maxRetries}`);
                }

                const startTime = Date.now();
                const response = await this.geminiService.generateQuiz(prompt);
                const duration = Date.now() - startTime;

                // Log AI interaction
                logger.logAI('quiz_generation', 'gemini-pro', prompt, response, duration);

                return response;
            } catch (error) {
                lastError = error;

                logger.warn(`AI generation attempt ${attempt} failed:`, {
                    generationId,
                    error: error.message,
                    attempt,
                    maxRetries: this.config.maxRetries
                });

                // Don't retry on certain errors
                if (error.code === 'INVALID_PROMPT' || error.code === 'QUOTA_EXCEEDED') {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new AIServiceError(`AI service failed after ${this.config.maxRetries} attempts: ${lastError.message}`, lastError);
    }

    /**
     * Enhance quiz with additional metadata (updated version)
     * @param {Object} quiz - Base quiz object
     * @param {Object} context - Enhancement context
     * @returns {Object} Enhanced quiz
     */
    async enhanceQuizMetadata(quiz, context) {
        const now = new Date();

        return {
            ...quiz,
            id: this.generateQuizId(),
            userId: context.userId,
            source: context.source || 'text',
            fileName: context.fileName || null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            generationMetadata: {
                generationId: context.generationId,
                originalPrompt: context.originalPrompt,
                generationParams: context.generationParams || {},
                aiModel: this.geminiService.getModelInfo?.() || 'gemini-pro',
                generatedAt: now
            },
            statistics: {
                totalQuestions: quiz.questions.length,
                questionTypes: this.analyzeQuestionTypes(quiz.questions),
                estimatedTime: this.estimateCompletionTime(quiz.questions),
                difficulty: this.analyzeDifficulty(quiz.questions)
            },
            // Add source file info if available
            ...(context.sourceFile && { sourceFile: context.sourceFile })
        };
    }

    /**
     * Get generation history for user
     * @param {string} userId - User ID
     * @param {Object} pagination - Pagination options
     * @returns {Object} Generation history
     */
    async getGenerationHistory(userId, pagination = {}) {
        const { limit = 10, offset = 0 } = pagination;

        const cacheKey = `generation:history:${userId}:${limit}:${offset}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached) return cached;

        // Get quiz generation history
        const quizzes = await this.quizRepository.findByUserId(userId, {
            limit,
            offset,
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });

        const total = await this.quizRepository.count({ user_id: userId });

        const result = {
            records: quizzes.map(quiz => ({
                id: quiz.id,
                title: quiz.title,
                questionCount: JSON.parse(quiz.questions || '[]').length,
                source: quiz.generation_source,
                createdAt: quiz.created_at,
                difficulty: quiz.difficulty,
                questionType: quiz.question_type
            })),
            total
        };

        await this.cacheService.set(cacheKey, result, 600); // 10 minutes
        return result;
    }

    /**
     * Get user quota information
     * @param {string} userId - User ID
     * @returns {Object} Quota information
     */
    async getUserQuotaInfo(userId) {
        const cacheKey = `quota:${userId}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached) return cached;

        const dailyQuota = await this.getDailyGenerationQuota(userId);
        const dailyUsage = await this.getDailyGenerationUsage(userId);
        const remaining = Math.max(0, dailyQuota - dailyUsage);

        const quotaInfo = {
            daily: {
                quota: dailyQuota,
                used: dailyUsage,
                remaining: remaining,
                resetTime: this.getQuotaResetTime()
            },
            percentage: Math.round((dailyUsage / dailyQuota) * 100)
        };

        await this.cacheService.set(cacheKey, quotaInfo, 300); // 5 minutes
        return quotaInfo;
    }

    /**
     * Check AI service health
     * @returns {Object} Health status
     */
    async checkAIServiceHealth() {
        try {
            const startTime = Date.now();
            const healthCheck = await this.geminiService.healthCheck();
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                service: 'Gemini AI',
                responseTime: `${responseTime}ms`,
                model: this.geminiService.getModelInfo(),
                timestamp: new Date().toISOString(),
                ...healthCheck
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'Gemini AI',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Cancel active generation
     * @param {string} generationId - Generation ID
     * @param {string} userId - User ID
     * @returns {Object} Cancellation result
     */
    async cancelGeneration(generationId, userId) {
        const generation = this.activeGenerations.get(generationId);

        if (!generation) {
            throw new NotFoundError('Generation not found or already completed');
        }

        if (generation.userId !== userId) {
            throw new ValidationError('Cannot cancel generation belonging to another user');
        }

        // Update status to cancelled
        this.updateGenerationStatus(generationId, 'cancelled');

        // Remove from active generations
        this.activeGenerations.delete(generationId);

        logger.logActivity('generation_cancelled', {
            generationId,
            userId,
            duration: Date.now() - generation.startTime
        });

        return {
            generationId,
            status: 'cancelled',
            message: 'Generation cancelled successfully'
        };
    }

    /**
     * Save user generation defaults
     * @param {string} userId - User ID
     * @param {Object} defaults - Default settings
     * @returns {Object} Save result
     */
    async saveUserDefaults(userId, defaults) {
        const cacheKey = `defaults:${userId}`;

        // Save to cache and potentially database
        await this.cacheService.set(cacheKey, defaults, 86400); // 24 hours

        // Could also save to database user_preferences table
        try {
            const query = `
        INSERT INTO user_preferences (user_id, preference_key, preference_value, updated_at) 
        VALUES (?, 'generation_defaults', ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
        preference_value = VALUES(preference_value),
        updated_at = CURRENT_TIMESTAMP
      `;
            await this.userRepository.execute(query, [userId, JSON.stringify(defaults)]);
        } catch (error) {
            logger.debug('Could not save defaults to database:', error.message);
        }

        return { success: true, defaults };
    }

    /**
     * Get user generation defaults
     * @param {string} userId - User ID
     * @returns {Object} User defaults
     */
    async getUserDefaults(userId) {
        const cacheKey = `defaults:${userId}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached) return cached;

        // Try to get from database
        try {
            const query = `
        SELECT preference_value 
        FROM user_preferences 
        WHERE user_id = ? AND preference_key = 'generation_defaults'
      `;
            const results = await this.userRepository.execute(query, [userId]);

            if (results.length > 0) {
                const defaults = JSON.parse(results[0].preference_value);
                await this.cacheService.set(cacheKey, defaults, 86400);
                return defaults;
            }
        } catch (error) {
            logger.debug('Could not get defaults from database:', error.message);
        }

        // Return system defaults
        const systemDefaults = {
            questionType: 'multiple_choice',
            difficulty: 'medium',
            language: 'th',
            numberOfQuestions: 5
        };

        return systemDefaults;
    }

    // Helper methods (updated and enhanced)

    generateId() {
        return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateQuizId() {
        return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    updateGenerationStatus(generationId, status, details = null) {
        if (this.activeGenerations.has(generationId)) {
            const generation = this.activeGenerations.get(generationId);
            generation.status = status;
            generation.lastUpdate = Date.now();
            if (details) generation.details = details;
        }
    }

    async incrementUserGenerationCount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cacheKey = `generation:count:${userId}:${today.toISOString().split('T')[0]}`;
        const currentCount = await this.cacheService.get(cacheKey) || 0;
        await this.cacheService.set(cacheKey, currentCount + 1, 86400); // 24 hours
    }

    calculateContentComplexity(content, questionType, difficulty) {
        if (!content) return 1;

        let complexity = 1;

        // Length factor
        if (content.length > 5000) complexity += 2;
        else if (content.length > 1000) complexity += 1;

        // Technical content detection
        const technicalKeywords = ['algorithm', 'function', 'class', 'database', 'network', 'security', 'API', 'framework'];
        const technicalCount = technicalKeywords.filter(keyword =>
            content.toLowerCase().includes(keyword)
        ).length;
        complexity += Math.min(technicalCount * 0.3, 1.5);

        // Question type complexity
        const typeComplexity = {
            'multiple_choice': 1,
            'true_false': 0.5,
            'short_answer': 1.5,
            'essay': 2
        };
        complexity += typeComplexity[questionType] || 1;

        // Difficulty factor
        const difficultyMultiplier = {
            'easy': 0.8,
            'medium': 1,
            'hard': 1.3
        };
        complexity *= difficultyMultiplier[difficulty] || 1;

        return Math.min(Math.ceil(complexity), 5);
    }

    getTokensPerQuestion(questionType) {
        const tokenCounts = {
            'multiple_choice': 150,
            'true_false': 80,
            'short_answer': 100,
            'essay': 200
        };
        return tokenCounts[questionType] || 120;
    }

    analyzeQuestionTypes(questions) {
        const types = {};
        questions.forEach(question => {
            const type = question.type || 'multiple_choice';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    analyzeDifficulty(questions) {
        // Simple difficulty analysis based on question complexity
        let totalComplexity = 0;
        questions.forEach(question => {
            let complexity = 1;
            if (question.question.length > 200) complexity += 0.5;
            if (question.type === 'essay') complexity += 1;
            if (question.options && question.options.length > 4) complexity += 0.3;
            totalComplexity += complexity;
        });

        const avgComplexity = totalComplexity / questions.length;
        if (avgComplexity > 2) return 'hard';
        if (avgComplexity > 1.5) return 'medium';
        return 'easy';
    }

    estimateCompletionTime(questions) {
        const timePerQuestion = {
            'multiple_choice': 1.5,
            'true_false': 1,
            'short_answer': 3,
            'essay': 10
        };

        let totalTime = 0;
        questions.forEach(question => {
            const type = question.type || 'multiple_choice';
            totalTime += timePerQuestion[type] || 2;
        });

        return Math.ceil(totalTime);
    }

    getGenerationRecommendations(params) {
        const recommendations = [];

        if (params.numberOfQuestions > 20) {
            recommendations.push('Consider breaking large quizzes into smaller sections for better user experience');
        }

        if (params.content && params.content.length > 5000) {
            recommendations.push('Large content may result in longer generation times');
        }

        if (params.questionType === 'essay') {
            recommendations.push('Essay questions require more detailed rubrics for grading');
        }

        if (params.difficulty === 'hard') {
            recommendations.push('Hard difficulty questions may take longer to generate and validate');
        }

        return recommendations;
    }

    async getDailyGenerationQuota(userId) {
        const user = await this.userRepository.findById(userId);

        // Different quotas based on user role
        const quotas = {
            'admin': 200,
            'school_admin': 100,
            'teacher': 50,
            'student': 10
        };

        return quotas[user.role] || quotas['student'];
    }

    async getDailyGenerationUsage(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cacheKey = `generation:count:${userId}:${today.toISOString().split('T')[0]}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await this.quizRepository.countGenerationsToday(userId, today);
        await this.cacheService.set(cacheKey, count, 3600); // 1 hour
        return count;
    }

    getQuotaResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }

    validateQuestionIndices(indices, totalQuestions) {
        return indices.every(index =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < totalQuestions
        );
    }

    async buildRegenerationPrompt(quiz, questions, params) {
        return this.promptBuilder.buildRegenerationPrompt(quiz, questions, params);
    }

    /**
     * Delay utility for retries (new method)
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default QuizGenerationService;