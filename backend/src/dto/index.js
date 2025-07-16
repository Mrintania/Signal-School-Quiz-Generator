/**
 * DTOs Index File
 * รวม exports ของ Data Transfer Objects ทั้งหมด
 */

// Quiz DTOs
export {
    QuizGenerationDTO,
    CreateQuizDTO,
    UpdateQuizDTO,
    QuizSearchDTO,
    QuizResponseDTO,
    QuestionResponseDTO,
    PaginationDTO,
    ErrorResponseDTO,
    DTOFactory
} from './quiz/QuizDTOs.js';

// Common DTOs
export { BaseDTO } from './common/BaseDTO.js';
