// backend/src/utils/quiz/QuizValidator.js
import logger from '../common/Logger.js';
import { ValidationError, BusinessLogicError } from '../../errors/CustomErrors.js';

/**
 * Quiz Validator Utility
 * จัดการการตรวจสอบความถูกต้องของข้อมูลข้อสอบ
 * รวมถึงการตรวจสอบคุณภาพและความสมเหตุสมผล
 */
export class QuizValidator {
    constructor(config = {}) {
        this.config = {
            maxTitleLength: config.maxTitleLength || 255,
            maxDescriptionLength: config.maxDescriptionLength || 1000,
            maxQuestionLength: config.maxQuestionLength || 1000,
            maxOptionLength: config.maxOptionLength || 200,
            maxExplanationLength: config.maxExplanationLength || 500,
            maxQuestionsPerQuiz: config.maxQuestionsPerQuiz || 100,
            minQuestionsPerQuiz: config.minQuestionsPerQuiz || 1,
            maxOptionsPerQuestion: config.maxOptionsPerQuestion || 6,
            minOptionsPerQuestion: config.minOptionsPerQuestion || 2,
            maxTagsPerQuiz: config.maxTagsPerQuiz || 10,
            maxTagLength: config.maxTagLength || 50,
            maxPointsPerQuestion: config.maxPointsPerQuestion || 10,
            minPointsPerQuestion: config.minPointsPerQuestion || 1,
            maxTimeLimit: config.maxTimeLimit || 480, // 8 hours
            minTimeLimit: config.minTimeLimit || 1,
            ...config
        };

        // Valid values
        this.validQuestionTypes = ['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching'];
        this.validDifficultyLevels = ['easy', 'medium', 'hard', 'expert'];
        this.validCategories = ['general', 'mathematics', 'science', 'language', 'history', 'technology', 'other'];
        this.validStatuses = ['draft', 'published', 'archived'];

        // Thai language patterns
        this.thaiPattern = /[\u0E00-\u0E7F]/;
        this.meaningfulContentPattern = /^[\u0E00-\u0E7Fa-zA-Z0-9\s\-_.,!?()'"]+$/;
    }

    /**
     * ตรวจสอบข้อมูลข้อสอบทั้งหมด
     */
    async validateQuizData(quizData) {
        try {
            const errors = [];

            // Validate basic quiz information
            errors.push(...this.validateBasicQuizInfo(quizData));

            // Validate questions if present
            if (quizData.questions && Array.isArray(quizData.questions)) {
                errors.push(...this.validateQuestions(quizData.questions));
            }

            // Validate advanced properties
            errors.push(...this.validateAdvancedProperties(quizData));

            // Check business rules
            errors.push(...this.validateBusinessRules(quizData));

            if (errors.length > 0) {
                throw new ValidationError('Quiz validation failed', { errors });
            }

            logger.debug('Quiz validation passed:', {
                title: quizData.title,
                questionCount: quizData.questions?.length || 0
            });

            return { isValid: true, errors: [] };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'validateQuizData',
                title: quizData?.title
            });
            throw error;
        }
    }

    /**
     * ตรวจสอบข้อมูลพื้นฐานของข้อสอบ
     */
    validateBasicQuizInfo(quizData) {
        const errors = [];

        // Title validation
        if (!quizData.title || typeof quizData.title !== 'string') {
            errors.push('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
        } else {
            const title = quizData.title.trim();

            if (title.length === 0) {
                errors.push('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
            } else if (title.length < 3) {
                errors.push('ชื่อข้อสอบต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
            } else if (title.length > this.config.maxTitleLength) {
                errors.push(`ชื่อข้อสอบต้องไม่เกิน ${this.config.maxTitleLength} ตัวอักษร`);
            } else if (!this.meaningfulContentPattern.test(title)) {
                errors.push('ชื่อข้อสอบมีตัวอักษรที่ไม่ถูกต้อง');
            }
        }

        // Topic validation
        if (quizData.topic && typeof quizData.topic === 'string') {
            if (quizData.topic.length > this.config.maxTitleLength) {
                errors.push(`หัวข้อต้องไม่เกิน ${this.config.maxTitleLength} ตัวอักษร`);
            }
        }

        // Description validation
        if (quizData.description && typeof quizData.description === 'string') {
            if (quizData.description.length > this.config.maxDescriptionLength) {
                errors.push(`คำอธิบายต้องไม่เกิน ${this.config.maxDescriptionLength} ตัวอักษร`);
            }
        }

        // Category validation
        if (quizData.category && !this.validCategories.includes(quizData.category)) {
            errors.push(`หมวดหมู่ไม่ถูกต้อง: ${quizData.category}`);
        }

        // Question type validation
        if (quizData.questionType && !this.validQuestionTypes.includes(quizData.questionType)) {
            errors.push(`ประเภทคำถามไม่ถูกต้อง: ${quizData.questionType}`);
        }

        // Difficulty level validation
        if (quizData.difficultyLevel && !this.validDifficultyLevels.includes(quizData.difficultyLevel)) {
            errors.push(`ระดับความยากไม่ถูกต้อง: ${quizData.difficultyLevel}`);
        }

        // Status validation
        if (quizData.status && !this.validStatuses.includes(quizData.status)) {
            errors.push(`สถานะไม่ถูกต้อง: ${quizData.status}`);
        }

        // Time limit validation
        if (quizData.timeLimit !== undefined && quizData.timeLimit !== null) {
            const timeLimit = parseInt(quizData.timeLimit);
            if (isNaN(timeLimit) || timeLimit < this.config.minTimeLimit || timeLimit > this.config.maxTimeLimit) {
                errors.push(`เวลาในการทำข้อสอบต้องอยู่ระหว่าง ${this.config.minTimeLimit}-${this.config.maxTimeLimit} นาที`);
            }
        }

        // User ID validation
        if (!quizData.userId) {
            errors.push('ต้องระบุ User ID');
        }

        return errors;
    }

    /**
     * ตรวจสอบคำถามทั้งหมด
     */
    validateQuestions(questions) {
        const errors = [];

        if (!Array.isArray(questions)) {
            errors.push('คำถามต้องเป็น array');
            return errors;
        }

        if (questions.length < this.config.minQuestionsPerQuiz) {
            errors.push(`ต้องมีอย่างน้อย ${this.config.minQuestionsPerQuiz} คำถาม`);
        }

        if (questions.length > this.config.maxQuestionsPerQuiz) {
            errors.push(`จำนวนคำถามต้องไม่เกิน ${this.config.maxQuestionsPerQuiz} ข้อ`);
        }

        // Validate each question
        questions.forEach((question, index) => {
            const questionErrors = this.validateSingleQuestion(question, index);
            errors.push(...questionErrors);
        });

        // Check for duplicate questions
        const duplicateErrors = this.checkDuplicateQuestions(questions);
        errors.push(...duplicateErrors);

        return errors;
    }

    /**
     * ตรวจสอบคำถามเดี่ยว
     */
    validateSingleQuestion(question, index) {
        const errors = [];
        const questionNumber = index + 1;

        // Question text validation
        if (!question.question || typeof question.question !== 'string') {
            errors.push(`คำถามที่ ${questionNumber}: ข้อความคำถามไม่ถูกต้อง`);
        } else {
            const questionText = question.question.trim();

            if (questionText.length === 0) {
                errors.push(`คำถามที่ ${questionNumber}: ข้อความคำถามไม่สามารถเป็นค่าว่างได้`);
            } else if (questionText.length > this.config.maxQuestionLength) {
                errors.push(`คำถามที่ ${questionNumber}: ข้อความคำถามยาวเกินไป (สูงสุด ${this.config.maxQuestionLength} ตัวอักษร)`);
            } else if (!this.meaningfulContentPattern.test(questionText)) {
                errors.push(`คำถามที่ ${questionNumber}: ข้อความคำถามมีตัวอักษรที่ไม่ถูกต้อง`);
            }
        }

        // Question type validation
        if (question.type && !this.validQuestionTypes.includes(question.type)) {
            errors.push(`คำถามที่ ${questionNumber}: ประเภทคำถามไม่ถูกต้อง`);
        }

        // Options validation
        if (question.options) {
            const optionErrors = this.validateQuestionOptions(question.options, questionNumber);
            errors.push(...optionErrors);
        }

        // Correct answer validation
        if (!question.correct_answer || typeof question.correct_answer !== 'string') {
            errors.push(`คำถามที่ ${questionNumber}: ต้องระบุคำตอบที่ถูกต้อง`);
        } else if (question.options && Array.isArray(question.options)) {
            // Check if correct answer exists in options
            const correctAnswer = question.correct_answer.trim();
            const optionsIncludeAnswer = question.options.some(option =>
                option && option.trim() === correctAnswer
            );

            if (!optionsIncludeAnswer) {
                errors.push(`คำถามที่ ${questionNumber}: คำตอบที่ถูกต้องต้องอยู่ในตัวเลือก`);
            }
        }

        // Explanation validation
        if (question.explanation && typeof question.explanation === 'string') {
            if (question.explanation.length > this.config.maxExplanationLength) {
                errors.push(`คำถามที่ ${questionNumber}: คำอธิบายยาวเกินไป (สูงสุด ${this.config.maxExplanationLength} ตัวอักษร)`);
            }
        }

        // Points validation
        if (question.points !== undefined) {
            const points = parseInt(question.points);
            if (isNaN(points) || points < this.config.minPointsPerQuestion || points > this.config.maxPointsPerQuestion) {
                errors.push(`คำถามที่ ${questionNumber}: คะแนนต้องอยู่ระหว่าง ${this.config.minPointsPerQuestion}-${this.config.maxPointsPerQuestion}`);
            }
        }

        // Difficulty validation
        if (question.difficulty && !this.validDifficultyLevels.includes(question.difficulty)) {
            errors.push(`คำถามที่ ${questionNumber}: ระดับความยากไม่ถูกต้อง`);
        }

        return errors;
    }

    /**
     * ตรวจสอบตัวเลือกของคำถาม
     */
    validateQuestionOptions(options, questionNumber) {
        const errors = [];

        if (!Array.isArray(options)) {
            errors.push(`คำถามที่ ${questionNumber}: ตัวเลือกต้องเป็น array`);
            return errors;
        }

        if (options.length < this.config.minOptionsPerQuestion) {
            errors.push(`คำถามที่ ${questionNumber}: ต้องมีตัวเลือกอย่างน้อย ${this.config.minOptionsPerQuestion} ตัว`);
        }

        if (options.length > this.config.maxOptionsPerQuestion) {
            errors.push(`คำถามที่ ${questionNumber}: จำนวนตัวเลือกต้องไม่เกิน ${this.config.maxOptionsPerQuestion} ตัว`);
        }

        // Validate each option
        options.forEach((option, optionIndex) => {
            if (!option || typeof option !== 'string') {
                errors.push(`คำถามที่ ${questionNumber}: ตัวเลือกที่ ${optionIndex + 1} ไม่ถูกต้อง`);
            } else {
                const optionText = option.trim();

                if (optionText.length === 0) {
                    errors.push(`คำถามที่ ${questionNumber}: ตัวเลือกที่ ${optionIndex + 1} ไม่สามารถเป็นค่าว่างได้`);
                } else if (optionText.length > this.config.maxOptionLength) {
                    errors.push(`คำถามที่ ${questionNumber}: ตัวเลือกที่ ${optionIndex + 1} ยาวเกินไป (สูงสุด ${this.config.maxOptionLength} ตัวอักษร)`);
                }
            }
        });

        // Check for duplicate options
        const uniqueOptions = new Set(options.map(option => option?.trim().toLowerCase()));
        if (uniqueOptions.size !== options.length) {
            errors.push(`คำถามที่ ${questionNumber}: ตัวเลือกซ้ำกัน`);
        }

        return errors;
    }

    /**
     * ตรวจสอบคุณสมบัติขั้นสูง
     */
    validateAdvancedProperties(quizData) {
        const errors = [];

        // Tags validation
        if (quizData.tags) {
            if (!Array.isArray(quizData.tags)) {
                errors.push('Tags ต้องเป็น array');
            } else {
                if (quizData.tags.length > this.config.maxTagsPerQuiz) {
                    errors.push(`จำนวน tags ต้องไม่เกิน ${this.config.maxTagsPerQuiz} รายการ`);
                }

                quizData.tags.forEach((tag, index) => {
                    if (!tag || typeof tag !== 'string') {
                        errors.push(`Tag ที่ ${index + 1}: ต้องเป็น string`);
                    } else if (tag.length > this.config.maxTagLength) {
                        errors.push(`Tag ที่ ${index + 1}: ความยาวต้องไม่เกิน ${this.config.maxTagLength} ตัวอักษร`);
                    }
                });
            }
        }

        // Settings validation
        if (quizData.settings && typeof quizData.settings !== 'object') {
            errors.push('Settings ต้องเป็น object');
        }

        // Boolean fields validation
        if (quizData.isPublic !== undefined && typeof quizData.isPublic !== 'boolean') {
            errors.push('isPublic ต้องเป็น boolean');
        }

        // Folder ID validation
        if (quizData.folderId !== undefined && quizData.folderId !== null) {
            const folderId = parseInt(quizData.folderId);
            if (isNaN(folderId) || folderId < 1) {
                errors.push('Folder ID ต้องเป็นจำนวนเต็มบวก');
            }
        }

        return errors;
    }

    /**
     * ตรวจสอบกฎทางธุรกิจ
     */
    validateBusinessRules(quizData) {
        const errors = [];

        // Published quiz must have questions
        if (quizData.status === 'published') {
            if (!quizData.questions || quizData.questions.length === 0) {
                errors.push('ข้อสอบที่เผยแพร่แล้วต้องมีคำถาม');
            }

            // Published quiz should have time limit
            if (!quizData.timeLimit) {
                // This is a warning, not an error
                logger.warn('Published quiz without time limit:', { title: quizData.title });
            }
        }

        // Public quiz validations
        if (quizData.isPublic) {
            if (!quizData.description || quizData.description.trim().length === 0) {
                errors.push('ข้อสอบสาธารณะต้องมีคำอธิบาย');
            }

            if (quizData.status === 'draft') {
                errors.push('ข้อสอบสาธารณะต้องไม่อยู่ในสถานะ draft');
            }
        }

        // Multiple choice specific validations
        if (quizData.questionType === 'multiple_choice' && quizData.questions) {
            quizData.questions.forEach((question, index) => {
                if (question.options && question.options.length < 2) {
                    errors.push(`คำถามปรนัยที่ ${index + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ตัว`);
                }
            });
        }

        // True/False specific validations
        if (quizData.questionType === 'true_false' && quizData.questions) {
            quizData.questions.forEach((question, index) => {
                if (question.options && question.options.length !== 2) {
                    errors.push(`คำถามถูก/ผิดที่ ${index + 1}: ต้องมีตัวเลือกเพียง 2 ตัว`);
                }
            });
        }

        return errors;
    }

    /**
     * ตรวจสอบคำถามซ้ำ
     */
    checkDuplicateQuestions(questions) {
        const errors = [];
        const questionTexts = new Set();

        questions.forEach((question, index) => {
            if (question.question) {
                const normalizedQuestion = question.question.trim().toLowerCase();

                if (questionTexts.has(normalizedQuestion)) {
                    errors.push(`คำถามที่ ${index + 1}: ซ้ำกับคำถามอื่น`);
                } else {
                    questionTexts.add(normalizedQuestion);
                }
            }
        });

        return errors;
    }

    /**
     * ตรวจสอบคุณภาพของข้อสอบ
     */
    async validateQuizQuality(quiz) {
        try {
            const qualityIssues = [];
            const suggestions = [];

            // Check question distribution
            const questionTypes = this.analyzeQuestionTypes(quiz.questions);
            if (questionTypes.variety < 0.3 && quiz.questions.length > 5) {
                qualityIssues.push('คำถามขาดความหลากหลายในรูปแบบ');
                suggestions.push('ควรเพิ่มคำถามในรูปแบบที่แตกต่างกัน');
            }

            // Check difficulty distribution
            const difficultyDistribution = this.analyzeDifficultyDistribution(quiz.questions);
            if (difficultyDistribution.imbalance > 0.8) {
                qualityIssues.push('การกระจายของระดับความยากไม่สมดุล');
                suggestions.push('ควรปรับให้มีคำถามในระดับความยากที่หลากหลาย');
            }

            // Check question length consistency
            const lengthAnalysis = this.analyzeQuestionLengths(quiz.questions);
            if (lengthAnalysis.inconsistency > 0.7) {
                qualityIssues.push('ความยาวของคำถามไม่สม่ำเสมอ');
                suggestions.push('ควรปรับความยาวของคำถามให้สม่ำเสมอกัน');
            }

            // Check answer distribution (for multiple choice)
            const answerDistribution = this.analyzeAnswerDistribution(quiz.questions);
            if (answerDistribution.bias > 0.6) {
                qualityIssues.push('การกระจายของคำตอบถูกไม่สมดุล');
                suggestions.push('ควรกระจายคำตอบถูกให้เท่าๆ กันในแต่ละตัวเลือก');
            }

            // Calculate overall quality score
            const qualityScore = this.calculateQualityScore(quiz, qualityIssues);

            const result = {
                isValid: qualityIssues.length === 0,
                qualityScore,
                qualityLevel: this.getQualityLevel(qualityScore),
                issues: qualityIssues,
                suggestions,
                analytics: {
                    questionTypes,
                    difficultyDistribution,
                    lengthAnalysis,
                    answerDistribution
                }
            };

            logger.debug('Quiz quality validation completed:', {
                title: quiz.title,
                qualityScore,
                issueCount: qualityIssues.length
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'validateQuizQuality',
                quizId: quiz?.id
            });
            throw error;
        }
    }

    /**
     * ตรวจสอบความเหมาะสมสำหรับการเผยแพร่
     */
    validateForPublication(quiz) {
        const errors = [];

        // Basic completeness check
        if (!quiz.title || quiz.title.trim().length < 5) {
            errors.push('ชื่อข้อสอบต้องมีความยาวอย่างน้อย 5 ตัวอักษร');
        }

        if (!quiz.description || quiz.description.trim().length < 20) {
            errors.push('คำอธิบายข้อสอบต้องมีความยาวอย่างน้อย 20 ตัวอักษร');
        }

        if (!quiz.questions || quiz.questions.length < 3) {
            errors.push('ข้อสอบต้องมีอย่างน้อย 3 คำถาม');
        }

        if (!quiz.timeLimit) {
            errors.push('ข้อสอบต้องมีการกำหนดเวลาทำ');
        }

        // Quality check
        if (quiz.questions) {
            const hasExplanations = quiz.questions.filter(q => q.explanation).length;
            const explanationRatio = hasExplanations / quiz.questions.length;

            if (explanationRatio < 0.5) {
                errors.push('ข้อสอบควรมีคำอธิบายอย่างน้อย 50% ของคำถาม');
            }
        }

        return {
            isReadyForPublication: errors.length === 0,
            errors,
            requirements: {
                titleLength: quiz.title?.length || 0,
                descriptionLength: quiz.description?.length || 0,
                questionCount: quiz.questions?.length || 0,
                hasTimeLimit: !!quiz.timeLimit,
                explanationRatio: quiz.questions ?
                    quiz.questions.filter(q => q.explanation).length / quiz.questions.length : 0
            }
        };
    }

    /**
     * ตรวจสอบข้อมูลการอัพเดท
     */
    async validateUpdateData(updateData) {
        const errors = [];

        // Only validate fields that are being updated
        if (updateData.title !== undefined) {
            const titleErrors = this.validateBasicQuizInfo({ title: updateData.title, userId: 'dummy' });
            errors.push(...titleErrors.filter(error => error.includes('ชื่อข้อสอบ')));
        }

        if (updateData.description !== undefined) {
            const descErrors = this.validateBasicQuizInfo({ description: updateData.description, userId: 'dummy' });
            errors.push(...descErrors.filter(error => error.includes('คำอธิบาย')));
        }

        if (updateData.questions !== undefined) {
            const questionErrors = this.validateQuestions(updateData.questions);
            errors.push(...questionErrors);
        }

        if (updateData.timeLimit !== undefined) {
            const timeErrors = this.validateBasicQuizInfo({ timeLimit: updateData.timeLimit, userId: 'dummy' });
            errors.push(...timeErrors.filter(error => error.includes('เวลา')));
        }

        if (updateData.tags !== undefined) {
            const tagErrors = this.validateAdvancedProperties({ tags: updateData.tags });
            errors.push(...tagErrors);
        }

        if (errors.length > 0) {
            throw new ValidationError('Update validation failed', { errors });
        }

        return { isValid: true, errors: [] };
    }

    /**
     * Private helper methods
     */

    /**
     * วิเคราะห์ประเภทคำถาม
     */
    analyzeQuestionTypes(questions) {
        if (!questions || questions.length === 0) {
            return { variety: 0, distribution: {} };
        }

        const types = {};
        questions.forEach(q => {
            const type = q.type || 'multiple_choice';
            types[type] = (types[type] || 0) + 1;
        });

        const uniqueTypes = Object.keys(types).length;
        const variety = uniqueTypes / this.validQuestionTypes.length;

        return {
            variety,
            distribution: types,
            uniqueTypes
        };
    }

    /**
     * วิเคราะห์การกระจายความยาก
     */
    analyzeDifficultyDistribution(questions) {
        if (!questions || questions.length === 0) {
            return { imbalance: 0, distribution: {} };
        }

        const difficulties = {};
        questions.forEach(q => {
            const difficulty = q.difficulty || 'medium';
            difficulties[difficulty] = (difficulties[difficulty] || 0) + 1;
        });

        // Calculate imbalance (how far from even distribution)
        const total = questions.length;
        const expected = total / Object.keys(difficulties).length;
        let imbalance = 0;

        Object.values(difficulties).forEach(count => {
            imbalance += Math.abs(count - expected) / total;
        });

        return {
            imbalance,
            distribution: difficulties
        };
    }

    /**
     * วิเคราะห์ความยาวคำถาม
     */
    analyzeQuestionLengths(questions) {
        if (!questions || questions.length === 0) {
            return { inconsistency: 0, average: 0, variance: 0 };
        }

        const lengths = questions.map(q => q.question?.length || 0);
        const average = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - average, 2), 0) / lengths.length;
        const standardDeviation = Math.sqrt(variance);

        // Inconsistency score (0-1, where 1 is very inconsistent)
        const inconsistency = Math.min(standardDeviation / average, 1);

        return {
            inconsistency,
            average,
            variance,
            standardDeviation
        };
    }

    /**
     * วิเคราะห์การกระจายคำตอบ
     */
    analyzeAnswerDistribution(questions) {
        if (!questions || questions.length === 0) {
            return { bias: 0, distribution: {} };
        }

        const answerPositions = {};
        let multipleChoiceCount = 0;

        questions.forEach(q => {
            if (q.type === 'multiple_choice' && q.options && q.correct_answer) {
                multipleChoiceCount++;
                const position = q.options.findIndex(option => option === q.correct_answer);
                if (position >= 0) {
                    answerPositions[position] = (answerPositions[position] || 0) + 1;
                }
            }
        });

        if (multipleChoiceCount === 0) {
            return { bias: 0, distribution: {} };
        }

        // Calculate bias (how far from even distribution)
        const expected = multipleChoiceCount / Object.keys(answerPositions).length;
        let bias = 0;

        Object.values(answerPositions).forEach(count => {
            bias += Math.abs(count - expected) / multipleChoiceCount;
        });

        return {
            bias,
            distribution: answerPositions,
            multipleChoiceCount
        };
    }

    /**
     * คำนวณคะแนนคุณภาพ
     */
    calculateQualityScore(quiz, issues) {
        let score = 100;

        // Deduct points for each issue
        score -= issues.length * 10;

        // Bonus for good practices
        if (quiz.description && quiz.description.length > 50) score += 5;
        if (quiz.timeLimit) score += 5;
        if (quiz.questions && quiz.questions.length >= 5) score += 5;

        // Question quality bonus
        if (quiz.questions) {
            const explanationRatio = quiz.questions.filter(q => q.explanation).length / quiz.questions.length;
            score += explanationRatio * 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * กำหนดระดับคุณภาพ
     */
    getQualityLevel(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        return 'poor';
    }
}

export default QuizValidator;