// backend/src/controllers/quiz/QuizExportController.js
import BaseController from '../base/BaseController.js';
import { QuizManagementService } from '../../services/quiz/QuizManagementService.js';
import { ExportService } from '../../services/quiz/ExportService.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../errors/CustomErrors.js';
import logger from '../../utils/logger.js';

/**
 * Quiz Export Controller
 * จัดการการส่งออกข้อสอบในรูปแบบต่างๆ
 * แยกออกมาจาก main controller เพื่อ Single Responsibility
 */
export class QuizExportController extends BaseController {
    constructor(quizManagementService, exportService) {
        super();

        // Inject dependencies
        this.quizManagementService = quizManagementService || new QuizManagementService();
        this.exportService = exportService || new ExportService();

        // Bind methods
        this.exportToPlainText = this.asyncHandler(this.exportToPlainText.bind(this));
        this.exportToMoodleGift = this.asyncHandler(this.exportToMoodleGift.bind(this));
        this.exportToPDF = this.asyncHandler(this.exportToPDF.bind(this));
        this.exportToJSON = this.asyncHandler(this.exportToJSON.bind(this));
        this.exportToCSV = this.asyncHandler(this.exportToCSV.bind(this));
        this.exportMultipleQuizzes = this.asyncHandler(this.exportMultipleQuizzes.bind(this));
        this.getExportFormats = this.asyncHandler(this.getExportFormats.bind(this));
    }

    /**
     * ส่งออกข้อสอบเป็นไฟล์ Plain Text
     * GET /api/quiz/:id/export/text
     */
    async exportToPlainText(req, res) {
        try {
            const { id } = req.params;
            const { includeAnswers = true, language = 'th' } = req.query;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Get quiz data
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Export to plain text
            const exportOptions = {
                includeAnswers: includeAnswers === 'true',
                language: language,
                format: 'readable'
            };

            const exportResult = await this.exportService.exportToPlainText(quiz, exportOptions);

            // Set response headers for file download
            const fileName = `${this.sanitizeFileName(quiz.title)}.txt`;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_text', {
                quizId: id,
                title: quiz.title,
                includeAnswers: exportOptions.includeAnswers,
                ip: req.ip
            });

            return res.send(exportResult.content);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบเป็นไฟล์ข้อความได้');
        }
    }

    /**
     * ส่งออกข้อสอบเป็นรูปแบบ Moodle GIFT
     * GET /api/quiz/:id/export/moodle
     */
    async exportToMoodleGift(req, res) {
        try {
            const { id } = req.params;
            const { category = 'Default' } = req.query;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Get quiz data
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Check if quiz has supported question types for GIFT format
            const supportedTypes = ['multiple_choice', 'true_false', 'short_answer'];
            const unsupportedQuestions = quiz.questions.filter(q => !supportedTypes.includes(q.type));

            if (unsupportedQuestions.length > 0) {
                logger.warn('Quiz contains unsupported question types for GIFT export', {
                    quizId: id,
                    unsupportedTypes: unsupportedQuestions.map(q => q.type)
                });
            }

            // Export to GIFT format
            const exportOptions = {
                category: category,
                includeOnlySupported: true
            };

            const exportResult = await this.exportService.exportToMoodleGift(quiz, exportOptions);

            // Set response headers for file download
            const fileName = `${this.sanitizeFileName(quiz.title)}.gift`;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_moodle', {
                quizId: id,
                title: quiz.title,
                category: category,
                supportedQuestions: quiz.questions.length - unsupportedQuestions.length,
                unsupportedQuestions: unsupportedQuestions.length,
                ip: req.ip
            });

            return res.send(exportResult.content);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบในรูปแบบ Moodle ได้');
        }
    }

    /**
     * ส่งออกข้อสอบเป็นไฟล์ PDF
     * GET /api/quiz/:id/export/pdf
     */
    async exportToPDF(req, res) {
        try {
            const { id } = req.params;
            const {
                includeAnswers = false,
                format = 'standard',
                answerSheet = false
            } = req.query;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Get quiz data
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Export to PDF
            const exportOptions = {
                includeAnswers: includeAnswers === 'true',
                format: format, // 'standard', 'compact', 'formal'
                answerSheet: answerSheet === 'true',
                header: {
                    title: quiz.title,
                    date: new Date().toLocaleDateString('th-TH'),
                    school: 'โรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร'
                }
            };

            const exportResult = await this.exportService.exportToPDF(quiz, exportOptions);

            // Set response headers for file download
            const fileName = `${this.sanitizeFileName(quiz.title)}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_pdf', {
                quizId: id,
                title: quiz.title,
                format: format,
                includeAnswers: exportOptions.includeAnswers,
                answerSheet: exportOptions.answerSheet,
                ip: req.ip
            });

            return res.send(exportResult.buffer);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบเป็นไฟล์ PDF ได้');
        }
    }

    /**
     * ส่งออกข้อสอบเป็นไฟล์ JSON
     * GET /api/quiz/:id/export/json
     */
    async exportToJSON(req, res) {
        try {
            const { id } = req.params;
            const { includeMetadata = true, pretty = true } = req.query;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Get quiz data
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Export to JSON
            const exportOptions = {
                includeMetadata: includeMetadata === 'true',
                pretty: pretty === 'true'
            };

            const exportResult = await this.exportService.exportToJSON(quiz, exportOptions);

            // Set response headers for file download
            const fileName = `${this.sanitizeFileName(quiz.title)}.json`;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_json', {
                quizId: id,
                title: quiz.title,
                includeMetadata: exportOptions.includeMetadata,
                ip: req.ip
            });

            return res.send(exportResult.content);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบเป็นไฟล์ JSON ได้');
        }
    }

    /**
     * ส่งออกข้อสอบเป็นไฟล์ CSV (สำหรับการวิเคราะห์)
     * GET /api/quiz/:id/export/csv
     */
    async exportToCSV(req, res) {
        try {
            const { id } = req.params;
            const { includeStatistics = false } = req.query;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check access permission
            const hasAccess = await this.quizManagementService.checkQuizAccess(id, req.user.userId);
            if (!hasAccess) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์เข้าถึงข้อสอบนี้');
            }

            // Get quiz data
            const quiz = await this.quizManagementService.getQuizById(id, req.user.userId);
            if (!quiz) {
                throw new NotFoundError('Quiz');
            }

            // Export to CSV
            const exportOptions = {
                includeStatistics: includeStatistics === 'true'
            };

            const exportResult = await this.exportService.exportToCSV(quiz, exportOptions);

            // Set response headers for file download
            const fileName = `${this.sanitizeFileName(quiz.title)}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_csv', {
                quizId: id,
                title: quiz.title,
                includeStatistics: exportOptions.includeStatistics,
                ip: req.ip
            });

            return res.send(exportResult.content);

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, 'ไม่พบข้อสอบที่ระบุ', 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบเป็นไฟล์ CSV ได้');
        }
    }

    /**
     * ส่งออกข้อสอบหลายรายการเป็นไฟล์ ZIP
     * POST /api/quiz/export/multiple
     */
    async exportMultipleQuizzes(req, res) {
        try {
            const { quizIds, format = 'text', options = {} } = req.body;

            // Validate input
            if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
                throw new ValidationError('ต้องระบุรายการข้อสอบที่ต้องการส่งออก');
            }

            if (quizIds.length > 50) {
                throw new ValidationError('สามารถส่งออกได้สูงสุด 50 ข้อสอบต่อครั้ง');
            }

            const validFormats = ['text', 'pdf', 'json', 'moodle'];
            if (!validFormats.includes(format)) {
                throw new ValidationError(`รูปแบบไม่ถูกต้อง ต้องเป็น: ${validFormats.join(', ')}`);
            }

            // Check access to all quizzes
            const accessChecks = await Promise.all(
                quizIds.map(id => this.quizManagementService.checkQuizAccess(id, req.user.userId))
            );

            const inaccessibleQuizzes = quizIds.filter((id, index) => !accessChecks[index]);
            if (inaccessibleQuizzes.length > 0) {
                throw new UnauthorizedError(`ไม่มีสิทธิ์เข้าถึงข้อสอบบางรายการ: ${inaccessibleQuizzes.join(', ')}`);
            }

            // Get all quizzes
            const quizzes = await Promise.all(
                quizIds.map(id => this.quizManagementService.getQuizById(id, req.user.userId))
            );

            const validQuizzes = quizzes.filter(quiz => quiz !== null);

            if (validQuizzes.length === 0) {
                throw new NotFoundError('ไม่พบข้อสอบที่ระบุ');
            }

            // Export multiple quizzes
            const exportResult = await this.exportService.exportMultipleQuizzes(
                validQuizzes,
                format,
                options
            );

            // Set response headers for file download
            const fileName = `quizzes_export_${Date.now()}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Log export activity
            this.logActivity(req.user, 'quiz_export_multiple', {
                quizCount: validQuizzes.length,
                format: format,
                requestedQuizzes: quizIds.length,
                successfulQuizzes: validQuizzes.length,
                ip: req.ip
            });

            return res.send(exportResult.buffer);

        } catch (error) {
            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            if (error instanceof NotFoundError) {
                return this.sendError(res, error.message, 404, error);
            }

            return this.handleError(res, error, 'ไม่สามารถส่งออกข้อสอบหลายรายการได้');
        }
    }

    /**
     * ดึงรายการรูปแบบการส่งออกที่รองรับ
     * GET /api/quiz/export/formats
     */
    async getExportFormats(req, res) {
        try {
            const formats = {
                text: {
                    name: 'Plain Text',
                    description: 'ไฟล์ข้อความธรรมดา เหมาะสำหรับการพิมพ์',
                    extension: '.txt',
                    mimeType: 'text/plain',
                    supports: ['all_question_types'],
                    options: {
                        includeAnswers: 'boolean',
                        language: 'string'
                    }
                },
                pdf: {
                    name: 'PDF Document',
                    description: 'เอกสาร PDF เหมาะสำหรับการพิมพ์และแบ่งปัน',
                    extension: '.pdf',
                    mimeType: 'application/pdf',
                    supports: ['all_question_types'],
                    options: {
                        includeAnswers: 'boolean',
                        format: 'string',
                        answerSheet: 'boolean'
                    }
                },
                moodle: {
                    name: 'Moodle GIFT',
                    description: 'รูปแบบ GIFT สำหรับนำเข้า Moodle LMS',
                    extension: '.gift',
                    mimeType: 'text/plain',
                    supports: ['multiple_choice', 'true_false', 'short_answer'],
                    limitations: 'ไม่รองรับคำถามแบบเรียงความ',
                    options: {
                        category: 'string'
                    }
                },
                json: {
                    name: 'JSON Data',
                    description: 'ข้อมูล JSON สำหรับการนำเข้าระบบอื่น',
                    extension: '.json',
                    mimeType: 'application/json',
                    supports: ['all_question_types'],
                    options: {
                        includeMetadata: 'boolean',
                        pretty: 'boolean'
                    }
                },
                csv: {
                    name: 'CSV Spreadsheet',
                    description: 'ไฟล์ CSV สำหรับการวิเคราะห์ใน Excel',
                    extension: '.csv',
                    mimeType: 'text/csv',
                    supports: ['analysis_data'],
                    options: {
                        includeStatistics: 'boolean'
                    }
                }
            };

            return this.sendSuccess(res, {
                formats,
                supportedQuestionTypes: [
                    'multiple_choice',
                    'true_false',
                    'essay',
                    'short_answer'
                ],
                limitations: {
                    moodle: 'ไม่รองรับคำถามแบบเรียงความ',
                    maxBulkExport: 50
                }
            }, 'ดึงรายการรูปแบบการส่งออกสำเร็จ');

        } catch (error) {
            return this.handleError(res, error, 'ไม่สามารถดึงรายการรูปแบบการส่งออกได้');
        }
    }

    /**
     * สร้างลิงก์แชร์สำหรับการส่งออก
     * POST /api/quiz/:id/export/share-link
     */
    async createExportShareLink(req, res) {
        try {
            const { id } = req.params;
            const { format = 'text', expiresIn = '24h', permissions = ['download'] } = req.body;

            // Validate input
            this.validateRequiredFields(req.params, ['id']);

            // Check permission
            const hasPermission = await this.quizManagementService.checkQuizEditPermission(
                id,
                req.user.userId
            );

            if (!hasPermission) {
                throw new UnauthorizedError('คุณไม่มีสิทธิ์สร้างลิงก์แชร์สำหรับข้อสอบนี้');
            }

            // Create share link
            const shareLink = await this.exportService.createExportShareLink(
                id,
                {
                    format,
                    expiresIn,
                    permissions,
                    createdBy: req.user.userId
                }
            );

            this.logActivity(req.user, 'quiz_export_share_link_created', {
                quizId: id,
                format: format,
                expiresIn: expiresIn,
                shareToken: shareLink.token,
                ip: req.ip
            });

            return this.sendSuccess(res, shareLink, 'สร้างลิงก์แชร์สำเร็จ');

        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return this.sendError(res, error.message, 403, error);
            }

            return this.handleError(res, error, 'ไม่สามารถสร้างลิงก์แชร์ได้');
        }
    }

    /**
     * ดาวน์โหลดผ่านลิงก์แชร์
     * GET /api/quiz/export/shared/:token
     */
    async downloadSharedExport(req, res) {
        try {
            const { token } = req.params;

            // Validate and get export info
            const exportInfo = await this.exportService.validateExportShareToken(token);

            if (!exportInfo) {
                throw new NotFoundError('ลิงก์แชร์ไม่ถูกต้องหรือหมดอายุแล้ว');
            }

            // Get quiz and export
            const quiz = await this.quizManagementService.getQuizById(
                exportInfo.quizId,
                exportInfo.createdBy
            );

            if (!quiz) {
                throw new NotFoundError('ไม่พบข้อสอบ');
            }

            // Export based on format
            let exportResult;
            const fileName = this.sanitizeFileName(quiz.title);

            switch (exportInfo.format) {
                case 'text':
                    exportResult = await this.exportService.exportToPlainText(quiz, exportInfo.options);
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.txt"`);
                    break;

                case 'pdf':
                    exportResult = await this.exportService.exportToPDF(quiz, exportInfo.options);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
                    break;

                case 'json':
                    exportResult = await this.exportService.exportToJSON(quiz, exportInfo.options);
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.json"`);
                    break;

                default:
                    throw new ValidationError('รูปแบบการส่งออกไม่รองรับ');
            }

            // Log download
            logger.info('Shared export downloaded', {
                token,
                quizId: exportInfo.quizId,
                format: exportInfo.format,
                ip: req.ip
            });

            return res.send(exportResult.content || exportResult.buffer);

        } catch (error) {
            if (error instanceof NotFoundError) {
                return this.sendError(res, error.message, 404, error);
            }

            if (error instanceof ValidationError) {
                return this.sendError(res, error.message, 400, error);
            }

            return this.handleError(res, error, 'ไม่สามารถดาวน์โหลดได้');
        }
    }

    /**
     * Sanitize filename for safe downloads
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFileName(filename) {
        if (!filename) return 'quiz';

        return filename
            .replace(/[^\w\s\u0E00-\u0E7F-]/g, '') // Keep only word chars, spaces, and Thai chars
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 100); // Limit length
    }
}

export default QuizExportController;