// backend/src/dto/quiz/QuizDTOs.js
import { ValidationError } from '../../errors/CustomErrors.js';

/**
 * Base DTO Class
 * ใช้เป็น parent class สำหรับ DTO ทั้งหมด
 */
class BaseDTO {
    constructor(data = {}) {
        this.validate(data);
        this.transform(data);
    }

    validate(data) {
        // Override in child classes
    }

    transform(data) {
        // Override in child classes
        Object.assign(this, data);
    }

    static create(data) {
        return new this(data);
    }

    toObject() {
        return { ...this };
    }

    toJSON() {
        return this.toObject();
    }
}

/**
 * Quiz Generation DTO
 * สำหรับการสร้างข้อสอบ
 */
export class QuizGenerationDTO extends BaseDTO {
    validate(data) {
        const { content, questionType, questionCount, userId } = data;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new ValidationError('เนื้อหาสำหรับสร้างข้อสอบไม่สามารถเป็นค่าว่างได้');
        }

        if (!questionType || typeof questionType !== 'string') {
            throw new ValidationError('ต้องระบุประเภทของคำถาม');
        }

        if (!userId) {
            throw new ValidationError('ต้องระบุ user ID');
        }

        if (questionCount !== undefined) {
            const count = parseInt(questionCount);
            if (isNaN(count) || count < 1 || count > 100) {
                throw new ValidationError('จำนวนคำถามต้องอยู่ระหว่าง 1-100');
            }
        }

        if (content.length > 50000) {
            throw new ValidationError('เนื้อหายาวเกินไป (สูงสุด 50,000 ตัวอักษร)');
        }
    }

    transform(data) {
        this.content = data.content.trim();
        this.questionType = data.questionType;
        this.questionCount = data.questionCount ? parseInt(data.questionCount) : 10;
        this.difficulty = data.difficulty || 'medium';
        this.subject = data.subject || '';
        this.userId = data.userId;
        this.language = data.language || 'th';
        this.includeExplanations = data.includeExplanations || false;
        this.customInstructions = data.customInstructions || '';
    }
}

/**
 * Create Quiz DTO
 * สำหรับการสร้างข้อสอบใหม่
 */
export class CreateQuizDTO extends BaseDTO {
    validate(data) {
        const { title, questions, userId } = data;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            throw new ValidationError('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
        }

        if (title.length > 255) {
            throw new ValidationError('ชื่อข้อสอบยาวเกินไป (สูงสุด 255 ตัวอักษร)');
        }

        if (!userId) {
            throw new ValidationError('ต้องระบุ user ID');
        }

        if (questions && !Array.isArray(questions)) {
            throw new ValidationError('คำถามต้องเป็น array');
        }

        if (questions && questions.length > 100) {
            throw new ValidationError('จำนวนคำถามต้องไม่เกิน 100 ข้อ');
        }

        // Validate each question
        if (questions) {
            questions.forEach((question, index) => {
                this.validateQuestion(question, index);
            });
        }
    }

    validateQuestion(question, index) {
        if (!question.question || typeof question.question !== 'string') {
            throw new ValidationError(`คำถามที่ ${index + 1}: ข้อความคำถามไม่ถูกต้อง`);
        }

        if (!question.options || !Array.isArray(question.options)) {
            throw new ValidationError(`คำถามที่ ${index + 1}: ตัวเลือกต้องเป็น array`);
        }

        if (question.options.length < 2) {
            throw new ValidationError(`คำถามที่ ${index + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ตัว`);
        }

        if (!question.correct_answer) {
            throw new ValidationError(`คำถามที่ ${index + 1}: ต้องระบุคำตอบที่ถูกต้อง`);
        }
    }

    transform(data) {
        this.title = data.title.trim();
        this.topic = data.topic?.trim() || '';
        this.description = data.description?.trim() || '';
        this.category = data.category || 'general';
        this.questionType = data.questionType || 'multiple_choice';
        this.questions = data.questions || [];
        this.questionCount = data.questions ? data.questions.length : 0;
        this.difficultyLevel = data.difficultyLevel || 'medium';
        this.timeLimit = data.timeLimit ? parseInt(data.timeLimit) : null;
        this.userId = data.userId;
        this.folderId = data.folderId || null;
        this.status = data.status || 'draft';
        this.tags = data.tags || [];
        this.isPublic = data.isPublic || false;
        this.settings = data.settings || {};
    }
}

/**
 * Update Quiz DTO
 * สำหรับการแก้ไขข้อสอบ
 */
export class UpdateQuizDTO extends BaseDTO {
    validate(data) {
        if (data.title !== undefined) {
            if (typeof data.title !== 'string' || data.title.trim().length === 0) {
                throw new ValidationError('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้');
            }
            if (data.title.length > 255) {
                throw new ValidationError('ชื่อข้อสอบยาวเกินไป (สูงสุด 255 ตัวอักษร)');
            }
        }

        if (data.questions !== undefined) {
            if (!Array.isArray(data.questions)) {
                throw new ValidationError('คำถามต้องเป็น array');
            }
            if (data.questions.length > 100) {
                throw new ValidationError('จำนวนคำถามต้องไม่เกิน 100 ข้อ');
            }
        }

        if (data.timeLimit !== undefined && data.timeLimit !== null) {
            const timeLimit = parseInt(data.timeLimit);
            if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 480) {
                throw new ValidationError('เวลาในการทำข้อสอบต้องอยู่ระหว่าง 1-480 นาที');
            }
        }
    }

    transform(data) {
        // Only include defined fields
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                if (key === 'title' || key === 'topic' || key === 'description') {
                    this[key] = data[key].trim();
                } else if (key === 'timeLimit' && data[key] !== null) {
                    this[key] = parseInt(data[key]);
                } else {
                    this[key] = data[key];
                }
            }
        });

        // Always update timestamp
        this.updatedAt = new Date();
    }
}

/**
 * Quiz Search DTO
 * สำหรับการค้นหาข้อสอบ
 */
export class QuizSearchDTO extends BaseDTO {
    validate(data) {
        if (data.page !== undefined) {
            const page = parseInt(data.page);
            if (isNaN(page) || page < 1) {
                throw new ValidationError('หมายเลขหน้าต้องเป็นจำนวนเต็มบวก');
            }
        }

        if (data.limit !== undefined) {
            const limit = parseInt(data.limit);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                throw new ValidationError('จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100');
            }
        }

        if (data.sortOrder !== undefined && !['ASC', 'DESC'].includes(data.sortOrder.toUpperCase())) {
            throw new ValidationError('การเรียงลำดับต้องเป็น ASC หรือ DESC');
        }
    }

    transform(data) {
        this.query = data.query?.trim() || '';
        this.category = data.category || null;
        this.folderId = data.folderId || null;
        this.status = data.status || 'active';
        this.difficulty = data.difficulty || null;
        this.questionType = data.questionType || null;
        this.page = data.page ? parseInt(data.page) : 1;
        this.limit = data.limit ? parseInt(data.limit) : 20;
        this.sortBy = data.sortBy || 'updated_at';
        this.sortOrder = data.sortOrder ? data.sortOrder.toUpperCase() : 'DESC';
        this.userId = data.userId;

        // Calculate offset
        this.offset = (this.page - 1) * this.limit;
    }
}

/**
 * Quiz Response DTO
 * สำหรับการส่งข้อมูลข้อสอบกลับ
 */
export class QuizResponseDTO extends BaseDTO {
    validate(data) {
        if (!data.id) {
            throw new ValidationError('Quiz ID is required');
        }
    }

    transform(data) {
        this.id = data.id;
        this.title = data.title;
        this.topic = data.topic;
        this.description = data.description;
        this.category = data.category;
        this.questionType = data.question_type || data.questionType;
        this.questionCount = data.question_count || data.questionCount;
        this.difficultyLevel = data.difficulty_level || data.difficultyLevel;
        this.timeLimit = data.time_limit || data.timeLimit;
        this.status = data.status;
        this.tags = this.parseTags(data.tags);
        this.isPublic = data.is_public || data.isPublic || false;
        this.folderId = data.folder_id || data.folderId;
        this.folderName = data.folder_name || data.folderName;
        this.userId = data.user_id || data.userId;
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
        this.settings = this.parseSettings(data.settings);

        // Include questions if present
        if (data.questions) {
            this.questions = data.questions.map(q => new QuestionResponseDTO(q));
        }

        // Include metadata
        this.metadata = {
            hasQuestions: !!data.questions && data.questions.length > 0,
            isComplete: this.status === 'published',
            canEdit: true // This should be determined by business logic
        };
    }

    parseTags(tags) {
        if (typeof tags === 'string') {
            try {
                return JSON.parse(tags);
            } catch {
                return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
        }
        return Array.isArray(tags) ? tags : [];
    }

    parseSettings(settings) {
        if (typeof settings === 'string') {
            try {
                return JSON.parse(settings);
            } catch {
                return {};
            }
        }
        return settings || {};
    }
}

/**
 * Question Response DTO
 * สำหรับการส่งข้อมูลคำถามกลับ
 */
export class QuestionResponseDTO extends BaseDTO {
    validate(data) {
        if (!data.question_text && !data.question) {
            throw new ValidationError('Question text is required');
        }
    }

    transform(data) {
        this.id = data.id;
        this.question = data.question_text || data.question;
        this.type = data.question_type || data.type || 'multiple_choice';
        this.options = this.parseOptions(data.options);
        this.correctAnswer = data.correct_answer || data.correctAnswer;
        this.explanation = data.explanation;
        this.points = data.points || 1;
        this.orderIndex = data.order_index || data.orderIndex || 0;
    }

    parseOptions(options) {
        if (typeof options === 'string') {
            try {
                return JSON.parse(options);
            } catch {
                return [];
            }
        }
        return Array.isArray(options) ? options : [];
    }
}

/**
 * Pagination DTO
 * สำหรับการส่งข้อมูล pagination
 */
export class PaginationDTO extends BaseDTO {
    validate(data) {
        if (data.total < 0 || data.page < 1 || data.limit < 1) {
            throw new ValidationError('Invalid pagination data');
        }
    }

    transform(data) {
        this.total = data.total;
        this.page = data.page;
        this.limit = data.limit;
        this.totalPages = Math.ceil(data.total / data.limit);
        this.hasNext = data.page < this.totalPages;
        this.hasPrev = data.page > 1;
        this.offset = (data.page - 1) * data.limit;
    }
}

/**
 * Error Response DTO
 * สำหรับการส่งข้อมูล error
 */
export class ErrorResponseDTO extends BaseDTO {
    validate(data) {
        if (!data.message) {
            throw new ValidationError('Error message is required');
        }
    }

    transform(data) {
        this.success = false;
        this.message = data.message;
        this.code = data.code || 'UNKNOWN_ERROR';
        this.details = data.details || null;
        this.timestamp = new Date().toISOString();
        
        if (process.env.NODE_ENV === 'development' && data.stack) {
            this.stack = data.stack;
        }
    }
}

/**
 * DTO Factory
 * สร้าง DTO instances
 */
export class DTOFactory {
    static createQuizGeneration(data) {
        return new QuizGenerationDTO(data);
    }

    static createQuiz(data) {
        return new CreateQuizDTO(data);
    }

    static updateQuiz(data) {
        return new UpdateQuizDTO(data);
    }

    static searchQuiz(data) {
        return new QuizSearchDTO(data);
    }

    static quizResponse(data) {
        return new QuizResponseDTO(data);
    }

    static questionResponse(data) {
        return new QuestionResponseDTO(data);
    }

    static pagination(data) {
        return new PaginationDTO(data);
    }

    static error(data) {
        return new ErrorResponseDTO(data);
    }

    /**
     * Transform array of data to DTOs
     */
    static transformArray(dataArray, dtoType) {
        if (!Array.isArray(dataArray)) {
            return [];
        }

        return dataArray.map(item => {
            switch (dtoType) {
                case 'quiz':
                    return new QuizResponseDTO(item);
                case 'question':
                    return new QuestionResponseDTO(item);
                default:
                    return item;
            }
        });
    }
}

// Export individual DTOs and factory
export {
    BaseDTO,
    QuizGenerationDTO as CreateQuizDTO,
    UpdateQuizDTO,
    QuizSearchDTO,
    QuizResponseDTO,
    QuestionResponseDTO,
    PaginationDTO,
    ErrorResponseDTO,
    DTOFactory
};