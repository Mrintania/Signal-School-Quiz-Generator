// backend/src/controllers/quiz/QuizGenerationController.js
import BaseController from '../base/BaseController.js';
import { QuizGenerationService } from '../../services/quiz/QuizGenerationService.js';
import { FileService } from '../../services/common/FileService.js';
import { DTOFactory } from '../../dto/quiz/QuizDTOs.js';
import { ValidationError, UnauthorizedError, AIServiceError } from '../../errors/CustomErrors.js';
import logger from '../../utils/common/Logger.js';

/**
 * Quiz Generation Controller
 * จัดการเฉพาะเรื่องการสร้างข้อสอบด้วย AI
 * แยกออกมาจาก main QuizController เพื่อ Single Responsibility
 */
export class QuizGenerationController extends BaseController {
    constructor(dependencies = {}) {
        super();

        // Inject dependencies
        this.quizGenerationService = dependencies.quizGenerationService || new QuizGenerationService();
        this.fileService = dependencies.fileService || new FileService();

        // Bind methods
        this.generateQuizFromText = this.asyncHandler(this.generateQuizFromText.bind(this));
        this.generateQuizFromFile = this.asyncHandler(this.generateQuizFromFile.bind(this));
        this.regenerateQuizQuestions = this.asyncHandler(this.regenerateQuizQuestions.bind(this));
        this.generateAdditionalQuestions = this.asyncHandler(this.generateAdditionalQuestions.bind(this));
        this.checkAIServiceHealth = this.asyncHandler(this.checkAIServiceHealth.bind(this));
        this.previewGenerationPrompt = this.asyncHandler(this.previewGenerationPrompt.bind(this));
        this.estimateGenerationCost = this.asyncHandler(this.estimateGenerationCost.bind(this));
        this.analyzeDifficulty = this.asyncHandler(this.analyzeDifficulty.bind(this));
        this.validateGenerationInput = this.asyncHandler(this.validateGenerationInput.bind(this));
    }

    /**
     * สร้างข้อสอบจาก text input
     * POST /api/quiz/generate
     */
    async generateQuizFromText(req, res) {
        const timer = logger.startTimer('quiz-generation-from-text');
        const startTime = Date.now();

        try {
            // Check user authorization
            const user = this.checkUserAuthorization(req);

            // Sanitize and validate input
            const sanitizedBody = this.sanitizeInput(req.body);
            const generationDTO = DTOFactory.createQuizGeneration({
                ...sanitizedBody,
                userId: user.userId
            });

            // Log generation request
            this.logAction('generate-quiz-from-text', user.userId, {
                questionType: generationDTO.questionType,
                questionCount: generationDTO.questionCount,
                contentLength: generationDTO.content.length
            });

            // Generate quiz using service
            const quiz = await this.quizGenerationService.generateFromText(generationDTO.toObject());

            // Transform response
            const responseData = DTOFactory.quizResponse(quiz);

            // Log success
            logger.quizGeneration('text-generation-completed', {
                userId: user.userId,
                quizId: quiz.id,
                questionCount: quiz.questions.length,
                duration: timer.end()
            });

            return this.sendSuccess(res, responseData, 'สร้างข้อสอบสำเร็จ', 201);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'generateQuizFromText',
                userId: req.user?.userId,
                duration: Date.now() - startTime
            });

            if (error instanceof AIServiceError) {
                return this.sendError(res, error, 502);
            }

            return this.sendError(res, error);
        }
    }

    /**
     * สร้างข้อสอบจากไฟล์
     * POST /api/quiz/generate-from-file
     */
    async generateQuizFromFile(req, res) {
        const timer = logger.startTimer('quiz-generation-from-file');
        let filePath = null;

        try {
            // Check user authorization
            const user = this.checkUserAuthorization(req);

            // Validate file upload
            if (!req.file) {
                throw new ValidationError('ต้องแนบไฟล์สำหรับสร้างข้อสอบ');
            }

            // Handle file upload errors
            if (req.fileValidationError) {
                this.handleFileUploadError(req.fileValidationError);
            }

            filePath = req.file.path;

            // Sanitize other inputs
            const sanitizedBody = this.sanitizeInput(req.body);

            // Create generation parameters
            const generationParams = {
                file: req.file,
                questionType: sanitizedBody.questionType,
                questionCount: sanitizedBody.questionCount,
                difficulty: sanitizedBody.difficulty,
                subject: sanitizedBody.subject,
                userId: user.userId,
                options: {
                    includeExplanations: sanitizedBody.includeExplanations === 'true',
                    customInstructions: sanitizedBody.customInstructions
                }
            };

            // Log file processing start
            this.logAction('generate-quiz-from-file', user.userId, {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            });

            // Generate quiz from file
            const quiz = await this.quizGenerationService.generateFromFile(generationParams);

            // Transform response
            const responseData = DTOFactory.quizResponse(quiz);

            // Log success
            logger.quizGeneration('file-generation-completed', {
                userId: user.userId,
                fileName: req.file.originalname,
                quizId: quiz.id,
                questionCount: quiz.questions.length,
                duration: timer.end()
            });

            return this.sendSuccess(res, responseData, 'สร้างข้อสอบจากไฟล์สำเร็จ', 201);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'generateQuizFromFile',
                userId: req.user?.userId,
                fileName: req.file?.originalname
            });

            if (error instanceof AIServiceError) {
                return this.sendError(res, error, 502);
            }

            return this.sendError(res, error);

        } finally {
            // Clean up uploaded file
            if (filePath) {
                await this.fileService.cleanupTempFile(filePath);
            }
        }
    }

    /**
     * สร้างคำถามเพิ่มเติมสำหรับข้อสอบที่มีอยู่
     * POST /api/quiz/:id/generate-questions
     */
    async generateAdditionalQuestions(req, res) {
        try {
            // Check user authorization
            const user = this.checkUserAuthorization(req);

            const { id: quizId } = req.params;
            const { questionCount } = this.sanitizeInput(req.body);

            // Validate inputs
            this.validateRequiredFields(req.body, ['questionCount']);

            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Generate additional questions
            const newQuestions = await this.quizGenerationService.generateAdditionalQuestions(
                parseInt(quizId),
                {
                    questionCount: parseInt(questionCount),
                    userId: user.userId
                }
            );

            // Transform response
            const responseData = DTOFactory.transformArray(newQuestions, 'question');

            this.logAction('generate-additional-questions', user.userId, {
                quizId: parseInt(quizId),
                newQuestionCount: newQuestions.length
            });

            return this.sendSuccess(res, responseData, 'สร้างคำถามเพิ่มเติมสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'generateAdditionalQuestions',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * สร้างข้อสอบใหม่จากข้อสอบเดิม (regenerate)
     * POST /api/quiz/:id/regenerate
     */
    async regenerateQuizQuestions(req, res) {
        try {
            // Check user authorization
            const user = this.checkUserAuthorization(req);

            const { id: quizId } = req.params;
            const {
                questionCount,
                difficulty,
                questionType,
                keepExisting
            } = this.sanitizeInput(req.body);

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Regenerate quiz questions
            const updatedQuiz = await this.quizGenerationService.regenerateQuestions(
                parseInt(quizId),
                {
                    questionCount: questionCount ? parseInt(questionCount) : undefined,
                    difficulty,
                    questionType,
                    keepExisting: keepExisting === 'true',
                    userId: user.userId
                }
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(updatedQuiz);

            this.logAction('regenerate-quiz-questions', user.userId, {
                quizId: parseInt(quizId),
                newQuestionCount: updatedQuiz.questions.length
            });

            return this.sendSuccess(res, responseData, 'สร้างข้อสอบใหม่สำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'regenerateQuizQuestions',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ตรวจสอบสถานะของ AI service
     * GET /api/quiz/ai-health
     */
    async checkAIServiceHealth(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            const healthStatus = await this.quizGenerationService.checkServiceHealth();

            this.logAction('check-ai-health', user.userId, healthStatus);

            return this.sendSuccess(res, healthStatus, 'ตรวจสอบสถานะ AI service สำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'checkAIServiceHealth',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดูตัวอย่าง prompt ที่จะส่งไปยัง AI
     * POST /api/quiz/preview-prompt
     */
    async previewGenerationPrompt(req, res) {
        try {
            // Check user authorization (admin only for security)
            const user = this.checkUserAuthorization(req, 'admin');

            const sanitizedBody = this.sanitizeInput(req.body);

            // Generate preview prompt
            const promptPreview = await this.quizGenerationService.generatePromptPreview({
                content: sanitizedBody.content,
                questionType: sanitizedBody.questionType,
                questionCount: sanitizedBody.questionCount,
                difficulty: sanitizedBody.difficulty,
                subject: sanitizedBody.subject
            });

            this.logAction('preview-generation-prompt', user.userId, {
                contentLength: sanitizedBody.content?.length || 0
            });

            return this.sendSuccess(res, promptPreview, 'สร้างตัวอย่าง prompt สำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'previewGenerationPrompt',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ประเมินค่าใช้จ่ายในการสร้างข้อสอบ
     * POST /api/quiz/estimate-cost
     */
    async estimateGenerationCost(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            const sanitizedBody = this.sanitizeInput(req.body);

            // Estimate generation cost
            const costEstimate = await this.quizGenerationService.estimateGenerationCost({
                content: sanitizedBody.content,
                questionType: sanitizedBody.questionType,
                questionCount: sanitizedBody.questionCount,
                hasFile: !!sanitizedBody.hasFile
            });

            this.logAction('estimate-generation-cost', user.userId, costEstimate);

            return this.sendSuccess(res, costEstimate, 'ประเมินค่าใช้จ่ายสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'estimateGenerationCost',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * วิเคราะห์ความยากของเนื้อหา
     * POST /api/quiz/analyze-difficulty
     */
    async analyzeDifficulty(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            const { content } = this.sanitizeInput(req.body);

            if (!content || content.trim().length === 0) {
                throw new ValidationError('ต้องระบุเนื้อหาสำหรับการวิเคราะห์');
            }

            // Analyze difficulty
            const analysis = await this.quizGenerationService.analyzeDifficulty(content);

            this.logAction('analyze-difficulty', user.userId, {
                contentLength: content.length,
                difficultyLevel: analysis.level
            });

            return this.sendSuccess(res, analysis, 'วิเคราะห์ความยากสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'analyzeDifficulty',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ตรวจสอบความถูกต้องของข้อมูลสำหรับการสร้างข้อสอบ
     * POST /api/quiz/validate-input
     */
    async validateGenerationInput(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            const sanitizedBody = this.sanitizeInput(req.body);

            // Validate input using service
            const validationResult = await this.quizGenerationService.validateGenerationInput({
                ...sanitizedBody,
                userId: user.userId
            });

            this.logAction('validate-generation-input', user.userId, {
                isValid: validationResult.isValid,
                errorCount: validationResult.errors?.length || 0
            });

            if (validationResult.isValid) {
                return this.sendSuccess(res, validationResult, 'ข้อมูลถูกต้อง');
            } else {
                return this.sendError(res, new ValidationError('ข้อมูลไม่ถูกต้อง', validationResult.errors), 400);
            }

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'validateGenerationInput',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดึงประวัติการสร้างข้อสอบ
     * GET /api/quiz/generation-history
     */
    async getGenerationHistory(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            const { page, limit } = this.validatePagination(req.query);

            // Get generation history
            const history = await this.quizGenerationService.getGenerationHistory(user.userId, {
                page,
                limit
            });

            return this.sendPaginatedResponse(res, history.data, history.pagination, 'ดึงประวัติการสร้างข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getGenerationHistory',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ยกเลิกการสร้างข้อสอบที่กำลังดำเนินการ
     * POST /api/quiz/cancel-generation/:taskId
     */
    async cancelGeneration(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { taskId } = req.params;

            if (!taskId) {
                throw new ValidationError('ต้องระบุ task ID');
            }

            // Cancel generation task
            const result = await this.quizGenerationService.cancelGeneration(taskId, user.userId);

            this.logAction('cancel-generation', user.userId, { taskId });

            return this.sendSuccess(res, result, 'ยกเลิกการสร้างข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cancelGeneration',
                userId: req.user?.userId,
                taskId: req.params.taskId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดึงสถานะการสร้างข้อสอบแบบ real-time
     * GET /api/quiz/generation-status/:taskId
     */
    async getGenerationStatus(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { taskId } = req.params;

            if (!taskId) {
                throw new ValidationError('ต้องระบุ task ID');
            }

            // Get generation status
            const status = await this.quizGenerationService.getGenerationStatus(taskId, user.userId);

            return this.sendSuccess(res, status, 'ดึงสถานะการสร้างข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getGenerationStatus',
                userId: req.user?.userId,
                taskId: req.params.taskId
            });

            return this.sendError(res, error);
        }
    }
}

export default QuizGenerationController;