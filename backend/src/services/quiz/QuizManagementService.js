// backend/src/services/quiz/QuizManagementService.js
import { QuizRepository } from '../../repositories/QuizRepository.js';
import { UserRepository } from '../../repositories/UserRepository.js';
import { FolderRepository } from '../../repositories/FolderRepository.js';
import { CacheService } from '../common/CacheService.js';
import { EmailService } from '../common/EmailService.js';
import { QuizValidator } from '../../utils/quiz/QuizValidator.js';
import { QuizFormatter } from '../../utils/quiz/QuizFormatter.js';
import logger from '../../utils/common/Logger.js';
import { ValidationError, NotFoundError, UnauthorizedError, BusinessLogicError } from '../../errors/CustomErrors.js';

/**
 * Quiz Management Service
 * จัดการ business logic ของการจัดการข้อสอบ
 * CRUD operations, sharing, permissions, analytics
 */
export class QuizManagementService {
    constructor(dependencies = {}) {
        // Inject dependencies
        this.quizRepository = dependencies.quizRepository || new QuizRepository();
        this.userRepository = dependencies.userRepository || new UserRepository();
        this.folderRepository = dependencies.folderRepository || new FolderRepository();
        this.cacheService = dependencies.cacheService || new CacheService();
        this.emailService = dependencies.emailService || new EmailService();
        this.quizValidator = dependencies.quizValidator || new QuizValidator();
        this.quizFormatter = dependencies.quizFormatter || new QuizFormatter();

        // Configuration
        this.config = {
            maxQuizzesPerUser: 1000,
            maxQuestionsPerQuiz: 100,
            defaultCacheExpiry: 600, // 10 minutes
            shareTokenExpiry: 86400 * 7, // 7 days
            maxTagsPerQuiz: 10,
            maxTitleLength: 255,
            maxDescriptionLength: 1000,
            bulkOperationLimit: 50
        };
    }

    /**
     * ดึงรายการข้อสอบของผู้ใช้
     */
    async getUserQuizzes(userId, pagination = {}, filters = {}) {
        try {
            const { limit = 20, offset = 0 } = pagination;
            const { 
                folderId, 
                category, 
                status = 'active',
                search,
                sortBy = 'updated_at', 
                sortOrder = 'DESC' 
            } = filters;

            // Validate user
            await this.validateUser(userId);

            // Build query options
            const queryOptions = {
                limit,
                offset,
                folderId,
                category,
                status,
                search,
                sortBy,
                sortOrder
            };

            // Get quizzes and total count
            const [quizzes, total] = await Promise.all([
                this.quizRepository.findByUserId(userId, queryOptions),
                this.quizRepository.countByUserId(userId, queryOptions)
            ]);

            // Format quizzes
            const formattedQuizzes = await Promise.all(
                quizzes.map(quiz => this.quizFormatter.formatQuiz(quiz))
            );

            logger.business('getUserQuizzes', {
                userId,
                total,
                filters: Object.keys(filters).filter(key => filters[key])
            });

            return {
                data: formattedQuizzes,
                pagination: {
                    total,
                    page: Math.floor(offset / limit) + 1,
                    limit,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getUserQuizzes',
                userId,
                filters
            });
            throw error;
        }
    }

    /**
     * ดึงข้อสอบตาม ID
     */
    async getQuizById(quizId, userId) {
        try {
            // Validate inputs
            if (!quizId || !userId) {
                throw new ValidationError('Quiz ID and User ID are required');
            }

            // Get quiz with questions
            const quiz = await this.quizRepository.findWithQuestions(quizId);

            if (!quiz) {
                throw new NotFoundError('ไม่พบข้อสอบที่ระบุ');
            }

            // Check ownership or access permission
            if (quiz.user_id !== userId && !quiz.is_public) {
                throw new UnauthorizedError('ไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Format quiz
            const formattedQuiz = await this.quizFormatter.formatQuiz(quiz);

            logger.business('getQuizById', { quizId, userId, hasQuestions: !!quiz.questions });

            return formattedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getQuizById',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * สร้างข้อสอบใหม่
     */
    async createQuiz(quizData) {
        try {
            // Validate quiz data
            await this.quizValidator.validateQuizData(quizData);

            // Check user's quiz limit
            await this.checkUserQuizLimit(quizData.userId);

            // Check title availability
            const titleAvailable = await this.checkTitleAvailability(
                quizData.title, 
                quizData.userId
            );

            if (!titleAvailable) {
                throw new BusinessLogicError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
            }

            // Prepare quiz data for database
            const dbQuizData = {
                title: quizData.title,
                topic: quizData.topic || '',
                description: quizData.description || '',
                category: quizData.category || 'general',
                question_type: quizData.questionType || 'multiple_choice',
                question_count: quizData.questions?.length || 0,
                difficulty_level: quizData.difficultyLevel || 'medium',
                time_limit: quizData.timeLimit || null,
                user_id: quizData.userId,
                folder_id: quizData.folderId || null,
                status: quizData.status || 'draft',
                is_public: quizData.isPublic || false,
                tags: JSON.stringify(quizData.tags || []),
                settings: JSON.stringify(quizData.settings || {}),
                created_at: new Date(),
                updated_at: new Date()
            };

            // Create quiz with questions
            const createdQuiz = await this.quizRepository.createWithQuestions(
                dbQuizData,
                quizData.questions || []
            );

            // Clear user's quiz cache
            await this.clearUserQuizCache(quizData.userId);

            // Log creation
            logger.business('createQuiz', {
                quizId: createdQuiz.id,
                userId: quizData.userId,
                title: quizData.title,
                questionCount: quizData.questions?.length || 0
            });

            return createdQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'createQuiz',
                userId: quizData?.userId,
                title: quizData?.title
            });
            throw error;
        }
    }

    /**
     * แก้ไขข้อสอบ
     */
    async updateQuiz(quizId, userId, updateData) {
        try {
            // Validate access
            const quiz = await this.validateQuizAccess(quizId, userId);

            // Validate update data
            await this.quizValidator.validateUpdateData(updateData);

            // Check title availability if title is being updated
            if (updateData.title && updateData.title !== quiz.title) {
                const titleAvailable = await this.checkTitleAvailability(
                    updateData.title,
                    userId,
                    quizId
                );

                if (!titleAvailable) {
                    throw new BusinessLogicError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
                }
            }

            // Prepare update data
            const dbUpdateData = this.prepareUpdateData(updateData);

            // Update quiz
            const updatedQuiz = await this.quizRepository.update(quizId, dbUpdateData);

            // Clear caches
            await this.clearQuizCaches(quizId, userId);

            // Log update
            logger.business('updateQuiz', {
                quizId,
                userId,
                updatedFields: Object.keys(updateData)
            });

            return updatedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateQuiz',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * ลบข้อสอบ
     */
    async deleteQuiz(quizId, userId) {
        try {
            // Validate access
            await this.validateQuizAccess(quizId, userId);

            // Soft delete quiz
            const result = await this.quizRepository.softDelete(quizId);

            // Clear caches
            await this.clearQuizCaches(quizId, userId);

            // Log deletion
            logger.business('deleteQuiz', { quizId, userId });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'deleteQuiz',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * เปลี่ยนชื่อข้อสอบ
     */
    async renameQuiz(quizId, newTitle, userId) {
        try {
            // Validate inputs
            if (!newTitle || newTitle.trim().length === 0) {
                throw new ValidationError('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
            }

            if (newTitle.length > this.config.maxTitleLength) {
                throw new ValidationError(`ชื่อข้อสอบต้องไม่เกิน ${this.config.maxTitleLength} ตัวอักษร`);
            }

            // Validate access
            await this.validateQuizAccess(quizId, userId);

            // Check title availability
            const titleAvailable = await this.checkTitleAvailability(newTitle, userId, quizId);
            if (!titleAvailable) {
                throw new BusinessLogicError('ชื่อข้อสอบนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
            }

            // Update quiz
            const updatedQuiz = await this.quizRepository.update(quizId, {
                title: newTitle.trim(),
                updated_at: new Date()
            });

            // Clear caches
            await this.clearQuizCaches(quizId, userId);

            logger.business('renameQuiz', { quizId, userId, newTitle });

            return updatedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'renameQuiz',
                quizId,
                userId,
                newTitle
            });
            throw error;
        }
    }

    /**
     * ย้ายข้อสอบไปยังโฟลเดอร์
     */
    async moveQuiz(quizId, folderId, userId) {
        try {
            // Validate access
            await this.validateQuizAccess(quizId, userId);

            // Validate folder if specified
            if (folderId) {
                await this.validateFolderAccess(folderId, userId);
            }

            // Move quiz
            const updatedQuiz = await this.quizRepository.moveToFolder(quizId, folderId, userId);

            // Clear caches
            await this.clearQuizCaches(quizId, userId);

            logger.business('moveQuiz', { quizId, userId, folderId });

            return updatedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'moveQuiz',
                quizId,
                userId,
                folderId
            });
            throw error;
        }
    }

    /**
     * ทำสำเนาข้อสอบ
     */
    async duplicateQuiz(quizId, userId, newTitle = null) {
        try {
            // Validate access
            await this.validateQuizAccess(quizId, userId);

            // Check user's quiz limit
            await this.checkUserQuizLimit(userId);

            // Duplicate quiz
            const duplicatedQuiz = await this.quizRepository.duplicateQuiz(
                quizId,
                userId,
                newTitle
            );

            // Clear user's quiz cache
            await this.clearUserQuizCache(userId);

            logger.business('duplicateQuiz', {
                originalQuizId: quizId,
                newQuizId: duplicatedQuiz.id,
                userId,
                newTitle
            });

            return duplicatedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'duplicateQuiz',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * แชร์ข้อสอบ
     */
    async shareQuiz(quizId, userId, shareOptions) {
        try {
            const { shareType, recipients = [], message = '' } = shareOptions;

            // Validate access
            const quiz = await this.validateQuizAccess(quizId, userId);

            // Generate share token
            const shareToken = this.generateShareToken();
            const shareExpiry = new Date(Date.now() + this.config.shareTokenExpiry * 1000);

            // Create share record
            const shareRecord = {
                quiz_id: quizId,
                shared_by: userId,
                share_type: shareType,
                share_token: shareToken,
                expires_at: shareExpiry,
                message,
                created_at: new Date()
            };

            // Save share record (assuming we have a shares table)
            // const shareId = await this.shareRepository.create(shareRecord);

            // Send notifications based on share type
            if (shareType === 'email' && recipients.length > 0) {
                await this.sendShareNotifications(quiz, recipients, shareToken, message);
            }

            logger.business('shareQuiz', {
                quizId,
                userId,
                shareType,
                recipientCount: recipients.length
            });

            return {
                shareToken,
                shareUrl: this.generateShareUrl(shareToken),
                expiresAt: shareExpiry,
                shareType
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'shareQuiz',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * ค้นหาข้อสอบ
     */
    async searchQuizzes(searchParams) {
        try {
            const {
                query,
                userId,
                category,
                difficulty,
                questionType,
                status,
                folderId,
                page = 1,
                limit = 20,
                sortBy = 'updated_at',
                sortOrder = 'DESC'
            } = searchParams;

            const offset = (page - 1) * limit;

            // Validate user
            await this.validateUser(userId);

            // Search quizzes
            const [quizzes, total] = await Promise.all([
                this.quizRepository.searchQuizzes(query, userId, {
                    category,
                    folderId,
                    limit,
                    offset
                }),
                this.quizRepository.countByUserId(userId, {
                    search: query,
                    category,
                    folderId,
                    status
                })
            ]);

            // Format results
            const formattedQuizzes = await Promise.all(
                quizzes.map(quiz => this.quizFormatter.formatQuiz(quiz))
            );

            logger.business('searchQuizzes', {
                userId,
                query,
                resultCount: quizzes.length
            });

            return {
                data: formattedQuizzes,
                pagination: {
                    total,
                    page,
                    limit,
                    hasNext: offset + limit < total,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'searchQuizzes',
                userId: searchParams?.userId,
                query: searchParams?.query
            });
            throw error;
        }
    }

    /**
     * ดึงข้อสอบล่าสุด
     */
    async getRecentQuizzes(userId, limit = 5) {
        try {
            // Validate user
            await this.validateUser(userId);

            // Get recent quizzes
            const quizzes = await this.quizRepository.findRecentByUserId(userId, limit);

            // Format quizzes
            const formattedQuizzes = await Promise.all(
                quizzes.map(quiz => this.quizFormatter.formatQuiz(quiz))
            );

            logger.business('getRecentQuizzes', { userId, count: quizzes.length });

            return formattedQuizzes;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getRecentQuizzes',
                userId
            });
            throw error;
        }
    }

    /**
     * ดึงสถิติผู้ใช้
     */
    async getUserStatistics(userId) {
        try {
            // Validate user
            await this.validateUser(userId);

            // Get statistics
            const stats = await this.quizRepository.getUserQuizStatistics(userId);

            // Additional calculations
            const enhancedStats = {
                ...stats,
                productivity: {
                    quizzesThisWeek: stats.this_week,
                    quizzesThisMonth: stats.this_month,
                    averageQuestionsPerQuiz: Math.round(stats.avg_questions || 0)
                },
                activity: {
                    lastActivity: stats.last_created,
                    isActive: stats.this_week > 0,
                    streak: await this.calculateUserStreak(userId)
                }
            };

            logger.business('getUserStatistics', { userId });

            return enhancedStats;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getUserStatistics',
                userId
            });
            throw error;
        }
    }

    /**
     * การดำเนินการหลายรายการ
     */
    async bulkOperation(operation, quizIds, userId, options = {}) {
        try {
            // Validate inputs
            if (!Array.isArray(quizIds) || quizIds.length === 0) {
                throw new ValidationError('Quiz IDs are required');
            }

            if (quizIds.length > this.config.bulkOperationLimit) {
                throw new ValidationError(`จำนวน Quiz IDs ต้องไม่เกิน ${this.config.bulkOperationLimit} รายการ`);
            }

            let result = { affected: 0, errors: [] };

            switch (operation) {
                case 'delete':
                    result = await this.quizRepository.bulkDelete(quizIds, userId);
                    break;

                case 'move':
                    const { targetFolderId } = options;
                    result = await this.bulkMoveQuizzes(quizIds, targetFolderId, userId);
                    break;

                case 'archive':
                    result = await this.bulkUpdateStatus(quizIds, 'archived', userId);
                    break;

                case 'publish':
                    result = await this.bulkUpdateStatus(quizIds, 'published', userId);
                    break;

                default:
                    throw new ValidationError(`Unsupported operation: ${operation}`);
            }

            // Clear user's quiz cache
            await this.clearUserQuizCache(userId);

            logger.business('bulkOperation', {
                operation,
                userId,
                quizCount: quizIds.length,
                affected: result.affected
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'bulkOperation',
                bulkOperation: operation,
                userId,
                quizCount: quizIds?.length || 0
            });
            throw error;
        }
    }

    /**
     * แก้ไขคำถามในข้อสอบ
     */
    async updateQuizQuestions(quizId, questions, userId) {
        try {
            // Validate access
            await this.validateQuizAccess(quizId, userId);

            // Validate questions
            await this.quizValidator.validateQuestions(questions);

            if (questions.length > this.config.maxQuestionsPerQuiz) {
                throw new ValidationError(`จำนวนคำถามต้องไม่เกิน ${this.config.maxQuestionsPerQuiz} ข้อ`);
            }

            // Update quiz questions
            const updatedQuiz = await this.quizRepository.updateQuestions(quizId, questions);

            // Clear caches
            await this.clearQuizCaches(quizId, userId);

            logger.business('updateQuizQuestions', {
                quizId,
                userId,
                questionCount: questions.length
            });

            return updatedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateQuizQuestions',
                quizId,
                userId
            });
            throw error;
        }
    }

    /**
     * ตรวจสอบความพร้อมใช้งานของชื่อข้อสอบ
     */
    async checkTitleAvailability(title, userId, excludeQuizId = null) {
        try {
            return await this.quizRepository.isTitleAvailable(title, userId, excludeQuizId);
        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'checkTitleAvailability',
                title,
                userId
            });
            return false;
        }
    }

    /**
     * Private helper methods
     */

    /**
     * ตรวจสอบผู้ใช้
     */
    async validateUser(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('ไม่พบผู้ใช้');
        }

        return user;
    }

    /**
     * ตรวจสอบสิทธิ์เข้าถึงข้อสอบ
     */
    async validateQuizAccess(quizId, userId) {
        const quiz = await this.quizRepository.findByIdAndUserId(quizId, userId);
        if (!quiz) {
            throw new NotFoundError('ไม่พบข้อสอบหรือไม่มีสิทธิ์เข้าถึง');
        }
        return quiz;
    }

    /**
     * ตรวจสอบสิทธิ์เข้าถึงโฟลเดอร์
     */
    async validateFolderAccess(folderId, userId) {
        const folder = await this.folderRepository.findByIdAndUserId(folderId, userId);
        if (!folder) {
            throw new NotFoundError('ไม่พบโฟลเดอร์หรือไม่มีสิทธิ์เข้าถึง');
        }
        return folder;
    }

    /**
     * ตรวจสอบขีดจำกัดข้อสอบของผู้ใช้
     */
    async checkUserQuizLimit(userId) {
        const userQuizCount = await this.quizRepository.countByUserId(userId, { status: 'active' });
        
        if (userQuizCount >= this.config.maxQuizzesPerUser) {
            throw new BusinessLogicError(`จำนวนข้อสอบเกินขีดจำกัด (สูงสุด ${this.config.maxQuizzesPerUser} ข้อสอบ)`);
        }
    }

    /**
     * เตรียมข้อมูลสำหรับการอัพเดท
     */
    prepareUpdateData(updateData) {
        const dbData = {};

        // Map frontend fields to database fields
        const fieldMapping = {
            title: 'title',
            topic: 'topic',
            description: 'description',
            category: 'category',
            questionType: 'question_type',
            difficultyLevel: 'difficulty_level',
            timeLimit: 'time_limit',
            status: 'status',
            isPublic: 'is_public',
            folderId: 'folder_id'
        };

        Object.keys(updateData).forEach(key => {
            if (fieldMapping[key] && updateData[key] !== undefined) {
                dbData[fieldMapping[key]] = updateData[key];
            }
        });

        // Handle special fields
        if (updateData.tags) {
            dbData.tags = JSON.stringify(updateData.tags);
        }

        if (updateData.settings) {
            dbData.settings = JSON.stringify(updateData.settings);
        }

        // Always update timestamp
        dbData.updated_at = new Date();

        return dbData;
    }

    /**
     * ล้าง cache ที่เกี่ยวข้องกับข้อสอบ
     */
    async clearQuizCaches(quizId, userId) {
        try {
            const patterns = [
                `quiz:${quizId}:*`,
                `user-quizzes:${userId}:*`,
                `recent-quizzes:${userId}:*`,
                `quiz-statistics:${userId}`
            ];

            await Promise.all(
                patterns.map(pattern => this.cacheService.deletePattern(pattern))
            );
        } catch (error) {
            logger.warn('Failed to clear quiz caches:', { error: error.message });
        }
    }

    /**
     * ล้าง cache ของผู้ใช้
     */
    async clearUserQuizCache(userId) {
        try {
            const patterns = [
                `user-quizzes:${userId}:*`,
                `recent-quizzes:${userId}:*`,
                `quiz-statistics:${userId}`
            ];

            await Promise.all(
                patterns.map(pattern => this.cacheService.deletePattern(pattern))
            );
        } catch (error) {
            logger.warn('Failed to clear user quiz cache:', { error: error.message });
        }
    }

    /**
     * สร้าง share token
     */
    generateShareToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * สร้าง share URL
     */
    generateShareUrl(shareToken) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return `${baseUrl}/quiz/shared/${shareToken}`;
    }

    /**
     * ส่งการแจ้งเตือนการแชร์
     */
    async sendShareNotifications(quiz, recipients, shareToken, message) {
        try {
            const shareUrl = this.generateShareUrl(shareToken);
            
            for (const email of recipients) {
                await this.emailService.sendQuizShareNotification(email, {
                    quizTitle: quiz.title,
                    shareUrl,
                    message,
                    senderName: quiz.user_name || 'ผู้ใช้'
                });
            }
        } catch (error) {
            logger.warn('Failed to send share notifications:', { error: error.message });
        }
    }

    /**
     * คำนวณ streak ของผู้ใช้
     */
    async calculateUserStreak(userId) {
        // Implementation for calculating user's quiz creation streak
        // This would typically involve querying quiz creation dates
        return 0; // Placeholder
    }

    /**
     * การย้ายข้อสอบหลายรายการ
     */
    async bulkMoveQuizzes(quizIds, targetFolderId, userId) {
        try {
            let moved = 0;
            const errors = [];

            for (const quizId of quizIds) {
                try {
                    await this.moveQuiz(quizId, targetFolderId, userId);
                    moved++;
                } catch (error) {
                    errors.push({ quizId, error: error.message });
                }
            }

            return { affected: moved, errors };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'bulkMoveQuizzes',
                userId,
                quizCount: quizIds.length
            });
            throw error;
        }
    }

    /**
     * การอัพเดทสถานะหลายรายการ
     */
    async bulkUpdateStatus(quizIds, status, userId) {
        try {
            let updated = 0;
            const errors = [];

            for (const quizId of quizIds) {
                try {
                    await this.updateQuiz(quizId, userId, { status });
                    updated++;
                } catch (error) {
                    errors.push({ quizId, error: error.message });
                }
            }

            return { affected: updated, errors };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'bulkUpdateStatus',
                status,
                userId,
                quizCount: quizIds.length
            });
            throw error;
        }
    }
}

export default QuizManagementService;