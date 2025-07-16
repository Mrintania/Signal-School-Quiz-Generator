// backend/src/controllers/quiz/QuizGenerationController.js
import BaseController from '../base/BaseController.js';
import { QuizGenerationService } from '../../services/quiz/QuizGenerationService.js';
import { FileService } from '../../services/common/FileService.js';
import { QuizGenerationDTO } from '../../dto/quiz/QuizGenerationDTO.js';
import { ValidationError, UnauthorizedError, AIServiceError } from '../../errors/CustomErrors.js';
import logger from '../../utils/logger.js';

/**
 * Quiz Generation Controller
 * จัดการเฉพาะเรื่องการสร้างข้อสอบ
 * แยกออกมาจาก main QuizController เพื่อ Single Responsibility
 */
export class QuizGenerationController extends BaseController {
    constructor(quizGenerationService, fileService) {
        super();

        // Inject dependencies
        this.quizGenerationService = quizGenerationService || new QuizGenerationService();
        this.fileService = fileService || new FileService();

        // Bind methods
        this.generateQuizFromText = this.asyncHandler(this.generateQuizFromText.bind(this));
        this.generateQuizFromFile = this.asyncHandler(this.generateQuizFromFile.bind(this));
        this.regenerateQuizQuestions = this.asyncHandler(this.regenerateQuizQuestions.bind(this));
        this.checkAIServiceHealth = this.asyncHandler(this.checkAIServiceHealth.bind(this));
        this.previewGenerationPrompt = this.asyncHandler(this.previewGenerationPrompt.bind(this));
        this.estimateGenerationCost = this.asyncHandler(this.estimateGenerationCost.bind(this));
    }

    /**
     * สร้างข้อสอบจาก text input
     * POST /api/quiz/generate
     */
    async generateQuizFromText(req, res) {
        const startTime = Date.now();

        try {
            // Sanitize input
            const sanitizedBody = this.sanitizeInput(req.body);

            // Validate input using DTO
            const generationData = new QuizGenerationDTO(sanitizedBody);

            // Log generation request
            this.logActivity(req.user, 'quiz_generation_request', {
                topic: generationData.topic,
                questionType: generationData.questionType,
                numberOfQuestions: generationData.numberOfQuestions,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Generate quiz using service
            const quiz = await this.quizGenerationService.generateFromText({
                ...generationData.toJSON(),
                userId: req.user.userId,
                source: 'text'
            });

            // Log performance
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Generation from Text', duration, {
                userId: req.user.userId,
                questionCount: quiz.questions.length,
                questionType: generationData.questionType
            });

            // Return success response
            return this.sendSuccess(res, quiz, 'สร้างข้อสอบสำเร็จ', 201);

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Generation from Text (Failed)', duration, {
                userId: req.user?.userId,
                error: error.message
            });

            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof AIServiceError) {
                return this.sendError(res, 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง', 503, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้างข้อสอบได้');
        }
    }

    /**
     * สร้างข้อสอบจากไฟล์
     * POST /api/quiz/generate-from-file
     */
    async generateQuizFromFile(req, res) {
        const startTime = Date.now();
        let filePath = null;

        try {
            // Check if file exists
            if (!req.file) {
                throw new ValidationError('ไม่พบไฟล์ที่อัพโหลด');
            }

            filePath = req.file.path;

            // Log file upload
            logger.info('File uploaded for quiz generation', {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                userId: req.user.userId
            });

            // Validate file
            const fileValidation = await this.fileService.validateFile(req.file);
            if (!fileValidation.isValid) {
                throw new ValidationError(fileValidation.message);
            }

            // Extract text from file
            const extractedText = await this.fileService.extractTextFromFile(req.file);

            if (!extractedText || extractedText.trim().length < 50) {
                throw new ValidationError('ไฟล์ไม่มีเนื้อหาเพียงพอสำหรับการสร้างข้อสอบ');
            }

            // Prepare generation data
            const generationData = new QuizGenerationDTO({
                content: extractedText,
                questionType: req.body.questionType || 'multiple_choice',
                numberOfQuestions: parseInt(req.body.numberOfQuestions) || 5,
                difficulty: req.body.difficulty || 'medium',
                language: req.body.language || 'th',
                category: req.body.category || '',
                tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
            });

            // Log file generation request
            this.logActivity(req.user, 'quiz_generation_from_file', {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                contentLength: extractedText.length,
                questionType: generationData.questionType,
                numberOfQuestions: generationData.numberOfQuestions,
                ip: req.ip
            });

            // Generate quiz from file content
            const quiz = await this.quizGenerationService.generateFromText({
                ...generationData.toJSON(),
                userId: req.user.userId,
                source: 'file',
                fileName: req.file.originalname
            });

            // Log performance
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Generation from File', duration, {
                userId: req.user.userId,
                fileName: req.file.originalname,
                questionCount: quiz.questions.length
            });

            return this.sendSuccess(res, quiz, 'สร้างข้อสอบจากไฟล์สำเร็จ', 201);

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Generation from File (Failed)', duration, {
                userId: req.user?.userId,
                fileName: req.file?.originalname,
                error: error.message
            });

            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof AIServiceError) {
                return this.sendError(res, 'บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง', 503, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้างข้อสอบจากไฟล์ได้');
        } finally {
            // Cleanup uploaded file
            if (filePath) {
                try {
                    await this.fileService.cleanupFile(filePath);
                    logger.debug('Uploaded file cleaned up', { filePath });
                } catch (cleanupError) {
                    logger.error('Failed to cleanup file:', { filePath, error: cleanupError.message });
                }
            }
        }
    }

    /**
     * สร้างคำถามใหม่สำหรับข้อสอบที่มีอยู่
     * POST /api/quiz/:id/regenerate-questions
     */
    async regenerateQuizQuestions(req, res) {
        const startTime = Date.now();

        try {
            const { id } = req.params;
            const { questionIndices, newQuestionType, regenerationReason } = req.body;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            if (!questionIndices || !Array.isArray(questionIndices) || questionIndices.length === 0) {
                throw new ValidationError('ต้องระบุหมายเลขคำถามที่ต้องการสร้างใหม่');
            }

            // Validate question indices
            if (!questionIndices.every(index => Number.isInteger(index) && index >= 0)) {
                throw new ValidationError('หมายเลขคำถามไม่ถูกต้อง');
            }

            // Check permissions
            const hasPermission = await this.quizGenerationService.checkQuizPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้');
            }

            // Log regeneration request
            this.logActivity(req.user, 'quiz_questions_regeneration', {
                quizId: id,
                questionIndices,
                newQuestionType,
                regenerationReason,
                ip: req.ip
            });

            // Regenerate questions
            const updatedQuiz = await this.quizGenerationService.regenerateQuestions(
                id,
                questionIndices,
                {
                    questionType: newQuestionType,
                    userId: req.user.userId,
                    reason: regenerationReason
                }
            );

            // Log performance
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Questions Regeneration', duration, {
                userId: req.user.userId,
                quizId: id,
                regeneratedCount: questionIndices.length
            });

            return this.sendSuccess(res, updatedQuiz, 'สร้างคำถามใหม่สำเร็จ');

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logPerformance('Quiz Questions Regeneration (Failed)', duration, {
                userId: req.user?.userId,
                quizId: req.params?.id,
                error: error.message
            });

            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้างคำถามใหม่ได้');
        }
    }

    /**
     * ตรวจสอบสถานะของ AI service
     * GET /api/quiz/generation/health
     */
    async checkAIServiceHealth(req, res) {
        try {
            const healthStatus = await this.quizGenerationService.checkAIServiceHealth();

            // Log health check
            logger.info('AI Service Health Check', {
                status: healthStatus.status,
                userId: req.user?.userId,
                timestamp: new Date().toISOString()
            });

            return this.sendSuccess(res, healthStatus, 'ตรวจสอบสถานะ AI service สำเร็จ');

        } catch (error) {
            logger.error('AI Service Health Check Failed', {
                error: error.message,
                userId: req.user?.userId
            });

            return this.handleError(res, error, 'ไม่สามารถตรวจสอบสถานะ AI service ได้');
        }
    }

    /**
     * ดูตัวอย่าง prompt ที่จะส่งให้ AI
     * POST /api/quiz/generation/preview-prompt
     */
    async previewGenerationPrompt(req, res) {
        try {
            const generationData = new QuizGenerationDTO(req.body);

            // Generate preview prompt
            const prompt = await this.quizGenerationService.buildPrompt(generationData.toJSON());

            // Log prompt preview
            this.logActivity(req.user, 'prompt_preview_request', {
                promptLength: prompt.length,
                questionType: generationData.questionType,
                numberOfQuestions: generationData.numberOfQuestions
            });

            return this.sendSuccess(res, {
                prompt,
                metadata: {
                    promptLength: prompt.length,
                    estimatedTokens: Math.ceil(prompt.length / 4), // Rough estimate
                    generationParams: generationData.toJSON()
                }
            }, 'สร้าง prompt ตัวอย่างสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้าง prompt ตัวอย่างได้');
        }
    }

    /**
     * ประมาณการเวลาและต้นทุนในการสร้างข้อสอบ
     * POST /api/quiz/generation/estimate
     */
    async estimateGenerationCost(req, res) {
        try {
            const generationData = new QuizGenerationDTO(req.body);

            // Calculate estimation
            const estimation = await this.quizGenerationService.estimateGeneration(generationData.toJSON());

            // Log estimation request
            this.logActivity(req.user, 'generation_cost_estimation', {
                estimatedTime: estimation.estimatedTime,
                estimatedTokens: estimation.estimatedTokens.total,
                complexity: estimation.complexity,
                questionType: generationData.questionType,
                numberOfQuestions: generationData.numberOfQuestions
            });

            return this.sendSuccess(res, estimation, 'ประมาณการต้นทุนสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถประมาณการต้นทุนได้');
        }
    }

    /**
     * ดึงประวัติการสร้างข้อสอบของผู้ใช้
     * GET /api/quiz/generation/history
     */
    async getGenerationHistory(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const pagination = this.validatePagination({ page, limit });

            const history = await this.quizGenerationService.getGenerationHistory(
                req.user.userId,
                pagination
            );

            const paginationMeta = this.createPaginationMeta(
                history.total,
                pagination.page,
                pagination.limit
            );

            return this.sendSuccess(res, {
                history: history.records,
                pagination: paginationMeta
            }, 'ดึงประวัติการสร้างข้อสอบสำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถดึงประวัติการสร้างข้อสอบได้');
        }
    }

    /**
     * ดึงการใช้งาน quota ของผู้ใช้
     * GET /api/quiz/generation/quota
     */
    async getUserQuota(req, res) {
        try {
            const quotaInfo = await this.quizGenerationService.getUserQuotaInfo(req.user.userId);

            return this.sendSuccess(res, quotaInfo, 'ดึงข้อมูล quota สำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถดึงข้อมูล quota ได้');
        }
    }

    /**
     * ยกเลิกการสร้างข้อสอบที่กำลังดำเนินการ
     * POST /api/quiz/generation/:id/cancel
     */
    async cancelGeneration(req, res) {
        try {
            const { id } = req.params;

            const result = await this.quizGenerationService.cancelGeneration(id, req.user.userId);

            this.logActivity(req.user, 'quiz_generation_cancelled', {
                generationId: id,
                ip: req.ip
            });

            return this.sendSuccess(res, result, 'ยกเลิกการสร้างข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถยกเลิกการสร้างข้อสอบได้');
        }
    }

    /**
     * บันทึกการตั้งค่าเริ่มต้นสำหรับการสร้างข้อสอบ
     * POST /api/quiz/generation/defaults
     */
    async saveGenerationDefaults(req, res) {
        try {
            const defaults = this.sanitizeInput(req.body);

            // Validate defaults using DTO (but allow partial data)
            const validatedDefaults = {
                questionType: defaults.questionType || 'multiple_choice',
                difficulty: defaults.difficulty || 'medium',
                language: defaults.language || 'th',
                numberOfQuestions: defaults.numberOfQuestions || 5
            };

            const result = await this.quizGenerationService.saveUserDefaults(
                req.user.userId,
                validatedDefaults
            );

            this.logActivity(req.user, 'generation_defaults_saved', {
                defaults: validatedDefaults
            });

            return this.sendSuccess(res, result, 'บันทึกการตั้งค่าเริ่มต้นสำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถบันทึกการตั้งค่าเริ่มต้นได้');
        }
    }

    /**
     * ดึงการตั้งค่าเริ่มต้นของผู้ใช้
     * GET /api/quiz/generation/defaults
     */
    async getGenerationDefaults(req, res) {
        try {
            const defaults = await this.quizGenerationService.getUserDefaults(req.user.userId);

            return this.sendSuccess(res, defaults || {}, 'ดึงการตั้งค่าเริ่มต้นสำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถดึงการตั้งค่าเริ่มต้นได้');
        }
    }
}

export default QuizGenerationController;