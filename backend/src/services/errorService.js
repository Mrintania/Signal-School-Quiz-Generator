/**
 * Signal School Quiz Generator - Error Service
 * ระบบจัดการ Error แบบครอบคลุมสำหรับ Signal School Quiz Generator
 * 
 * @author Signal School, Signal Department, Royal Thai Army
 * @version 1.0.0
 */

class ErrorService {
    constructor() {
        this.errorLogs = [];
        this.errorHandlers = new Map();
        this.isProduction = process.env.NODE_ENV === 'production';
        this.logLevel = process.env.LOG_LEVEL || 'error';
        this.maxLogSize = 1000; // จำนวน log สูงสุดที่เก็บในหน่วยความจำ

        this.initializeErrorHandlers();
        this.setupGlobalErrorHandlers();
    }

    /**
     * ประเภทของ Error ต่างๆ
     */
    static ErrorTypes = {
        VALIDATION: 'VALIDATION_ERROR',
        AUTHENTICATION: 'AUTHENTICATION_ERROR',
        AUTHORIZATION: 'AUTHORIZATION_ERROR',
        NETWORK: 'NETWORK_ERROR',
        DATABASE: 'DATABASE_ERROR',
        FILE_SYSTEM: 'FILE_SYSTEM_ERROR',
        QUIZ_GENERATION: 'QUIZ_GENERATION_ERROR',
        AI_SERVICE: 'AI_SERVICE_ERROR',
        RATE_LIMIT: 'RATE_LIMIT_ERROR',
        SYSTEM: 'SYSTEM_ERROR',
        BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
        EXTERNAL_API: 'EXTERNAL_API_ERROR'
    };

    /**
     * ระดับความร้าแรงของ Error
     */
    static ErrorSeverity = {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    };

    /**
     * Error Messages ภาษาไทยและอังกฤษ
     */
    static ErrorMessages = {
        th: {
            VALIDATION_ERROR: 'ข้อมูลที่ป้อนไม่ถูกต้อง',
            AUTHENTICATION_ERROR: 'การยืนยันตัวตนไม่สำเร็จ',
            AUTHORIZATION_ERROR: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
            NETWORK_ERROR: 'เกิดปัญหาในการเชื่อมต่อเครือข่าย',
            DATABASE_ERROR: 'เกิดปัญหาในการเชื่อมต่อฐานข้อมูล',
            FILE_SYSTEM_ERROR: 'เกิดปัญหาในการอ่านเขียนไฟล์',
            QUIZ_GENERATION_ERROR: 'เกิดปัญหาในการสร้างแบบทดสอบ',
            AI_SERVICE_ERROR: 'เกิดปัญหาในการเชื่อมต่อระบบ AI',
            RATE_LIMIT_ERROR: 'การใช้งานเกินกำหนด กรุณารอสักครู่',
            SYSTEM_ERROR: 'เกิดปัญหาในระบบ',
            BUSINESS_LOGIC_ERROR: 'เกิดปัญหาในลอจิกการทำงาน',
            EXTERNAL_API_ERROR: 'เกิดปัญหาในการเชื่อมต่อบริการภายนอก',
            UNKNOWN_ERROR: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
        },
        en: {
            VALIDATION_ERROR: 'Invalid input data provided',
            AUTHENTICATION_ERROR: 'Authentication failed',
            AUTHORIZATION_ERROR: 'Access denied - insufficient permissions',
            NETWORK_ERROR: 'Network connection error',
            DATABASE_ERROR: 'Database connection error',
            FILE_SYSTEM_ERROR: 'File system operation error',
            QUIZ_GENERATION_ERROR: 'Quiz generation failed',
            AI_SERVICE_ERROR: 'AI service connection error',
            RATE_LIMIT_ERROR: 'Rate limit exceeded - please wait',
            SYSTEM_ERROR: 'System error occurred',
            BUSINESS_LOGIC_ERROR: 'Business logic error',
            EXTERNAL_API_ERROR: 'External API connection error',
            UNKNOWN_ERROR: 'Unknown error occurred'
        }
    };

    /**
     * สร้าง Custom Error Class
     */
    createCustomError(type, message, code = null, details = {}) {
        const error = new Error(message);
        error.type = type;
        error.code = code;
        error.details = details;
        error.timestamp = new Date().toISOString();
        error.severity = this.determineSeverity(type);
        return error;
    }

    /**
     * กำหนดระดับความร้าแรงของ Error
     */
    determineSeverity(errorType) {
        const severityMap = {
            [ErrorService.ErrorTypes.VALIDATION]: ErrorService.ErrorSeverity.LOW,
            [ErrorService.ErrorTypes.AUTHENTICATION]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.AUTHORIZATION]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.NETWORK]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.DATABASE]: ErrorService.ErrorSeverity.HIGH,
            [ErrorService.ErrorTypes.FILE_SYSTEM]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.QUIZ_GENERATION]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.AI_SERVICE]: ErrorService.ErrorSeverity.HIGH,
            [ErrorService.ErrorTypes.RATE_LIMIT]: ErrorService.ErrorSeverity.LOW,
            [ErrorService.ErrorTypes.SYSTEM]: ErrorService.ErrorSeverity.CRITICAL,
            [ErrorService.ErrorTypes.BUSINESS_LOGIC]: ErrorService.ErrorSeverity.MEDIUM,
            [ErrorService.ErrorTypes.EXTERNAL_API]: ErrorService.ErrorSeverity.MEDIUM
        };

        return severityMap[errorType] || ErrorService.ErrorSeverity.MEDIUM;
    }

    /**
     * จัดการ Error หลัก
     */
    handleError(error, context = {}, language = 'th') {
        const processedError = this.processError(error, context);
        this.logError(processedError, context);

        // ส่งการแจ้งเตือนสำหรับ Error ที่มีความร้าแรงสูง
        if (processedError.severity === ErrorService.ErrorSeverity.CRITICAL) {
            this.sendCriticalAlert(processedError);
        }

        return {
            success: false,
            error: {
                id: processedError.id,
                type: processedError.type,
                message: this.getLocalizedMessage(processedError.type, language),
                code: processedError.code,
                timestamp: processedError.timestamp,
                ...(this.isProduction ? {} : { details: processedError.details })
            }
        };
    }

    /**
     * ประมวลผล Error
     */
    processError(error, context) {
        const errorId = this.generateErrorId();

        let processedError = {
            id: errorId,
            type: error.type || ErrorService.ErrorTypes.SYSTEM,
            message: error.message,
            code: error.code,
            stack: error.stack,
            severity: error.severity || this.determineSeverity(error.type),
            timestamp: new Date().toISOString(),
            context: context,
            details: error.details || {}
        };

        // เพิ่มข้อมูลเพิ่มเติมสำหรับ Error บางประเภท
        if (error.type === ErrorService.ErrorTypes.NETWORK) {
            processedError.details.retryCount = context.retryCount || 0;
            processedError.details.url = context.url;
            processedError.details.method = context.method;
        }

        if (error.type === ErrorService.ErrorTypes.VALIDATION) {
            processedError.details.fieldErrors = context.fieldErrors || [];
            processedError.details.invalidFields = context.invalidFields || [];
        }

        return processedError;
    }

    /**
     * บันทึก Error Log
     */
    logError(error, context) {
        const logEntry = {
            ...error,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : context.userAgent,
            url: typeof window !== 'undefined' ? window.location.href : context.url,
            userId: context.userId,
            sessionId: context.sessionId,
            ip: context.ip
        };

        this.errorLogs.push(logEntry);

        // จำกัดขนาด Log
        if (this.errorLogs.length > this.maxLogSize) {
            this.errorLogs.shift();
        }

        // Log ไปยัง Console หรือ External Service
        this.writeLog(logEntry);
    }

    /**
     * เขียน Log
     */
    writeLog(logEntry) {
        if (this.isProduction) {
            // ส่งไปยัง External Logging Service (เช่น Winston, Bunyan, หรือ Cloud Logging)
            this.sendToExternalLogger(logEntry);
        } else {
            // Log ไปยัง Console ในโหมด Development
            console.error('Error Log:', {
                id: logEntry.id,
                type: logEntry.type,
                message: logEntry.message,
                severity: logEntry.severity,
                timestamp: logEntry.timestamp,
                context: logEntry.context
            });
        }
    }

    /**
     * ส่งไปยัง External Logger (ต้องปรับแต่งตาม Service ที่ใช้)
     */
    async sendToExternalLogger(logEntry) {
        try {
            // ตัวอย่าง: ส่งไปยัง API Endpoint สำหรับ Logging
            if (typeof fetch !== 'undefined') {
                await fetch('/api/logs/error', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(logEntry)
                });
            }
        } catch (err) {
            console.error('Failed to send log to external service:', err);
        }
    }

    /**
     * ส่งการแจ้งเตือนสำหรับ Critical Error
     */
    async sendCriticalAlert(error) {
        try {
            // ส่งการแจ้งเตือนไปยัง Admin หรือ DevOps Team
            const alertData = {
                type: 'CRITICAL_ERROR',
                errorId: error.id,
                errorType: error.type,
                message: error.message,
                timestamp: error.timestamp,
                context: error.context
            };

            // ตัวอย่าง: ส่งผ่าน Email, Slack, หรือ SMS
            await this.sendAlert(alertData);
        } catch (err) {
            console.error('Failed to send critical alert:', err);
        }
    }

    /**
     * ส่งการแจ้งเตือน
     */
    async sendAlert(alertData) {
        // ปรับแต่งตามระบบแจ้งเตือนที่ใช้
        if (typeof fetch !== 'undefined') {
            await fetch('/api/alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(alertData)
            });
        }
    }

    /**
     * ได้รับข้อความ Error ตามภาษา
     */
    getLocalizedMessage(errorType, language = 'th') {
        const messages = ErrorService.ErrorMessages[language] || ErrorService.ErrorMessages.th;
        return messages[errorType] || messages.UNKNOWN_ERROR;
    }

    /**
     * สร้าง Error ID
     */
    generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * ตั้งค่า Global Error Handlers
     */
    setupGlobalErrorHandlers() {
        if (typeof window !== 'undefined') {
            // สำหรับ Frontend
            window.addEventListener('error', (event) => {
                this.handleError(
                    this.createCustomError(
                        ErrorService.ErrorTypes.SYSTEM,
                        event.error?.message || 'Global error occurred',
                        null,
                        { filename: event.filename, lineno: event.lineno, colno: event.colno }
                    ),
                    { source: 'global_error_handler' }
                );
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleError(
                    this.createCustomError(
                        ErrorService.ErrorTypes.SYSTEM,
                        event.reason?.message || 'Unhandled promise rejection',
                        null,
                        { reason: event.reason }
                    ),
                    { source: 'unhandled_rejection' }
                );
            });
        } else {
            // สำหรับ Backend (Node.js)
            process.on('uncaughtException', (error) => {
                this.handleError(
                    this.createCustomError(
                        ErrorService.ErrorTypes.SYSTEM,
                        error.message,
                        null,
                        { stack: error.stack }
                    ),
                    { source: 'uncaught_exception' }
                );

                // ออกจากกระบวนการหลังจาก Log Error
                process.exit(1);
            });

            process.on('unhandledRejection', (reason, promise) => {
                this.handleError(
                    this.createCustomError(
                        ErrorService.ErrorTypes.SYSTEM,
                        reason?.message || 'Unhandled rejection',
                        null,
                        { reason, promise }
                    ),
                    { source: 'unhandled_rejection' }
                );
            });
        }
    }

    /**
     * เริ่มต้น Error Handlers สำหรับประเภทต่างๆ
     */
    initializeErrorHandlers() {
        // Validation Error Handler
        this.registerErrorHandler(ErrorService.ErrorTypes.VALIDATION, (error, context) => {
            return {
                shouldRetry: false,
                userMessage: this.getLocalizedMessage(error.type, context.language),
                actions: ['fix_input']
            };
        });

        // Network Error Handler
        this.registerErrorHandler(ErrorService.ErrorTypes.NETWORK, (error, context) => {
            const retryCount = context.retryCount || 0;
            return {
                shouldRetry: retryCount < 3,
                retryDelay: Math.pow(2, retryCount) * 1000, // Exponential backoff
                userMessage: this.getLocalizedMessage(error.type, context.language),
                actions: retryCount < 3 ? ['retry'] : ['contact_support']
            };
        });

        // Authentication Error Handler
        this.registerErrorHandler(ErrorService.ErrorTypes.AUTHENTICATION, (error, context) => {
            return {
                shouldRetry: false,
                userMessage: this.getLocalizedMessage(error.type, context.language),
                actions: ['redirect_login']
            };
        });

        // AI Service Error Handler
        this.registerErrorHandler(ErrorService.ErrorTypes.AI_SERVICE, (error, context) => {
            return {
                shouldRetry: true,
                retryDelay: 5000,
                userMessage: this.getLocalizedMessage(error.type, context.language),
                actions: ['fallback_method', 'retry']
            };
        });
    }

    /**
     * ลงทะเบียน Error Handler
     */
    registerErrorHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
    }

    /**
     * รับ Error Handler
     */
    getErrorHandler(errorType) {
        return this.errorHandlers.get(errorType);
    }

    /**
     * Retry Logic
     */
    async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (i === maxRetries) {
                    throw this.createCustomError(
                        error.type || ErrorService.ErrorTypes.SYSTEM,
                        `Operation failed after ${maxRetries} retries: ${error.message}`,
                        error.code,
                        { originalError: error, retryCount: i }
                    );
                }

                const delay = baseDelay * Math.pow(2, i); // Exponential backoff
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Sleep Function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ทำความสะอาด Error Logs
     */
    clearLogs() {
        this.errorLogs = [];
    }

    /**
     * รับ Error Logs
     */
    getLogs(limit = 50) {
        return this.errorLogs.slice(-limit);
    }

    /**
     * รับสถิติ Error
     */
    getErrorStats() {
        const stats = {
            total: this.errorLogs.length,
            byType: {},
            bySeverity: {},
            last24Hours: 0
        };

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        this.errorLogs.forEach(log => {
            // Count by type
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

            // Count by severity
            stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

            // Count last 24 hours
            if (new Date(log.timestamp) > oneDayAgo) {
                stats.last24Hours++;
            }
        });

        return stats;
    }

    /**
     * Wrapper Functions สำหรับ Error Types ต่างๆ
     */

    validationError(message, fieldErrors = [], code = 'VALIDATION_FAILED') {
        return this.createCustomError(
            ErrorService.ErrorTypes.VALIDATION,
            message,
            code,
            { fieldErrors }
        );
    }

    authenticationError(message = 'Authentication failed', code = 'AUTH_FAILED') {
        return this.createCustomError(
            ErrorService.ErrorTypes.AUTHENTICATION,
            message,
            code
        );
    }

    authorizationError(message = 'Access denied', code = 'ACCESS_DENIED') {
        return this.createCustomError(
            ErrorService.ErrorTypes.AUTHORIZATION,
            message,
            code
        );
    }

    networkError(message, url, method, code = 'NETWORK_ERROR') {
        return this.createCustomError(
            ErrorService.ErrorTypes.NETWORK,
            message,
            code,
            { url, method }
        );
    }

    databaseError(message, query, code = 'DB_ERROR') {
        return this.createCustomError(
            ErrorService.ErrorTypes.DATABASE,
            message,
            code,
            { query }
        );
    }

    quizGenerationError(message, quizData, code = 'QUIZ_GEN_ERROR') {
        return this.createCustomError(
            ErrorService.ErrorTypes.QUIZ_GENERATION,
            message,
            code,
            { quizData }
        );
    }

    aiServiceError(message, serviceEndpoint, code = 'AI_SERVICE_ERROR') {
        return this.createCustomError(
            ErrorService.ErrorTypes.AI_SERVICE,
            message,
            code,
            { serviceEndpoint }
        );
    }

    rateLimitError(message = 'Rate limit exceeded', limit, timeWindow, code = 'RATE_LIMIT') {
        return this.createCustomError(
            ErrorService.ErrorTypes.RATE_LIMIT,
            message,
            code,
            { limit, timeWindow }
        );
    }
}

// Singleton Pattern
const errorService = new ErrorService();

// Export สำหรับ Node.js และ Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorService, errorService };
} else if (typeof window !== 'undefined') {
    window.ErrorService = ErrorService;
    window.errorService = errorService;
}

export { ErrorService, errorService };