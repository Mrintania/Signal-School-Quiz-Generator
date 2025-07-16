// backend/src/utils/quiz/QuizFormatter.js
import logger from '../common/Logger.js';
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Quiz Formatter Utility
 * จัดการการ format และ transform ข้อมูลข้อสอบ
 * ให้อยู่ในรูปแบบที่เหมาะสมสำหรับการใช้งาน
 */
export class QuizFormatter {
    constructor() {
        this.questionTypes = {
            multiple_choice: 'คำถามปรนัยแบบเลือกตอบ',
            true_false: 'คำถามแบบถูก/ผิด',
            fill_in_blank: 'คำถามแบบเติมคำ',
            essay: 'คำถามแบบอัตนัย',
            matching: 'คำถามแบบจับคู่'
        };

        this.difficultyLevels = {
            easy: 'ง่าย',
            medium: 'ปานกลาง',
            hard: 'ยาก',
            expert: 'ผู้เชี่ยวชาญ'
        };

        this.categories = {
            general: 'ทั่วไป',
            mathematics: 'คณิตศาสตร์',
            science: 'วิทยาศาสตร์',
            language: 'ภาษา',
            history: 'ประวัติศาสตร์',
            technology: 'เทคโนโลยี',
            other: 'อื่นๆ'
        };
    }

    /**
     * Format complete quiz object
     */
    async formatQuiz(rawQuiz, context = {}) {
        try {
            if (!rawQuiz) {
                throw new ValidationError('Raw quiz data is required');
            }

            logger.debug('Formatting quiz:', {
                title: rawQuiz.title,
                questionCount: rawQuiz.questions?.length || 0
            });

            const formattedQuiz = {
                id: rawQuiz.id || Date.now(),
                title: this.formatTitle(rawQuiz.title),
                topic: this.formatText(rawQuiz.topic),
                description: this.formatDescription(rawQuiz.description),
                category: this.formatCategory(rawQuiz.category),
                questionType: this.formatQuestionType(rawQuiz.questionType || rawQuiz.question_type),
                difficultyLevel: this.formatDifficultyLevel(rawQuiz.difficultyLevel || rawQuiz.difficulty_level),
                questionCount: rawQuiz.questions?.length || 0,
                timeLimit: rawQuiz.timeLimit || rawQuiz.time_limit || null,
                status: rawQuiz.status || 'draft',
                isPublic: Boolean(rawQuiz.isPublic || rawQuiz.is_public),
                tags: this.formatTags(rawQuiz.tags),
                userId: rawQuiz.userId || rawQuiz.user_id || context.userId,
                folderId: rawQuiz.folderId || rawQuiz.folder_id || null,
                folderName: rawQuiz.folderName || rawQuiz.folder_name || null,
                createdAt: rawQuiz.createdAt || rawQuiz.created_at || new Date(),
                updatedAt: rawQuiz.updatedAt || rawQuiz.updated_at || new Date(),
                settings: this.formatSettings(rawQuiz.settings),
                metadata: this.generateMetadata(rawQuiz, context)
            };

            // Format questions if present
            if (rawQuiz.questions && Array.isArray(rawQuiz.questions)) {
                formattedQuiz.questions = await this.formatQuestions(rawQuiz.questions, context);
            }

            // Add source file information if from file generation
            if (context.sourceFile || rawQuiz.sourceFile) {
                formattedQuiz.sourceFile = this.formatSourceFile(context.sourceFile || rawQuiz.sourceFile);
            }

            logger.debug('Quiz formatting completed:', {
                id: formattedQuiz.id,
                title: formattedQuiz.title,
                questionCount: formattedQuiz.questionCount
            });

            return formattedQuiz;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'formatQuiz',
                title: rawQuiz?.title
            });
            throw new ValidationError(`Quiz formatting failed: ${error.message}`);
        }
    }

    /**
     * Format array of questions
     */
    async formatQuestions(rawQuestions, context = {}) {
        try {
            if (!Array.isArray(rawQuestions)) {
                throw new ValidationError('Questions must be an array');
            }

            const formattedQuestions = rawQuestions.map((question, index) =>
                this.formatQuestion(question, index, context)
            );

            return formattedQuestions;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'formatQuestions',
                questionCount: rawQuestions?.length || 0
            });
            throw new ValidationError(`Questions formatting failed: ${error.message}`);
        }
    }

    /**
     * Format single question
     */
    formatQuestion(rawQuestion, index = 0, context = {}) {
        try {
            const formatted = {
                id: rawQuestion.id || `q_${index + 1}`,
                question: this.formatQuestionText(rawQuestion.question || rawQuestion.question_text),
                type: this.formatQuestionType(rawQuestion.type || rawQuestion.question_type || 'multiple_choice'),
                options: this.formatOptions(rawQuestion.options),
                correctAnswer: this.formatCorrectAnswer(
                    rawQuestion.correctAnswer || rawQuestion.correct_answer,
                    rawQuestion.options
                ),
                explanation: this.formatExplanation(rawQuestion.explanation),
                points: this.formatPoints(rawQuestion.points),
                orderIndex: rawQuestion.orderIndex || rawQuestion.order_index || index,
                difficulty: this.formatDifficultyLevel(rawQuestion.difficulty),
                tags: this.formatTags(rawQuestion.tags),
                metadata: {
                    createdAt: rawQuestion.createdAt || rawQuestion.created_at || new Date(),
                    updatedAt: rawQuestion.updatedAt || rawQuestion.updated_at || new Date(),
                    generatedBy: context.generatedBy || 'ai',
                    validated: Boolean(rawQuestion.validated)
                }
            };

            // Add type-specific formatting
            switch (formatted.type) {
                case 'true_false':
                    formatted.options = ['ถูก', 'ผิด'];
                    break;
                case 'fill_in_blank':
                    formatted.blanks = this.extractBlanks(formatted.question);
                    break;
                case 'matching':
                    formatted.leftColumn = rawQuestion.leftColumn || [];
                    formatted.rightColumn = rawQuestion.rightColumn || [];
                    break;
            }

            return formatted;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'formatQuestion',
                index,
                questionText: rawQuestion?.question?.substring(0, 50)
            });
            throw new ValidationError(`Question ${index + 1} formatting failed: ${error.message}`);
        }
    }

    /**
     * Format quiz for export
     */
    formatForExport(quiz, exportType = 'json') {
        try {
            switch (exportType.toLowerCase()) {
                case 'json':
                    return this.formatForJSON(quiz);
                case 'csv':
                    return this.formatForCSV(quiz);
                case 'moodle':
                case 'gift':
                    return this.formatForMoodle(quiz);
                case 'text':
                case 'plain':
                    return this.formatForPlainText(quiz);
                default:
                    throw new ValidationError(`Unsupported export type: ${exportType}`);
            }
        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'formatForExport',
                exportType,
                quizId: quiz?.id
            });
            throw error;
        }
    }

    /**
     * Format quiz for JSON export
     */
    formatForJSON(quiz) {
        return {
            metadata: {
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                difficulty: quiz.difficultyLevel,
                questionCount: quiz.questionCount,
                timeLimit: quiz.timeLimit,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            },
            questions: quiz.questions.map(q => ({
                question: q.question,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: q.points
            }))
        };
    }

    /**
     * Format quiz for CSV export
     */
    formatForCSV(quiz) {
        let csv = 'Question,Type,Option1,Option2,Option3,Option4,CorrectAnswer,Explanation,Points\n';

        quiz.questions.forEach(q => {
            const row = [
                this.escapeCsvValue(q.question),
                q.type,
                this.escapeCsvValue(q.options[0] || ''),
                this.escapeCsvValue(q.options[1] || ''),
                this.escapeCsvValue(q.options[2] || ''),
                this.escapeCsvValue(q.options[3] || ''),
                this.escapeCsvValue(q.correctAnswer),
                this.escapeCsvValue(q.explanation || ''),
                q.points || 1
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Format quiz for Moodle GIFT format
     */
    formatForMoodle(quiz) {
        let gift = `// Quiz: ${quiz.title}\n`;
        gift += `// Category: ${quiz.category}\n`;
        gift += `// Generated: ${new Date().toISOString()}\n\n`;

        quiz.questions.forEach((q, index) => {
            gift += `::Question ${index + 1}::\n`;
            gift += `${q.question} {\n`;

            if (q.type === 'multiple_choice') {
                q.options.forEach(option => {
                    const isCorrect = option === q.correctAnswer;
                    gift += `${isCorrect ? '=' : '~'}${option}\n`;
                });
            } else if (q.type === 'true_false') {
                const isTrue = q.correctAnswer.toLowerCase() === 'ถูก' || q.correctAnswer.toLowerCase() === 'true';
                gift += `${isTrue ? 'TRUE' : 'FALSE'}\n`;
            }

            if (q.explanation) {
                gift += `# ${q.explanation}\n`;
            }

            gift += `}\n\n`;
        });

        return gift;
    }

    /**
     * Format quiz for plain text export
     */
    formatForPlainText(quiz) {
        let text = `${quiz.title}\n`;
        text += `${'='.repeat(quiz.title.length)}\n\n`;

        if (quiz.description) {
            text += `${quiz.description}\n\n`;
        }

        text += `หมวดหมู่: ${this.categories[quiz.category] || quiz.category}\n`;
        text += `ระดับความยาก: ${this.difficultyLevels[quiz.difficultyLevel] || quiz.difficultyLevel}\n`;
        text += `จำนวนข้อ: ${quiz.questionCount}\n`;

        if (quiz.timeLimit) {
            text += `เวลา: ${quiz.timeLimit} นาที\n`;
        }

        text += `\n${'='.repeat(50)}\n\n`;

        quiz.questions.forEach((q, index) => {
            text += `${index + 1}. ${q.question}\n`;

            if (q.options && q.options.length > 0) {
                q.options.forEach((option, optIndex) => {
                    const letter = String.fromCharCode(97 + optIndex); // a, b, c, d
                    const isCorrect = option === q.correctAnswer;
                    text += `   ${letter}) ${option}${isCorrect ? ' ✓' : ''}\n`;
                });
            }

            if (q.explanation) {
                text += `   คำอธิบาย: ${q.explanation}\n`;
            }

            text += `   คะแนน: ${q.points || 1}\n\n`;
        });

        return text;
    }

    /**
     * Format quiz summary for reporting
     */
    formatSummary(quiz) {
        const questionTypeCount = {};
        const difficultyCount = {};

        quiz.questions.forEach(q => {
            questionTypeCount[q.type] = (questionTypeCount[q.type] || 0) + 1;
            if (q.difficulty) {
                difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
            }
        });

        return {
            basic: {
                id: quiz.id,
                title: quiz.title,
                category: quiz.category,
                questionCount: quiz.questionCount,
                status: quiz.status,
                createdAt: quiz.createdAt,
                updatedAt: quiz.updatedAt
            },
            statistics: {
                questionTypes: questionTypeCount,
                difficulties: difficultyCount,
                totalPoints: quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0),
                averageQuestionLength: Math.round(
                    quiz.questions.reduce((sum, q) => sum + q.question.length, 0) / quiz.questions.length
                ),
                hasExplanations: quiz.questions.filter(q => q.explanation).length,
                hasImages: quiz.questions.filter(q => q.hasImage).length
            },
            metadata: {
                estimatedTime: this.estimateCompletionTime(quiz),
                complexity: this.calculateComplexity(quiz),
                readabilityScore: this.calculateReadabilityScore(quiz)
            }
        };
    }

    /**
     * Private helper methods
     */

    formatTitle(title) {
        if (!title || typeof title !== 'string') {
            return 'ข้อสอบไม่มีชื่อ';
        }
        return title.trim().substring(0, 255);
    }

    formatText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        return text.trim();
    }

    formatDescription(description) {
        if (!description || typeof description !== 'string') {
            return '';
        }
        return description.trim().substring(0, 1000);
    }

    formatCategory(category) {
        const validCategories = Object.keys(this.categories);
        return validCategories.includes(category) ? category : 'general';
    }

    formatQuestionType(questionType) {
        const validTypes = Object.keys(this.questionTypes);
        return validTypes.includes(questionType) ? questionType : 'multiple_choice';
    }

    formatDifficultyLevel(difficulty) {
        const validDifficulties = Object.keys(this.difficultyLevels);
        return validDifficulties.includes(difficulty) ? difficulty : 'medium';
    }

    formatQuestionText(text) {
        if (!text || typeof text !== 'string') {
            throw new ValidationError('Question text is required');
        }
        return text.trim();
    }

    formatOptions(options) {
        if (!Array.isArray(options)) {
            return [];
        }
        return options
            .filter(option => option && typeof option === 'string')
            .map(option => option.trim())
            .slice(0, 6); // Maximum 6 options
    }

    formatCorrectAnswer(answer, options) {
        if (!answer || typeof answer !== 'string') {
            throw new ValidationError('Correct answer is required');
        }

        const trimmedAnswer = answer.trim();

        // Validate that answer exists in options
        if (options && Array.isArray(options) && options.length > 0) {
            const validAnswer = options.find(option =>
                option && option.trim() === trimmedAnswer
            );

            if (!validAnswer) {
                throw new ValidationError('Correct answer must be one of the provided options');
            }
        }

        return trimmedAnswer;
    }

    formatExplanation(explanation) {
        if (!explanation || typeof explanation !== 'string') {
            return '';
        }
        return explanation.trim().substring(0, 500);
    }

    formatPoints(points) {
        const numPoints = parseInt(points);
        if (isNaN(numPoints) || numPoints < 1 || numPoints > 10) {
            return 1;
        }
        return numPoints;
    }

    formatTags(tags) {
        if (!Array.isArray(tags)) {
            if (typeof tags === 'string') {
                try {
                    return JSON.parse(tags);
                } catch {
                    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                }
            }
            return [];
        }
        return tags
            .filter(tag => tag && typeof tag === 'string')
            .map(tag => tag.trim())
            .slice(0, 10); // Maximum 10 tags
    }

    formatSettings(settings) {
        if (typeof settings === 'string') {
            try {
                return JSON.parse(settings);
            } catch {
                return {};
            }
        }
        return settings || {};
    }

    formatSourceFile(sourceFile) {
        if (!sourceFile) {
            return null;
        }

        return {
            name: sourceFile.name || sourceFile.originalname,
            size: sourceFile.size,
            type: sourceFile.type || sourceFile.mimetype,
            extractedAt: sourceFile.extractedAt || new Date().toISOString()
        };
    }

    generateMetadata(quiz, context) {
        return {
            version: '1.0',
            generatedBy: context.generatedBy || 'system',
            generatedAt: new Date().toISOString(),
            hasQuestions: Boolean(quiz.questions && quiz.questions.length > 0),
            isComplete: Boolean(quiz.status === 'published'),
            estimatedTime: this.estimateCompletionTime(quiz),
            complexity: this.calculateComplexity(quiz)
        };
    }

    extractBlanks(questionText) {
        // Extract blanks marked with _____ or {blank}
        const blankPattern = /_{3,}|\{blank\}/g;
        const matches = questionText.match(blankPattern) || [];
        return matches.length;
    }

    escapeCsvValue(value) {
        if (!value) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    estimateCompletionTime(quiz) {
        // Estimate based on question count and complexity
        const baseTimePerQuestion = 60; // seconds
        const questionCount = quiz.questions?.length || quiz.questionCount || 0;

        return Math.round((questionCount * baseTimePerQuestion) / 60); // minutes
    }

    calculateComplexity(quiz) {
        if (!quiz.questions || quiz.questions.length === 0) {
            return 'low';
        }

        let complexityScore = 0;

        quiz.questions.forEach(q => {
            // Question length complexity
            if (q.question.length > 200) complexityScore += 2;
            else if (q.question.length > 100) complexityScore += 1;

            // Option count complexity
            if (q.options && q.options.length > 4) complexityScore += 1;

            // Has explanation
            if (q.explanation) complexityScore += 1;
        });

        const avgComplexity = complexityScore / quiz.questions.length;

        if (avgComplexity >= 3) return 'high';
        if (avgComplexity >= 1.5) return 'medium';
        return 'low';
    }

    calculateReadabilityScore(quiz) {
        // Simple readability score based on question text
        if (!quiz.questions || quiz.questions.length === 0) {
            return 0;
        }

        let totalScore = 0;

        quiz.questions.forEach(q => {
            const words = q.question.split(/\s+/).length;
            const sentences = q.question.split(/[.!?]+/).length;

            // Simple readability formula
            const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (words / words));
            totalScore += Math.max(0, Math.min(100, score));
        });

        return Math.round(totalScore / quiz.questions.length);
    }
}

export default QuizFormatter;