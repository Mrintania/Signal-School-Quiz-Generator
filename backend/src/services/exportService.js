// backend/src/services/exportService.js
import { logger } from '../utils/logger.js';
import QuizService from './quizService.js';

/**
 * Service for exporting quizzes in different formats
 */
class ExportService {
    /**
     * Export quiz to GIFT format for Moodle
     * @param {number} quizId - Quiz ID
     * @returns {Promise<string>} GIFT format content
     */
    static async exportToGift(quizId) {
        try {
            // Get quiz data
            const quiz = await QuizService.getQuizById(quizId);

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Generate GIFT format content
            let giftContent = "";

            // Add quiz details as comments
            giftContent += `// ${quiz.title}\n`;
            giftContent += `// Topic: ${quiz.topic}\n`;
            if (quiz.student_level) {
                giftContent += `// Level: ${quiz.student_level}\n`;
            }
            giftContent += `// Created: ${new Date(quiz.created_at).toLocaleString()}\n\n`;

            // Add questions
            quiz.questions.forEach((question, index) => {
                // Add question number and text
                giftContent += `::Question ${index + 1}::[html]${this.escapeGiftSpecialChars(question.questionText)}\n`;

                if (quiz.question_type === 'Multiple Choice') {
                    // For multiple choice questions
                    giftContent += "{\n";

                    // Add options
                    question.options.forEach(option => {
                        if (option.isCorrect) {
                            // Correct option
                            giftContent += `  =${this.escapeGiftSpecialChars(option.text)}\n`;
                        } else {
                            // Incorrect option
                            giftContent += `  ~${this.escapeGiftSpecialChars(option.text)}\n`;
                        }
                    });

                    // Add explanation if available
                    if (question.explanation) {
                        giftContent += `  ####${this.escapeGiftSpecialChars(question.explanation)}\n`;
                    }

                    giftContent += "}\n\n";
                } else {
                    // For essay questions
                    giftContent += "{\n";
                    giftContent += "  // Essay questions don't have definitive answers in Moodle\n";

                    // Add explanation if available
                    if (question.explanation) {
                        giftContent += `  ####${this.escapeGiftSpecialChars(question.explanation)}\n`;
                    }

                    giftContent += "}\n\n";
                }
            });

            return giftContent;
        } catch (error) {
            logger.error('Error exporting quiz to GIFT format:', error);
            throw error;
        }
    }

    /**
     * Export quiz to plain text format
     * @param {number} quizId - Quiz ID
     * @returns {Promise<string>} Plain text content
     */
    static async exportToPlainText(quizId) {
        try {
            // Get quiz data
            const quiz = await QuizService.getQuizById(quizId);

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Generate plain text content
            let textContent = "";

            // Add header and details
            textContent += `${quiz.title}\n`;
            textContent += `หัวข้อ: ${quiz.topic}\n`;
            if (quiz.student_level) {
                textContent += `ระดับ: ${quiz.student_level}\n`;
            }
            textContent += `วันที่สร้าง: ${new Date(quiz.created_at).toLocaleString()}\n`;
            textContent += `ประเภทข้อสอบ: ${quiz.question_type === 'Multiple Choice' ? 'ปรนัย' : 'อัตนัย'}\n`;
            textContent += `จำนวนข้อ: ${quiz.questions.length}\n\n`;

            // Add questions
            quiz.questions.forEach((question, index) => {
                textContent += `ข้อที่ ${index + 1}: ${question.questionText}\n\n`;

                if (quiz.question_type === 'Multiple Choice') {
                    // For multiple choice questions
                    question.options.forEach((option, optIndex) => {
                        const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D, ...
                        textContent += `   ${optionLabel}. ${option.text}\n`;
                    });

                    // Find correct option
                    const correctOption = question.options.findIndex(option => option.isCorrect);
                    const correctLabel = String.fromCharCode(65 + correctOption);

                    textContent += `\nเฉลย: ${correctLabel}\n`;

                    // Add explanation if available
                    if (question.explanation) {
                        textContent += `คำอธิบาย: ${question.explanation}\n`;
                    }
                } else {
                    // For essay questions
                    textContent += "แนวทางคำตอบ/การให้คะแนน:\n";

                    if (question.explanation) {
                        textContent += `${question.explanation}\n`;
                    }
                }

                textContent += "\n--------------------\n\n";
            });

            return textContent;
        } catch (error) {
            logger.error('Error exporting quiz to plain text:', error);
            throw error;
        }
    }

    /**
     * Escape special characters in GIFT format
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeGiftSpecialChars(text) {
        if (!text) return '';

        // Escape special characters: ~ = # { } :
        return text
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/~/g, '\\~')
            .replace(/=/g, '\\=')
            .replace(/#/g, '\\#')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/:/g, '\\:');
    }

    /**
     * Export quiz to JSON format
     * @param {number} quizId - Quiz ID
     * @returns {Promise<Object>} JSON object
     */
    static async exportToJSON(quizId) {
        try {
            // Get quiz data
            const quiz = await QuizService.getQuizById(quizId);

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Return quiz data as JSON
            return {
                title: quiz.title,
                topic: quiz.topic,
                questionType: quiz.question_type,
                studentLevel: quiz.student_level,
                createdAt: quiz.created_at,
                questions: quiz.questions.map(question => ({
                    questionText: question.questionText,
                    explanation: question.explanation,
                    options: question.options ? question.options.map(option => ({
                        text: option.text,
                        isCorrect: option.isCorrect
                    })) : []
                }))
            };
        } catch (error) {
            logger.error('Error exporting quiz to JSON:', error);
            throw error;
        }
    }

    /**
     * Export quiz to CSV format
     * @param {number} quizId - Quiz ID
     * @returns {Promise<string>} CSV content
     */
    static async exportToCSV(quizId) {
        try {
            // Get quiz data
            const quiz = await QuizService.getQuizById(quizId);

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Create CSV header
            let csvContent = "Question Number,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n";

            // Add questions
            quiz.questions.forEach((question, index) => {
                const row = [];

                // Question number and text
                row.push(`${index + 1}`);
                row.push(`"${question.questionText.replace(/"/g, '""')}"`);

                if (quiz.question_type === 'Multiple Choice') {
                    // Options (A, B, C, D)
                    const options = ['', '', '', ''];
                    let correctAnswer = '';

                    question.options.forEach((option, optIndex) => {
                        if (optIndex < 4) {
                            options[optIndex] = option.text.replace(/"/g, '""');

                            if (option.isCorrect) {
                                correctAnswer = String.fromCharCode(65 + optIndex); // A, B, C, D
                            }
                        }
                    });

                    // Add options to row
                    options.forEach(option => {
                        row.push(`"${option}"`);
                    });

                    // Add correct answer
                    row.push(correctAnswer);
                } else {
                    // For essay questions, add empty columns
                    row.push('""');
                    row.push('""');
                    row.push('""');
                    row.push('""');
                    row.push('ESSAY');
                }

                // Add explanation
                row.push(`"${question.explanation ? question.explanation.replace(/"/g, '""') : ''}"`);

                // Add row to CSV content
                csvContent += row.join(',') + '\n';
            });

            return csvContent;
        } catch (error) {
            logger.error('Error exporting quiz to CSV:', error);
            throw error;
        }
    }
}

export default ExportService;