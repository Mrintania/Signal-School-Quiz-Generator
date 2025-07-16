// backend/src/utils/quiz/QuizValidator.js
import logger from '../logger.js';
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Quiz Validator
 * ตรวจสอบความถูกต้องของข้อมูลข้อสอบ
 */
export class QuizValidator {
    constructor() {
        this.config = {
            maxTitleLength: 200,
            maxDescriptionLength: 1000,
            maxQuestionLength: 1000,
            maxOptionLength: 500,
            maxQuestions: 100,
            minQuestions: 1,
            maxOptions: 6,
            minOptions: 2
        };

        this.validQuestionTypes = [
            'multiple_choice',
            'true_false',
            'essay',
            'short_answer'
        ];

        this.validDifficulties = ['easy', 'medium', 'hard'];
    }

    /**
     * Validate complete quiz structure and content
     * @param {Object} quiz - Quiz data to validate
     * @returns {Object} Validation result
     */
    validateGeneratedQuiz(quiz) {
        try {
            const errors = [];

            // Basic structure validation
            if (!quiz || typeof quiz !== 'object') {
                errors.push('Quiz must be a valid object');
                return { isValid: false, errors };
            }

            // Title validation
            const titleValidation = this.validateTitle(quiz.title);
            if (!titleValidation.isValid) {
                errors.push(...titleValidation.errors);
            }

            // Description validation (optional)
            if (quiz.description) {
                const descValidation = this.validateDescription(quiz.description);
                if (!descValidation.isValid) {
                    errors.push(...descValidation.errors);
                }
            }

            // Questions validation
            const questionsValidation = this.validateQuizQuestions(quiz.questions);
            if (!questionsValidation.isValid) {
                errors.push(...questionsValidation.errors);
            }

            // Additional metadata validation
            if (quiz.category && typeof quiz.category !== 'string') {
                errors.push('Category must be a string');
            }

            if (quiz.tags && (!Array.isArray(quiz.tags) ||
                quiz.tags.some(tag => typeof tag !== 'string'))) {
                errors.push('Tags must be an array of strings');
            }

            if (quiz.difficulty && !this.validDifficulties.includes(quiz.difficulty)) {
                errors.push(`Difficulty must be one of: ${this.validDifficulties.join(', ')}`);
            }

            const result = {
                isValid: errors.length === 0,
                errors: errors,
                warnings: this.generateWarnings(quiz)
            };

            if (result.isValid) {
                logger.debug('Quiz validation passed', {
                    title: quiz.title,
                    questionCount: quiz.questions?.length || 0
                });
            } else {
                logger.warn('Quiz validation failed', {
                    title: quiz.title,
                    errors: errors
                });
            }

            return result;

        } catch (error) {
            logger.error('Quiz validation error:', error);
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                warnings: []
            };
        }
    }

    /**
     * Validate quiz questions array
     * @param {Array} questions - Questions to validate
     * @returns {Object} Validation result
     */
    validateQuizQuestions(questions) {
        const errors = [];

        if (!Array.isArray(questions)) {
            errors.push('Questions must be an array');
            return { isValid: false, errors };
        }

        if (questions.length < this.config.minQuestions) {
            errors.push(`Quiz must have at least ${this.config.minQuestions} question(s)`);
        }

        if (questions.length > this.config.maxQuestions) {
            errors.push(`Quiz cannot have more than ${this.config.maxQuestions} questions`);
        }

        // Validate each question
        questions.forEach((question, index) => {
            const questionValidation = this.validateQuestion(question);
            if (!questionValidation.isValid) {
                questionValidation.errors.forEach(error => {
                    errors.push(`Question ${index + 1}: ${error}`);
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate individual question
     * @param {Object} question - Question to validate
     * @returns {Object} Validation result
     */
    validateQuestion(question) {
        const errors = [];

        if (!question || typeof question !== 'object') {
            errors.push('Question must be a valid object');
            return { isValid: false, errors };
        }

        // Question text validation
        if (!question.question || typeof question.question !== 'string') {
            errors.push('Question must have valid question text');
        } else {
            if (question.question.trim().length === 0) {
                errors.push('Question text cannot be empty');
            }
            if (question.question.length > this.config.maxQuestionLength) {
                errors.push(`Question text cannot exceed ${this.config.maxQuestionLength} characters`);
            }
        }

        // Question type validation
        if (!question.type || !this.validQuestionTypes.includes(question.type)) {
            errors.push(`Question type must be one of: ${this.validQuestionTypes.join(', ')}`);
        } else {
            // Type-specific validation
            const typeValidation = this.validateQuestionByType(question);
            if (!typeValidation.isValid) {
                errors.push(...typeValidation.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate question based on its type
     * @param {Object} question - Question to validate
     * @returns {Object} Validation result
     */
    validateQuestionByType(question) {
        const errors = [];

        switch (question.type) {
            case 'multiple_choice':
                errors.push(...this.validateMultipleChoiceQuestion(question));
                break;

            case 'true_false':
                errors.push(...this.validateTrueFalseQuestion(question));
                break;

            case 'essay':
                errors.push(...this.validateEssayQuestion(question));
                break;

            case 'short_answer':
                errors.push(...this.validateShortAnswerQuestion(question));
                break;

            default:
                errors.push(`Unknown question type: ${question.type}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate multiple choice question
     * @param {Object} question - Question to validate
     * @returns {Array} Validation errors
     */
    validateMultipleChoiceQuestion(question) {
        const errors = [];

        // Options validation
        if (!question.options || !Array.isArray(question.options)) {
            errors.push('Multiple choice question must have options array');
        } else {
            if (question.options.length < this.config.minOptions) {
                errors.push(`Multiple choice question must have at least ${this.config.minOptions} options`);
            }

            if (question.options.length > this.config.maxOptions) {
                errors.push(`Multiple choice question cannot have more than ${this.config.maxOptions} options`);
            }

            // Validate each option
            question.options.forEach((option, index) => {
                if (!option || typeof option !== 'string') {
                    errors.push(`Option ${index + 1} must be a non-empty string`);
                } else {
                    if (option.trim().length === 0) {
                        errors.push(`Option ${index + 1} cannot be empty`);
                    }
                    if (option.length > this.config.maxOptionLength) {
                        errors.push(`Option ${index + 1} cannot exceed ${this.config.maxOptionLength} characters`);
                    }
                }
            });

            // Check for duplicate options
            const uniqueOptions = new Set(question.options.map(opt => opt.trim().toLowerCase()));
            if (uniqueOptions.size !== question.options.length) {
                errors.push('Options must be unique');
            }
        }

        // Correct answer validation
        if (typeof question.correctAnswer !== 'number') {
            errors.push('Multiple choice question must have numeric correctAnswer');
        } else {
            if (question.correctAnswer < 0 ||
                question.correctAnswer >= (question.options?.length || 0)) {
                errors.push('correctAnswer must be a valid option index');
            }
        }

        return errors;
    }

    /**
     * Validate true/false question
     * @param {Object} question - Question to validate
     * @returns {Array} Validation errors
     */
    validateTrueFalseQuestion(question) {
        const errors = [];

        if (typeof question.correctAnswer !== 'boolean') {
            errors.push('True/false question must have boolean correctAnswer');
        }

        // Check for absolute terms that might make questions ambiguous
        const absoluteTerms = ['always', 'never', 'all', 'none', 'every', 'เสมอ', 'ไม่เคย', 'ทั้งหมด'];
        const questionText = question.question?.toLowerCase() || '';

        if (absoluteTerms.some(term => questionText.includes(term))) {
            // This is a warning, not an error
        }

        return errors;
    }

    /**
     * Validate essay question
     * @param {Object} question - Question to validate
     * @returns {Array} Validation errors
     */
    validateEssayQuestion(question) {
        const errors = [];

        // Essay questions should have rubric or keywords for grading
        if (!question.rubric && !question.keywords) {
            // This is more of a recommendation
        }

        if (question.rubric && typeof question.rubric !== 'string') {
            errors.push('Essay question rubric must be a string');
        }

        if (question.keywords) {
            if (!Array.isArray(question.keywords)) {
                errors.push('Essay question keywords must be an array');
            } else if (question.keywords.some(kw => typeof kw !== 'string')) {
                errors.push('All keywords must be strings');
            }
        }

        if (question.points && (typeof question.points !== 'number' || question.points <= 0)) {
            errors.push('Essay question points must be a positive number');
        }

        return errors;
    }

    /**
     * Validate short answer question
     * @param {Object} question - Question to validate
     * @returns {Array} Validation errors
     */
    validateShortAnswerQuestion(question) {
        const errors = [];

        if (question.correctAnswers) {
            if (!Array.isArray(question.correctAnswers)) {
                errors.push('Short answer correctAnswers must be an array');
            } else {
                if (question.correctAnswers.length === 0) {
                    errors.push('Short answer question must have at least one correct answer');
                }

                question.correctAnswers.forEach((answer, index) => {
                    if (!answer || typeof answer !== 'string') {
                        errors.push(`Correct answer ${index + 1} must be a non-empty string`);
                    }
                });
            }
        }

        if (question.points && (typeof question.points !== 'number' || question.points <= 0)) {
            errors.push('Short answer question points must be a positive number');
        }

        return errors;
    }

    /**
     * Validate quiz title
     * @param {string} title - Title to validate
     * @returns {Object} Validation result
     */
    validateTitle(title) {
        const errors = [];

        if (!title || typeof title !== 'string') {
            errors.push('Title must be a valid string');
        } else {
            if (title.trim().length === 0) {
                errors.push('Title cannot be empty');
            }
            if (title.length > this.config.maxTitleLength) {
                errors.push(`Title cannot exceed ${this.config.maxTitleLength} characters`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate quiz description
     * @param {string} description - Description to validate
     * @returns {Object} Validation result
     */
    validateDescription(description) {
        const errors = [];

        if (description && typeof description !== 'string') {
            errors.push('Description must be a string');
        } else if (description && description.length > this.config.maxDescriptionLength) {
            errors.push(`Description cannot exceed ${this.config.maxDescriptionLength} characters`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate warnings for quiz quality
     * @param {Object} quiz - Quiz to analyze
     * @returns {Array} Warning messages
     */
    generateWarnings(quiz) {
        const warnings = [];

        if (!quiz.questions) return warnings;

        // Check question distribution
        const questionTypes = {};
        quiz.questions.forEach(q => {
            questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
        });

        // Warn if all questions are the same type
        if (Object.keys(questionTypes).length === 1 && quiz.questions.length > 5) {
            warnings.push('Consider varying question types for better assessment');
        }

        // Warn about essay question grading
        const essayQuestions = quiz.questions.filter(q => q.type === 'essay');
        if (essayQuestions.length > 0) {
            const withoutRubric = essayQuestions.filter(q => !q.rubric && !q.keywords);
            if (withoutRubric.length > 0) {
                warnings.push('Essay questions should include rubrics or keywords for consistent grading');
            }
        }

        // Warn about quiz length
        if (quiz.questions.length > 50) {
            warnings.push('Long quizzes may cause fatigue - consider breaking into sections');
        }

        // Warn about multiple choice options
        const mcQuestions = quiz.questions.filter(q => q.type === 'multiple_choice');
        mcQuestions.forEach((q, index) => {
            if (q.options && q.options.length < 4) {
                warnings.push(`Question ${index + 1}: Consider providing 4 options for better assessment`);
            }
        });

        return warnings;
    }

    /**
     * Quick validation for basic quiz structure
     * @param {Object} quiz - Quiz to validate
     * @returns {boolean} Is valid
     */
    isValidQuizStructure(quiz) {
        return quiz &&
            typeof quiz === 'object' &&
            typeof quiz.title === 'string' &&
            quiz.title.trim().length > 0 &&
            Array.isArray(quiz.questions) &&
            quiz.questions.length > 0;
    }

    /**
     * Check content appropriateness
     * @param {Object} quiz - Quiz to check
     * @returns {Object} Appropriateness check result
     */
    checkContentAppropriateness(quiz) {
        const issues = [];
        const warnings = [];

        // Define inappropriate content patterns
        const inappropriatePatterns = [
            /violence|violent|kill|death|murder/i,
            /sexual|sex|porn|adult/i,
            /drugs|alcohol|smoking/i,
            /politics|political|government/i,
            /religion|religious|god|allah|buddha/i
        ];

        // Check title and description
        [quiz.title, quiz.description].forEach((text, index) => {
            if (text) {
                inappropriatePatterns.forEach(pattern => {
                    if (pattern.test(text)) {
                        warnings.push(`Potentially sensitive content detected in ${index === 0 ? 'title' : 'description'}`);
                    }
                });
            }
        });

        // Check questions
        quiz.questions?.forEach((question, qIndex) => {
            inappropriatePatterns.forEach(pattern => {
                if (pattern.test(question.question)) {
                    warnings.push(`Potentially sensitive content detected in question ${qIndex + 1}`);
                }

                // Check options for multiple choice
                if (question.options) {
                    question.options.forEach((option, oIndex) => {
                        if (pattern.test(option)) {
                            warnings.push(`Potentially sensitive content detected in question ${qIndex + 1}, option ${oIndex + 1}`);
                        }
                    });
                }
            });
        });

        return {
            isAppropriate: issues.length === 0,
            issues,
            warnings
        };
    }
}

export { PromptBuilder, ResponseParser, QuizValidator };