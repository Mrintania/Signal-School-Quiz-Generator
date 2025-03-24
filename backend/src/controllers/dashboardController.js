// src/controllers/dashboardController.js
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

class DashboardController {
  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get total quiz count without any limits
      const [quizCount] = await pool.execute(
        'SELECT COUNT(*) as total FROM quizzes WHERE user_id = ?',
        [userId]
      );
      
      // Get lesson plan count
      const [lessonPlanCount] = await pool.execute(
        'SELECT COUNT(*) as total FROM lesson_plans WHERE user_id = ?',
        [userId]
      );
      
      // Return the counts
      return res.status(200).json({
        success: true,
        data: {
          quizCount: quizCount[0].total,
          lessonPlanCount: lessonPlanCount[0].total || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get recent content with proper date categorization - no limit on total results
  static async getRecentContent(req, res) {
    try {
      const userId = req.user.userId;
      // Increased to retrieve more results - adjust this if needed
      const limitPerCategory = parseInt(req.query.limit) || 50;
      
      // Get current date
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      const lastMonthStart = new Date(today);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      
      // Get ALL quizzes with created_at date - no LIMIT clause
      const [quizzes] = await pool.execute(
        `SELECT id, title, created_at, 'quiz' as type 
         FROM quizzes 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userId]
      );
      
      // Categorize content by date
      const categorized = {
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [] // Added category for older content
      };
      
      // Process each item
      quizzes.forEach(item => {
        const itemDate = new Date(item.created_at);
        
        if (itemDate >= today) {
          categorized.today.push(item);
        } else if (itemDate >= yesterday) {
          categorized.yesterday.push(item);
        } else if (itemDate >= lastWeekStart) {
          categorized.lastWeek.push(item);
        } else if (itemDate >= lastMonthStart) {
          categorized.lastMonth.push(item);
        } else {
          categorized.older.push(item);
        }
      });
      
      // Include total count in the response
      const totalQuizzes = quizzes.length;
      
      return res.status(200).json({
        success: true,
        data: categorized,
        total: totalQuizzes
      });
    } catch (error) {
      logger.error('Error fetching recent content:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching recent content',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default DashboardController;