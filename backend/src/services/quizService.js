import DBService from './dbService.js';
import { logger } from '../utils/logger.js';
import { pool } from '../config/db.js';


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
 * ย้ายข้อสอบไปยังโฟลเดอร์
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
    static async moveQuiz(req, res) {
        try {
            const { id } = req.params;
            const { folderId } = req.body;
            const userId = req.user?.userId;

            // ตรวจสอบข้อมูลนำเข้า
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ Quiz ID'
                });
            }

            // ตรวจสอบว่าผู้ใช้เป็นเจ้าของข้อสอบหรือไม่
            const quiz = await QuizService.getQuizById(id);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อสอบ'
                });
            }

            // ตรวจสอบว่าผู้ใช้มีสิทธิ์ย้ายข้อสอบนี้หรือไม่
            if (quiz.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์ย้ายข้อสอบนี้'
                });
            }

            // ย้ายข้อสอบใน database
            await pool.execute(
                'UPDATE quizzes SET folder_id = ?, updated_at = NOW() WHERE id = ?',
                [folderId === '0' ? null : folderId, id]
            );

            logger.info(`ข้อสอบถูกย้าย: ID ${id} ไปยังโฟลเดอร์ ID: ${folderId} โดยผู้ใช้ ID: ${userId}`);

            return res.status(200).json({
                success: true,
                message: 'ย้ายข้อสอบเรียบร้อยแล้ว'
            });
        } catch (error) {
            logger.error('เกิดข้อผิดพลาดในการย้ายข้อสอบ:', error);

            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในขณะย้ายข้อสอบ',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
 * Check if a user has access to a folder
 * @param {number} folderId - Folder ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user has access
 */
    static async checkFolderAccess(folderId, userId) {
        try {
            // Handle special case for root folder (usually represented as 0 or null)
            if (!folderId || folderId === '0' || folderId === 0) {
                return true; // Everyone has access to root folder
            }

            // Query the database to check if folder belongs to user
            const result = await DBService.queryOne(
                'SELECT id FROM folders WHERE id = ? AND user_id = ?',
                [folderId, userId]
            );

            return !!result; // Return true if folder exists and belongs to user
        } catch (error) {
            logger.error('Error checking folder access:', error);
            return false; // Default to no access on error
        }
    }

    /**
 * Check if a user has access to a quiz
 * @param {number} quizId - Quiz ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user has access
 */
    static async checkQuizAccess(quizId, userId) {
        try {
            // First check if user is the owner of the quiz
            const quiz = await this.getQuizById(quizId);

            if (!quiz) {
                return false; // Quiz not found
            }

            if (quiz.user_id === userId) {
                return true; // User is the owner
            }

            // Check if quiz is shared with user
            const [shared] = await pool.execute(
                'SELECT id FROM quiz_shares WHERE quiz_id = ? AND user_id = ?',
                [quizId, userId]
            );

            return shared.length > 0; // Return true if quiz is shared with user
        } catch (error) {
            logger.error('Error checking quiz access:', error);
            return false; // Default to no access on error
        }
    }

    /**
 * Check if a user has edit access to a quiz
 * @param {number} quizId - Quiz ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user has edit access
 */
    static async checkQuizEditAccess(quizId, userId) {
        try {
            // First check if user is the owner of the quiz
            const quiz = await this.getQuizById(quizId);

            if (!quiz) {
                return false; // Quiz not found
            }

            if (quiz.user_id === userId) {
                return true; // User is the owner
            }

            // Check if user is an admin
            const isAdmin = await this.isUserAdmin(userId);
            if (isAdmin) {
                return true; // Admins can edit all quizzes
            }

            // Try to check for edit permissions in shares table
            try {
                const [shared] = await pool.execute(
                    'SELECT id FROM quiz_shares WHERE quiz_id = ? AND user_id = ? AND permissions = ?',
                    [quizId, userId, 'edit']
                );

                return shared.length > 0; // Return true if quiz is shared with edit permissions
            } catch (error) {
                // If the shares table doesn't exist yet, just return false
                return false;
            }
        } catch (error) {
            logger.error('Error checking quiz edit access:', error);
            return false; // Default to no access on error
        }
    }

    /**
     * Check if a user is an admin
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user is admin
     */
    static async isUserAdmin(userId) {
        try {
            const [user] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            return user.length > 0 && user[0].role === 'admin';
        } catch (error) {
            logger.error('Error checking admin status:', error);
            return false;
        }
    }

    /**
 * สร้างโฟลเดอร์ใหม่
 * @param {string} name - ชื่อโฟลเดอร์
 * @param {number} userId - ID ของผู้ใช้
 * @param {number} parentId - ID ของโฟลเดอร์แม่ (ถ้ามี)
 * @returns {Promise<Object>} ผลลัพธ์การสร้างโฟลเดอร์
 */
    static async createFolder(name, userId, parentId = null) {
        try {
            if (!name || !userId) {
                return { success: false, error: 'ชื่อโฟลเดอร์และ ID ผู้ใช้จำเป็นต้องระบุ' };
            }

            // ตรวจสอบว่าโฟลเดอร์แม่มีอยู่จริงและผู้ใช้มีสิทธิ์เข้าถึง (ถ้าระบุ parentId)
            if (parentId) {
                const hasAccess = await this.checkFolderAccess(parentId, userId);
                if (!hasAccess) {
                    return { success: false, error: 'ไม่พบโฟลเดอร์แม่หรือคุณไม่มีสิทธิ์เข้าถึง' };
                }
            }

            // สร้างโฟลเดอร์ใหม่
            const [result] = await pool.execute(
                'INSERT INTO folders (name, user_id, parent_id) VALUES (?, ?, ?)',
                [name, userId, parentId]
            );

            const folderId = result.insertId;

            logger.info(`โฟลเดอร์ถูกสร้าง: ${name} (ID: ${folderId}) โดยผู้ใช้ ID: ${userId}`);

            return {
                success: true,
                folderId,
                message: 'โฟลเดอร์ถูกสร้างเรียบร้อยแล้ว'
            };
        } catch (error) {
            logger.error('เกิดข้อผิดพลาดในการสร้างโฟลเดอร์:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ดึงโฟลเดอร์ทั้งหมดของผู้ใช้
     * @param {number} userId - ID ของผู้ใช้
     * @returns {Promise<Array>} รายการโฟลเดอร์
     */
    static async getUserFolders(userId) {
        try {
            // ดึงข้อมูลโฟลเดอร์ทั้งหมดของผู้ใช้
            const [folders] = await pool.execute(
                `SELECT f.id, f.name, f.parent_id, f.created_at, f.updated_at,
        (SELECT COUNT(*) FROM quizzes WHERE folder_id = f.id) as quiz_count
        FROM folders f
        WHERE f.user_id = ?
        ORDER BY f.name ASC`,
                [userId]
            );

            // สร้างโครงสร้างแบบต้นไม้ (tree structure)
            const folderMap = {};
            const rootFolders = [];

            // สร้าง Map ของโฟลเดอร์ทั้งหมด
            folders.forEach(folder => {
                folderMap[folder.id] = {
                    ...folder,
                    children: []
                };
            });

            // จัดโครงสร้างต้นไม้
            folders.forEach(folder => {
                if (folder.parent_id === null) {
                    rootFolders.push(folderMap[folder.id]);
                } else {
                    if (folderMap[folder.parent_id]) {
                        folderMap[folder.parent_id].children.push(folderMap[folder.id]);
                    } else {
                        // ถ้าไม่พบโฟลเดอร์แม่ ให้ใส่ในรากแทน
                        rootFolders.push(folderMap[folder.id]);
                    }
                }
            });

            return rootFolders;
        } catch (error) {
            logger.error('เกิดข้อผิดพลาดในการดึงโฟลเดอร์:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อสอบในโฟลเดอร์
     * @param {number} folderId - ID ของโฟลเดอร์
     * @param {Object} options - ตัวเลือกการค้นหา
     * @returns {Promise<Object>} ข้อสอบและข้อมูลเพจเนชัน
     */
    static async getFolderQuizzes(folderId, { limit = 10, offset = 0 }) {
        try {
            // ดึงข้อสอบในโฟลเดอร์นี้
            const [quizzes] = await pool.execute(
                `SELECT * FROM quizzes
        WHERE folder_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
                [folderId, limit, offset]
            );

            // นับจำนวนข้อสอบทั้งหมดในโฟลเดอร์
            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM quizzes WHERE folder_id = ?',
                [folderId]
            );

            const total = countResult[0].total;

            return {
                quizzes,
                total
            };
        } catch (error) {
            logger.error('เกิดข้อผิดพลาดในการดึงข้อสอบในโฟลเดอร์:', error);
            throw error;
        }
    }
}

export default QuizService;