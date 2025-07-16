// backend/src/repositories/QuizRepository.js
import BaseRepository from './base/BaseRepository.js';
import logger from '../utils/common/Logger.js';
import { NotFoundError, ValidationError, DatabaseError } from '../errors/CustomErrors.js';

/**
 * Quiz Repository
 * จัดการ data access สำหรับ quizzes table
 * ขยายจาก BaseRepository เพื่อเพิ่ม quiz-specific operations
 */
export class QuizRepository extends BaseRepository {
    constructor() {
        super('quizzes', 'id');
    }

    /**
     * Find quizzes by user ID with pagination and filters
     */
    async findByUserId(userId, options = {}) {
        try {
            const {
                folderId = null,
                category = null,
                status = 'active',
                search = null,
                sortBy = 'updated_at',
                sortOrder = 'DESC',
                limit = 20,
                offset = 0
            } = options;

            let query = `
                SELECT q.*, f.name as folder_name
                FROM ${this.tableName} q
                LEFT JOIN folders f ON q.folder_id = f.id
                WHERE q.user_id = ? AND q.deleted_at IS NULL
            `;
            const params = [userId];

            // Add folder filter
            if (folderId) {
                query += ' AND q.folder_id = ?';
                params.push(folderId);
            }

            // Add category filter
            if (category) {
                query += ' AND q.category = ?';
                params.push(category);
            }

            // Add status filter
            if (status) {
                query += ' AND q.status = ?';
                params.push(status);
            }

            // Add search filter
            if (search && search.trim() !== '') {
                query += ' AND (q.title LIKE ? OR q.topic LIKE ? OR q.description LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Add ordering
            query += ` ORDER BY q.${sortBy} ${sortOrder}`;

            // Add pagination
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);
                
                if (offset > 0) {
                    query += ' OFFSET ?';
                    params.push(offset);
                }
            }

            return await this.executeQuery(query, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Count quizzes by user ID with filters
     */
    async countByUserId(userId, options = {}) {
        try {
            const {
                folderId = null,
                category = null,
                status = 'active',
                search = null
            } = options;

            let query = `
                SELECT COUNT(*) as total
                FROM ${this.tableName}
                WHERE user_id = ? AND deleted_at IS NULL
            `;
            const params = [userId];

            // Add filters
            if (folderId) {
                query += ' AND folder_id = ?';
                params.push(folderId);
            }

            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            if (search && search.trim() !== '') {
                query += ' AND (title LIKE ? OR topic LIKE ? OR description LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const results = await this.executeQuery(query, params);
            return results[0].total;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find recent quizzes for user
     */
    async findRecentByUserId(userId, limit = 5) {
        try {
            const query = `
                SELECT q.*, f.name as folder_name
                FROM ${this.tableName} q
                LEFT JOIN folders f ON q.folder_id = f.id
                WHERE q.user_id = ? AND q.deleted_at IS NULL
                ORDER BY q.updated_at DESC
                LIMIT ?
            `;

            return await this.executeQuery(query, [userId, limit]);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find quiz by ID and user ID (for ownership check)
     */
    async findByIdAndUserId(quizId, userId) {
        try {
            const query = `
                SELECT q.*, f.name as folder_name
                FROM ${this.tableName} q
                LEFT JOIN folders f ON q.folder_id = f.id
                WHERE q.id = ? AND q.user_id = ? AND q.deleted_at IS NULL
            `;

            const results = await this.executeQuery(query, [quizId, userId]);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Create quiz with questions
     */
    async createWithQuestions(quizData, questions) {
        try {
            return await this.withTransaction(async () => {
                // Create quiz
                const quiz = await this.create(quizData);

                // Create questions
                if (questions && questions.length > 0) {
                    const questionInserts = questions.map(question => ({
                        quiz_id: quiz.id,
                        question_text: question.question || question.question_text,
                        question_type: question.type || question.question_type || 'multiple_choice',
                        options: JSON.stringify(question.options || []),
                        correct_answer: question.correct_answer,
                        explanation: question.explanation || null,
                        points: question.points || 1,
                        order_index: question.order_index || 0,
                        created_at: new Date(),
                        updated_at: new Date()
                    }));

                    await this.bulkCreateQuestions(questionInserts);
                }

                // Return complete quiz with questions
                return await this.findWithQuestions(quiz.id);
            });
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find quiz with questions
     */
    async findWithQuestions(quizId) {
        try {
            // Get quiz
            const quiz = await this.findById(quizId);
            if (!quiz) {
                return null;
            }

            // Get questions
            const questionsQuery = `
                SELECT * FROM quiz_questions
                WHERE quiz_id = ?
                ORDER BY order_index ASC, id ASC
            `;
            const questions = await this.executeQuery(questionsQuery, [quizId]);

            // Parse options from JSON
            quiz.questions = questions.map(question => ({
                ...question,
                options: question.options ? JSON.parse(question.options) : []
            }));

            return quiz;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update quiz questions
     */
    async updateQuestions(quizId, questions) {
        try {
            return await this.withTransaction(async () => {
                // Delete existing questions
                await this.executeQuery('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);

                // Insert new questions
                if (questions && questions.length > 0) {
                    const questionInserts = questions.map((question, index) => ({
                        quiz_id: quizId,
                        question_text: question.question || question.question_text,
                        question_type: question.type || question.question_type || 'multiple_choice',
                        options: JSON.stringify(question.options || []),
                        correct_answer: question.correct_answer,
                        explanation: question.explanation || null,
                        points: question.points || 1,
                        order_index: index,
                        created_at: new Date(),
                        updated_at: new Date()
                    }));

                    await this.bulkCreateQuestions(questionInserts);
                }

                // Update quiz's question count and updated_at
                await this.update(quizId, {
                    question_count: questions.length,
                    updated_at: new Date()
                });

                return await this.findWithQuestions(quizId);
            });
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Move quiz to folder
     */
    async moveToFolder(quizId, folderId, userId) {
        try {
            // Verify quiz ownership
            const quiz = await this.findByIdAndUserId(quizId, userId);
            if (!quiz) {
                throw new NotFoundError('ไม่พบข้อสอบหรือไม่มีสิทธิ์เข้าถึง');
            }

            // Verify folder ownership if folderId is provided
            if (folderId) {
                const folderQuery = `
                    SELECT id FROM folders 
                    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
                `;
                const folderResults = await this.executeQuery(folderQuery, [folderId, userId]);
                
                if (folderResults.length === 0) {
                    throw new NotFoundError('ไม่พบโฟลเดอร์หรือไม่มีสิทธิ์เข้าถึง');
                }
            }

            // Update quiz folder
            return await this.update(quizId, { 
                folder_id: folderId,
                updated_at: new Date()
            });
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Search quizzes
     */
    async searchQuizzes(searchTerm, userId, options = {}) {
        try {
            const {
                category = null,
                folderId = null,
                limit = 50,
                offset = 0
            } = options;

            let query = `
                SELECT q.*, f.name as folder_name,
                       MATCH(q.title, q.topic, q.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
                FROM ${this.tableName} q
                LEFT JOIN folders f ON q.folder_id = f.id
                WHERE q.user_id = ? AND q.deleted_at IS NULL
                AND (
                    MATCH(q.title, q.topic, q.description) AGAINST(? IN NATURAL LANGUAGE MODE)
                    OR q.title LIKE ?
                    OR q.topic LIKE ?
                    OR q.description LIKE ?
                )
            `;

            const searchPattern = `%${searchTerm}%`;
            const params = [searchTerm, userId, searchTerm, searchPattern, searchPattern, searchPattern];

            // Add filters
            if (category) {
                query += ' AND q.category = ?';
                params.push(category);
            }

            if (folderId) {
                query += ' AND q.folder_id = ?';
                params.push(folderId);
            }

            // Order by relevance and date
            query += ' ORDER BY relevance DESC, q.updated_at DESC';

            // Add pagination
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);
                
                if (offset > 0) {
                    query += ' OFFSET ?';
                    params.push(offset);
                }
            }

            return await this.executeQuery(query, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get quiz statistics for user
     */
    async getUserQuizStatistics(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_quizzes,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as this_week,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as this_month,
                    AVG(question_count) as avg_questions,
                    MAX(created_at) as last_created
                FROM ${this.tableName}
                WHERE user_id = ? AND deleted_at IS NULL
            `;

            const results = await this.executeQuery(query, [userId]);
            return results[0];
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Duplicate quiz
     */
    async duplicateQuiz(quizId, userId, newTitle = null) {
        try {
            return await this.withTransaction(async () => {
                // Get original quiz with questions
                const originalQuiz = await this.findWithQuestions(quizId);
                if (!originalQuiz || originalQuiz.user_id !== userId) {
                    throw new NotFoundError('ไม่พบข้อสอบหรือไม่มีสิทธิ์เข้าถึง');
                }

                // Create new quiz data
                const newQuizData = {
                    title: newTitle || `${originalQuiz.title} (Copy)`,
                    topic: originalQuiz.topic,
                    description: originalQuiz.description,
                    category: originalQuiz.category,
                    question_type: originalQuiz.question_type,
                    question_count: originalQuiz.question_count,
                    difficulty_level: originalQuiz.difficulty_level,
                    time_limit: originalQuiz.time_limit,
                    user_id: userId,
                    folder_id: originalQuiz.folder_id,
                    status: 'draft',
                    created_at: new Date(),
                    updated_at: new Date()
                };

                // Create new quiz
                const newQuiz = await this.create(newQuizData);

                // Copy questions
                if (originalQuiz.questions && originalQuiz.questions.length > 0) {
                    const newQuestions = originalQuiz.questions.map((question, index) => ({
                        quiz_id: newQuiz.id,
                        question_text: question.question_text,
                        question_type: question.question_type,
                        options: JSON.stringify(question.options),
                        correct_answer: question.correct_answer,
                        explanation: question.explanation,
                        points: question.points,
                        order_index: index,
                        created_at: new Date(),
                        updated_at: new Date()
                    }));

                    await this.bulkCreateQuestions(newQuestions);
                }

                return await this.findWithQuestions(newQuiz.id);
            });
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Bulk operations
     */
    async bulkDelete(quizIds, userId) {
        try {
            if (!Array.isArray(quizIds) || quizIds.length === 0) {
                return { deleted: 0 };
            }

            return await this.withTransaction(async () => {
                // Verify ownership
                const placeholders = quizIds.map(() => '?').join(',');
                const verifyQuery = `
                    SELECT id FROM ${this.tableName}
                    WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL
                `;
                
                const ownedQuizzes = await this.executeQuery(verifyQuery, [...quizIds, userId]);
                const ownedIds = ownedQuizzes.map(quiz => quiz.id);

                if (ownedIds.length === 0) {
                    return { deleted: 0 };
                }

                // Soft delete quizzes
                const deleteQuery = `
                    UPDATE ${this.tableName}
                    SET deleted_at = NOW(), updated_at = NOW()
                    WHERE id IN (${ownedIds.map(() => '?').join(',')})
                `;
                
                await this.executeQuery(deleteQuery, ownedIds);

                return { deleted: ownedIds.length };
            });
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Check title availability for user
     */
    async isTitleAvailable(title, userId, excludeQuizId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM ${this.tableName}
                WHERE title = ? AND user_id = ? AND deleted_at IS NULL
            `;
            const params = [title, userId];

            if (excludeQuizId) {
                query += ' AND id != ?';
                params.push(excludeQuizId);
            }

            const results = await this.executeQuery(query, params);
            return results[0].count === 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Private helper methods
     */

    /**
     * Bulk create questions
     */
    async bulkCreateQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return [];
        }

        try {
            const fields = Object.keys(questions[0]);
            const placeholders = fields.map(() => '?').join(',');
            const valueClause = questions.map(() => `(${placeholders})`).join(',');

            const query = `
                INSERT INTO quiz_questions (${fields.join(',')})
                VALUES ${valueClause}
            `;

            const flatValues = questions.flatMap(question => Object.values(question));
            
            return await this.executeQuery(query, flatValues);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
}