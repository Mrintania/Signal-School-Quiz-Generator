// src/utils/constants.js
// ค่าคงที่ต่างๆ สำหรับระบบสร้างข้อสอบ โรงเรียนทหารสื่อสาร

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
};

/**
 * ข้อความ Error มาตรฐาน
 */
export const ERROR_MESSAGES = {
    // Authentication & Authorization
    UNAUTHORIZED: 'ไม่มีสิทธิ์เข้าถึง',
    FORBIDDEN: 'ไม่อนุญาตให้เข้าถึง',
    INVALID_TOKEN: 'Token ไม่ถูกต้อง',
    TOKEN_EXPIRED: 'Token หมดอายุแล้ว',
    INVALID_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',

    // Validation
    REQUIRED_FIELD: 'กรุณากรอกข้อมูลให้ครบถ้วน',
    INVALID_EMAIL: 'รูปแบบอีเมลไม่ถูกต้อง',
    INVALID_PASSWORD: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    PASSWORD_NOT_MATCH: 'รหัสผ่านไม่ตรงกัน',
    INVALID_INPUT: 'ข้อมูลที่ป้อนไม่ถูกต้อง',

    // Database
    NOT_FOUND: 'ไม่พบข้อมูลที่ร้องขอ',
    ALREADY_EXISTS: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
    DELETE_FAILED: 'ไม่สามารถลบข้อมูลได้',
    UPDATE_FAILED: 'ไม่สามารถอัปเดตข้อมูลได้',

    // File Upload
    FILE_TOO_LARGE: 'ขนาดไฟล์เกินที่กำหนด',
    INVALID_FILE_TYPE: 'ประเภทไฟล์ไม่ถูกต้อง',
    UPLOAD_FAILED: 'การอัปโหลดไฟล์ล้มเหลว',
    FILE_NOT_FOUND: 'ไม่พบไฟล์ที่ระบุ',

    // Quiz Generation
    QUIZ_GENERATION_FAILED: 'การสร้างข้อสอบล้มเหลว',
    INVALID_QUIZ_DATA: 'ข้อมูลข้อสอบไม่ถูกต้อง',
    INSUFFICIENT_CONTENT: 'เนื้อหาไม่เพียงพอสำหรับสร้างข้อสอบ',

    // AI Service
    AI_SERVICE_ERROR: 'เกิดข้อผิดพลาดในบริการ AI',
    AI_QUOTA_EXCEEDED: 'การใช้งาน AI เกินโควต้า',
    AI_RESPONSE_ERROR: 'ไม่สามารถรับผลตอบกลับจาก AI',

    // General
    INTERNAL_SERVER_ERROR: 'เกิดข้อผิดพลาดภายในระบบ',
    NETWORK_ERROR: 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
    MAINTENANCE_MODE: 'ระบบอยู่ในช่วงปรับปรุง กรุณาลองใหม่ภายหลัง',
    RATE_LIMIT_EXCEEDED: 'การร้องขอมากเกินไป กรุณาลองใหม่ภายหลัง'
};

/**
 * ข้อความ Success มาตรฐาน
 */
export const SUCCESS_MESSAGES = {
    // Authentication
    LOGIN_SUCCESS: 'เข้าสู่ระบบสำเร็จ',
    LOGOUT_SUCCESS: 'ออกจากระบบสำเร็จ',
    REGISTER_SUCCESS: 'สมัครสมาชิกสำเร็จ',
    PASSWORD_CHANGED: 'เปลี่ยนรหัสผ่านสำเร็จ',

    // CRUD Operations
    CREATED_SUCCESS: 'สร้างข้อมูลสำเร็จ',
    UPDATED_SUCCESS: 'อัปเดตข้อมูลสำเร็จ',
    DELETED_SUCCESS: 'ลบข้อมูลสำเร็จ',
    RETRIEVED_SUCCESS: 'ดึงข้อมูลสำเร็จ',

    // File Operations
    UPLOAD_SUCCESS: 'อัปโหลดไฟล์สำเร็จ',
    DOWNLOAD_SUCCESS: 'ดาวน์โหลดไฟล์สำเร็จ',

    // Quiz Operations
    QUIZ_GENERATED: 'สร้างข้อสอบสำเร็จ',
    QUIZ_SAVED: 'บันทึกข้อสอบสำเร็จ',
    QUIZ_EXPORTED: 'ส่งออกข้อสอบสำเร็จ'
};

/**
 * ระดับชั้นเรียน
 */
export const QUIZ_LEVELS = {
    PRIMARY: 'ประถม',
    SECONDARY: 'มัธยม',
    VOCATIONAL: 'ปวช',
    HIGH_VOCATIONAL: 'ปวส',
    UNIVERSITY: 'อุดม',
    MILITARY: 'ทหาร',
    SIGNAL_SCHOOL: 'โรงเรียนทหารสื่อสาร'
};

/**
 * ประเภทของคำถาม
 */
export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    SHORT_ANSWER: 'short_answer',
    ESSAY: 'essay',
    MATCHING: 'matching',
    FILL_IN_THE_BLANK: 'fill_in_the_blank',
    ORDERING: 'ordering'
};

/**
 * วิชาต่างๆ สำหรับโรงเรียนทหารสื่อสาร
 */
export const SUBJECTS = {
    // วิชาทหาร
    MILITARY_STRATEGY: 'ยุทธศาสตร์ทหาร',
    MILITARY_HISTORY: 'ประวัติศาสตร์ทหาร',
    LEADERSHIP: 'ภาวะผู้นำ',
    MILITARY_LAW: 'กฎหมายทหาร',

    // วิชาสื่อสาร
    COMMUNICATION_TECH: 'เทคโนโลยีการสื่อสาร',
    RADIO_COMMUNICATION: 'การสื่อสารวิทยุ',
    SATELLITE_COMMUNICATION: 'การสื่อสารผ่านดาวเทียม',
    NETWORK_SECURITY: 'ความปลอดภัยเครือข่าย',
    CRYPTOGRAPHY: 'การเข้ารหัส',

    // วิชาคอมพิวเตอร์และ IT
    COMPUTER_SCIENCE: 'วิทยาการคอมพิวเตอร์',
    PROGRAMMING: 'การเขียนโปรแกรม',
    DATABASE: 'ฐานข้อมูล',
    ARTIFICIAL_INTELLIGENCE: 'ปัญญาประดิษฐ์',
    CYBERSECURITY: 'ความปลอดภัยไซเบอร์',

    // วิชาพื้นฐาน
    MATHEMATICS: 'คณิตศาสตร์',
    PHYSICS: 'ฟิสิกส์',
    CHEMISTRY: 'เคมี',
    ENGLISH: 'ภาษาอังกฤษ',
    THAI: 'ภาษาไทย',

    // วิชาเลือก
    ELECTRONICS: 'อิเล็กทรอนิกส์',
    SIGNAL_PROCESSING: 'การประมวลผลสัญญาณ',
    RADAR_TECHNOLOGY: 'เทคโนโลยีเรดาร์',
    PROJECT_MANAGEMENT: 'การจัดการโครงการ'
};

/**
 * ประเภทไฟล์ที่รองรับ
 */
export const FILE_TYPES = {
    DOCUMENTS: {
        PDF: 'application/pdf',
        DOC: 'application/msword',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        TXT: 'text/plain'
    },
    IMAGES: {
        JPEG: 'image/jpeg',
        PNG: 'image/png',
        GIF: 'image/gif',
        SVG: 'image/svg+xml'
    },
    SPREADSHEETS: {
        XLS: 'application/vnd.ms-excel',
        XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        CSV: 'text/csv'
    }
};

/**
 * ขีดจำกัดต่างๆ ของระบบ
 */
export const LIMITS = {
    // File Upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES_PER_UPLOAD: 5,

    // Quiz Generation
    MIN_QUESTIONS: 5,
    MAX_QUESTIONS: 50,
    MIN_CONTENT_LENGTH: 100, // characters
    MAX_CONTENT_LENGTH: 50000, // characters

    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,

    // Rate Limiting
    API_RATE_LIMIT: 100, // requests per 15 minutes
    AI_RATE_LIMIT: 10, // requests per minute

    // Text Limits
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_QUESTION_LENGTH: 500,
    MAX_ANSWER_LENGTH: 200,

    // User Limits
    MAX_USERNAME_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128
};

/**
 * สถานะต่างๆ ของระบบ
 */
export const STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
};

/**
 * บทบาทผู้ใช้
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    GUEST: 'guest'
};

/**
 * ระดับความยากของข้อสอบ
 */
export const DIFFICULTY_LEVELS = {
    EASY: 'ง่าย',
    MEDIUM: 'ปานกลาง',
    HARD: 'ยาก',
    EXPERT: 'ผู้เชี่ยวชาญ'
};

/**
 * การตั้งค่า AI
 */
export const AI_CONFIG = {
    DEFAULT_MODEL: 'gemini-1.5-flash',
    MODELS: {
        FLASH: 'gemini-1.5-flash',
        PRO: 'gemini-1.5-pro'
    },
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.7,
    TOP_P: 0.8,
    TOP_K: 40
};

/**
 * รูปแบบวันที่
 */
export const DATE_FORMATS = {
    THAI_SHORT: 'DD/MM/YYYY',
    THAI_LONG: 'DD MMMM YYYY',
    THAI_WITH_TIME: 'DD/MM/YYYY HH:mm',
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DISPLAY: 'D MMMM YYYY เวลา HH:mm น.'
};

/**
 * ข้อมูลโรงเรียนทหารสื่อสาร
 */
export const SCHOOL_INFO = {
    NAME_TH: 'โรงเรียนทหารสื่อสาร',
    NAME_EN: 'Signal School',
    DEPARTMENT_TH: 'กรมการทหารสื่อสาร',
    DEPARTMENT_EN: 'Signal Department',
    ORGANIZATION: 'กองทัพบกไทย',
    ABBREVIATION: 'รทส.',
    MOTTO: 'ความรู้คือพลัง',
    ESTABLISHED: '2494' // พ.ศ.
};

// ส่งออกทั้งหมดเป็น default object
export default {
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    QUIZ_LEVELS,
    QUESTION_TYPES,
    SUBJECTS,
    FILE_TYPES,
    LIMITS,
    STATUS,
    USER_ROLES,
    DIFFICULTY_LEVELS,
    AI_CONFIG,
    DATE_FORMATS,
    SCHOOL_INFO
};