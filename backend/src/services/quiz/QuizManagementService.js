// backend/src/services/quiz/QuizManagementService.js
import { QuizRepository } from '../../repositories/QuizRepository.js';
import { UserRepository } from '../../repositories/UserRepository.js';
import { FolderRepository } from '../../repositories/FolderRepository.js';
import { CacheService } from '../common/CacheService.js';
import { EmailService } from '../common/EmailService.js';
import { QuizValidator } from '../../utils/quiz/QuizValidator.js';
import logger from '../../utils/logger.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../errors/CustomErrors.js';

/**
 * Quiz Management Service
 * จัดการ business logic ของการจัดการข้อสอบ
 * CRUD operations, sharing, permissions, etc.
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

        // Configuration
        this.config = {
            maxQuizzesPerUser: 1000,
            maxQuestionsPerQuiz: 100,
            defaultCacheExpiry: 600, // 10 minutes
            shareTokenExpiry: 86400 * 7, // 7 days
        };
    }

    /**
     * ดึงรายการข้อสอบของผู้ใช้
     * @param {string} userId - User ID
     * @param {Object} pagination - Pagination options
     * @param {Object} filters - Filter options
     * @returns {Object} User's quizzes with pagination
     */
    async getUserQuizzes(userId, pagination = {}, filters = {}) {
        try {
            const { limit = 20, offset = 0 } = pagination;
            const { folderId, category, sortBy = 'updated_at', sortOrder = 'DESC' } = filters;

            // Build query options
            const queryOptions = {
                limit,
                offset,
                orderBy: sortBy,
                orderDirection: sortOrder
            };

            // Build conditions
            const conditions = {
                user_id: userId,
                deleted_at: null
            };

            if (folderId) {
                conditions.folder_id = folderId;
            }

            if (category) {
                conditions.category = category;
            }

            // Get quizzes and total count
            const [quizzes, total] = await Promise.all([
                this.quizRepository.findAll(conditions, queryOptions),
                this.quizRepository.count(conditions)
            ]);

            // Format quiz data
            const formattedQuizzes = quizzes.map(quiz => this.formatQuizSummary(quiz));

            logger.debug('Retrieved user quizzes', {
                userId,
                total,
                returned: formattedQuizzes.length,
                filters
            });

            return {
                quizzes: formattedQuizzes,
                total
            };

        } catch (error) {
            logger.error('Error retrieving user quizzes:', {
                userId,
                error: error.message,
                pagination,
                filters
            });
            throw error;
        }
    }

    /**
     * ดึงข้อมูลข้อสอบตาม ID
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Object|null} Quiz data
     */
    async getQuizById(quizId, userId) {
        try {
            const quiz = await this.quizRepository.findWithDetails(quizId);

            if (!quiz || quiz.deleted_at) {
                return null;
            }

            // Check if user has access
            const hasAccess = await this.checkQuizAccess(quizId, userId);
            if (!hasAccess) {
                throw new UnauthorizedError('Access denied to this quiz');
            }

            // Format quiz data
            const formattedQuiz = this.formatQuizDetail(quiz);

            logger.debug('Retrieved quiz by ID', {
                quizId,
                userId,
                title: quiz.title
            });

            return formattedQuiz;

        } catch (error) {
            logger.error('Error retrieving quiz by ID:', {
                quizId,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * สร้างข้อสอบใหม่
     * @param {Object} quizData - Quiz data
     * @returns {Object} Created quiz
     */
    async createQuiz(quizData) {
        const transaction = await this.quizRepository.beginTransaction();

        try {
            const { userId, title, description, questions, folderId, tags, category, ...otherData } = quizData;

            // Validate user exists
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError('User not found');
            }

            // Check user's quiz limit
            const userQuizCount = await this.quizRepository.count({ user_id: userId });
            if (userQuizCount >= this.config.maxQuizzesPerUser) {
                throw new ValidationError(`Quiz limit exceeded. Maximum ${this.config.maxQuizzesPerUser} quizzes per user`);
            }

            // Validate folder if specified
            if (folderId) {
                const folderAccess = await this.checkFolderAccess(folderId, userId);
                if (!folderAccess) {
                    throw new ValidationError('Invalid folder or no access to specified folder');
                }
            }

            // Check for duplicate title
            const isDuplicate = await this.quizRepository.isDuplicateTitle(title, userId);
            if (isDuplicate) {
                throw new ValidationError('Quiz with this title already exists');
            }

            // Validate questions
            const validationResult = this.quizValidator.validateQuizQuestions(questions);
            if (!validationResult.isValid) {
                throw new ValidationError(`Question validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Prepare quiz data for database
            const quizRecord = {
                user_id: userId,
                title: title.trim(),
                description: description ? description.trim() : '',
                questions: JSON.stringify(questions),
                folder_id: folderId || null,
                tags: JSON.stringify(tags || []),
                category: category || '',
                question_count: questions.length,
                estimated_time: this.calculateEstimatedTime(questions),
                difficulty: this.analyzeDifficulty(questions),
                generation_source: 'manual',
                status: 'active',
                ...otherData
            };

            // Create quiz in database
            const createdQuiz = await this.quizRepository.executeInTransaction(
                transaction,
                `INSERT INTO quizzes (${Object.keys(quizRecord).join(', ')}) VALUES (${Object.keys(quizRecord).map(() => '?').join(', ')})`,
                Object.values(quizRecord)
            );

            const quizId = createdQuiz.insertId;

            // Create activity log
            await this.createActivityLog(transaction, userId, 'quiz_created', {
                quiz_id: quizId,
                title: title
            });

            await this.quizRepository.commitTransaction(transaction);

            // Get the complete created quiz
            const newQuiz = await this.getQuizById(quizId, userId);

            logger.info('Quiz created successfully', {
                quizId,
                userId,
                title: title,
                questionCount: questions.length
            });

            return newQuiz;

        } catch (error) {
            await this.quizRepository.rollbackTransaction(transaction);
            logger.error('Error creating quiz:', {
                userId: quizData.userId,
                title: quizData.title,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * แก้ไขข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Object} Updated quiz
     */
    async updateQuiz(quizId, updateData, userId) {
        const transaction = await this.quizRepository.beginTransaction();

        try {
            // Check if quiz exists and user has permission
            const existingQuiz = await this.quizRepository.findById(quizId);
            if (!existingQuiz || existingQuiz.deleted_at) {
                throw new NotFoundError('Quiz not found');
            }

            const hasPermission = await this.checkQuizEditPermission(quizId, userId);
            if (!hasPermission) {
                throw new UnauthorizedError('No permission to edit this quiz');
            }

            // Validate update data
            const allowedFields = [
                'title', 'description', 'questions', 'tags', 'category',
                'isPublic', 'timeLimit', 'allowRetake', 'shuffleQuestions', 'showResults'
            ];

            const sanitizedData = {};
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    sanitizedData[key] = value;
                }
            }

            // Special handling for specific fields
            if (sanitizedData.title) {
                // Check for duplicate title (excluding current quiz)
                const isDuplicate = await this.quizRepository.isDuplicateTitle(
                    sanitizedData.title,
                    userId,
                    quizId
                );
                if (isDuplicate) {
                    throw new ValidationError('Quiz with this title already exists');
                }
                sanitizedData.title = sanitizedData.title.trim();
            }

            if (sanitizedData.questions) {
                // Validate questions
                const validationResult = this.quizValidator.validateQuizQuestions(sanitizedData.questions);
                if (!validationResult.isValid) {
                    throw new ValidationError(`Question validation failed: ${validationResult.errors.join(', ')}`);
                }

                sanitizedData.questions = JSON.stringify(sanitizedData.questions);
                sanitizedData.question_count = sanitizedData.questions.length;
                sanitizedData.estimated_time = this.calculateEstimatedTime(sanitizedData.questions);
                sanitizedData.difficulty = this.analyzeDifficulty(sanitizedData.questions);
            }

            if (sanitizedData.tags) {
                sanitizedData.tags = JSON.stringify(sanitizedData.tags);
            }

            // Update quiz in database
            if (Object.keys(sanitizedData).length > 0) {
                await this.quizRepository.executeInTransaction(
                    transaction,
                    `UPDATE quizzes SET ${Object.keys(sanitizedData).map(key => `${key} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [...Object.values(sanitizedData), quizId]
                );

                // Create activity log
                await this.createActivityLog(transaction, userId, 'quiz_updated', {
                    quiz_id: quizId,
                    fields: Object.keys(sanitizedData)
                });
            }

            await this.quizRepository.commitTransaction(transaction);

            // Get updated quiz
            const updatedQuiz = await this.getQuizById(quizId, userId);

            logger.info('Quiz updated successfully', {
                quizId,
                userId,
                updatedFields: Object.keys(sanitizedData)
            });

            return updatedQuiz;

        } catch (error) {
            await this.quizRepository.rollbackTransaction(transaction);
            logger.error('Error updating quiz:', {
                quizId,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * ลบข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @param {boolean} permanent - Permanent delete flag
     * @returns {Object} Delete result
     */
    async deleteQuiz(quizId, userId, permanent = false) {
        const transaction = await this.quizRepository.beginTransaction();

        try {
            // Check if quiz exists and user has permission
            const existingQuiz = await this.quizRepository.findById(quizId);
            if (!existingQuiz || (!permanent && existingQuiz.deleted_at)) {
                throw new NotFoundError('Quiz not found');
            }

            const hasPermission = await this.checkQuizEditPermission(quizId, userId);
            if (!hasPermission) {
                throw new UnauthorizedError('No permission to delete this quiz');
            }

            let result;

            if (permanent) {
                // Hard delete
                await this.quizRepository.executeInTransaction(
                    transaction,
                    'DELETE FROM quizzes WHERE id = ?',
                    [quizId]
                );

                // Also delete related data (collaborators, shares, etc.)
                await this.cleanupQuizRelatedData(transaction, quizId);

                result = {
                    quizId,
                    deleted: true,
                    permanent: true,
                    message: 'Quiz permanently deleted'
                };

                logger.info('Quiz permanently deleted', { quizId, userId });
            } else {
                // Soft delete
                await this.quizRepository.executeInTransaction(
                    transaction,
                    'UPDATE quizzes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [quizId]
                );

                result = {
                    quizId,
                    deleted: true,
                    permanent: false,
                    message: 'Quiz moved to trash'
                };

                logger.info('Quiz soft deleted', { quizId, userId });
            }

            // Create activity log
            await this.createActivityLog(transaction, userId, 'quiz_deleted', {
                quiz_id: quizId,
                permanent: permanent,
                title: existingQuiz.title
            });

            await this.quizRepository.commitTransaction(transaction);

            return result;

        } catch (error) {
            await this.quizRepository.rollbackTransaction(transaction);
            logger.error('Error deleting quiz:', {
                quizId,
                userId,
                permanent,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * เปลี่ยนชื่อข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {string} newTitle - New title
     * @param {string} userId - User ID
     * @returns {Object} Updated quiz
     */
    async renameQuiz(quizId, newTitle, userId) {
        try {
            const updateData = { title: newTitle };
            return await this.updateQuiz(quizId, updateData, userId);
        } catch (error) {
            logger.error('Error renaming quiz:', {
                quizId,
                newTitle,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * ย้ายข้อสอบไปโฟลเดอร์
     * @param {string} quizId - Quiz ID
     * @param {string} folderId - Target folder ID
     * @param {string} userId - User ID
     * @returns {Object} Updated quiz
     */
    async moveQuiz(quizId, folderId, userId) {
        try {
            // Validate folder access if folderId is provided
            if (folderId) {
                const folderAccess = await this.checkFolderAccess(folderId, userId);
                if (!folderAccess) {
                    throw new ValidationError('Invalid folder or no access to specified folder');
                }
            }

            const success = await this.quizRepository.moveToFolder(quizId, folderId);
            if (!success) {
                throw new Error('Failed to move quiz');
            }

            // Get updated quiz
            const updatedQuiz = await this.getQuizById(quizId, userId);

            logger.info('Quiz moved successfully', {
                quizId,
                folderId,
                userId
            });

            return updatedQuiz;

        } catch (error) {
            logger.error('Error moving quiz:', {
                quizId,
                folderId,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * แชร์ข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {Object} shareOptions - Share options
     * @param {string} userId - User ID
     * @returns {Object} Share result
     */
    async shareQuiz(quizId, shareOptions, userId) {
        const transaction = await this.quizRepository.beginTransaction();

        try {
            const { emails, permissions = 'view', message = '', expiresAt = null } = shareOptions;

            // Check if quiz exists and user has permission
            const quiz = await this.quizRepository.findById(quizId);
            if (!quiz || quiz.deleted_at) {
                throw new NotFoundError('Quiz not found');
            }

            const hasPermission = await this.checkQuizEditPermission(quizId, userId);
            if (!hasPermission) {
                throw new UnauthorizedError('No permission to share this quiz');
            }

            // Get sender info
            const sender = await this.userRepository.findById(userId);
            if (!sender) {
                throw new ValidationError('Sender not found');
            }

            const shareResults = [];

            // Process each email
            for (const email of emails) {
                try {
                    // Check if user exists
                    let recipient = await this.userRepository.findByEmail(email);
                    let isNewUser = false;

                    if (!recipient) {
                        // Create invitation for new user
                        recipient = await this.createUserInvitation(transaction, email, {
                            invitedBy: userId,
                            quizId: quizId,
                            permissions: permissions
                        });
                        isNewUser = true;
                    }

                    // Add collaborator if not new user
                    if (!isNewUser && permissions !== 'view') {
                        await this.quizRepository.addCollaborator(quizId, recipient.id, permissions);
                    }

                    // Generate share token
                    const shareToken = await this.generateShareToken(quizId, expiresAt);

                    // Send email notification
                    await this.emailService.sendQuizShareNotification({
                        recipient: {
                            email: email,
                            name: recipient.first_name || email
                        },
                        sender: {
                            name: `${sender.first_name} ${sender.last_name}`.trim() || sender.username,
                            email: sender.email
                        },
                        quiz: {
                            title: quiz.title,
                            description: quiz.description
                        },
                        shareToken: shareToken,
                        permissions: permissions,
                        message: message,
                        expiresAt: expiresAt,
                        isNewUser: isNewUser
                    });

                    shareResults.push({
                        email: email,
                        status: 'success',
                        shareToken: shareToken,
                        isNewUser: isNewUser
                    });

                    logger.info('Quiz shared successfully', {
                        quizId,
                        recipientEmail: email,
                        permissions,
                        isNewUser
                    });

                } catch (emailError) {
                    logger.error('Error sharing quiz with individual email:', {
                        quizId,
                        email,
                        error: emailError.message
                    });

                    shareResults.push({
                        email: email,
                        status: 'failed',
                        error: emailError.message
                    });
                }
            }

            // Create activity log
            await this.createActivityLog(transaction, userId, 'quiz_shared', {
                quiz_id: quizId,
                recipients: emails.length,
                successful: shareResults.filter(r => r.status === 'success').length
            });

            await this.quizRepository.commitTransaction(transaction);

            return {
                quizId: quizId,
                shareResults: shareResults,
                totalRecipients: emails.length,
                successCount: shareResults.filter(r => r.status === 'success').length,
                failureCount: shareResults.filter(r => r.status === 'failed').length
            };

        } catch (error) {
            await this.quizRepository.rollbackTransaction(transaction);
            logger.error('Error sharing quiz:', {
                quizId,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * ดึงสถิติของข้อสอบ
     * @param {string} quizId - Quiz ID
     * @returns {Object} Quiz statistics
     */
    async getQuizStatistics(quizId) {
        try {
            const statistics = await this.quizRepository.getStatistics(quizId);

            if (!statistics) {
                throw new NotFoundError('Quiz not found');
            }

            // Add additional statistics
            const enhancedStats = {
                ...statistics,
                performance: await this.getQuizPerformanceStats(quizId),
                sharing: await this.getQuizSharingStats(quizId),
                activity: await this.getQuizActivityStats(quizId)
            };

            return enhancedStats;

        } catch (error) {
            logger.error('Error getting quiz statistics:', {
                quizId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * ค้นหาข้อสอบ
     * @param {string} searchTerm - Search term
     * @param {string} userId - User ID
     * @param {Object} pagination - Pagination options
     * @param {Object} filters - Filter options
     * @returns {Object} Search results
     */
    async searchQuizzes(searchTerm, userId, pagination = {}, filters = {}) {
        try {
            const { limit = 20, offset = 0 } = pagination;

            // Get search results
            const quizzes = await this.quizRepository.search(searchTerm, userId, {
                limit,
                offset,
                conditions: {
                    category: filters.category || null,
                    difficulty: filters.difficulty || null
                }
            });

            // Get total count for pagination
            const totalQuery = `
        SELECT COUNT(*) as count FROM quizzes 
        WHERE user_id = ? 
        AND deleted_at IS NULL
        AND (title LIKE ? OR JSON_EXTRACT(questions, '$[*].question') LIKE ?)
        ${filters.category ? 'AND category = ?' : ''}
        ${filters.difficulty ? 'AND difficulty = ?' : ''}
      `;

            const searchPattern = `%${searchTerm}%`;
            const countParams = [userId, searchPattern, searchPattern];

            if (filters.category) countParams.push(filters.category);
            if (filters.difficulty) countParams.push(filters.difficulty);

            const [{ count: total }] = await this.quizRepository.execute(totalQuery, countParams);

            // Format results
            const formattedQuizzes = quizzes.map(quiz => this.formatQuizSummary(quiz));

            logger.debug('Quiz search completed', {
                searchTerm,
                userId,
                total,
                returned: formattedQuizzes.length
            });

            return {
                quizzes: formattedQuizzes,
                total,
                searchTerm
            };

        } catch (error) {
            logger.error('Error searching quizzes:', {
                searchTerm,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * คัดลอกข้อสอบ
     * @param {string} quizId - Quiz ID to duplicate
     * @param {Object} options - Duplication options
     * @param {string} userId - User ID
     * @returns {Object} Duplicated quiz
     */
    async duplicateQuiz(quizId, options = {}, userId) {
        try {
            // Get original quiz
            const originalQuiz = await this.getQuizById(quizId, userId);
            if (!originalQuiz) {
                throw new NotFoundError('Quiz not found');
            }

            // Prepare new quiz data
            const newTitle = options.title || `${originalQuiz.title} (Copy)`;
            const newQuizData = {
                userId: userId,
                title: newTitle,
                description: originalQuiz.description,
                questions: originalQuiz.questions,
                folderId: options.folderId || originalQuiz.folderId,
                tags: originalQuiz.tags || [],
                category: originalQuiz.category,
                isPublic: false, // Reset to private
                timeLimit: originalQuiz.timeLimit,
                allowRetake: originalQuiz.allowRetake,
                shuffleQuestions: originalQuiz.shuffleQuestions,
                showResults: originalQuiz.showResults
            };

            // Create the duplicated quiz
            const duplicatedQuiz = await this.createQuiz(newQuizData);

            logger.info('Quiz duplicated successfully', {
                originalQuizId: quizId,
                newQuizId: duplicatedQuiz.id,
                userId
            });

            return duplicatedQuiz;

        } catch (error) {
            logger.error('Error duplicating quiz:', {
                quizId,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * การดำเนินการแบบ bulk
     * @param {string} action - Action to perform
     * @param {Array} quizIds - Quiz IDs
     * @param {Object} data - Action data
     * @param {string} userId - User ID
     * @returns {Object} Bulk operation result
     */
    async bulkOperation(action, quizIds, data, userId) {
        const transaction = await this.quizRepository.beginTransaction();
        const results = {
            successCount: 0,
            failureCount: 0,
            results: []
        };

        try {
            for (const quizId of quizIds) {
                try {
                    let result;

                    switch (action) {
                        case 'delete':
                            result = await this.deleteQuiz(quizId, userId, data.permanent);
                            break;
                        case 'move':
                            result = await this.moveQuiz(quizId, data.folderId, userId);
                            break;
                        case 'updateCategory':
                            result = await this.updateQuiz(quizId, { category: data.category }, userId);
                            break;
                        case 'updateTags':
                            result = await this.updateQuiz(quizId, { tags: data.tags }, userId);
                            break;
                        default:
                            throw new ValidationError(`Unknown action: ${action}`);
                    }

                    results.successCount++;
                    results.results.push({
                        quizId,
                        status: 'success',
                        result
                    });

                } catch (error) {
                    results.failureCount++;
                    results.results.push({
                        quizId,
                        status: 'failed',
                        error: error.message
                    });

                    logger.error(`Bulk operation failed for quiz ${quizId}:`, {
                        action,
                        quizId,
                        error: error.message
                    });
                }
            }

            // Create activity log
            await this.createActivityLog(transaction, userId, 'quiz_bulk_operation', {
                action,
                quiz_count: quizIds.length,
                success_count: results.successCount,
                failure_count: results.failureCount
            });

            await this.quizRepository.commitTransaction(transaction);

            logger.info('Bulk operation completed', {
                action,
                userId,
                totalQuizzes: quizIds.length,
                successCount: results.successCount,
                failureCount: results.failureCount
            });

            return results;

        } catch (error) {
            await this.quizRepository.rollbackTransaction(transaction);
            logger.error('Error in bulk operation:', {
                action,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    // Permission and Access Control Methods

    /**
     * ตรวจสอบสิทธิ์การเข้าถึงข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @returns {boolean} Has access
     */
    async checkQuizAccess(quizId, userId) {
        try {
            const quiz = await this.quizRepository.findById(quizId);
            if (!quiz || quiz.deleted_at) {
                return false;
            }

            // Owner always has access
            if (quiz.user_id === userId) {
                return true;
            }

            // Check if public
            if (quiz.is_public) {
                return true;
            }

            // Check collaborator access
            return await this.quizRepository.checkCollaborator(quizId, userId);

        } catch (error) {
            logger.error('Error checking quiz access:', {
                quizId,
                userId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * ตรวจสอบสิทธิ์การแก้ไขข้อสอบ
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @returns {boolean} Has edit permission
     */
    async checkQuizEditPermission(quizId, userId) {
        try {
            const quiz = await this.quizRepository.findById(quizId);
            if (!quiz || quiz.deleted_at) {
                return false;
            }

            // Owner always has edit permission
            if (quiz.user_id === userId) {
                return true;
            }

            // Check collaborator edit permission
            const collaboratorQuery = `
        SELECT permission FROM quiz_collaborators 
        WHERE quiz_id = ? AND user_id = ? AND status = 'active'
      `;

            const [collaborator] = await this.quizRepository.execute(collaboratorQuery, [quizId, userId]);

            return collaborator && ['edit', 'admin'].includes(collaborator.permission);

        } catch (error) {
            logger.error('Error checking quiz edit permission:', {
                quizId,
                userId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * ตรวจสอบการเข้าถึงโฟลเดอร์
     * @param {string} folderId - Folder ID
     * @param {string} userId - User ID
     * @returns {boolean} Has access
     */
    async checkFolderAccess(folderId, userId) {
        try {
            const folder = await this.folderRepository.findById(folderId);
            return folder && folder.user_id === userId && !folder.deleted_at;
        } catch (error) {
            logger.error('Error checking folder access:', {
                folderId,
                userId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * ตรวจสอบชื่อข้อสอบซ้ำ
     * @param {string} title - Quiz title
     * @param {string} userId - User ID
     * @param {string} excludeId - Quiz ID to exclude
     * @returns {boolean} Is duplicate
     */
    async checkDuplicateTitle(title, userId, excludeId = null) {
        try {
            return await this.quizRepository.isDuplicateTitle(title, userId, excludeId);
        } catch (error) {
            logger.error('Error checking duplicate title:', {
                title,
                userId,
                excludeId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * อัพเดท last accessed timestamp
     * @param {string} quizId - Quiz ID
     * @returns {boolean} Success
     */
    async updateLastAccessed(quizId) {
        try {
            return await this.quizRepository.updateLastAccessed(quizId);
        } catch (error) {
            logger.error('Error updating last accessed:', {
                quizId,
                error: error.message
            });
            return false;
        }
    }

    // Helper Methods

    /**
     * Format quiz summary for listing
     * @param {Object} quiz - Raw quiz data
     * @returns {Object} Formatted quiz summary
     */
    formatQuizSummary(quiz) {
        const questions = JSON.parse(quiz.questions || '[]');

        return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questionCount: questions.length,
            category: quiz.category,
            difficulty: quiz.difficulty,
            estimatedTime: quiz.estimated_time,
            tags: JSON.parse(quiz.tags || '[]'),
            isPublic: Boolean(quiz.is_public),
            folderId: quiz.folder_id,
            createdAt: quiz.created_at,
            updatedAt: quiz.updated_at,
            lastAccessed: quiz.last_accessed,
            status: quiz.status
        };
    }

    /**
     * Format detailed quiz data
     * @param {Object} quiz - Raw quiz data with details
     * @returns {Object} Formatted quiz detail
     */
    formatQuizDetail(quiz) {
        return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions, // Already parsed in findWithDetails
            category: quiz.category,
            difficulty: quiz.difficulty,
            estimatedTime: quiz.estimated_time,
            tags: JSON.parse(quiz.tags || '[]'),
            isPublic: Boolean(quiz.is_public),
            folderId: quiz.folder_id,
            timeLimit: quiz.time_limit,
            allowRetake: Boolean(quiz.allow_retake),
            shuffleQuestions: Boolean(quiz.shuffle_questions),
            showResults: Boolean(quiz.show_results),
            createdAt: quiz.created_at,
            updatedAt: quiz.updated_at,
            lastAccessed: quiz.last_accessed,
            status: quiz.status,
            userId: quiz.user_id,
            collaborators: quiz.collaborators || []
        };
    }

    /**
     * Calculate estimated completion time
     * @param {Array} questions - Quiz questions
     * @returns {number} Time in minutes
     */
    calculateEstimatedTime(questions) {
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

    /**
     * Analyze quiz difficulty
     * @param {Array} questions - Quiz questions
     * @returns {string} Difficulty level
     */
    analyzeDifficulty(questions) {
        let totalComplexity = 0;

        questions.forEach(question => {
            let complexity = 1;

            // Question length factor
            if (question.question.length > 200) complexity += 0.5;

            // Question type factor
            if (question.type === 'essay') complexity += 1;
            if (question.type === 'short_answer') complexity += 0.5;

            // Options complexity for multiple choice
            if (question.options && question.options.length > 4) complexity += 0.3;

            totalComplexity += complexity;
        });

        const avgComplexity = totalComplexity / questions.length;

        if (avgComplexity > 2) return 'hard';
        if (avgComplexity > 1.5) return 'medium';
        return 'easy';
    }

    // Additional helper methods for sharing and statistics would go here...

    async generateShareToken(quizId, expiresAt) {
        return await this.quizRepository.generateShareToken(quizId, expiresAt);
    }

    async createActivityLog(transaction, userId, action, details) {
        // Implementation for activity logging
        // This could be a separate table or service
        try {
            await this.quizRepository.executeInTransaction(
                transaction,
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                [userId, action, JSON.stringify(details)]
            );
        } catch (error) {
            // Log error but don't fail the main operation
            logger.error('Error creating activity log:', error);
        }
    }

    async createUserInvitation(transaction, email, invitationData) {
        // Implementation for user invitation
        // This is a placeholder - actual implementation would depend on your user management system
        return {
            id: 'temp_user_id',
            email: email,
            first_name: null,
            status: 'invited'
        };
    }

    async cleanupQuizRelatedData(transaction, quizId) {
        // Clean up related data when permanently deleting a quiz
        const cleanupQueries = [
            'DELETE FROM quiz_collaborators WHERE quiz_id = ?',
            'DELETE FROM quiz_shares WHERE quiz_id = ?',
            'DELETE FROM quiz_views WHERE quiz_id = ?',
            'DELETE FROM activity_logs WHERE JSON_EXTRACT(details, "$.quiz_id") = ?'
        ];

        for (const query of cleanupQueries) {
            try {
                await this.quizRepository.executeInTransaction(transaction, query, [quizId]);
            } catch (error) {
                logger.error(`Error in cleanup query: ${query}`, error);
            }
        }
    }

    async getQuizPerformanceStats(quizId) {
        // Placeholder for performance statistics
        return {
            averageScore: 0,
            completionRate: 0,
            averageTime: 0,
            totalAttempts: 0
        };
    }

    async getQuizSharingStats(quizId) {
        // Placeholder for sharing statistics
        return {
            totalShares: 0,
            activeCollaborators: 0,
            publicViews: 0
        };
    }

    async getQuizActivityStats(quizId) {
        // Placeholder for activity statistics
        return {
            recentViews: 0,
            editHistory: [],
            lastActivity: null
        };
    }
}

export default QuizManagementService;