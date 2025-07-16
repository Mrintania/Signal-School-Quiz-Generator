// backend/src/controllers/quiz/QuizManagementController.js
import BaseController from '../base/BaseController.js';
import { QuizManagementService } from '../../services/quiz/QuizManagementService.js';
import { CacheService } from '../../services/common/CacheService.js';
import { CreateQuizDTO, UpdateQuizDTO } from '../../dto/quiz/CreateQuizDTO.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../errors/CustomErrors.js';
import logger from '../../utils/logger.js';

/**
 * Quiz Management Controller
 * จัดการ CRUD operations ของข้อสอบ
 * แยกออกมาจาก main QuizController เพื่อ Single Responsibility
 */
export class QuizManagementController extends BaseController {
    constructor(quizManagementService, cacheService) {
        super();

        // Inject dependencies
        this.quizManagementService = quizManagementService || new QuizManagementService();
        this.cacheService = cacheService || new CacheService();

        // Bind methods
        this.getAllQuizzes = this.asyncHandler(this.getAllQuizzes.bind(this));
        this.getQuizById = this.asyncHandler(this.getQuizById.bind(this));
        this.createQuiz = this.asyncHandler(this.createQuiz.bind(this));
        this.updateQuiz = this.asyncHandler(this.updateQuiz.bind(this));
        this.deleteQuiz = this.asyncHandler(this.deleteQuiz.bind(this));
        this.renameQuiz = this.asyncHandler(this.renameQuiz.bind(this));
        this.moveQuiz = this.asyncHandler(this.moveQuiz.bind(this));
        this.shareQuiz = this.asyncHandler(this.shareQuiz.bind(this));
        this.getQuizStatistics = this.asyncHandler(this.getQuizStatistics.bind(this));
        this.searchQuizzes = this.asyncHandler(this.searchQuizzes.bind(this));
        this.duplicateQuiz = this.asyncHandler(this.duplicateQuiz.bind(this));
        this.bulkOperations = this.asyncHandler(this.bulkOperations.bind(this));
    }

    /**
     * ดึงรายการข้อสอบทั้งหมดของผู้ใช้
     * GET /api/quiz
     */
    async getAllQuizzes(req, res) {
        try {
            const { page = 1, limit = 20, folderId, category, sortBy, sortOrder } = req.query;
            const pagination = this.validatePagination({ page, limit });

            const filters = {
                folderId: folderId || null,
                category: category || null,
                sortBy: sortBy || 'updated_at',
                sortOrder: sortOrder || 'DESC'
            };

            // Generate cache key
            const cacheKey = `quizzes:${req.user.userId}:${JSON.stringify({ pagination, filters })}`;

            // Try cache first
            const cachedQuizzes = await this.cacheService.get(cacheKey);
            if (cachedQuizzes) {
                logger.debug('Returning cached quizzes', { userId: req.user.userId });
                return this.sendSuccess(res, cachedQuizzes, 'ดึงรายการข้อสอบสำเร็จ (จาก cache)');
            }

            const result = await this.quizManagementService.getUserQuizzes(
                req.user.userId,
                pagination,
                filters
            );

            const paginationMeta = this.createPaginationMeta(
                result.total,
                pagination.page,
                pagination.limit
            );

            const response = {
                quizzes: result.quizzes,
                pagination: paginationMeta,
                filters: filters
            };

            // Cache for 5 minutes
            await this.cacheService.set(cacheKey, response, 300);

            this.logActivity(req.user, 'quiz_list_viewed', {
                total: result.total,
                page: pagination.page,
                filters
            });

            return this.sendSuccess(res, response, 'ดึงรายการข้อสอบสำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถดึงรายการข้อสอบได้');
        }
    }

    /**
     * ดึงข้อมูลข้อสอบตาม ID
     * GET /api/quiz/:id
     */
    async getQuizById(req, res) {
        try {
            const { id } = req.params;
            const { includeStatistics = false } = req.query;

            // Validate required fields
            this.validateRequiredFields(req.params, ['id']);

            // Generate cache key
            const cacheKey = `quiz:${id}:${includeStatistics}`;

            // Try cache first
            const cachedQuiz = await this.cacheService.get(cacheKey);
            if (cachedQuiz) {
                logger.debug('Returning cached quiz', { quizId: id });
                return this.sendSuccess(res, cachedQuiz, 'ดึงข้อมูลข้อสอบสำเร็จ (จาก cache)');
            }

            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);

            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Check if user has access to this quiz
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            let response = quiz;

            // Include statistics if requested
            if (includeStatistics === 'true') {
                const statistics = await this.quizManagementService.getQuizStatistics(id);
                response = {
                    ...quiz,
                    statistics
                };
            }

            // Cache for 10 minutes
            await this.cacheService.set(cacheKey, response, 600);

            // Update last accessed timestamp
            await this.quizManagementService.updateLastAccessed(id);

            this.logActivity(req.user, 'quiz_viewed', {
                quizId: id,
                title: quiz.title,
                includeStatistics
            });

            return this.sendSuccess(res, response, 'ดึงข้อมูลข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถดึงข้อมูลข้อสอบได้');
        }
    }

    /**
     * สร้างข้อสอบใหม่
     * POST /api/quiz
     */
    async createQuiz(req, res) {
        try {
            // Sanitize and validate input
            const sanitizedBody = this.sanitizeInput(req.body);
            const quizData = new CreateQuizDTO(sanitizedBody);

            // Create quiz
            const newQuiz = await this.quizManagementService.createQuiz({
                ...quizData.toJSON(),
                userId: req.user.userId
            });

            // Invalidate related cache
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_created', {
                quizId: newQuiz.id,
                title: newQuiz.title,
                questionCount: newQuiz.questions.length,
                ip: req.ip
            });

            return this.sendSuccess(res, newQuiz, 'สร้างข้อสอบสำเร็จ', 201);

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้างข้อสอบได้');
        }
    }

    /**
     * แก้ไขข้อสอบ
     * PUT /api/quiz/:id
     */
    async updateQuiz(req, res) {
        try {
            const { id } = req.params;

            // Validate required fields
            this.validateRequiredFields(req.params, ['id']);

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้');
            }

            // Sanitize and validate input
            const sanitizedBody = this.sanitizeInput(req.body);
            const updateData = new UpdateQuizDTO(sanitizedBody);

            // Update quiz
            const updatedQuiz = await this.quizManagementService.updateQuiz(
                id,
                updateData.toJSON(),
                req.user.userId
            );

            // Invalidate related cache
            await this.cacheService.delete(`quiz:${id}:*`);
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_updated', {
                quizId: id,
                title: updatedQuiz.title,
                changes: Object.keys(updateData.toJSON()),
                ip: req.ip
            });

            return this.sendSuccess(res, updatedQuiz, 'แก้ไขข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถแก้ไขข้อสอบได้');
        }
    }

    /**
     * ลบข้อสอบ
     * DELETE /api/quiz/:id
     */
    async deleteQuiz(req, res) {
        try {
            const { id } = req.params;
            const { permanent = false } = req.query;

            // Validate required fields
            this.validateRequiredFields(req.params, ['id']);

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์ลบข้อสอบนี้');
            }

            // Get quiz info before deletion for logging
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Delete quiz (soft or hard delete)
            const deleteResult = await this.quizManagementService.deleteQuiz(
                id,
                req.user.userId,
                permanent === 'true'
            );

            // Invalidate related cache
            await this.cacheService.delete(`quiz:${id}:*`);
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_deleted', {
                quizId: id,
                title: quiz.title,
                permanent: permanent === 'true',
                ip: req.ip
            });

            return this.sendSuccess(res, deleteResult, 'ลบข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถลบข้อสอบได้');
        }
    }

    /**
     * เปลี่ยนชื่อข้อสอบ
     * PATCH /api/quiz/:id/rename
     */
    async renameQuiz(req, res) {
        try {
            const { id } = req.params;
            const { title } = req.body;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);
            this.validateRequiredFields(req.body, ['title']);

            if (!title || title.trim().length === 0) {
                throw new ValidationError('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
            }

            if (title.length > 200) {
                throw new ValidationError('ชื่อข้อสอบต้องมีความยาวไม่เกิน 200 ตัวอักษร');
            }

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้');
            }

            // Check for duplicate title
            const isDuplicate = await this.quizManagementService.checkDuplicateTitle(
                title.trim(),
                req.user.userId,
                id
            );

            if (isDuplicate) {
                throw new ValidationError('ชื่อข้อสอบนี้มีอยู่แล้ว');
            }

            // Rename quiz
            const renamedQuiz = await this.quizManagementService.renameQuiz(
                id,
                title.trim(),
                req.user.userId
            );

            // Invalidate related cache
            await this.cacheService.delete(`quiz:${id}:*`);
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_renamed', {
                quizId: id,
                newTitle: title.trim(),
                ip: req.ip
            });

            return this.sendSuccess(res, renamedQuiz, 'เปลี่ยนชื่อข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถเปลี่ยนชื่อข้อสอบได้');
        }
    }

    /**
     * ย้ายข้อสอบไปโฟลเดอร์
     * PATCH /api/quiz/:id/move
     */
    async moveQuiz(req, res) {
        try {
            const { id } = req.params;
            const { folderId } = req.body;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์ย้ายข้อสอบนี้');
            }

            // If folderId is provided, validate folder exists and belongs to user
            if (folderId) {
                const folderExists = await this.quizManagementService.checkFolderAccess(
                    folderId,
                    req.user.userId
                );

                if (!folderExists) {
                    throw new ValidationError('ไม่พบโฟลเดอร์ที่ระบุหรือคุณไม่มีสิทธิ์เข้าถึง');
                }
            }

            // Move quiz
            const movedQuiz = await this.quizManagementService.moveQuiz(
                id,
                folderId,
                req.user.userId
            );

            // Invalidate related cache
            await this.cacheService.delete(`quiz:${id}:*`);
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_moved', {
                quizId: id,
                targetFolderId: folderId,
                ip: req.ip
            });

            return this.sendSuccess(res, movedQuiz, 'ย้ายข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถย้ายข้อสอบได้');
        }
    }

    /**
     * แชร์ข้อสอบ
     * POST /api/quiz/:id/share
     */
    async shareQuiz(req, res) {
        try {
            const { id } = req.params;
            const { emails, permissions, message, expiresAt } = req.body;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                throw new ValidationError('ต้องระบุอีเมลผู้รับอย่างน้อย 1 คน');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalidEmails = emails.filter(email => !emailRegex.test(email));
            if (invalidEmails.length > 0) {
                throw new ValidationError(`อีเมลไม่ถูกต้อง: ${invalidEmails.join(', ')}`);
            }

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์แชร์ข้อสอบนี้');
            }

            // Share quiz
            const shareResult = await this.quizManagementService.shareQuiz(
                id,
                {
                    emails,
                    permissions: permissions || 'view',
                    message: message || '',
                    expiresAt: expiresAt ? new Date(expiresAt) : null
                },
                req.user.userId
            );

            this.logActivity(req.user, 'quiz_shared', {
                quizId: id,
                recipients: emails.length,
                permissions: permissions || 'view',
                hasMessage: !!message,
                hasExpiry: !!expiresAt,
                ip: req.ip
            });

            return this.sendSuccess(res, shareResult, 'แชร์ข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถแชร์ข้อสอบได้');
        }
    }

    /**
     * ดึงสถิติของข้อสอบ
     * GET /api/quiz/:id/statistics
     */
    async getQuizStatistics(req, res) {
        try {
            const { id } = req.params;

            // Validate required fields
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์ดูสถิติของข้อสอบนี้');
            }

            // Generate cache key
            const cacheKey = `quiz:${id}:statistics`;

            // Try cache first
            const cachedStats = await this.cacheService.get(cacheKey);
            if (cachedStats) {
                return this.sendSuccess(res, cachedStats, 'ดึงสถิติข้อสอบสำเร็จ (จาก cache)');
            }

            const statistics = await this.quizManagementService.getQuizStatistics(id);

            // Cache for 10 minutes
            await this.cacheService.set(cacheKey, statistics, 600);

            this.logActivity(req.user, 'quiz_statistics_viewed', {
                quizId: id
            });

            return this.sendSuccess(res, statistics, 'ดึงสถิติข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถดึงสถิติข้อสอบได้');
        }
    }

    /**
     * ค้นหาข้อสอบ
     * GET /api/quiz/search
     */
    async searchQuizzes(req, res) {
        try {
            const { q, page = 1, limit = 20, category, difficulty } = req.query;

            if (!q || q.trim().length < 2) {
                throw new ValidationError('คำค้นหาต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
            }

            const pagination = this.validatePagination({ page, limit });
            const filters = {
                category: category || null,
                difficulty: difficulty || null
            };

            const searchResults = await this.quizManagementService.searchQuizzes(
                q.trim(),
                req.user.userId,
                pagination,
                filters
            );

            const paginationMeta = this.createPaginationMeta(
                searchResults.total,
                pagination.page,
                pagination.limit
            );

            this.logActivity(req.user, 'quiz_search', {
                query: q.trim(),
                resultCount: searchResults.total,
                filters
            });

            return this.sendSuccess(res, {
                quizzes: searchResults.quizzes,
                pagination: paginationMeta,
                searchQuery: q.trim(),
                filters
            }, 'ค้นหาข้อสอบสำเร็จ');

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถค้นหาข้อสอบได้');
        }
    }

    /**
     * คัดลอกข้อสอบ
     * POST /api/quiz/:id/duplicate
     */
    async duplicateQuiz(req, res) {
        try {
            const { id } = req.params;
            const { title, folderId } = req.body;

            // Validate required fields
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์คัดลอกข้อสอบนี้');
            }

            // Duplicate quiz
            const duplicatedQuiz = await this.quizManagementService.duplicateQuiz(
                id,
                {
                    title: title || null,
                    folderId: folderId || null
                },
                req.user.userId
            );

            // Invalidate related cache
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);

            this.logActivity(req.user, 'quiz_duplicated', {
                originalQuizId: id,
                newQuizId: duplicatedQuiz.id,
                newTitle: duplicatedQuiz.title,
                ip: req.ip
            });

            return this.sendSuccess(res, duplicatedQuiz, 'คัดลอกข้อสอบสำเร็จ', 201);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถคัดลอกข้อสอบได้');
        }
    }

    /**
     * การดำเนินการแบบ bulk (หลายรายการพร้อมกัน)
     * POST /api/quiz/bulk
     */
    async bulkOperations(req, res) {
        try {
            const { action, quizIds, data } = req.body;

            // Validate input
            if (!action || !quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
                throw new ValidationError('ต้องระบุการกระทำและรายการข้อสอบ');
            }

            const validActions = ['delete', 'move', 'updateCategory', 'updateTags'];
            if (!validActions.includes(action)) {
                throw new ValidationError('การกระทำไม่ถูกต้อง');
            }

            // Execute bulk operation
            const result = await this.quizManagementService.bulkOperation(
                action,
                quizIds,
                data || {},
                req.user.userId
            );

            // Invalidate related cache
            await this.cacheService.invalidatePattern(`quizzes:${req.user.userId}:*`);
            for (const quizId of quizIds) {
                await this.cacheService.delete(`quiz:${quizId}:*`);
            }

            this.logActivity(req.user, 'quiz_bulk_operation', {
                action,
                quizCount: quizIds.length,
                successCount: result.successCount,
                failureCount: result.failureCount,
                ip: req.ip
            });

            return this.sendSuccess(res, result, `ดำเนินการ bulk ${action} สำเร็จ`);

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถดำเนินการ bulk ได้');
        }
    }
}

export default QuizManagementController;