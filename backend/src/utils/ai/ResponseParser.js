// backend/src/utils/ai/ResponseParser.js
import logger from '../logger.js';
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Response Parser
 * จัดการการ parse และ validate response จาก AI
 */
export class ResponseParser {
    constructor() {
        this.cleanupPatterns = [
            /```json\n?/g,
            /```\n?/g,
            /^\s*[\{\[]/, // Match starting { or [
            /[\}\]]\s*$/ // Match ending } or ]
        ];
    }

    /**
     * Parse quiz response from AI
     * @param {string} response - Raw AI response
     * @returns {Object} Parsed quiz data
     */
    async parseQuizResponse(response) {
        try {
            if (!response || typeof response !== 'string') {
                throw new ValidationError('Invalid response format');
            }

            // Clean response
            const cleanedResponse = this.cleanResponse(response);

            // Parse JSON
            let parsedData;
            try {
                parsedData = JSON.parse(cleanedResponse);
            } catch (parseError) {
                // Try to extract JSON from text
                const extractedJson = this.extractJsonFromText(cleanedResponse);
                if (extractedJson) {
                    parsedData = JSON.parse(extractedJson);
                } else {
                    throw new ValidationError(`Invalid JSON format: ${parseError.message}`);
                }
            }

            // Validate structure
            const validationResult = this.validateQuizStructure(parsedData);
            if (!validationResult.isValid) {
                throw new ValidationError(`Quiz structure validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Enhance and normalize data
            const enhancedData = this.enhanceQuizData(parsedData);

            logger.debug('Quiz response parsed successfully', {
                title: enhancedData.title,
                questionCount: enhancedData.questions.length
            });

            return enhancedData;

        } catch (error) {
            logger.error('Error parsing quiz response:', {
                error: error.message,
                responseLength: response ? response.length : 0
            });

            if (error instanceof ValidationError) {
                throw error;
            }

            throw new ValidationError(`Failed to parse quiz response: ${error.message}`);
        }
    }

    /**
     * Parse questions-only response from AI
     * @param {string} response - Raw AI response
     * @returns {Array} Parsed questions array
     */
    async parseQuestionsResponse(response) {
        try {
            const cleanedResponse = this.cleanResponse(response);
            let parsedData;

            try {
                parsedData = JSON.parse(cleanedResponse);
            } catch (parseError) {
                const extractedJson = this.extractJsonFromText(cleanedResponse);
                if (extractedJson) {
                    parsedData = JSON.parse(extractedJson);
                } else {
                    throw new ValidationError(`Invalid JSON format: ${parseError.message}`);
                }
            }

            // Handle different response formats
            let questions;
            if (Array.isArray(parsedData)) {
                questions = parsedData;
            } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
                questions = parsedData.questions;
            } else {
                throw new ValidationError('Response does not contain valid questions array');
            }

            // Validate each question
            const validatedQuestions = questions.map((question, index) => {
                const validation = this.validateQuestionStructure(question);
                if (!validation.isValid) {
                    throw new ValidationError(`Question ${index + 1} validation failed: ${validation.errors.join(', ')}`);
                }
                return this.enhanceQuestionData(question);
            });

            logger.debug('Questions response parsed successfully', {
                questionCount: validatedQuestions.length
            });

            return validatedQuestions;

        } catch (error) {
            logger.error('Error parsing questions response:', {
                error: error.message,
                responseLength: response ? response.length : 0
            });

            if (error instanceof ValidationError) {
                throw error;
            }

            throw new ValidationError(`Failed to parse questions response: ${error.message}`);
        }
    }

    /**
     * Clean AI response
     * @param {string} response - Raw response
     * @returns {string} Cleaned response
     */
    cleanResponse(response) {
        if (!response) return '';

        let cleaned = response.trim();

        // Remove code block markers
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Remove any text before first { or [
        const jsonStart = Math.min(
            cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
            cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
        );

        if (jsonStart !== Infinity && jsonStart > 0) {
            cleaned = cleaned.substring(jsonStart);
        }

        // Remove any text after last } or ]
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }

        return cleaned.trim();
    }

    /**
     * Extract JSON from mixed text
     * @param {string} text - Text containing JSON
     * @returns {string|null} Extracted JSON string
     */
    extractJsonFromText(text) {
        try {
            // Try to find JSON object
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return objectMatch[0];
            }

            // Try to find JSON array
            const arrayMatch = text.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return arrayMatch[0];
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Validate quiz structure
     * @param {Object} data - Parsed quiz data
     * @returns {Object} Validation result
     */
    validateQuizStructure(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            errors.push('Quiz data must be an object');
            return { isValid: false, errors };
        }

        // Check required fields
        if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
            errors.push('Quiz must have a valid title');
        }

        if (!data.questions || !Array.isArray(data.questions)) {
            errors.push('Quiz must have a questions array');
        } else if (data.questions.length === 0) {
            errors.push('Quiz must have at least one question');
        } else {
            // Validate each question
            data.questions.forEach((question, index) => {
                const questionValidation = this.validateQuestionStructure(question);
                if (!questionValidation.isValid) {
                    errors.push(`Question ${index + 1}: ${questionValidation.errors.join(', ')}`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate individual question structure
     * @param {Object} question - Question data
     * @returns {Object} Validation result
     */
    validateQuestionStructure(question) {
        const errors = [];

        if (!question || typeof question !== 'object') {
            errors.push('Question must be an object');
            return { isValid: false, errors };
        }

        // Check required fields
        if (!question.question || typeof question.question !== 'string' || question.question.trim().length === 0) {
            errors.push('Question must have valid question text');
        }

        if (!question.type || typeof question.type !== 'string') {
            errors.push('Question must have a valid type');
        }

        // Type-specific validation
        switch (question.type) {
            case 'multiple_choice':
                if (!question.options || !Array.isArray(question.options)) {
                    errors.push('Multiple choice question must have options array');
                } else if (question.options.length < 2) {
                    errors.push('Multiple choice question must have at least 2 options');
                } else if (question.options.some(opt => !opt || typeof opt !== 'string')) {
                    errors.push('All options must be non-empty strings');
                }

                if (typeof question.correctAnswer !== 'number' ||
                    question.correctAnswer < 0 ||
                    question.correctAnswer >= (question.options?.length || 0)) {
                    errors.push('Multiple choice question must have valid correctAnswer index');
                }
                break;

            case 'true_false':
                if (typeof question.correctAnswer !== 'boolean') {
                    errors.push('True/false question must have boolean correctAnswer');
                }
                break;

            case 'essay':
                // Essay questions might have rubric or keywords
                if (question.rubric && typeof question.rubric !== 'string') {
                    errors.push('Essay question rubric must be a string');
                }
                if (question.keywords && (!Array.isArray(question.keywords) ||
                    question.keywords.some(kw => typeof kw !== 'string'))) {
                    errors.push('Essay question keywords must be array of strings');
                }
                break;

            case 'short_answer':
                if (question.correctAnswers) {
                    if (!Array.isArray(question.correctAnswers) ||
                        question.correctAnswers.some(ans => typeof ans !== 'string')) {
                        errors.push('Short answer question correctAnswers must be array of strings');
                    }
                }
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
     * Enhance quiz data with defaults and normalization
     * @param {Object} data - Raw quiz data
     * @returns {Object} Enhanced quiz data
     */
    enhanceQuizData(data) {
        return {
            title: data.title.trim(),
            description: data.description ? data.description.trim() : '',
            questions: data.questions.map(question => this.enhanceQuestionData(question)),
            metadata: {
                totalQuestions: data.questions.length,
                questionTypes: this.analyzeQuestionTypes(data.questions),
                aiGenerated: true,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Enhance individual question data
     * @param {Object} question - Raw question data
     * @returns {Object} Enhanced question data
     */
    enhanceQuestionData(question) {
        const enhanced = {
            question: question.question.trim(),
            type: question.type.toLowerCase(),
            ...question
        };

        // Normalize based on type
        switch (enhanced.type) {
            case 'multiple_choice':
                enhanced.options = question.options.map(opt => opt.trim());
                break;

            case 'essay':
                if (question.points) enhanced.points = parseInt(question.points) || 10;
                if (question.rubric) enhanced.rubric = question.rubric.trim();
                break;

            case 'short_answer':
                if (question.correctAnswers) {
                    enhanced.correctAnswers = question.correctAnswers.map(ans => ans.trim());
                }
                if (question.points) enhanced.points = parseInt(question.points) || 5;
                break;
        }

        // Add explanation if provided
        if (question.explanation) {
            enhanced.explanation = question.explanation.trim();
        }

        return enhanced;
    }

    /**
     * Analyze question types distribution
     * @param {Array} questions - Questions array
     * @returns {Object} Question types analysis
     */
    analyzeQuestionTypes(questions) {
        const types = {};
        questions.forEach(question => {
            const type = question.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    /**
     * Detect and fix common AI response issues
     * @param {string} response - AI response
     * @returns {string} Fixed response
     */
    fixCommonIssues(response) {
        let fixed = response;

        // Fix common JSON issues
        fixed = fixed
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix missing quotes around keys
            .replace(/(\w+):/g, '"$1":')
            // Fix single quotes to double quotes
            .replace(/'/g, '"')
            // Fix escaped quotes issues
            .replace(/\\"/g, '\\"');

        return fixed;
    }
}