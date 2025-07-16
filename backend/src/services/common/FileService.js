// backend/src/services/common/FileService.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import logger from '../../utils/logger.js';
import { FileError } from '../../errors/CustomErrors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File Service
 * จัดการไฟล์ upload, extraction, และ validation
 */
export class FileService {
    constructor() {
        this.allowedMimeTypes = [
            'text/plain',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
        this.uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads');
    }

    /**
     * Validate uploaded file
     * @param {Object} file - Multer file object
     * @returns {Object} Validation result
     */
    async validateFile(file) {
        try {
            if (!file) {
                return {
                    isValid: false,
                    message: 'No file provided'
                };
            }

            // Check file size
            if (file.size > this.maxFileSize) {
                return {
                    isValid: false,
                    message: `File size exceeds limit. Maximum ${Math.round(this.maxFileSize / 1024 / 1024)}MB allowed.`
                };
            }

            // Check mime type
            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                return {
                    isValid: false,
                    message: `File type not allowed. Supported types: ${this.allowedMimeTypes.join(', ')}`
                };
            }

            // Check file extension
            const allowedExtensions = ['.txt', '.pdf', '.docx'];
            const fileExtension = path.extname(file.originalname).toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                return {
                    isValid: false,
                    message: `File extension not allowed. Supported extensions: ${allowedExtensions.join(', ')}`
                };
            }

            // Check if file exists and is readable
            try {
                await fs.access(file.path, fs.constants.R_OK);
            } catch (error) {
                return {
                    isValid: false,
                    message: 'File is not accessible'
                };
            }

            return {
                isValid: true,
                message: 'File validation passed'
            };

        } catch (error) {
            logger.error('File validation error:', {
                fileName: file?.originalname,
                error: error.message
            });

            return {
                isValid: false,
                message: 'File validation failed'
            };
        }
    }

    /**
     * Extract text from uploaded file
     * @param {Object} file - Multer file object
     * @returns {string} Extracted text
     */
    async extractTextFromFile(file) {
        try {
            const fileExtension = path.extname(file.originalname).toLowerCase();
            let extractedText = '';

            switch (fileExtension) {
                case '.txt':
                    extractedText = await this.extractFromTextFile(file.path);
                    break;
                case '.pdf':
                    extractedText = await this.extractFromPDF(file.path);
                    break;
                case '.docx':
                    extractedText = await this.extractFromDocx(file.path);
                    break;
                default:
                    throw new FileError(`Unsupported file type: ${fileExtension}`);
            }

            // Basic text cleaning
            extractedText = this.cleanExtractedText(extractedText);

            if (!extractedText || extractedText.trim().length < 10) {
                throw new FileError('Insufficient content in file');
            }

            logger.info('Text extracted successfully', {
                fileName: file.originalname,
                textLength: extractedText.length,
                fileType: fileExtension
            });

            return extractedText;

        } catch (error) {
            logger.error('Text extraction error:', {
                fileName: file?.originalname,
                error: error.message
            });

            if (error instanceof FileError) {
                throw error;
            }

            throw new FileError(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from plain text file
     * @param {string} filePath - File path
     * @returns {string} Extracted text
     */
    async extractFromTextFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return data;
        } catch (error) {
            throw new FileError(`Failed to read text file: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF file
     * @param {string} filePath - File path
     * @returns {string} Extracted text
     */
    async extractFromPDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } catch (error) {
            throw new FileError(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    /**
     * Extract text from DOCX file
     * @param {string} filePath - File path
     * @returns {string} Extracted text
     */
    async extractFromDocx(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error) {
            throw new FileError(`Failed to extract text from DOCX: ${error.message}`);
        }
    }

    /**
     * Clean extracted text
     * @param {string} text - Raw extracted text
     * @returns {string} Cleaned text
     */
    cleanExtractedText(text) {
        if (!text) return '';

        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove special characters that might interfere with AI processing
            .replace(/[^\w\s\u0E00-\u0E7F.,!?;:()\-]/g, '')
            // Trim whitespace
            .trim();
    }

    /**
     * Clean up uploaded file
     * @param {string} filePath - File path to delete
     * @returns {boolean} Success status
     */
    async cleanupFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.debug('File cleaned up successfully', { filePath });
            return true;
        } catch (error) {
            logger.error('File cleanup error:', {
                filePath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Save file to storage
     * @param {Object} file - Multer file object
     * @param {string} directory - Target directory
     * @returns {string} Saved file path
     */
    async saveFile(file, directory = 'documents') {
        try {
            const targetDir = path.join(this.uploadPath, directory);

            // Ensure directory exists
            await fs.mkdir(targetDir, { recursive: true });

            const fileName = `${Date.now()}-${file.originalname}`;
            const targetPath = path.join(targetDir, fileName);

            // Copy file to target location
            await fs.copyFile(file.path, targetPath);

            // Clean up temporary file
            await this.cleanupFile(file.path);

            logger.info('File saved successfully', {
                originalName: file.originalname,
                savedPath: targetPath
            });

            return targetPath;

        } catch (error) {
            logger.error('File save error:', {
                fileName: file?.originalname,
                error: error.message
            });

            throw new FileError(`Failed to save file: ${error.message}`);
        }
    }

    /**
     * Get file information
     * @param {string} filePath - File path
     * @returns {Object} File information
     */
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const extension = path.extname(filePath).toLowerCase();

            return {
                name: path.basename(filePath),
                path: filePath,
                size: stats.size,
                extension: extension,
                mimeType: this.getMimeType(extension),
                created: stats.birthtime,
                modified: stats.mtime,
                isReadable: await this.checkReadAccess(filePath)
            };

        } catch (error) {
            throw new FileError(`Failed to get file info: ${error.message}`);
        }
    }

    /**
     * Check file read access
     * @param {string} filePath - File path
     * @returns {boolean} Has read access
     */
    async checkReadAccess(filePath) {
        try {
            await fs.access(filePath, fs.constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get MIME type from extension
     * @param {string} extension - File extension
     * @returns {string} MIME type
     */
    getMimeType(extension) {
        const mimeTypes = {
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Health check for file service
     * @returns {Object} Health status
     */
    async healthCheck() {
        try {
            // Check if upload directory is accessible
            await fs.access(this.uploadPath, fs.constants.W_OK);

            // Check available disk space (simplified)
            const stats = await fs.stat(this.uploadPath);

            return {
                status: 'healthy',
                uploadPath: this.uploadPath,
                allowedTypes: this.allowedMimeTypes,
                maxFileSize: this.maxFileSize,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                uploadPath: this.uploadPath,
                timestamp: new Date().toISOString()
            };
        }
    }
}