import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Quiz Generation DTO
 * ใช้สำหรับ validate และ transform ข้อมูลการสร้างข้อสอบ
 */
export class QuizGenerationDTO {
    constructor(data) {
        this.content = data.content || data.topic || '';
        this.topic = data.topic || '';
        this.questionType = data.questionType || 'multiple_choice';
        this.numberOfQuestions = parseInt(data.numberOfQuestions) || 5;
        this.difficulty = data.difficulty || 'medium';
        this.language = data.language || 'th';
        this.tags = data.tags || [];
        this.category = data.category || '';
        this.instructions = data.instructions || '';

        this.validate();
    }

    validate() {
        const errors = [];

        // Content validation
        if (!this.content && !this.topic) {
            errors.push('ต้องระบุหัวข้อหรือเนื้อหาสำหรับการสร้างข้อสอบ');
        }

        if (this.content && this.content.length < 10) {
            errors.push('เนื้อหาต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
        }

        if (this.content && this.content.length > 15000) {
            errors.push('เนื้อหาต้องมีความยาวไม่เกิน 15,000 ตัวอักษร');
        }

        // Question count validation
        if (this.numberOfQuestions < 1 || this.numberOfQuestions > 50) {
            errors.push('จำนวนคำถามต้องอยู่ระหว่าง 1-50 ข้อ');
        }

        // Question type validation
        const validQuestionTypes = ['multiple_choice', 'true_false', 'essay', 'short_answer'];
        if (!validQuestionTypes.includes(this.questionType)) {
            errors.push('ประเภทคำถามไม่ถูกต้อง');
        }

        // Difficulty validation
        const validDifficulties = ['easy', 'medium', 'hard'];
        if (!validDifficulties.includes(this.difficulty)) {
            errors.push('ระดับความยากไม่ถูกต้อง');
        }

        // Language validation
        const validLanguages = ['th', 'en'];
        if (!validLanguages.includes(this.language)) {
            errors.push('ภาษาไม่ถูกต้อง');
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
    }

    toJSON() {
        return {
            content: this.content,
            topic: this.topic,
            questionType: this.questionType,
            numberOfQuestions: this.numberOfQuestions,
            difficulty: this.difficulty,
            language: this.language,
            tags: this.tags,
            category: this.category,
            instructions: this.instructions
        };
    }
}