// backend/src/services/quizService.js
import DBService from './dbService.js';
import { logger } from '../utils/logger.js';

/**
 * Service for quiz operations
 */
class QuizService {
    /**
     * Save a new quiz with questions and options
     * @param {Object} quizData - Quiz data with questions and options
     * @returns {Promise<Object>} Result with success status and quiz ID
     */
    static async saveQuiz(quizData) {
        const { title, topic, questionType, studentLevel, language, questions, userId } = quizData;

        try {
            // Use transaction to ensure all operations succeed or fail together
            return await DBService.withTransaction(async (connection) => {
                // Insert quiz
                const [quizResult] = await connection.execute(
                    'INSERT INTO quizzes (title, topic, question_type, student_level, language, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [title, topic, questionType, studentLevel, language || 'english', userId]
                );

                const quizId = quizResult.insertId;

                // Insert questions
                for (const question of questions) {
                    const [questionResult] = await connection.execute(
                        'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
                        [quizId, question.questionText, question.explanation]
                    );

                    const questionId = questionResult.insertId;

                    // Insert options for multiple choice questions
                    if (question.options && question.options.length > 0) {
                        for (const option of question.options) {
                            await connection.execute(
                                'INSERT INTO options (question_id, option_text, is_correct, created_at) VALUES (?, ?, ?, NOW())',
                                [questionId, option.text, option.isCorrect]
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

            return { success: false, error: error.message };
        }
    }

    /**
     * Get all quizzes with pagination
     * @param {Object} options - Query options
     * @param {number} options.limit - Number of records to return
     * @param {number} options.offset - Number of records to skip
     * @param {number} options.userId - Filter by user ID (optional)
     * @param {string} options.search - Search term (optional)
     * @returns {Promise<Object>} Quizzes with pagination info
     */
    static async getAllQuizzes({ limit = 10, offset = 0, userId = null, search = null }) {
        try {
            // Base query
            let query = 'SELECT * FROM quizzes';
            let countQuery = 'SELECT COUNT(*) as total FROM quizzes';

            const queryParams = [];
            const countParams = [];

            // Add filters
            const filters = [];

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

            // Apply filters
            if (filters.length > 0) {
                const whereClause = filters.join(' AND ');
                query += ` WHERE ${whereClause}`;
                countQuery += ` WHERE ${whereClause}`;
            }

            // Add ordering and pagination
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute queries in parallel for better performance
            const [quizzes, countResult] = await Promise.all([
                DBService.query(query, queryParams),
                DBService.queryOne(countQuery, countParams)
            ]);

            return {
                quizzes,
                total: countResult.total
            };
        } catch (error) {
            logger.error('Error fetching quizzes:', error);
            throw error;
        }
    }

    /**
     * Get quiz by ID with all questions and options
     * @param {number} quizId - Quiz ID
     * @returns {Promise<Object|null>} Quiz data or null if not found
     */
    static async getQuizById(quizId) {
        try {
            return await DBService.withConnection(async (connection) => {
                // Get quiz data
                const [quizRows] = await connection.execute(
                    'SELECT * FROM quizzes WHERE id = ?',
                    [quizId]
                );

                if (quizRows.length === 0) {
                    return null;
                }

                const quiz = quizRows[0];

                // Get all questions for this quiz
                const [questionRows] = await connection.execute(
                    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC',
                    [quizId]
                );

                const questions = [];

                // Get options for each question
                for (const question of questionRows) {
                    const [optionRows] = await connection.execute(
                        'SELECT * FROM options WHERE question_id = ? ORDER BY id ASC',
                        [question.id]
                    );

                    questions.push({
                        id: question.id,
                        questionText: question.question_text,
                        explanation: question.explanation,
                        options: optionRows.map(option => ({
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
     * @returns {Promise<Object>} Result with success status
     */
    static async deleteQuiz(quizId) {
        try {
            return await DBService.withTransaction(async (connection) => {
                // Get all questions for this quiz
                const [questionRows] = await connection.execute(
                    'SELECT id FROM questions WHERE quiz_id = ?',
                    [quizId]
                );

                // Delete options for each question
                for (const question of questionRows) {
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
            return { success: false, error: error.message };
        }
    }

    /**
     * Rename a quiz
     * @param {number} quizId - Quiz ID
     * @param {string} newTitle - New title
     * @returns {Promise<Object>} Result with success status
     */
    static async renameQuiz(quizId, newTitle) {
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
            return { success: false, error: error.message };
        }
    }

    /**
     * Check for duplicate quiz titles and suggest alternatives
     * @param {string} title - Quiz title
     * @returns {Promise<Object>} Result with duplicate status and suggested title
     */
    static async checkDuplicateTitle(title) {
        try {
            // Search for exact match or titles with the same base and numbering
            const rows = await DBService.query(
                'SELECT title FROM quizzes WHERE title = ? OR title LIKE ?',
                [title, `${title}\\_%%`]
            );

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
     * @param {Array} questions - Question data
     * @returns {Promise<Object>} Result with success status
     */
    static async updateQuizQuestions(quizId, questions) {
        try {
            return await DBService.withTransaction(async (connection) => {
                // Verify quiz exists
                const [quizRows] = await connection.execute(
                    'SELECT * FROM quizzes WHERE id = ?',
                    [quizId]
                );

                if (quizRows.length === 0) {
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

                    const questionId = questionResult.insertId;

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
            return { success: false, error: error.message };
        }
    }

    /**
     * Move quiz to a folder
     * @param {number} quizId - Quiz ID
     * @param {number} folderId - Folder ID
     * @returns {Promise<Object>} Result with success status
     */
    static async moveQuiz(quizId, folderId) {
        try {
            const result = await DBService.update('quizzes',
                { folder_id: folderId, updated_at: new Date() },
                { id: quizId }
            );

            if (result === 0) {
                return { success: false, error: 'Quiz not found' };
            }

            return { success: true };
        } catch (error) {
            logger.error('Error moving quiz:', error);
            return { success: false, error: error.message };
        }
    }
}

export default QuizService;