import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import logger from '../../utils/logger.js';
import { CacheService } from '../common/CacheService.js';
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Export Service
 * จัดการการส่งออกข้อสอบในรูปแบบต่างๆ
 */
export class ExportService {
    constructor(dependencies = {}) {
        this.cacheService = dependencies.cacheService || new CacheService();

        // Share token storage (in production, use database)
        this.shareTokens = new Map();

        this.config = {
            shareTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
            maxCachedExports: 100
        };
    }

    /**
     * Export quiz to plain text format
     * @param {Object} quiz - Quiz data
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportToPlainText(quiz, options = {}) {
        try {
            const {
                includeAnswers = true,
                language = 'th',
                format = 'readable'
            } = options;

            const labels = this.getLabels(language);
            let content = '';

            // Header
            content += `${labels.title}: ${quiz.title}\n`;
            if (quiz.description) {
                content += `${labels.description}: ${quiz.description}\n`;
            }
            content += `${labels.totalQuestions}: ${quiz.questions.length}\n`;
            content += `${labels.createdDate}: ${new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}\n`;
            content += '\n' + '='.repeat(60) + '\n\n';

            // Questions
            quiz.questions.forEach((question, index) => {
                content += `${labels.question} ${index + 1}: ${question.question}\n\n`;

                switch (question.type) {
                    case 'multiple_choice':
                        question.options.forEach((option, optIndex) => {
                            const marker = String.fromCharCode(97 + optIndex); // a, b, c, d
                            const isCorrect = includeAnswers && optIndex === question.correctAnswer;
                            content += `   ${marker}) ${option}${isCorrect ? ` [${labels.correct}]` : ''}\n`;
                        });
                        break;

                    case 'true_false':
                        content += `   ${labels.trueOption}\n   ${labels.falseOption}\n`;
                        if (includeAnswers) {
                            content += `   ${labels.answer}: ${question.correctAnswer ? labels.trueOption : labels.falseOption}\n`;
                        }
                        break;

                    case 'essay':
                        if (question.rubric) {
                            content += `   ${labels.rubric}: ${question.rubric}\n`;
                        }
                        if (question.keywords && question.keywords.length > 0) {
                            content += `   ${labels.keywords}: ${question.keywords.join(', ')}\n`;
                        }
                        break;

                    case 'short_answer':
                        if (includeAnswers && question.correctAnswers) {
                            content += `   ${labels.possibleAnswers}: ${question.correctAnswers.join(', ')}\n`;
                        }
                        break;
                }

                if (question.explanation && includeAnswers) {
                    content += `   ${labels.explanation}: ${question.explanation}\n`;
                }

                content += '\n' + '-'.repeat(40) + '\n\n';
            });

            // Footer
            if (includeAnswers) {
                content += '\n' + '='.repeat(60) + '\n';
                content += `${labels.answerKey}\n`;
                content += '='.repeat(60) + '\n\n';

                quiz.questions.forEach((question, index) => {
                    content += `${index + 1}. `;

                    switch (question.type) {
                        case 'multiple_choice':
                            const correctLetter = String.fromCharCode(97 + question.correctAnswer);
                            content += `${correctLetter})\n`;
                            break;
                        case 'true_false':
                            content += `${question.correctAnswer ? labels.trueOption : labels.falseOption}\n`;
                            break;
                        case 'essay':
                            content += `${labels.seeRubric}\n`;
                            break;
                        case 'short_answer':
                            content += `${question.correctAnswers ? question.correctAnswers.join(', ') : labels.seeQuestion}\n`;
                            break;
                    }
                });
            }

            logger.debug('Quiz exported to plain text', {
                quizId: quiz.id,
                title: quiz.title,
                contentLength: content.length,
                includeAnswers
            });

            return {
                content,
                metadata: {
                    format: 'text/plain',
                    size: Buffer.byteLength(content, 'utf8'),
                    questions: quiz.questions.length,
                    includeAnswers
                }
            };

        } catch (error) {
            logger.error('Error exporting to plain text:', error);
            throw new Error(`Plain text export failed: ${error.message}`);
        }
    }

    /**
     * Export quiz to Moodle GIFT format
     * @param {Object} quiz - Quiz data
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportToMoodleGift(quiz, options = {}) {
        try {
            const { category = 'Default', includeOnlySupported = true } = options;

            let content = '';

            // Category declaration
            content += `$CATEGORY: ${category}\n\n`;

            // Questions
            quiz.questions.forEach((question, index) => {
                if (includeOnlySupported && !this.isGiftSupported(question.type)) {
                    return; // Skip unsupported question types
                }

                // Question name (optional)
                content += `// Question ${index + 1}\n`;

                switch (question.type) {
                    case 'multiple_choice':
                        content += this.formatGiftMultipleChoice(question);
                        break;
                    case 'true_false':
                        content += this.formatGiftTrueFalse(question);
                        break;
                    case 'short_answer':
                        content += this.formatGiftShortAnswer(question);
                        break;
                    default:
                        if (!includeOnlySupported) {
                            content += `// Unsupported question type: ${question.type}\n`;
                            content += `// ${question.question}\n\n`;
                        }
                }

                content += '\n';
            });

            logger.debug('Quiz exported to GIFT format', {
                quizId: quiz.id,
                title: quiz.title,
                category,
                contentLength: content.length
            });

            return {
                content,
                metadata: {
                    format: 'text/gift',
                    category,
                    size: Buffer.byteLength(content, 'utf8'),
                    supportedQuestions: quiz.questions.filter(q => this.isGiftSupported(q.type)).length,
                    totalQuestions: quiz.questions.length
                }
            };

        } catch (error) {
            logger.error('Error exporting to GIFT format:', error);
            throw new Error(`GIFT export failed: ${error.message}`);
        }
    }

    /**
     * Export quiz to PDF format
     * @param {Object} quiz - Quiz data
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportToPDF(quiz, options = {}) {
        try {
            const {
                includeAnswers = false,
                format = 'standard',
                answerSheet = false,
                header = {}
            } = options;

            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 72, bottom: 72, left: 72, right: 72 }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));

            // Header
            this.addPDFHeader(doc, quiz, header);

            // Quiz instructions
            this.addPDFInstructions(doc, quiz, format);

            // Questions
            quiz.questions.forEach((question, index) => {
                this.addPDFQuestion(doc, question, index + 1, { includeAnswers, format });
            });

            // Answer sheet (if requested)
            if (answerSheet && !includeAnswers) {
                doc.addPage();
                this.addPDFAnswerSheet(doc, quiz);
            }

            // Footer
            this.addPDFFooter(doc);

            doc.end();

            // Wait for PDF generation to complete
            const buffer = await new Promise((resolve) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(buffers));
                });
            });

            logger.debug('Quiz exported to PDF', {
                quizId: quiz.id,
                title: quiz.title,
                format,
                size: buffer.length,
                includeAnswers,
                answerSheet
            });

            return {
                buffer,
                metadata: {
                    format: 'application/pdf',
                    size: buffer.length,
                    pages: doc.bufferedPageRange().count,
                    questions: quiz.questions.length,
                    includeAnswers,
                    answerSheet
                }
            };

        } catch (error) {
            logger.error('Error exporting to PDF:', error);
            throw new Error(`PDF export failed: ${error.message}`);
        }
    }

    /**
     * Export quiz to JSON format
     * @param {Object} quiz - Quiz data
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportToJSON(quiz, options = {}) {
        try {
            const { includeMetadata = true, pretty = true } = options;

            const exportData = {
                title: quiz.title,
                description: quiz.description,
                questions: quiz.questions
            };

            if (includeMetadata) {
                exportData.metadata = {
                    id: quiz.id,
                    createdAt: quiz.createdAt,
                    updatedAt: quiz.updatedAt,
                    userId: quiz.userId,
                    category: quiz.category,
                    tags: quiz.tags,
                    difficulty: quiz.difficulty,
                    estimatedTime: quiz.estimatedTime,
                    questionCount: quiz.questions.length,
                    questionTypes: this.analyzeQuestionTypes(quiz.questions),
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'Signal School Quiz Generator'
                };
            }

            const content = pretty ?
                JSON.stringify(exportData, null, 2) :
                JSON.stringify(exportData);

            logger.debug('Quiz exported to JSON', {
                quizId: quiz.id,
                title: quiz.title,
                includeMetadata,
                contentLength: content.length
            });

            return {
                content,
                metadata: {
                    format: 'application/json',
                    size: Buffer.byteLength(content, 'utf8'),
                    pretty,
                    includeMetadata
                }
            };

        } catch (error) {
            logger.error('Error exporting to JSON:', error);
            throw new Error(`JSON export failed: ${error.message}`);
        }
    }

    /**
     * Export quiz to CSV format (for analysis)
     * @param {Object} quiz - Quiz data
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportToCSV(quiz, options = {}) {
        try {
            const { includeStatistics = false } = options;

            let content = '';

            // Headers
            const headers = [
                'Question Number',
                'Question Text',
                'Question Type',
                'Correct Answer',
                'Option A',
                'Option B',
                'Option C',
                'Option D',
                'Difficulty',
                'Category'
            ];

            if (includeStatistics) {
                headers.push('Response Count', 'Correct Rate', 'Avg Time');
            }

            content += headers.join(',') + '\n';

            // Data rows
            quiz.questions.forEach((question, index) => {
                const row = [
                    index + 1,
                    `"${this.escapeCSV(question.question)}"`,
                    question.type,
                    this.getCorrectAnswerText(question),
                    question.options ? `"${this.escapeCSV(question.options[0] || '')}"` : '',
                    question.options ? `"${this.escapeCSV(question.options[1] || '')}"` : '',
                    question.options ? `"${this.escapeCSV(question.options[2] || '')}"` : '',
                    question.options ? `"${this.escapeCSV(question.options[3] || '')}"` : '',
                    question.difficulty || '',
                    question.category || ''
                ];

                if (includeStatistics) {
                    // Mock statistics - in real implementation, fetch from database
                    row.push('0', '0%', '0s');
                }

                content += row.join(',') + '\n';
            });

            logger.debug('Quiz exported to CSV', {
                quizId: quiz.id,
                title: quiz.title,
                includeStatistics,
                contentLength: content.length
            });

            return {
                content,
                metadata: {
                    format: 'text/csv',
                    size: Buffer.byteLength(content, 'utf8'),
                    rows: quiz.questions.length + 1, // +1 for header
                    includeStatistics
                }
            };

        } catch (error) {
            logger.error('Error exporting to CSV:', error);
            throw new Error(`CSV export failed: ${error.message}`);
        }
    }

    /**
     * Export multiple quizzes to ZIP file
     * @param {Array} quizzes - Array of quiz data
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    async exportMultipleQuizzes(quizzes, format, options = {}) {
        try {
            const zip = new JSZip();

            for (const quiz of quizzes) {
                let exportResult;
                let fileName;

                switch (format) {
                    case 'text':
                        exportResult = await this.exportToPlainText(quiz, options);
                        fileName = `${this.sanitizeFileName(quiz.title)}.txt`;
                        zip.file(fileName, exportResult.content);
                        break;

                    case 'pdf':
                        exportResult = await this.exportToPDF(quiz, options);
                        fileName = `${this.sanitizeFileName(quiz.title)}.pdf`;
                        zip.file(fileName, exportResult.buffer);
                        break;

                    case 'json':
                        exportResult = await this.exportToJSON(quiz, options);
                        fileName = `${this.sanitizeFileName(quiz.title)}.json`;
                        zip.file(fileName, exportResult.content);
                        break;

                    case 'moodle':
                        exportResult = await this.exportToMoodleGift(quiz, options);
                        fileName = `${this.sanitizeFileName(quiz.title)}.gift`;
                        zip.file(fileName, exportResult.content);
                        break;

                    default:
                        throw new ValidationError(`Unsupported format: ${format}`);
                }
            }

            // Generate ZIP buffer
            const buffer = await zip.generateAsync({ type: 'nodebuffer' });

            logger.debug('Multiple quizzes exported to ZIP', {
                quizCount: quizzes.length,
                format,
                zipSize: buffer.length
            });

            return {
                buffer,
                metadata: {
                    format: 'application/zip',
                    size: buffer.length,
                    quizCount: quizzes.length,
                    exportFormat: format
                }
            };

        } catch (error) {
            logger.error('Error exporting multiple quizzes:', error);
            throw new Error(`Multiple quiz export failed: ${error.message}`);
        }
    }

    /**
     * Create export share link
     * @param {string} quizId - Quiz ID
     * @param {Object} options - Share options
     * @returns {Object} Share link info
     */
    async createExportShareLink(quizId, options = {}) {
        try {
            const {
                format = 'text',
                expiresIn = '24h',
                permissions = ['download'],
                createdBy
            } = options;

            // Generate unique token
            const token = this.generateShareToken();

            // Calculate expiry
            const expiresAt = new Date();
            if (expiresIn.endsWith('h')) {
                expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
            } else if (expiresIn.endsWith('d')) {
                expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
            } else {
                expiresAt.setHours(expiresAt.getHours() + 24); // Default 24 hours
            }

            // Store share info (in production, use database)
            this.shareTokens.set(token, {
                quizId,
                format,
                permissions,
                createdBy,
                createdAt: new Date(),
                expiresAt,
                options: options.exportOptions || {}
            });

            const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const shareUrl = `${baseUrl}/api/quiz/export/shared/${token}`;

            logger.info('Export share link created', {
                token,
                quizId,
                format,
                expiresAt,
                createdBy
            });

            return {
                token,
                shareUrl,
                expiresAt,
                format,
                permissions
            };

        } catch (error) {
            logger.error('Error creating export share link:', error);
            throw new Error(`Share link creation failed: ${error.message}`);
        }
    }

    /**
     * Validate export share token
     * @param {string} token - Share token
     * @returns {Object|null} Share info or null if invalid
     */
    async validateExportShareToken(token) {
        try {
            const shareInfo = this.shareTokens.get(token);

            if (!shareInfo) {
                return null;
            }

            // Check expiry
            if (new Date() > shareInfo.expiresAt) {
                this.shareTokens.delete(token);
                return null;
            }

            return shareInfo;

        } catch (error) {
            logger.error('Error validating share token:', error);
            return null;
        }
    }

    // Helper methods

    getLabels(language) {
        const labels = {
            th: {
                title: 'ชื่อข้อสอบ',
                description: 'คำอธิบาย',
                totalQuestions: 'จำนวนคำถาม',
                createdDate: 'วันที่สร้าง',
                question: 'คำถามที่',
                correct: 'ถูกต้อง',
                trueOption: 'ถูก',
                falseOption: 'ผิด',
                answer: 'คำตอบ',
                rubric: 'เกณฑ์การให้คะแนน',
                keywords: 'คำสำคัญ',
                possibleAnswers: 'คำตอบที่เป็นไปได้',
                explanation: 'คำอธิบาย',
                answerKey: 'เฉลย',
                seeRubric: 'ดูเกณฑ์การให้คะแนน',
                seeQuestion: 'ดูคำถาม'
            },
            en: {
                title: 'Quiz Title',
                description: 'Description',
                totalQuestions: 'Total Questions',
                createdDate: 'Created Date',
                question: 'Question',
                correct: 'Correct',
                trueOption: 'True',
                falseOption: 'False',
                answer: 'Answer',
                rubric: 'Rubric',
                keywords: 'Keywords',
                possibleAnswers: 'Possible Answers',
                explanation: 'Explanation',
                answerKey: 'Answer Key',
                seeRubric: 'See Rubric',
                seeQuestion: 'See Question'
            }
        };

        return labels[language] || labels.th;
    }

    isGiftSupported(questionType) {
        return ['multiple_choice', 'true_false', 'short_answer'].includes(questionType);
    }

    formatGiftMultipleChoice(question) {
        let gift = `${this.escapeGift(question.question)} {\n`;

        question.options.forEach((option, index) => {
            const prefix = index === question.correctAnswer ? '=' : '~';
            gift += `  ${prefix}${this.escapeGift(option)}\n`;
        });

        gift += '}\n';
        return gift;
    }

    formatGiftTrueFalse(question) {
        const answer = question.correctAnswer ? 'TRUE' : 'FALSE';
        return `${this.escapeGift(question.question)} {${answer}}\n`;
    }

    formatGiftShortAnswer(question) {
        if (question.correctAnswers && question.correctAnswers.length > 0) {
            const answers = question.correctAnswers.map(ans => `=${this.escapeGift(ans)}`).join('\n  ');
            return `${this.escapeGift(question.question)} {\n  ${answers}\n}\n`;
        }
        return `${this.escapeGift(question.question)} {=ANSWER}\n`;
    }

    escapeGift(text) {
        return text.replace(/[{}~=]/g, '\\$&');
    }

    escapeCSV(text) {
        return text.replace(/"/g, '""');
    }

    getCorrectAnswerText(question) {
        switch (question.type) {
            case 'multiple_choice':
                return question.options ? question.options[question.correctAnswer] : '';
            case 'true_false':
                return question.correctAnswer ? 'True' : 'False';
            case 'short_answer':
                return question.correctAnswers ? question.correctAnswers[0] : '';
            default:
                return '';
        }
    }

    analyzeQuestionTypes(questions) {
        const types = {};
        questions.forEach(question => {
            const type = question.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    sanitizeFileName(filename) {
        return filename
            .replace(/[^\w\s\u0E00-\u0E7F-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
    }

    generateShareToken() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15) +
            Date.now().toString(36);
    }

    // PDF helper methods

    addPDFHeader(doc, quiz, header) {
        doc.fontSize(18).font('Helvetica-Bold');
        doc.text(header.school || 'Signal School Quiz System', 72, 72);

        doc.fontSize(16);
        doc.text(quiz.title, 72, 100);

        doc.fontSize(10).font('Helvetica');
        if (header.date) {
            doc.text(`Date: ${header.date}`, 72, 130);
        }

        doc.moveDown(2);
    }

    addPDFInstructions(doc, quiz, format) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Instructions:', 72, doc.y);

        doc.fontSize(10).font('Helvetica');
        doc.text(`• Total Questions: ${quiz.questions.length}`, 72, doc.y + 5);
        if (quiz.timeLimit) {
            doc.text(`• Time Limit: ${quiz.timeLimit} minutes`, 72, doc.y + 5);
        }
        doc.text('• Choose the best answer for each question', 72, doc.y + 5);

        doc.moveDown(2);
    }

    addPDFQuestion(doc, question, number, options) {
        const { includeAnswers, format } = options;

        // Check if we need a new page
        if (doc.y > 700) {
            doc.addPage();
        }

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(`${number}. ${question.question}`, 72, doc.y, { width: 450 });

        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        switch (question.type) {
            case 'multiple_choice':
                question.options.forEach((option, index) => {
                    const letter = String.fromCharCode(65 + index); // A, B, C, D
                    const text = `${letter}. ${option}`;
                    const isCorrect = includeAnswers && index === question.correctAnswer;

                    if (isCorrect) {
                        doc.font('Helvetica-Bold');
                    }

                    doc.text(text, 85, doc.y);

                    if (isCorrect) {
                        doc.font('Helvetica');
                    }

                    doc.moveDown(0.3);
                });
                break;

            case 'true_false':
                doc.text('A. True', 85, doc.y);
                doc.moveDown(0.3);
                doc.text('B. False', 85, doc.y);
                if (includeAnswers) {
                    doc.moveDown(0.3);
                    doc.font('Helvetica-Bold');
                    doc.text(`Answer: ${question.correctAnswer ? 'True' : 'False'}`, 85, doc.y);
                    doc.font('Helvetica');
                }
                break;

            case 'essay':
                doc.text('_'.repeat(80), 85, doc.y);
                doc.moveDown(3);
                break;

            case 'short_answer':
                doc.text('Answer: _________________________________', 85, doc.y);
                doc.moveDown(1);
                break;
        }

        doc.moveDown(1);
    }

    addPDFAnswerSheet(doc, quiz) {
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Answer Sheet', 72, 72);

        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica');

        const questionsPerRow = 5;
        let x = 72;
        let y = doc.y;

        quiz.questions.forEach((question, index) => {
            if (index % questionsPerRow === 0 && index > 0) {
                y += 30;
                x = 72;
            }

            doc.text(`${index + 1}.`, x, y);

            if (question.type === 'multiple_choice') {
                ['A', 'B', 'C', 'D'].forEach((letter, letterIndex) => {
                    doc.circle(x + 15 + (letterIndex * 15), y + 3, 4);
                    doc.stroke();
                    doc.text(letter, x + 12 + (letterIndex * 15), y, { width: 10, align: 'center' });
                });
            } else if (question.type === 'true_false') {
                doc.circle(x + 15, y + 3, 4);
                doc.stroke();
                doc.text('T', x + 12, y, { width: 10, align: 'center' });

                doc.circle(x + 30, y + 3, 4);
                doc.stroke();
                doc.text('F', x + 27, y, { width: 10, align: 'center' });
            }

            x += 100;
        });
    }

    addPDFFooter(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).font('Helvetica');
            doc.text(
                `Page ${i + 1} of ${pages.count}`,
                72,
                doc.page.height - 50,
                { width: 450, align: 'center' }
            );
        }
    }
}

export default ExportService;