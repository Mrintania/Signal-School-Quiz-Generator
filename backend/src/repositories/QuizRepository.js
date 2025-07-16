import { BaseRepository } from './base/BaseRepository.js';
import logger from '../utils/logger.js';

/**
 * Quiz Repository
 * จัดการ data access สำหรับ quiz
 */
export class QuizRepository extends BaseRepository {
    constructor() {
        super('quizzes');
    }

    /**
     * Find quizzes by user ID
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} User's quizzes
     */
    async findByUserId(userId, options = {}) {
        const conditions = {
            user_id: userId,
            deleted_at: null
        };

        // Add folder condition if specified
        if (options.folderId) {
            conditions.folder_id = options.folderId;
        }

        // Default order by updated_at DESC
        const queryOptions = {
            orderBy: 'updated_at',
            orderDirection: 'DESC',
            ...options
        };

        return await this.findAll(conditions, queryOptions);
    }

    /**
     * Find quizzes in folder
     * @param {string} folderId - Folder ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Quizzes and total count
     */
    async findByFolderId(folderId, options = {}) {
        const conditions = {
            folder_id: folderId,
            deleted_at: null
        };

        // Get total count
        const total = await this.count(conditions);

        // Get quizzes with pagination
        const quizzes = await this.findAll(conditions, {
            orderBy: 'updated_at',
            orderDirection: 'DESC',
            ...options
        });

        return { quizzes, total };
    }

    /**
     * Search quizzes by title or content
     * @param {string} searchTerm - Search term
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Matching quizzes
     */
    async search(searchTerm, userId, options = {}) {
        const query = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = ? 
      AND deleted_at IS NULL
      AND (title LIKE ? OR JSON_EXTRACT(questions, '$[*].question') LIKE ?)
      ORDER BY updated_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

        const searchPattern = `%${searchTerm}%`;
        const params = [userId, searchPattern, searchPattern];

        return await this.execute(query, params);
    }

    /**
     * Update quiz questions
     * @param {string} quizId - Quiz ID
     * @param {Array} questions - New questions
     * @returns {Promise<boolean>} Success status
     */
    async updateQuestions(quizId, questions) {
        const query = `
      UPDATE ${this.tableName} 
      SET questions = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const result = await this.execute(query, [JSON.stringify(questions), quizId]);
        return result.affectedRows > 0;
    }

    /**
     * Move quiz to folder
     * @param {string} quizId - Quiz ID
     * @param {string} folderId - Target folder ID
     * @returns {Promise<boolean>} Success status
     */
    async moveToFolder(quizId, folderId) {
        return await this.update(quizId, { folder_id: folderId });
    }

    /**
     * Rename quiz
     * @param {string} quizId - Quiz ID
     * @param {string} newTitle - New title
     * @returns {Promise<boolean>} Success status
     */
    async rename(quizId, newTitle) {
        return await this.update(quizId, { title: newTitle });
    }

    /**
     * Check if title is duplicate for user
     * @param {string} title - Quiz title
     * @param {string} userId - User ID
     * @param {string} excludeId - Quiz ID to exclude from check
     * @returns {Promise<boolean>} Is duplicate
     */
    async isDuplicateTitle(title, userId, excludeId = null) {
        let query = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE title = ? AND user_id = ? AND deleted_at IS NULL
    `;
        const params = [title, userId];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const results = await this.execute(query, params);
        return results[0].count > 0;
    }

    /**
     * Get quiz statistics
     * @param {string} quizId - Quiz ID
     * @returns {Promise<Object>} Quiz statistics
     */
    async getStatistics(quizId) {
        const quiz = await this.findById(quizId);
        if (!quiz || quiz.deleted_at) return null;

        const questions = JSON.parse(quiz.questions || '[]');

        // Get view count from separate table if exists
        const viewCountQuery = `
      SELECT COUNT(*) as views 
      FROM quiz_views 
      WHERE quiz_id = ?
    `;

        let views = 0;
        try {
            const viewResults = await this.execute(viewCountQuery, [quizId]);
            views = viewResults[0]?.views || 0;
        } catch (error) {
            // Table might not exist, use default
            logger.debug('Quiz views table not found, using default value');
        }

        return {
            totalQuestions: questions.length,
            questionTypes: this.analyzeQuestionTypes(questions),
            views: views,
            createdAt: quiz.created_at,
            updatedAt: quiz.updated_at,
            lastAccessed: quiz.last_accessed
        };
    }

    /**
     * Count generations today for user
     * @param {string} userId - User ID
     * @param {Date} startOfDay - Start of day timestamp
     * @returns {Promise<number>} Generation count
     */
    async countGenerationsToday(userId, startOfDay) {
        const query = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE user_id = ? 
      AND created_at >= ? 
      AND deleted_at IS NULL
      AND generation_source IN ('ai', 'file')
    `;

        const results = await this.execute(query, [userId, startOfDay]);
        return results[0].count;
    }

    /**
     * Check collaborator access
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Has collaborator access
     */
    async checkCollaborator(quizId, userId) {
        const query = `
      SELECT COUNT(*) as count FROM quiz_collaborators 
      WHERE quiz_id = ? AND user_id = ? AND status = 'active'
    `;

        try {
            const results = await this.execute(query, [quizId, userId]);
            return results[0].count > 0;
        } catch (error) {
            // Table might not exist yet
            logger.debug('Quiz collaborators table not found');
            return false;
        }
    }

    /**
     * Add quiz collaborator
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @param {string} permission - Permission level
     * @returns {Promise<boolean>} Success status
     */
    async addCollaborator(quizId, userId, permission = 'edit') {
        const query = `
      INSERT INTO quiz_collaborators (quiz_id, user_id, permission, status, created_at) 
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
      permission = VALUES(permission), 
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP
    `;

        try {
            const result = await this.execute(query, [quizId, userId, permission]);
            return result.affectedRows > 0;
        } catch (error) {
            logger.error('Error adding collaborator:', error);
            return false;
        }
    }

    /**
     * Remove quiz collaborator
     * @param {string} quizId - Quiz ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    async removeCollaborator(quizId, userId) {
        const query = `
      UPDATE quiz_collaborators 
      SET status = 'removed', updated_at = CURRENT_TIMESTAMP 
      WHERE quiz_id = ? AND user_id = ?
    `;

        try {
            const result = await this.execute(query, [quizId, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            logger.error('Error removing collaborator:', error);
            return false;
        }
    }

    /**
     * Get quiz with full details including collaborators
     * @param {string} quizId - Quiz ID
     * @returns {Promise<Object|null>} Quiz with details
     */
    async findWithDetails(quizId) {
        const quiz = await this.findById(quizId);
        if (!quiz || quiz.deleted_at) return null;

        // Get collaborators
        const collaboratorsQuery = `
      SELECT qc.*, u.username, u.email, u.first_name, u.last_name
      FROM quiz_collaborators qc
      JOIN users u ON qc.user_id = u.id
      WHERE qc.quiz_id = ? AND qc.status = 'active'
    `;

        let collaborators = [];
        try {
            collaborators = await this.execute(collaboratorsQuery, [quizId]);
        } catch (error) {
            logger.debug('Could not fetch collaborators:', error.message);
        }

        return {
            ...quiz,
            questions: JSON.parse(quiz.questions || '[]'),
            collaborators
        };
    }

    /**
     * Update last accessed timestamp
     * @param {string} quizId - Quiz ID
     * @returns {Promise<boolean>} Success status
     */
    async updateLastAccessed(quizId) {
        const query = `
      UPDATE ${this.tableName} 
      SET last_accessed = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const result = await this.execute(query, [quizId]);
        return result.affectedRows > 0;
    }

    /**
     * Get quiz sharing settings
     * @param {string} quizId - Quiz ID
     * @returns {Promise<Object|null>} Sharing settings
     */
    async getSharingSettings(quizId) {
        const query = `
      SELECT is_public, share_token, share_expires_at, allow_anonymous
      FROM ${this.tableName} 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const results = await this.execute(query, [quizId]);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Generate share token for quiz
     * @param {string} quizId - Quiz ID
     * @param {Date} expiresAt - Expiration date
     * @returns {Promise<string>} Share token
     */
    async generateShareToken(quizId, expiresAt = null) {
        const shareToken = this.generateRandomToken();

        const query = `
      UPDATE ${this.tableName} 
      SET share_token = ?, share_expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

        const result = await this.execute(query, [shareToken, expiresAt, quizId]);

        if (result.affectedRows > 0) {
            return shareToken;
        }

        throw new Error('Failed to generate share token');
    }

    /**
     * Find quiz by share token
     * @param {string} shareToken - Share token
     * @returns {Promise<Object|null>} Quiz if valid token
     */
    async findByShareToken(shareToken) {
        const query = `
      SELECT * FROM ${this.tableName} 
      WHERE share_token = ? 
      AND deleted_at IS NULL
      AND (share_expires_at IS NULL OR share_expires_at > CURRENT_TIMESTAMP)
    `;

        const results = await this.execute(query, [shareToken]);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Analyze question types in questions array
     * @param {Array} questions - Questions array
     * @returns {Object} Question type analysis
     */
    analyzeQuestionTypes(questions) {
        const types = {};
        questions.forEach(question => {
            const type = question.type || 'multiple_choice';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    /**
     * Get recent quizzes for user
     * @param {string} userId - User ID
     * @param {number} limit - Number of recent quizzes
     * @returns {Promise<Array>} Recent quizzes
     */
    async getRecentQuizzes(userId, limit = 10) {
        return await this.findByUserId(userId, {
            limit,
            orderBy: 'updated_at',
            orderDirection: 'DESC'
        });
    }

    /**
     * Export quiz data
     * @param {string} quizId - Quiz ID
     * @returns {Promise<Object>} Export data
     */
    async getExportData(quizId) {
        const quiz = await this.findWithDetails(quizId);
        if (!quiz) return null;

        return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions,
            metadata: {
                createdAt: quiz.created_at,
                updatedAt: quiz.updated_at,
                questionCount: quiz.questions.length,
                estimatedTime: this.calculateEstimatedTime(quiz.questions),
                difficulty: quiz.difficulty,
                category: quiz.category,
                tags: quiz.tags
            }
        };
    }

    /**
     * Calculate estimated completion time
     * @param {Array} questions - Questions array
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
     * Generate random token
     * @returns {string} Random token
     */
    generateRandomToken() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get quiz usage analytics
     * @param {string} userId - User ID
     * @param {Object} dateRange - Date range filter
     * @returns {Promise<Object>} Usage analytics
     */
    async getUsageAnalytics(userId, dateRange = {}) {
        const { startDate, endDate } = dateRange;

        let whereClause = 'WHERE user_id = ? AND deleted_at IS NULL';
        const params = [userId];

        if (startDate) {
            whereClause += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND created_at <= ?';
            params.push(endDate);
        }

        const query = `
      SELECT 
        COUNT(*) as total_quizzes,
        COUNT(CASE WHEN generation_source = 'ai' THEN 1 END) as ai_generated,
        COUNT(CASE WHEN generation_source = 'manual' THEN 1 END) as manually_created,
        AVG(JSON_LENGTH(questions)) as avg_questions_per_quiz,
        COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_quizzes
      FROM ${this.tableName}
      ${whereClause}
    `;

        const results = await this.execute(query, params);
        return results[0];
    }

    /**
     * Bulk update quiz folder
     * @param {Array} quizIds - Array of quiz IDs
     * @param {string} folderId - Target folder ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Promise<number>} Number of updated quizzes
     */
    async bulkMoveToFolder(quizIds, folderId, userId) {
        if (!quizIds || quizIds.length === 0) {
            return 0;
        }

        const placeholders = quizIds.map(() => '?').join(',');
        const query = `
      UPDATE ${this.tableName} 
      SET folder_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) 
      AND user_id = ? 
      AND deleted_at IS NULL
    `;

        const params = [folderId, ...quizIds, userId];
        const result = await this.execute(query, params);

        return result.affectedRows;
    }

    /**
     * Health check specific to quiz repository
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const baseHealth = await super.healthCheck();

            // Additional quiz-specific checks
            const quizCount = await this.count();
            const recentQuizzes = await this.execute(`
        SELECT COUNT(*) as count 
        FROM ${this.tableName} 
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND deleted_at IS NULL
      `);

            return {
                ...baseHealth,
                totalQuizzes: quizCount,
                recentQuizzes: recentQuizzes[0].count,
                tableName: this.tableName
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                tableName: this.tableName,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default QuizRepository;