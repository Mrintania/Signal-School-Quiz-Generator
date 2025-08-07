// backend/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');
const logger = require('../utils/logger');

/**
 * Middleware สำหรับการอัปโหลดไฟล์
 */

// สร้างโฟลเดอร์อัปโหลดถ้ายังไม่มี
const uploadDir = config.upload.uploadPath || './uploads/documents';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนดการเก็บไฟล์
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        
        // ทำความสะอาดชื่อไฟล์
        const cleanBasename = basename.replace(/[^a-zA-Z0-9ก-ฮเ-๏]/g, '_');
        const filename = `${cleanBasename}_${uniqueSuffix}${ext}`;
        
        cb(null, filename);
    }
});

// ฟังก์ชันกรองไฟล์
const fileFilter = (req, file, cb) => {
    const allowedTypes = config.upload.allowedTypes;
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(`File type ${file.mimetype} is not allowed`);
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// สร้าง multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.upload.maxFileSize,
        files: 1 // จำกัด 1 ไฟล์ต่อครั้ง
    },
    fileFilter: fileFilter
});

/**
 * Middleware สำหรับจัดการ error ของการอัปโหลด
 */
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        logger.error('Multer upload error', {
            error: error.message,
            code: error.code,
            field: error.field,
            userId: req.user?.id,
            ip: req.ip
        });

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'ขนาดไฟล์เกินกำหนด',
                    error: 'FILE_TOO_LARGE',
                    maxSize: config.upload.maxFileSize
                });
            
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'จำนวนไฟล์เกินกำหนด',
                    error: 'TOO_MANY_FILES'
                });
            
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'ฟิลด์ไฟล์ไม่ถูกต้อง',
                    error: 'UNEXPECTED_FILE_FIELD'
                });
            
            default:
                return res.status(400).json({
                    success: false,
                    message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
                    error: 'UPLOAD_ERROR'
                });
        }
    }

    if (error.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
            success: false,
            message: 'ประเภทไฟล์ไม่ได้รับอนุญาต',
            error: 'INVALID_FILE_TYPE',
            allowedTypes: config.upload.allowedTypes
        });
    }

    next(error);
};

/**
 * Middleware สำหรับ log การอัปโหลด
 */
const logUpload = (req, res, next) => {
    if (req.file) {
        logger.logFileUpload(
            req.file.originalname,
            req.file.size,
            req.file.mimetype,
            req.user?.id,
            true
        );
    }
    next();
};

/**
 * ฟังก์ชันลบไฟล์
 */
const deleteFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            logger.info('File deleted successfully', { filePath });
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to delete file', {
            error: error.message,
            filePath
        });
        return false;
    }
};

/**
 * ฟังก์ชันตรวจสอบไฟล์
 */
const validateFile = (file) => {
    if (!file) {
        return {
            valid: false,
            error: 'NO_FILE_UPLOADED'
        };
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > config.upload.maxFileSize) {
        return {
            valid: false,
            error: 'FILE_TOO_LARGE'
        };
    }

    // ตรวจสอบประเภทไฟล์
    if (!config.upload.allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'INVALID_FILE_TYPE'
        };
    }

    return { valid: true };
};

/**
 * Middleware สำหรับทำความสะอาดไฟล์เก่า
 */
const cleanupOldFiles = async (maxAge = 24 * 60 * 60 * 1000) => { // 24 ชั่วโมง
    try {
        const files = await fs.promises.readdir(uploadDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = await fs.promises.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                await deleteFile(filePath);
                logger.info('Old file cleaned up', { file });
            }
        }
    } catch (error) {
        logger.error('Failed to cleanup old files', {
            error: error.message
        });
    }
};

// สร้าง middleware ที่พร้อมใช้งาน
const uploadSingle = (fieldName = 'file') => {
    return [
        upload.single(fieldName),
        handleUploadError,
        logUpload
    ];
};

const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
    return [
        upload.array(fieldName, maxCount),
        handleUploadError,
        logUpload
    ];
};

const uploadFields = (fields) => {
    return [
        upload.fields(fields),
        handleUploadError,
        logUpload
    ];
};

// เริ่มการทำความสะอาดไฟล์เก่าทุก ๆ 6 ชั่วโมง
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        cleanupOldFiles();
    }, 6 * 60 * 60 * 1000);
}

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadFields,
    handleUploadError,
    logUpload,
    validateFile,
    deleteFile,
    cleanupOldFiles,
    // Export default upload.single สำหรับใช้งานง่าย
    single: upload.single.bind(upload),
    array: upload.array.bind(upload),
    fields: upload.fields.bind(upload)
};