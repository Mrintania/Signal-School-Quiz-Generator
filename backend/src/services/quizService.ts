// backend/src/services/quizService.ts
import DBService from './dbService.js';
import { logger } from '../utils/logger.js';
import { pool } from '../config/db.js';
import { Quiz, QuizQuestion, QuizOption } from '../types/index.js';

// Define additional types needed for the service
interface QuizResult {
    success: boolean;
    quizId?: number;
    error?: string;
}

interface PaginatedQuizResult {
    quizzes: Quiz[];
    total: number;
}

interface QuizDuplicateResult {
    isDuplicate: boolean;
    suggestedTitle: string;
}

interface FolderAccessResult {
    success: boolean;
    error?: string;
}

/**
 * Service for quiz operations
 */
class QuizService {
    /**
     * Save a new quiz with questions and options
     * @param {Quiz} quizData - Quiz data with questions and options
     * @returns {Promise<QuizResult>} Result with success status and quiz ID
     */
    static async saveQuiz(quizData: Quiz): Promise<QuizResult> {
        const { title, topic, questionType, studentLevel, language, questions, userId } = quizData;

        try {
            // Use transaction to ensure all operations succeed or fail together
            return await DBService.withTransaction(async (connection) => {
                // Insert quiz
                const [quizResult] = await connection.execute(
                    'INSERT INTO quizzes (title, topic, question_type, student_level, language, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [title, topic, questionType, studentLevel, language || 'english', userId]
                );

                const quizId = (quizResult as any).insertId;

                // Insert questions
                for (const question of questions) {
                    const [questionResult] = await connection.execute(
                        'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
                        [quizId, question.questionText, question.explanation, new Date()]
                    );

                    const questionId = (questionResult as any).insertId;

                    // Insert options for multiple choice questions
                    if (question.options && question.options.length > 0) {
                        for (const option of question.options) {
                            await connection.execute(
                                'INSERT INTO options (question_id, option_text, is_correct, created_at) VALUES (?, ?, ?, NOW())',
                                [questionId, option.text, option.isCorrect, new Date()]
                            );
                        }
                    }
                }

                return { success: true, quizId };
            });
        } catch (error) {
            logger.error('Error saving quiz:', error);
            logger.error('Quiz data:', JSON.stringify({
                title, topic, questionType, studentLevel, language, userId,
                questionCount: questions?.length
            }));

            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Get all quizzes with pagination
     * @param {Object} options - Query options
     * @param {number} options.limit - Number of records to return
     * @param {number} options.offset - Number of records to skip
     * @param {number} options.userId - Filter by user ID (optional)
     * @param {string} options.search - Search term (optional)
     * @param {string} options.folder - Filter by folder ID (optional)
     * @param {string} options.sortBy - Sort field (optional)
     * @param {string} options.sortOrder - Sort direction (optional)
     * @returns {Promise<PaginatedQuizResult>} Quizzes with pagination info
     */
    static async getAllQuizzes(options: {
        limit?: number;
        offset?: number;
        userId?: number;
        search?: string;
        folder?: string;
        sortBy?: string;
        sortOrder?: string;
    }): Promise<PaginatedQuizResult> {
        try {
            const {
                limit = 10,
                offset = 0,
                userId = null,
                search = null,
                folder = null,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = options;

            // Base query
            let query = 'SELECT * FROM quizzes';
            let countQuery = 'SELECT COUNT(*) as total FROM quizzes';

            const queryParams: any[] = [];
            const countParams: any[] = [];

            // Add filters
            const filters: string[] = [];

            if (userId) {
                filters.push('user_id = ?');
                queryParams.push(userId);
                countParams.push(userId);
            }

            if (search) {
                filters.push('(title LIKE ? OR topic LIKE ?)');
                queryParams.push(`%${search}%`, `%${search}%`);
                countParams.push(`%${search}%`, `%${search}%`);
            }

            if (folder) {
                if (folder === 'root' || folder === '0') {
                    filters.push('(folder_id IS NULL OR folder_id = 0)');
                } else {
                    filters.push('folder_id = ?');
                    queryParams.push(folder);
                    countParams.push(folder);
                }
            }

            // Apply filters
            if (filters.length > 0) {
                const whereClause = filters.join(' AND ');
                query += ` WHERE ${whereClause}`;
                countQuery += ` WHERE ${whereClause}`;
            }

            // Validate sort field to prevent SQL injection
            const allowedSortFields = ['created_at', 'updated_at', 'title', 'topic'];
            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

            // Validate sort order
            const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            // Add ordering and pagination
            query += ` ORDER BY ${validSortBy} ${validSortOrder} LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);

            // Execute queries in parallel for better performance
            const [quizzes, countResult] = await Promise.all([
                DBService.query(query, queryParams),
                DBService.queryOne(countQuery, countParams)
            ]);

            return {
                quizzes: quizzes as Quiz[],
                total: countResult?.total || 0
            };
        } catch (error) {
            logger.error('Error fetching quizzes:', error);
            throw error;
        }
    }

    /**
     * Get quiz by ID with all questions and options
     * @param {number} quizId - Quiz ID
     * @returns {Promise<Quiz|null>} Quiz data or null if not found
     */
    static async getQuizById(quizId: number): Promise<Quiz | null> {
        try {
            return await DBService.withConnection(async (connection) => {
                // Get quiz data
                const [quizRows] = await connection.execute(
                    'SELECT * FROM quizzes WHERE id = ?',
                    [quizId]
                );

                if ((quizRows as any[]).length === 0) {
                    return null;
                }

                const quiz = (quizRows as any[])[0] as Quiz;

                // Get all questions for this quiz
                const [questionRows] = await connection.execute(
                    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC',
                    [quizId]
                );

                const questions: QuizQuestion[] = [];

                // Get options for each question
                for (const question of (questionRows as any[])) {
                    const [optionRows] = await connection.execute(
                        'SELECT * FROM options WHERE question_id = ? ORDER BY id ASC',
                        [question.id]
                    );

                    questions.push({
                        id: question.id,
                        questionText: question.question_text,
                        explanation: question.explanation,
                        options: (optionRows as any[]).map(option => ({
                            id: option.id,
                            text: option.option_text,
                            isCorrect: option.is_correct === 1
                        }))
                    });
                }

                return {
                    ...quiz,
                    questions
                };
            });
        } catch (error) {
            logger.error('Error fetching quiz by ID:', error);
            throw error;
        }
    }

    /**
     * Delete a quiz and all related data
     * @param {number} quizId - Quiz ID
     * @returns {Promise<QuizResult>} Result with success status
     */
    static async deleteQuiz(quizId: number): Promise<QuizResult> {
        try {
            return await DBService.withTransaction(async (connection) => {
                // Get all questions for this quiz
                const [questionRows] = await connection.execute(
                    'SELECT id FROM questions WHERE quiz_id = ?',
                    [quizId]
                );

                // Delete options for each question
                for (const question of (questionRows as any[])) {
                    await connection.execute(
                        'DELETE FROM options WHERE question_id = ?',
                        [question.id]
                    );
                }

                // Delete all questions
                await connection.execute(
                    'DELETE FROM questions WHERE quiz_id = ?',
                    [quizId]
                );

                // Delete the quiz
                await connection.execute(
                    'DELETE FROM quizzes WHERE id = ?',
                    [quizId]
                );

                return { success: true };
            });
        } catch (error) {
            logger.error('Error deleting quiz:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Rename a quiz
     * @param {number} quizId - Quiz ID
     * @param {string} newTitle - New title
     * @returns {Promise<QuizResult>} Result with success status
     */
    static async renameQuiz(quizId: number, newTitle: string): Promise<QuizResult> {
        try {
            const result = await DBService.update('quizzes',
                { title: newTitle, updated_at: new Date() },
                { id: quizId }
            );

            if (result === 0) {
                return { success: false, error: 'Quiz not found' };
            }

            return { success: true };
        } catch (error) {
            logger.error('Error renaming quiz:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check for duplicate quiz titles and suggest alternatives
     * @param {string} title - Quiz title
     * @param {number} userId - User ID (optional)
     * @returns {Promise<QuizDuplicateResult>} Result with duplicate status and suggested title
     */
    static async checkDuplicateTitle(title: string, userId?: number): Promise<QuizDuplicateResult> {
        try {
            // Search for exact match or titles with the same base and numbering
            let query = 'SELECT title FROM quizzes WHERE title = ? OR title LIKE ?';
            const params: any[] = [title, `${title}\\_%%`];

            // Add user filter if provided
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }

            const rows = await DBService.query(query, params);

            if (rows.length === 0) {
                // No duplicates found
                return {
                    isDuplicate: false,
                    suggestedTitle: title
                };
            }

            // Get all existing titles
            const existingTitles = rows.map(row => row.title);

            // Find the next available number
            let counter = 1;
            let newTitle = `${title}_${counter}`;

            while (existingTitles.includes(newTitle)) {
                counter++;
                newTitle = `${title}_${counter}`;
            }

            return {
                isDuplicate: true,
                suggestedTitle: newTitle
            };
        } catch (error) {
            logger.error('Error checking duplicate title:', error);
            // Default to assuming no duplicate if there's an error
            return {
                isDuplicate: false,
                suggestedTitle: title
            };
        }
    }

    /**
     * Update quiz questions
     * @param {number} quizId - Quiz ID
     * @param {QuizQuestion[]} questions - Question data
     * @returns {Promise<QuizResult>} Result with success status
     */
    static async updateQuizQuestions(quizId: number, questions: QuizQuestion[]): Promise<QuizResult> {
        try {
            return await DBService.withTransaction(async (connection) => {
                // Verify quiz exists
                const [quizRows] = await connection.execute(
                    'SELECT * FROM quizzes WHERE id = ?',
                    [quizId]
                );

                if ((quizRows as any[]).length === 0) {
                    return { success: false, error: 'Quiz not found' };
                }

                // Process only new questions (without an ID)
                for (const question of questions) {
                    if (question.id) continue;

                    // Insert new question
                    const [questionResult] = await connection.execute(
                        'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
                        [quizId, question.questionText, question.explanation]
                    );

                    const questionId = (questionResult as any).insertId;

                    // Insert options if this is a multiple choice question
                    if (question.options && question.options.length > 0) {
                        for (const option of question.options) {
                            await connection.execute(
                                'INSERT INTO options (question_id, option_text, is_correct, created_at) VALUES (?, ?, ?, NOW())',
                                [questionId, option.text, option.isCorrect]
                            );
                        }
                    }
                }

                // Update quiz timestamp
                await connection.execute(
                    'UPDATE quizzes SET updated_at = NOW() WHERE id = ?',
                    [quizId]
                );

                return { success: true };
            });
        } catch (error) {
            logger.error('Error updating quiz questions:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if a folder exists and user has access to it
     * @param {number|string} folderId - Folder ID
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if folder exists and user has access
     */
    static async checkFolderAccess(folderId: number | string, userId: number): Promise<boolean> {
        try {
            // Check if it's the root folder (null, 0, or '0')
            if (!folderId || folderId === 0 || folderId === '0') {
                return true; // Root folder always exists and is accessible
            }

            // Query to check if folder exists and belongs to user
            const [folders] = await pool.execute(
                'SELECT id FROM folders WHERE id = ? AND user_id = ?',
                [folderId, userId]
            );

            return (folders as any[]).length > 0;
        } catch (error) {
            logger.error('Error checking folder access:', error);
            return false;
        }
    }

    /**
     * Move quiz to a folder
     * @param {number} quizId - Quiz ID
     * @param {number|string|null} folderId - Folder ID (null for root)
     * @returns {Promise<QuizResult>} Result with success status
     */
    static async moveQuiz(quizId: number, folderId: number | string | null): Promise<QuizResult> {
        try {
            // Handle root folder case
            const folderIdForDb = folderId === 'root' || folderId === '0' ? null : folderId;

            const result = await DBService.update('quizzes',
                { folder_id: folderIdForDb, updated_at: new Date() },
                { id: quizId }
            );

            if (result === 0) {
                return { success: false, error: 'Quiz not found' };
            }

            return { success: true };
        } catch (error) {
            logger.error('Error moving quiz:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if user is an admin
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user is an admin
     */
    static async isUserAdmin(userId: number): Promise<boolean> {
        try {
            const [users] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            return (users as any[]).length > 0 && (users as any[])[0].role === 'admin';
        } catch (error) {
            logger.error('Error checking if user is admin:', error);
            return false;
        }
    }

    /**
     * Check if user has access to a quiz
     * @param {number} quizId - Quiz ID
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user has access
     */
    static async checkQuizAccess(quizId: number, userId: number): Promise<boolean> {
        try {
            // Check for direct ownership
            const [ownQuizRows] = await pool.execute(
                'SELECT id FROM quizzes WHERE id = ? AND user_id = ?',
                [quizId, userId]
            );

            if ((ownQuizRows as any[]).length > 0) {
                return true;
            }

            // Check for shared access
            const [sharedRows] = await pool.execute(
                'SELECT id FROM quiz_shares WHERE quiz_id = ? AND user_id = ?',
                [quizId, userId]
            );

            if ((sharedRows as any[]).length > 0) {
                return true;
            }

            // Check if user is admin
            return await this.isUserAdmin(userId);
        } catch (error) {
            logger.error('Error checking quiz access:', error);
            return false;
        }
    }

    /**
     * Check if user has edit access to a quiz
     * @param {number} quizId - Quiz ID
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user has edit access
     */
    static async checkQuizEditAccess(quizId: number, userId: number): Promise<boolean> {
        try {
            // Check for direct ownership
            const [ownQuizRows] = await pool.execute(
                'SELECT id FROM quizzes WHERE id = ? AND user_id = ?',
                [quizId, userId]
            );

            if ((ownQuizRows as any[]).length > 0) {
                return true;
            }

            // Check for shared edit access
            const [sharedRows] = await pool.execute(
                'SELECT id FROM quiz_shares WHERE quiz_id = ? AND user_id = ? AND permission = ?',
                [quizId, userId, 'edit']
            );

            if ((sharedRows as any[]).length > 0) {
                return true;
            }

            // Check if user is admin
            return await this.isUserAdmin(userId);
        } catch (error) {
            logger.error('Error checking quiz edit access:', error);
            return false;
        }
    }

    /**
     * Get user's folders
     * @param {number} userId - User ID
     * @returns {Promise<any[]>} Folders
     */
    static async getUserFolders(userId: number): Promise<any[]> {
        try {
            const [folders] = await pool.execute(
                `SELECT id, name, parent_id, created_at, updated_at
         FROM folders 
         WHERE user_id = ?
         ORDER BY name ASC`,
                [userId]
            );

            return folders as any[];
        } catch (error) {
            logger.error('Error fetching user folders:', error);
            return [];
        }
    }

    /**
     * Get quizzes in a folder
     * @param {number|string} folderId - Folder ID or 'root'
     * @param {Object} options - Query options
     * @returns {Promise<PaginatedQuizResult>} Quizzes with pagination info
     */
    static async getFolderQuizzes(folderId: number | string, options: {
        limit?: number;
        offset?: number;
    } = {}): Promise<PaginatedQuizResult> {
        try {
            const { limit = 100, offset = 0 } = options;

            let query: string;
            let countQuery: string;
            let params: any[];

            // Handle root folder case
            if (folderId === 'root' || folderId === '0') {
                query = `
          SELECT * FROM quizzes
          WHERE folder_id IS NULL OR folder_id = 0
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
                countQuery = 'SELECT COUNT(*) as total FROM quizzes WHERE folder_id IS NULL OR folder_id = 0';
                params = [limit, offset];
            } else {
                query = `
          SELECT * FROM quizzes
          WHERE folder_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
                countQuery = 'SELECT COUNT(*) as total FROM quizzes WHERE folder_id = ?';
                params = [folderId, limit, offset];
            }

            // Execute queries in parallel
            const [quizzes, countResult] = await Promise.all([
                DBService.query(query, params),
                DBService.queryOne(countQuery, folderId === 'root' || folderId === '0' ? [] : [folderId])
            ]);

            return {
                quizzes: quizzes as Quiz[],
                total: countResult?.total || 0
            };
        } catch (error) {
            logger.error('Error fetching folder quizzes:', error);
            return { quizzes: [], total: 0 };
        }
    }

    /**
     * Create a folder
     * @param {string} name - Folder name
     * @param {number} userId - User ID
     * @param {number|null} parentId - Parent folder ID (optional)
     * @returns {Promise<{ success: boolean; folderId?: number; error?: string; }>} Result
     */
    static async createFolder(name: string, userId: number, parentId?: number | null): Promise<{
        success: boolean;
        folderId?: number;
        error?: string;
    }> {
        try {
            const [result] = await pool.execute(
                'INSERT INTO folders (name, user_id, parent_id, created_at) VALUES (?, ?, ?, NOW())',
                [name, userId, parentId || null]
            );

            return {
                success: true,
                folderId: (result as any).insertId
            };
        } catch (error) {
            logger.error('Error creating folder:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Share a quiz with other users
     * @param {number} quizId - Quiz ID
     * @param {string[]} emails - List of email addresses
     * @param {string} permissions - Permissions (view or edit)
     * @returns {Promise<{ success: boolean; successful: string[]; failed: string[]; }>} Result
     */
    static async shareQuiz(quizId: number, emails: string[], permissions: string): Promise<{
        success: boolean;
        successful: string[];
        failed: string[];
    }> {
        try {
            const successful: string[] = [];
            const failed: string[] = [];

            // Process each email
            for (const email of emails) {
                try {
                    // Get user ID from email
                    const [users] = await pool.execute(
                        'SELECT id FROM users WHERE email = ?',
                        [email]
                    );

                    if ((users as any[]).length === 0) {
                        failed.push(email);
                        continue;
                    }

                    const userId = (users as any[])[0].id;

                    // Check if already shared
                    const [existing] = await pool.execute(
                        'SELECT id FROM quiz_shares WHERE quiz_id = ? AND user_id = ?',
                        [quizId, userId]
                    );

                    if ((existing as any[]).length > 0) {
                        // Update permissions if already shared
                        await pool.execute(
                            'UPDATE quiz_shares SET permission = ?, updated_at = NOW() WHERE quiz_id = ? AND user_id = ?',
                            [permissions, quizId, userId]
                        );
                    } else {
                        // Create new share
                        await pool.execute(
                            'INSERT INTO quiz_shares (quiz_id, user_id, permission, created_at) VALUES (?, ?, ?, NOW())',
                            [quizId, userId, permissions]
                        );
                    }

                    successful.push(email);
                } catch (error) {
                    logger.error(`Error sharing quiz with ${email}:`, error);
                    failed.push(email);
                }
            }

            return {
                success: successful.length > 0,
                successful,
                failed
            };
        } catch (error) {
            logger.error('Error sharing quiz:', error);
            return {
                success: false,
                successful: [],
                failed: emails
            };
        }
    }

    /**
     * Get list of users a quiz is shared with
     * @param {number} quizId - Quiz ID
     * @returns {Promise<any[]>} Share data
     */
    static async getQuizShares(quizId: number): Promise<any[]> {
        try {
            const [shares] = await pool.execute(
                `SELECT s.id, s.permission, s.created_at, u.id as user_id, u.email, u.first_name, u.last_name
         FROM quiz_shares s
         JOIN users u ON s.user_id = u.id
         WHERE s.quiz_id = ?
         ORDER BY u.first_name, u.last_name`,
                [quizId]
            );

            return shares as any[];
        } catch (error) {
            logger.error('Error fetching quiz shares:', error);
            return [];
        }
    }

    /**
     * Remove share access for a user
     * @param {number} quizId - Quiz ID
     * @param {string} email - User email
     * @returns {Promise<{ success: boolean; error?: string; }>} Result
     */
    static async removeQuizShare(quizId: number, email: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Get user ID from email
            const [users] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if ((users as any[]).length === 0) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            const userId = (users as any[])[0].id;

            // Delete share
            await pool.execute(
                'DELETE FROM quiz_shares WHERE quiz_id = ? AND user_id = ?',
                [quizId, userId]
            );

            return { success: true };
        } catch (error) {
            logger.error('Error removing quiz share:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Update sharing permissions for a user
     * @param {number} quizId - Quiz ID
     * @param {string} email - User email
     * @param {string} permissions - Permissions (view or edit)
     * @returns {Promise<{ success: boolean; error?: string; }>} Result
     */
    static async updateQuizShare(quizId: number, email: string, permissions: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Get user ID from email
            const [users] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if ((users as any[]).length === 0) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            const userId = (users as any[])[0].id;

            // Update share
            await pool.execute(
                'UPDATE quiz_shares SET permission = ?, updated_at = NOW() WHERE quiz_id = ? AND user_id = ?',
                [permissions, quizId, userId]
            );

            return { success: true };
        } catch (error) {
            logger.error('Error updating quiz share:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Clone a quiz
     * @param {number} quizId - Quiz ID to clone
     * @param {number} userId - User ID of new owner
     * @param {string} title - New title
     * @param {number|null} folderId - Folder ID for new quiz
     * @returns {Promise<QuizResult>} Result with success status and new quiz ID
     */
    static async cloneQuiz(quizId: number, userId: number, title: string, folderId?: number | null): Promise<QuizResult> {
        try {
            // Get source quiz with all questions and options
            const sourceQuiz = await this.getQuizById(quizId);

            if (!sourceQuiz) {
                return {
                    success: false,
                    error: 'Source quiz not found'
                };
            }

            // Create new quiz data
            const newQuiz = {
                title,
                topic: sourceQuiz.topic,
                questionType: sourceQuiz.questionType,
                studentLevel: sourceQuiz.studentLevel,
                language: sourceQuiz.language,
                userId,
                questions: sourceQuiz.questions,
                folder_id: folderId || null
            };

            // Save new quiz
            return await this.saveQuiz(newQuiz);
        } catch (error) {
            logger.error('Error cloning quiz:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

export default QuizService;