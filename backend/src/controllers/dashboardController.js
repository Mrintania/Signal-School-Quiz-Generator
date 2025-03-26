import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

class DashboardController {
    // Get dashboard statistics
    static async getDashboardStats(req, res) {
        try {
            // Get user ID from auth token if available
            const userId = req.user?.userId;

            // Prepare query for quiz count
            let quizQuery = 'SELECT COUNT(*) as total FROM quizzes';
            let quizParams = [];

            // Filter by user if userId is available
            if (userId) {
                quizQuery += ' WHERE user_id = ?';
                quizParams.push(userId);
            }

            // Get quiz count
            const [quizCount] = await pool.execute(quizQuery, quizParams);

            // Prepare queries for other content types
            // For now, these will return 0 since the tables might not exist yet
            // You can modify these once you have the tables in your database
            const lessonPlanCount = { total: 0 };
            const teachingResourcesCount = { total: 0 };
            const slideDeckCount = { total: 0 };
            const flashcardSetCount = { total: 0 };
            const customChatbotCount = { total: 0 };

            // Return the counts
            return res.status(200).json({
                success: true,
                data: {
                    quizCount: quizCount[0].total,
                    lessonPlanCount: lessonPlanCount.total,
                    teachingResourcesCount: teachingResourcesCount.total,
                    slideDeckCount: slideDeckCount.total,
                    flashcardSetCount: flashcardSetCount.total,
                    customChatbotCount: customChatbotCount.total
                }
            });
        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);

            return res.status(200).json({
                success: true,
                data: {
                    quizCount: 0,
                    lessonPlanCount: 0,
                    teachingResourcesCount: 0,
                    slideDeckCount: 0,
                    flashcardSetCount: 0,
                    customChatbotCount: 0
                },
                error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
            });
        }
    }

    /**
 * Get recent quizzes categorized by time (Today, Yesterday, Last Week, Last Month)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
    static async getRecentQuizzes(req, res) {
        try {
            logger.info('Fetching recent quizzes');

            // Get limit from query params or use default of 10
            const limit = parseInt(req.query.limit) || 10;

            // Get user ID from auth token if available
            const userId = req.user?.userId;

            // Get current date (reset to start of day)
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate date ranges
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const lastMonthStart = new Date(today);
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

            // Base query to get recent quizzes
            let query = `
        SELECT 
          id, 
          title, 
          topic,
          question_type as questionType, 
          student_level as studentLevel,
          created_at as createdAt
        FROM quizzes
      `;

            // Filter by user if userId is available
            if (userId) {
                query += ' WHERE user_id = ?';
            }

            // Add ordering and limit - use a larger limit to ensure we get enough for all categories
            query += ' ORDER BY created_at DESC LIMIT ?';

            // Execute query
            const queryParams = userId ? [userId, limit * 2] : [limit * 2]; // Multiply limit to ensure we get enough
            const [quizzes] = await pool.execute(query, queryParams);

            logger.info(`Retrieved ${quizzes.length} quizzes from database`);

            // Initialize categories
            const categorized = {
                today: [],
                yesterday: [],
                lastWeek: [],
                lastMonth: [],
                older: []
            };

            // Categorize quizzes by creation date
            quizzes.forEach(quiz => {
                // Make sure createdAt is a Date object
                const createdAt = new Date(quiz.createdAt);

                // Format date for display
                quiz.formattedDate = new Intl.DateTimeFormat('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(createdAt);

                // Also add compatibility with older frontend
                quiz.created_at = quiz.createdAt;
                quiz.question_type = quiz.questionType;
                quiz.student_level = quiz.studentLevel;

                // Categorize by date
                if (createdAt >= today) {
                    categorized.today.push(quiz);
                } else if (createdAt >= yesterday) {
                    categorized.yesterday.push(quiz);
                } else if (createdAt >= lastWeekStart) {
                    categorized.lastWeek.push(quiz);
                } else if (createdAt >= lastMonthStart) {
                    categorized.lastMonth.push(quiz);
                } else {
                    categorized.older.push(quiz);
                }
            });

            // Log counts for debugging
            logger.info(`Categorized quizzes: Today: ${categorized.today.length}, Yesterday: ${categorized.yesterday.length}, Last Week: ${categorized.lastWeek.length}, Last Month: ${categorized.lastMonth.length}, Older: ${categorized.older.length}`);

            // Calculate total in each category for UI display
            const counts = {
                today: categorized.today.length,
                yesterday: categorized.yesterday.length,
                lastWeek: categorized.lastWeek.length,
                lastMonth: categorized.lastMonth.length,
                older: categorized.older.length,
                total: quizzes.length
            };

            return res.status(200).json({
                success: true,
                data: categorized,
                counts: counts
            });
        } catch (error) {
            logger.error('Error fetching recent quizzes:', error);

            // Return empty data instead of error for better UX
            return res.status(200).json({
                success: true,
                data: {
                    today: [],
                    yesterday: [],
                    lastWeek: [],
                    lastMonth: [],
                    older: []
                },
                counts: {
                    today: 0,
                    yesterday: 0,
                    lastWeek: 0,
                    lastMonth: 0,
                    older: 0,
                    total: 0
                },
                error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
            });
        }
    }
}

export default DashboardController;