// src/middlewares/validation/FileValidation.js
import multer from 'multer';
import path from 'path';

// กำหนดประเภทไฟล์ที่อนุญาต
const allowedFileTypes = {
    documents: ['.pdf', '.doc', '.docx', '.txt'],
    images: ['.jpg', '.jpeg', '.png', '.gif'],
    spreadsheets: ['.xlsx', '.xls', '.csv']
};

// กำหนดขนาดไฟล์สูงสุด (10MB)
const maxFileSize = 10 * 1024 * 1024;

// การตั้งค่า storage สำหรับ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
    }
});

// ฟังก์ชันตรวจสอบประเภทไฟล์
const fileFilter = (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allAllowedTypes = [
        ...allowedFileTypes.documents,
        ...allowedFileTypes.images,
        ...allowedFileTypes.spreadsheets
    ];

    if (allAllowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`ประเภทไฟล์ไม่ได้รับอนุญาต: ${fileExtension}. ไฟล์ที่อนุญาต: ${allAllowedTypes.join(', ')}`), false);
    }
};

// สร้าง multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: maxFileSize
    },
    fileFilter: fileFilter
});

// Middleware สำหรับการอัปโหลดไฟล์เดี่ยว
export const uploadSingleFile = (fieldName = 'file') => {
    return upload.single(fieldName);
};

// Middleware สำหรับการอัปโหลดไฟล์หลายไฟล์
export const uploadMultipleFiles = (fieldName = 'files', maxCount = 5) => {
    return upload.array(fieldName, maxCount);
};

// Middleware สำหรับตรวจสอบไฟล์หลังจากอัปโหลด
export const validateUploadedFile = (req, res, next) => {
    try {
        if (!req.file && !req.files) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบไฟล์ที่อัปโหลด'
            });
        }

        // ตรวจสอบไฟล์เดี่ยว
        if (req.file) {
            req.file.isValid = true;
            req.file.uploadTime = new Date();
        }

        // ตรวจสอบไฟล์หลายไฟล์
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                file.isValid = true;
                file.uploadTime = new Date();
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
            error: error.message
        });
    }
};

// Middleware สำหรับตรวจสอบไฟล์สำหรับการสร้างข้อสอบ
export const validateQuizFile = (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาอัปโหลดไฟล์เนื้อหาสำหรับสร้างข้อสอบ'
            });
        }

        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const supportedQuizFileTypes = ['.pdf', '.doc', '.docx', '.txt'];

        if (!supportedQuizFileTypes.includes(fileExtension)) {
            return res.status(400).json({
                success: false,
                message: `ประเภทไฟล์ไม่รองรับสำหรับการสร้างข้อสอบ. รองรับเฉพาะ: ${supportedQuizFileTypes.join(', ')}`
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์สำหรับข้อสอบ',
            error: error.message
        });
    }
};

// Error handler สำหรับ multer
export const multerErrorHandler = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: `ขนาดไฟล์เกินขีดจำกัด. ขนาดสูงสุด: ${maxFileSize / (1024 * 1024)}MB`
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'จำนวนไฟล์เกินขีดจำกัด'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'พบไฟล์ที่ไม่คาดหวัง'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
                });
        }
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
};

export default {
    uploadSingleFile,
    uploadMultipleFiles,
    validateUploadedFile,
    validateQuizFile,
    multerErrorHandler
};