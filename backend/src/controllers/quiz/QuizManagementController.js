// backend/src/controllers/quiz/QuizManagementController.js
import BaseController from '../base/BaseController.js';
import { QuizManagementService } from '../../services/quiz/QuizManagementService.js';
import { CacheService } from '../../services/common/CacheService.js';
import { DTOFactory } from '../../dto/quiz/QuizDTOs.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../errors/CustomErrors.js';
import logger from '../../utils/common/Logger.js';

/**
 * Quiz Management Controller
 * จัดการ CRUD operations ของข้อสอบ
 * แยกออกมาจาก main QuizController เพื่อ Single Responsibility
 */
export class QuizManagementController extends BaseController {
    constructor(dependencies = {}) {
        super();

        // Inject dependencies
        this.quizManagementService = dependencies.quizManagementService || new QuizManagementService();
        this.cacheService = dependencies.cacheService || new CacheService();

        // Bind methods
        this.getAllQuizzes = this.asyncHandler(this.getAllQuizzes.bind(this));
        this.getQuizById = this.asyncHandler(this.getQuizById.bind(this));
        this.createQuiz = this.asyncHandler(this.createQuiz.bind(this));
        this.updateQuiz = this.asyncHandler(this.updateQuiz.bind(this));
        this.deleteQuiz = this.asyncHandler(this.deleteQuiz.bind(this));
        this.renameQuiz = this.asyncHandler(this.renameQuiz.bind(this));
        this.moveQuiz = this.asyncHandler(this.moveQuiz.bind(this));
        this.duplicateQuiz = this.asyncHandler(this.duplicateQuiz.bind(this));
        this.shareQuiz = this.asyncHandler(this.shareQuiz.bind(this));
        this.getQuizStatistics = this.asyncHandler(this.getQuizStatistics.bind(this));
        this.searchQuizzes = this.asyncHandler(this.searchQuizzes.bind(this));
        this.getRecentQuizzes = this.asyncHandler(this.getRecentQuizzes.bind(this));
        this.bulkOperations = this.asyncHandler(this.bulkOperations.bind(this));
        this.updateQuizQuestions = this.asyncHandler(this.updateQuizQuestions.bind(this));
        this.checkTitleAvailability = this.asyncHandler(this.checkTitleAvailability.bind(this));
        this.getQuizVersions = this.asyncHandler(this.getQuizVersions.bind(this));
        this.restoreQuizVersion = this.asyncHandler(this.restoreQuizVersion.bind(this));
    }

    /**
     * ดึงรายการข้อสอบทั้งหมดของผู้ใช้
     * GET /api/quiz
     */
    async getAllQuizzes(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const pagination = this.validatePagination(req.query);
            const filters = this.parseFilters(req.query);
            const sortParams = this.parseSortParams(req.query);

            // Check cache first
            const cacheKey = this.generateCacheKey(
                'user-quizzes',
                user.userId,
                pagination.page,
                pagination.limit,
                JSON.stringify(filters),
                JSON.stringify(sortParams)
            );

            const cachedData = await this.cacheService.get(cacheKey);
            if (cachedData) {
                logger.cache('hit', cacheKey, { userId: user.userId });
                return this.sendPaginatedResponse(res, cachedData.data, cachedData.pagination);
            }

            // Get quizzes from service
            const result = await this.quizManagementService.getUserQuizzes(
                user.userId,
                pagination,
                { ...filters, ...sortParams }
            );

            // Transform response
            const responseData = DTOFactory.transformArray(result.data, 'quiz');

            // Cache result
            const responsePayload = {
                data: responseData,
                pagination: result.pagination
            };
            await this.cacheService.set(cacheKey, responsePayload, 300); // 5 minutes

            this.logAction('get-all-quizzes', user.userId, {
                total: result.pagination.total,
                page: pagination.page
            });

            return this.sendPaginatedResponse(res, responseData, result.pagination);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getAllQuizzes',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดึงข้อสอบตาม ID
     * GET /api/quiz/:id
     */
    async getQuizById(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Check cache first
            const cacheKey = this.generateCacheKey('quiz', quizId, user.userId);
            const cachedQuiz = await this.cacheService.get(cacheKey);

            if (cachedQuiz) {
                logger.cache('hit', cacheKey, { userId: user.userId, quizId });
                return this.sendSuccess(res, cachedQuiz);
            }

            // Get quiz from service
            const quiz = await this.quizManagementService.getQuizById(parseInt(quizId), user.userId);

            if (!quiz) {
                throw new NotFoundError('ไม่พบข้อสอบที่ระบุ');
            }

            // Transform response
            const responseData = DTOFactory.quizResponse(quiz);

            // Cache result
            await this.cacheService.set(cacheKey, responseData, 600); // 10 minutes

            this.logAction('get-quiz-by-id', user.userId, { quizId: parseInt(quizId) });

            return this.sendSuccess(res, responseData);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getQuizById',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * สร้างข้อสอบใหม่
     * POST /api/quiz
     */
    async createQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const sanitizedBody = this.sanitizeInput(req.body);

            // Create DTO and validate
            const createQuizDTO = DTOFactory.createQuiz({
                ...sanitizedBody,
                userId: user.userId
            });

            // Check title availability
            const titleAvailable = await this.quizManagementService.checkTitleAvailability(
                createQuizDTO.title,
                user.userId
            );

            if (!titleAvailable) {
                throw new ValidationError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
            }

            // Create quiz
            const quiz = await this.quizManagementService.createQuiz(createQuizDTO.toObject());

            // Transform response
            const responseData = DTOFactory.quizResponse(quiz);

            // Invalidate user's quiz cache
            await this.invalidateUserQuizCache(user.userId);

            this.logAction('create-quiz', user.userId, {
                quizId: quiz.id,
                title: quiz.title,
                questionCount: quiz.questions?.length || 0
            });

            return this.sendSuccess(res, responseData, 'สร้างข้อสอบสำเร็จ', 201);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'createQuiz',
                userId: req.user?.userId,
                title: req.body?.title
            });

            return this.sendError(res, error);
        }
    }

    /**
     * แก้ไขข้อสอบ
     * PUT /api/quiz/:id
     */
    async updateQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const sanitizedBody = this.sanitizeInput(req.body);

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Create update DTO
            const updateQuizDTO = DTOFactory.updateQuiz(sanitizedBody);

            // Check title availability if title is being updated
            if (updateQuizDTO.title) {
                const titleAvailable = await this.quizManagementService.checkTitleAvailability(
                    updateQuizDTO.title,
                    user.userId,
                    parseInt(quizId)
                );

                if (!titleAvailable) {
                    throw new ValidationError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
                }
            }

            // Update quiz
            const updatedQuiz = await this.quizManagementService.updateQuiz(
                parseInt(quizId),
                user.userId,
                updateQuizDTO.toObject()
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(updatedQuiz);

            // Invalidate caches
            await this.invalidateQuizCache(parseInt(quizId), user.userId);

            this.logAction('update-quiz', user.userId, {
                quizId: parseInt(quizId),
                updatedFields: Object.keys(updateQuizDTO.toObject())
            });

            return this.sendSuccess(res, responseData, 'แก้ไขข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ลบข้อสอบ
     * DELETE /api/quiz/:id
     */
    async deleteQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Delete quiz
            const result = await this.quizManagementService.deleteQuiz(parseInt(quizId), user.userId);

            // Invalidate caches
            await this.invalidateQuizCache(parseInt(quizId), user.userId);

            this.logAction('delete-quiz', user.userId, { quizId: parseInt(quizId) });

            return this.sendSuccess(res, result, 'ลบข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'deleteQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * เปลี่ยนชื่อข้อสอบ
     * PATCH /api/quiz/:id/rename
     */
    async renameQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const { title } = this.sanitizeInput(req.body);

            // Validate inputs
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            this.validateRequiredFields(req.body, ['title']);

            // Check title availability
            const titleAvailable = await this.quizManagementService.checkTitleAvailability(
                title,
                user.userId,
                parseInt(quizId)
            );

            if (!titleAvailable) {
                throw new ValidationError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
            }

            // Rename quiz
            const updatedQuiz = await this.quizManagementService.renameQuiz(
                parseInt(quizId),
                title,
                user.userId
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(updatedQuiz);

            // Invalidate caches
            await this.invalidateQuizCache(parseInt(quizId), user.userId);

            this.logAction('rename-quiz', user.userId, {
                quizId: parseInt(quizId),
                newTitle: title
            });

            return this.sendSuccess(res, responseData, 'เปลี่ยนชื่อข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'renameQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ย้ายข้อสอบไปยังโฟลเดอร์
     * PATCH /api/quiz/:id/move
     */
    async moveQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const { folderId } = this.sanitizeInput(req.body);

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Move quiz
            const updatedQuiz = await this.quizManagementService.moveQuiz(
                parseInt(quizId),
                folderId ? parseInt(folderId) : null,
                user.userId
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(updatedQuiz);

            // Invalidate caches
            await this.invalidateQuizCache(parseInt(quizId), user.userId);

            this.logAction('move-quiz', user.userId, {
                quizId: parseInt(quizId),
                folderId: folderId ? parseInt(folderId) : null
            });

            return this.sendSuccess(res, responseData, 'ย้ายข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'moveQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ทำสำเนาข้อสอบ
     * POST /api/quiz/:id/duplicate
     */
    async duplicateQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const { title: newTitle } = this.sanitizeInput(req.body);

            // Validate quiz ID
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            // Duplicate quiz
            const duplicatedQuiz = await this.quizManagementService.duplicateQuiz(
                parseInt(quizId),
                user.userId,
                newTitle
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(duplicatedQuiz);

            // Invalidate user's quiz cache
            await this.invalidateUserQuizCache(user.userId);

            this.logAction('duplicate-quiz', user.userId, {
                originalQuizId: parseInt(quizId),
                newQuizId: duplicatedQuiz.id,
                newTitle: duplicatedQuiz.title
            });

            return this.sendSuccess(res, responseData, 'ทำสำเนาข้อสอบสำเร็จ', 201);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'duplicateQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * แชร์ข้อสอบ
     * POST /api/quiz/:id/share
     */
    async shareQuiz(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const { shareType, recipients, message } = this.sanitizeInput(req.body);

            // Validate inputs
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            this.validateRequiredFields(req.body, ['shareType']);

            // Share quiz
            const shareResult = await this.quizManagementService.shareQuiz(
                parseInt(quizId),
                user.userId,
                {
                    shareType,
                    recipients: recipients || [],
                    message: message || ''
                }
            );

            this.logAction('share-quiz', user.userId, {
                quizId: parseInt(quizId),
                shareType,
                recipientCount: recipients?.length || 0
            });

            return this.sendSuccess(res, shareResult, 'แชร์ข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'shareQuiz',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดึงสถิติข้อสอบ
     * GET /api/quiz/statistics
     */
    async getQuizStatistics(req, res) {
        try {
            const user = this.checkUserAuthorization(req);

            // Check cache first
            const cacheKey = this.generateCacheKey('quiz-statistics', user.userId);
            const cachedStats = await this.cacheService.get(cacheKey);

            if (cachedStats) {
                logger.cache('hit', cacheKey, { userId: user.userId });
                return this.sendSuccess(res, cachedStats);
            }

            // Get statistics from service
            const statistics = await this.quizManagementService.getUserStatistics(user.userId);

            // Cache result
            await this.cacheService.set(cacheKey, statistics, 300); // 5 minutes

            this.logAction('get-quiz-statistics', user.userId);

            return this.sendSuccess(res, statistics, 'ดึงสถิติข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getQuizStatistics',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ค้นหาข้อสอบ
     * GET /api/quiz/search
     */
    async searchQuizzes(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const searchDTO = DTOFactory.searchQuiz({
                ...req.query,
                userId: user.userId
            });

            // Search quizzes
            const result = await this.quizManagementService.searchQuizzes(searchDTO.toObject());

            // Transform response
            const responseData = DTOFactory.transformArray(result.data, 'quiz');

            this.logAction('search-quizzes', user.userId, {
                query: searchDTO.query,
                resultCount: result.data.length
            });

            return this.sendPaginatedResponse(res, responseData, result.pagination, 'ค้นหาข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'searchQuizzes',
                userId: req.user?.userId,
                query: req.query.query
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดึงข้อสอบล่าสุด
     * GET /api/quiz/recent
     */
    async getRecentQuizzes(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const limit = parseInt(req.query.limit) || 5;

            // Check cache first
            const cacheKey = this.generateCacheKey('recent-quizzes', user.userId, limit);
            const cachedQuizzes = await this.cacheService.get(cacheKey);

            if (cachedQuizzes) {
                logger.cache('hit', cacheKey, { userId: user.userId });
                return this.sendSuccess(res, cachedQuizzes);
            }

            // Get recent quizzes
            const recentQuizzes = await this.quizManagementService.getRecentQuizzes(user.userId, limit);

            // Transform response
            const responseData = DTOFactory.transformArray(recentQuizzes, 'quiz');

            // Cache result
            await this.cacheService.set(cacheKey, responseData, 300); // 5 minutes

            this.logAction('get-recent-quizzes', user.userId, { limit });

            return this.sendSuccess(res, responseData, 'ดึงข้อสอบล่าสุดสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getRecentQuizzes',
                userId: req.user?.userId
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ดำเนินการหลายรายการพร้อมกัน
     * POST /api/quiz/bulk
     */
    async bulkOperations(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { operation, quizIds, targetFolderId } = this.sanitizeInput(req.body);

            // Validate inputs
            this.validateRequiredFields(req.body, ['operation', 'quizIds']);

            if (!Array.isArray(quizIds) || quizIds.length === 0) {
                throw new ValidationError('ต้องระบุรายการข้อสอบ');
            }

            // Perform bulk operation
            const result = await this.quizManagementService.bulkOperation(
                operation,
                quizIds.map(id => parseInt(id)),
                user.userId,
                { targetFolderId: targetFolderId ? parseInt(targetFolderId) : null }
            );

            // Invalidate user's quiz cache
            await this.invalidateUserQuizCache(user.userId);

            this.logAction('bulk-operations', user.userId, {
                operation,
                quizCount: quizIds.length,
                affectedCount: result.affected
            });

            return this.sendSuccess(res, result, `ดำเนินการ ${operation} สำเร็จ`);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'bulkOperations',
                userId: req.user?.userId,
                bulkOperation: req.body?.operation
            });

            return this.sendError(res, error);
        }
    }

    /**
     * แก้ไขคำถามในข้อสอบ
     * PUT /api/quiz/:id/questions
     */
    async updateQuizQuestions(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { id: quizId } = req.params;
            const { questions } = this.sanitizeInput(req.body);

            // Validate inputs
            if (!quizId || isNaN(parseInt(quizId))) {
                throw new ValidationError('Quiz ID ไม่ถูกต้อง');
            }

            this.validateRequiredFields(req.body, ['questions']);

            if (!Array.isArray(questions)) {
                throw new ValidationError('คำถามต้องเป็น array');
            }

            // Update quiz questions
            const updatedQuiz = await this.quizManagementService.updateQuizQuestions(
                parseInt(quizId),
                questions,
                user.userId
            );

            // Transform response
            const responseData = DTOFactory.quizResponse(updatedQuiz);

            // Invalidate quiz cache
            await this.invalidateQuizCache(parseInt(quizId), user.userId);

            this.logAction('update-quiz-questions', user.userId, {
                quizId: parseInt(quizId),
                questionCount: questions.length
            });

            return this.sendSuccess(res, responseData, 'แก้ไขคำถามสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateQuizQuestions',
                userId: req.user?.userId,
                quizId: req.params.id
            });

            return this.sendError(res, error);
        }
    }

    /**
     * ตรวจสอบความพร้อมใช้งานของชื่อข้อสอบ
     * GET /api/quiz/check-title
     */
    async checkTitleAvailability(req, res) {
        try {
            const user = this.checkUserAuthorization(req);
            const { title, excludeId } = req.query;

            if (!title || title.trim() === '') {
                throw new ValidationError('ต้องระบุชื่อข้อสอบ');
            }

            // Check title availability
            const isAvailable = await this.quizManagementService.checkTitleAvailability(
                title.trim(),
                user.userId,
                excludeId ? parseInt(excludeId) : null
            );

            return this.sendSuccess(res, { available: isAvailable }, 'ตรวจสอบชื่อข้อสอบสำเร็จ');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'checkTitleAvailability',
                userId: req.user?.userId,
                title: req.query?.title
            });

            return this.sendError(res, error);
        }
    }

    /**
     * Private helper methods
     */

    /**
     * Invalidate quiz-related caches
     */
    async invalidateQuizCache(quizId, userId) {
        try {
            const patterns = [
                `quiz:${quizId}:*`,
                `user-quizzes:${userId}:*`,
                `recent-quizzes:${userId}:*`,
                `quiz-statistics:${userId}`
            ];

            await Promise.all(patterns.map(pattern =>
                this.cacheService.deletePattern(pattern)
            ));
        } catch (error) {
            logger.warn('Cache invalidation failed:', { error: error.message });
        }
    }

    /**
     * Invalidate user's quiz caches
     */
    async invalidateUserQuizCache(userId) {
        try {
            const patterns = [
                `user-quizzes:${userId}:*`,
                `recent-quizzes:${userId}:*`,
                `quiz-statistics:${userId}`
            ];

            await Promise.all(patterns.map(pattern =>
                this.cacheService.deletePattern(pattern)
            ));
        } catch (error) {
            logger.warn('User quiz cache invalidation failed:', { error: error.message });
        }
    }
}

export default QuizManagementController;