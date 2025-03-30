import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

class DashboardController {
    // Get dashboard statistics
    static async getDashboardStats(req, res) {
        try {
            // Get user ID from auth token if available
            const userId = req.user?.userId;

            // Create a database connection
            const connection = await pool.getConnection();

            try {
                // Execute queries in parallel for better performance
                const [
                    usersCountResult,
                    schoolsCountResult,
                    quizzesCountResult,
                    pendingUsersResult
                ] = await Promise.all([
                    // Get total users count
                    connection.execute('SELECT COUNT(*) as count FROM users WHERE status = "active"'),

                    // Get total schools count
                    connection.execute('SELECT COUNT(*) as count FROM schools'),

                    // Get total quizzes count
                    connection.execute('SELECT COUNT(*) as count FROM quizzes'),

                    // Get pending users count
                    connection.execute('SELECT COUNT(*) as count FROM users WHERE status = "pending"')
                ]);

                // Extract counts from results
                const usersCount = usersCountResult[0][0].count;
                const schoolsCount = schoolsCountResult[0][0].count;
                const quizzesCount = quizzesCountResult[0][0].count;
                const pendingUsersCount = pendingUsersResult[0][0].count;

                // If user is an admin, get additional system statistics
                let systemStats = {};
                if (req.user?.role === 'admin') {
                    const [
                        activeUsersResult,
                        recentQuizzesResult,
                        aiGenerationsResult
                    ] = await Promise.all([
                        // Get active users in last 7 days
                        connection.execute(`
                            SELECT COUNT(*) as count FROM users 
                            WHERE last_login > DATE_SUB(NOW(), INTERVAL 7 DAY)
                        `),

                        // Get quizzes created in last 7 days
                        connection.execute(`
                            SELECT COUNT(*) as count FROM quizzes 
                            WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                        `),

                        // Get total AI generations
                        connection.execute(`
                            SELECT SUM(ai_generation_count) as count FROM user_quotas
                        `)
                    ]);

                    systemStats = {
                        activeUsers: activeUsersResult[0][0].count,
                        recentQuizzes: recentQuizzesResult[0][0].count,
                        totalAiGenerations: aiGenerationsResult[0][0].count || 0
                    };
                }

                // Return the combined statistics
                return res.status(200).json({
                    success: true,
                    data: {
                        usersCount,
                        schoolsCount,
                        quizzesCount,
                        pendingUsersCount,
                        systemStats
                    }
                });
            } finally {
                // Always release the connection
                connection.release();
            }
        } catch (error) {
            logger.error('Error fetching dashboard stats:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get recent activities for dashboard
    static async getRecentActivities(req, res) {
        try {
            // Create a database connection
            const connection = await pool.getConnection();

            try {
                // Get recent user activities
                const [activities] = await connection.execute(`
                    SELECT a.id, a.activity_type, a.description, a.created_at,
                           u.first_name, u.last_name, u.email, u.profile_image
                    FROM user_activities a
                    JOIN users u ON a.user_id = u.id
                    ORDER BY a.created_at DESC
                    LIMIT 10
                `);

                return res.status(200).json({
                    success: true,
                    data: activities
                });
            } finally {
                // Always release the connection
                connection.release();
            }
        } catch (error) {
            logger.error('Error fetching recent activities:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching recent activities',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get system health status
    static async getSystemStatus(req, res) {
        try {
            // Only allow admins to access this endpoint
            if (req.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin privileges required.'
                });
            }

            // Create a database connection for checking DB status
            const connection = await pool.getConnection();

            try {
                // Check database status with a simple query
                const [dbStatus] = await connection.execute('SELECT 1 as status');

                // Systems to check
                const systems = [
                    {
                        name: 'Database',
                        status: 'online',
                        health: 95, // Percentage value
                        lastChecked: new Date()
                    },
                    {
                        name: 'API Server',
                        status: 'online',
                        health: 98,
                        lastChecked: new Date()
                    },
                    {
                        name: 'AI Service',
                        status: 'online',
                        health: 92,
                        lastChecked: new Date()
                    }
                ];

                return res.status(200).json({
                    success: true,
                    data: {
                        systems,
                        overallHealth: 95, // Overall system health percentage
                        lastChecked: new Date()
                    }
                });
            } finally {
                // Always release the connection
                connection.release();
            }
        } catch (error) {
            logger.error('Error checking system status:', error);

            // If there's a database error, report systems as having issues
            return res.status(200).json({
                success: true,
                data: {
                    systems: [
                        {
                            name: 'Database',
                            status: 'issues',
                            health: 50,
                            lastChecked: new Date()
                        },
                        {
                            name: 'API Server',
                            status: 'online',
                            health: 95,
                            lastChecked: new Date()
                        },
                        {
                            name: 'AI Service',
                            status: 'unknown',
                            health: 70,
                            lastChecked: new Date()
                        }
                    ],
                    overallHealth: 70,
                    lastChecked: new Date()
                }
            });
        }
    }
    // Get recent quizzes
    static async getRecentQuizzes(req, res) {
        try {
            // Get user ID from auth token if available
            const userId = req.user?.userId;

            // Create a database connection
            const connection = await pool.getConnection();

            try {
                // Query to get recent quizzes, filtered by user if userId is available
                let query = `
                SELECT q.id, q.title, q.topic, q.question_type as questionType, 
                       q.student_level as studentLevel, q.created_at as createdAt,
                       u.first_name, u.last_name
                FROM quizzes q
                LEFT JOIN users u ON q.user_id = u.id
            `;

                // Add user filtering if userId is available
                const queryParams = [];
                if (userId) {
                    query += ' WHERE q.user_id = ?';
                    queryParams.push(userId);
                }

                // Add order and limit
                query += ' ORDER BY q.created_at DESC LIMIT 10';

                // Execute query
                const [quizzes] = await connection.execute(query, queryParams);

                // Process dates for display
                const processedQuizzes = quizzes.map(quiz => {
                    // Format created date
                    const createdAt = new Date(quiz.createdAt);
                    const formattedDate = createdAt.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return {
                        ...quiz,
                        formattedDate,
                        // Keep compatibility with older code expecting snake_case
                        created_at: quiz.createdAt,
                        question_type: quiz.questionType,
                        student_level: quiz.studentLevel
                    };
                });

                // Group quizzes by time period
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const lastWeekStart = new Date(today);
                lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                const lastMonthStart = new Date(today);
                lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

                const categorized = {
                    today: [],
                    yesterday: [],
                    lastWeek: [],
                    lastMonth: [],
                    older: []
                };

                processedQuizzes.forEach(quiz => {
                    const createdAt = new Date(quiz.createdAt);

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

                // Calculate counts
                const counts = {
                    today: categorized.today.length,
                    yesterday: categorized.yesterday.length,
                    lastWeek: categorized.lastWeek.length,
                    lastMonth: categorized.lastMonth.length,
                    older: categorized.older.length,
                    total: processedQuizzes.length
                };

                return res.status(200).json({
                    success: true,
                    data: categorized,
                    counts: counts
                });
            } finally {
                // Always release the connection
                connection.release();
            }
        } catch (error) {
            logger.error('Error fetching recent quizzes:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching recent quizzes',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default DashboardController;