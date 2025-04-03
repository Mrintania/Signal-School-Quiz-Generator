// backend/src/controllers/exportController.js
import ExportService from '../services/exportService.js';
import { logger } from '../utils/logger.js';

/**
 * Controller for handling quiz export endpoints
 */
class ExportController {
  /**
   * Export quiz to GIFT format for Moodle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async exportQuizToGift(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Generate GIFT content
      const giftContent = await ExportService.exportToGift(id);

      // Set response headers for download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      // Get quiz title for filename
      const filename = req.query.filename || `quiz_${id}_moodle`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.txt"`);

      // Send content
      return res.status(200).send(giftContent);

    } catch (error) {
      logger.error('Error exporting quiz to GIFT format:', error);

      return res.status(error.message === 'Quiz not found' ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Export quiz to plain text format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async exportQuizToPlainText(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Generate plain text content
      const textContent = await ExportService.exportToPlainText(id);

      // Set response headers for download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      // Get quiz title for filename
      const filename = req.query.filename || `quiz_${id}`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.txt"`);

      // Send content
      return res.status(200).send(textContent);

    } catch (error) {
      logger.error('Error exporting quiz to plain text:', error);

      return res.status(error.message === 'Quiz not found' ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Export quiz to JSON format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async exportQuizToJSON(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Generate JSON data
      const jsonData = await ExportService.exportToJSON(id);

      // Set response headers for download
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      // Get quiz title for filename
      const filename = req.query.filename || `quiz_${id}`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.json"`);

      // Send content
      return res.status(200).json(jsonData);

    } catch (error) {
      logger.error('Error exporting quiz to JSON:', error);

      return res.status(error.message === 'Quiz not found' ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Export quiz to CSV format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async exportQuizToCSV(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Generate CSV content
      const csvContent = await ExportService.exportToCSV(id);

      // Set response headers for download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');

      // Get quiz title for filename
      const filename = req.query.filename || `quiz_${id}`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.csv"`);

      // Send content
      return res.status(200).send(csvContent);

    } catch (error) {
      logger.error('Error exporting quiz to CSV:', error);

      return res.status(error.message === 'Quiz not found' ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default ExportController;