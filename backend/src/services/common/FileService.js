// backend/src/services/common/FileService.js
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { PDFExtract } from 'pdf.js-extract';
import logger from '../../utils/common/Logger.js';
import { FileOperationError, ValidationError } from '../../errors/CustomErrors.js';

/**
 * File Service
 * จัดการการประมวลผลไฟล์ต่างๆ
 * รองรับ PDF, DOC, DOCX, TXT
 */
export class FileService {
    constructor(config = {}) {
        this.config = {
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            supportedTypes: config.supportedTypes || [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/csv'
            ],
            tempDir: config.tempDir || './temp',
            encoding: config.encoding || 'utf8',
            ...config
        };

        // Initialize temp directory
        this.initializeTempDirectory();
    }

    /**
     * Initialize temporary directory
     */
    async initializeTempDirectory() {
        try {
            await fs.mkdir(this.config.tempDir, { recursive: true });
            logger.info('Temp directory initialized:', { dir: this.config.tempDir });
        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'initializeTempDirectory',
                tempDir: this.config.tempDir
            });
        }
    }

    /**
     * Extract text from uploaded file
     */
    async extractText(file) {
        try {
            // Validate file
            this.validateFile(file);

            logger.info('Starting text extraction:', {
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            });

            let extractedText;

            // Extract based on file type
            switch (file.mimetype) {
                case 'application/pdf':
                    extractedText = await this.extractFromPDF(file);
                    break;

                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    extractedText = await this.extractFromWord(file);
                    break;

                case 'text/plain':
                case 'text/csv':
                    extractedText = await this.extractFromText(file);
                    break;

                default:
                    throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
            }

            // Clean and validate extracted text
            const cleanedText = this.cleanExtractedText(extractedText);

            logger.info('Text extraction completed:', {
                fileName: file.originalname,
                originalLength: extractedText.length,
                cleanedLength: cleanedText.length
            });

            return cleanedText;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'extractText',
                fileName: file?.originalname,
                fileSize: file?.size
            });

            throw new FileOperationError(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF file
     */
    async extractFromPDF(file) {
        try {
            const pdfExtract = new PDFExtract();

            return new Promise((resolve, reject) => {
                pdfExtract.extract(file.path || file.buffer, {}, (error, data) => {
                    if (error) {
                        reject(new FileOperationError(`PDF extraction failed: ${error.message}`));
                        return;
                    }

                    try {
                        let text = '';

                        if (data && data.pages) {
                            data.pages.forEach(page => {
                                if (page.content) {
                                    page.content.forEach(item => {
                                        if (item.str && item.str.trim()) {
                                            text += item.str + ' ';
                                        }
                                    });
                                }
                            });
                        }

                        if (text.trim().length === 0) {
                            reject(new FileOperationError('No text content found in PDF'));
                            return;
                        }

                        resolve(text.trim());

                    } catch (processingError) {
                        reject(new FileOperationError(`PDF processing error: ${processingError.message}`));
                    }
                });
            });

        } catch (error) {
            throw new FileOperationError(`PDF extraction error: ${error.message}`);
        }
    }

    /**
     * Extract text from Word document (DOC/DOCX)
     */
    async extractFromWord(file) {
        try {
            let buffer;

            // Get file buffer
            if (file.buffer) {
                buffer = file.buffer;
            } else if (file.path) {
                buffer = await fs.readFile(file.path);
            } else {
                throw new FileOperationError('No file data available');
            }

            // Extract text using mammoth
            const result = await mammoth.extractRawText({ buffer });

            if (!result.value || result.value.trim().length === 0) {
                throw new FileOperationError('No text content found in Word document');
            }

            // Log any warnings
            if (result.messages && result.messages.length > 0) {
                logger.warn('Word extraction warnings:', {
                    messages: result.messages.map(msg => msg.message)
                });
            }

            return result.value;

        } catch (error) {
            throw new FileOperationError(`Word extraction error: ${error.message}`);
        }
    }

    /**
     * Extract text from plain text file
     */
    async extractFromText(file) {
        try {
            let text;

            // Read file content
            if (file.buffer) {
                text = file.buffer.toString(this.config.encoding);
            } else if (file.path) {
                text = await fs.readFile(file.path, this.config.encoding);
            } else {
                throw new FileOperationError('No file data available');
            }

            if (!text || text.trim().length === 0) {
                throw new FileOperationError('Text file is empty');
            }

            return text;

        } catch (error) {
            if (error instanceof FileOperationError) {
                throw error;
            }
            throw new FileOperationError(`Text extraction error: ${error.message}`);
        }
    }

    /**
     * Clean extracted text
     */
    cleanExtractedText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove special characters that might cause issues
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Remove multiple line breaks
            .replace(/\n\s*\n/g, '\n')
            // Trim
            .trim();
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        if (!file) {
            throw new ValidationError('No file provided');
        }

        // Check file size
        if (file.size > this.config.maxFileSize) {
            throw new ValidationError(
                `File size too large. Maximum size is ${this.config.maxFileSize / (1024 * 1024)}MB`
            );
        }

        // Check file type
        if (!this.config.supportedTypes.includes(file.mimetype)) {
            throw new ValidationError(
                `Unsupported file type: ${file.mimetype}. Supported types: ${this.config.supportedTypes.join(', ')}`
            );
        }

        // Check if file has content
        if (file.size === 0) {
            throw new ValidationError('File is empty');
        }
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }

        return path.extname(filename).toLowerCase().substring(1);
    }

    /**
     * Generate safe filename
     */
    generateSafeFilename(originalName, prefix = '') {
        const ext = this.getFileExtension(originalName);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);

        const safeName = originalName
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 50);

        return `${prefix}${timestamp}_${random}_${safeName}${ext ? '.' + ext : ''}`;
    }

    /**
     * Save file to temporary directory
     */
    async saveToTemp(file, customName = null) {
        try {
            const filename = customName || this.generateSafeFilename(file.originalname, 'temp_');
            const tempPath = path.join(this.config.tempDir, filename);

            // Ensure temp directory exists
            await fs.mkdir(path.dirname(tempPath), { recursive: true });

            // Save file
            if (file.buffer) {
                await fs.writeFile(tempPath, file.buffer);
            } else if (file.path) {
                await fs.copyFile(file.path, tempPath);
            } else {
                throw new FileOperationError('No file data to save');
            }

            logger.info('File saved to temp:', {
                originalName: file.originalname,
                tempPath,
                size: file.size
            });

            return tempPath;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'saveToTemp',
                fileName: file?.originalname
            });

            throw new FileOperationError(`Failed to save file to temp: ${error.message}`);
        }
    }

    /**
     * Clean up temporary file
     */
    async cleanupTempFile(filePath) {
        try {
            if (!filePath) {
                return;
            }

            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                // File doesn't exist, nothing to clean up
                return;
            }

            // Delete file
            await fs.unlink(filePath);

            logger.debug('Temp file cleaned up:', { filePath });

        } catch (error) {
            logger.warn('Failed to cleanup temp file:', {
                filePath,
                error: error.message
            });
        }
    }

    /**
     * Clean up old temporary files
     */
    async cleanupOldTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        try {
            const files = await fs.readdir(this.config.tempDir);
            const now = Date.now();
            let cleanedCount = 0;

            for (const file of files) {
                try {
                    const filePath = path.join(this.config.tempDir, file);
                    const stats = await fs.stat(filePath);

                    // Check if file is older than maxAge
                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.unlink(filePath);
                        cleanedCount++;
                    }
                } catch (error) {
                    logger.warn('Failed to process temp file:', {
                        file,
                        error: error.message
                    });
                }
            }

            logger.info('Temp file cleanup completed:', {
                cleanedCount,
                totalFiles: files.length
            });

            return cleanedCount;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cleanupOldTempFiles',
                tempDir: this.config.tempDir
            });

            return 0;
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(file) {
        try {
            const metadata = {
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                extension: this.getFileExtension(file.originalname),
                isSupported: this.config.supportedTypes.includes(file.mimetype),
                uploadedAt: new Date().toISOString()
            };

            // Add file stats if path exists
            if (file.path) {
                try {
                    const stats = await fs.stat(file.path);
                    metadata.lastModified = stats.mtime.toISOString();
                    metadata.created = stats.birthtime.toISOString();
                } catch (statError) {
                    logger.warn('Failed to get file stats:', {
                        path: file.path,
                        error: statError.message
                    });
                }
            }

            return metadata;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'getFileMetadata',
                fileName: file?.originalname
            });

            throw new FileOperationError(`Failed to get file metadata: ${error.message}`);
        }
    }

    /**
     * Check file encoding
     */
    async detectEncoding(filePath) {
        try {
            // Read first chunk of file
            const buffer = await fs.readFile(filePath);
            const firstChunk = buffer.slice(0, 1024);

            // Simple encoding detection
            if (firstChunk.includes(0xEF) && firstChunk.includes(0xBB) && firstChunk.includes(0xBF)) {
                return 'utf8'; // UTF-8 BOM
            }

            if (firstChunk.includes(0xFF) && firstChunk.includes(0xFE)) {
                return 'utf16le'; // UTF-16 LE BOM
            }

            if (firstChunk.includes(0xFE) && firstChunk.includes(0xFF)) {
                return 'utf16be'; // UTF-16 BE BOM
            }

            // Default to UTF-8
            return 'utf8';

        } catch (error) {
            logger.warn('Failed to detect encoding:', {
                filePath,
                error: error.message
            });

            return 'utf8'; // Default fallback
        }
    }

    /**
     * Create file processing summary
     */
    createProcessingSummary(file, extractedText, processingTime) {
        return {
            file: {
                name: file.originalname,
                size: file.size,
                type: file.mimetype,
                extension: this.getFileExtension(file.originalname)
            },
            extraction: {
                textLength: extractedText.length,
                wordCount: extractedText.split(/\s+/).length,
                processingTime: `${processingTime}ms`,
                success: true
            },
            timestamp: new Date().toISOString()
        };
    }
}

export default FileService;