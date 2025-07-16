// backend/src/dto/quiz/
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Create Quiz DTO
 * ใช้สำหรับ validate ข้อมูลการสร้างข้อสอบใหม่
 */
export class CreateQuizDTO {
    constructor(data) {
        this.title = data.title || '';
        this.description = data.description || '';
        this.questions = data.questions || [];
        this.folderId = data.folderId || null;
        this.tags = data.tags || [];
        this.category = data.category || '';
        this.isPublic = Boolean(data.isPublic);
        this.timeLimit = data.timeLimit ? parseInt(data.timeLimit) : null;
        this.allowRetake = Boolean(data.allowRetake);
        this.shuffleQuestions = Boolean(data.shuffleQuestions);
        this.showResults = Boolean(data.showResults);

        this.validate();
    }

    validate() {
        const errors = [];

        // Title validation
        if (!this.title || this.title.trim().length === 0) {
            errors.push('ชื่อข้อสอบเป็นข้อมูลที่จำเป็น');
        }

        if (this.title && this.title.length > 200) {
            errors.push('ชื่อข้อสอบต้องมีความยาวไม่เกิน 200 ตัวอักษร');
        }

        // Description validation
        if (this.description && this.description.length > 1000) {
            errors.push('คำอธิบายต้องมีความยาวไม่เกิน 1,000 ตัวอักษร');
        }

        // Questions validation
        if (!Array.isArray(this.questions) || this.questions.length === 0) {
            errors.push('ข้อสอบต้องมีคำถามอย่างน้อย 1 ข้อ');
        }

        if (this.questions.length > 100) {
            errors.push('ข้อสอบต้องมีคำถามไม่เกิน 100 ข้อ');
        }

        // Validate each question
        this.questions.forEach((question, index) => {
            const questionErrors = this.validateQuestion(question, index + 1);
            errors.push(...questionErrors);
        });

        // Time limit validation
        if (this.timeLimit && (this.timeLimit < 1 || this.timeLimit > 480)) {
            errors.push('ระยะเวลาทำข้อสอบต้องอยู่ระหว่าง 1-480 นาที');
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
    }

    validateQuestion(question, questionNumber) {
        const errors = [];

        // Question text validation
        if (!question.question || question.question.trim().length === 0) {
            errors.push(`คำถามข้อ ${questionNumber}: ต้องมีข้อความคำถาม`);
        }

        if (question.question && question.question.length > 1000) {
            errors.push(`คำถามข้อ ${questionNumber}: ข้อความคำถามต้องมีความยาวไม่เกิน 1,000 ตัวอักษร`);
        }

        // Question type validation
        const validTypes = ['multiple_choice', 'true_false', 'essay', 'short_answer'];
        if (!question.type || !validTypes.includes(question.type)) {
            errors.push(`คำถามข้อ ${questionNumber}: ประเภทคำถามไม่ถูกต้อง`);
        }

        // Specific validation based on question type
        if (question.type === 'multiple_choice') {
            errors.push(...this.validateMultipleChoiceQuestion(question, questionNumber));
        } else if (question.type === 'true_false') {
            errors.push(...this.validateTrueFalseQuestion(question, questionNumber));
        }

        return errors;
    }

    validateMultipleChoiceQuestion(question, questionNumber) {
        const errors = [];

        // Options validation
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            errors.push(`คำถามข้อ ${questionNumber}: ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก`);
        }

        if (question.options && question.options.length > 6) {
            errors.push(`คำถามข้อ ${questionNumber}: ตัวเลือกต้องไม่เกิน 6 ตัวเลือก`);
        }

        // Validate each option
        if (question.options) {
            question.options.forEach((option, index) => {
                if (!option || option.trim().length === 0) {
                    errors.push(`คำถามข้อ ${questionNumber}: ตัวเลือกที่ ${index + 1} ไม่สามารถเป็นค่าว่างได้`);
                }
                if (option && option.length > 500) {
                    errors.push(`คำถามข้อ ${questionNumber}: ตัวเลือกที่ ${index + 1} ต้องมีความยาวไม่เกิน 500 ตัวอักษร`);
                }
            });
        }

        // Correct answer validation
        if (question.correctAnswer === undefined || question.correctAnswer === null) {
            errors.push(`คำถามข้อ ${questionNumber}: ต้องระบุคำตอบที่ถูกต้อง`);
        }

        if (question.options && (question.correctAnswer < 0 || question.correctAnswer >= question.options.length)) {
            errors.push(`คำถามข้อ ${questionNumber}: คำตอบที่ถูกต้องไม่อยู่ในช่วงตัวเลือกที่กำหนด`);
        }

        return errors;
    }

    validateTrueFalseQuestion(question, questionNumber) {
        const errors = [];

        // Correct answer validation for true/false
        if (typeof question.correctAnswer !== 'boolean') {
            errors.push(`คำถามข้อ ${questionNumber}: คำตอบต้องเป็น true หรือ false`);
        }

        return errors;
    }

    toJSON() {
        return {
            title: this.title.trim(),
            description: this.description.trim(),
            questions: this.questions,
            folderId: this.folderId,
            tags: this.tags,
            category: this.category,
            isPublic: this.isPublic,
            timeLimit: this.timeLimit,
            allowRetake: this.allowRetake,
            shuffleQuestions: this.shuffleQuestions,
            showResults: this.showResults
        };
    }
}