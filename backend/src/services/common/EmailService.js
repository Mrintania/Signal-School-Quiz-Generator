// backend/src/services/common/EmailService.js
import nodemailer from 'nodemailer';
import logger from '../../utils/logger.js';

/**
 * Email Service
 * จัดการการส่งอีเมลแจ้งเตือนและการแชร์
 */
export class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.setupTransporter();
    }

    setupTransporter() {
        try {
            const emailConfig = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };

            if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
                this.transporter = nodemailer.createTransporter(emailConfig);
                this.isConfigured = true;
                logger.info('Email service configured successfully');
            } else {
                logger.warn('Email service not configured - missing environment variables');
            }

        } catch (error) {
            logger.error('Email service setup error:', error);
        }
    }

    /**
     * Send quiz share notification
     * @param {Object} data - Email data
     * @returns {boolean} Send success
     */
    async sendQuizShareNotification(data) {
        if (!this.isConfigured) {
            logger.warn('Email service not configured, skipping email send');
            return false;
        }

        try {
            const { recipient, sender, quiz, shareToken, permissions, message, expiresAt, isNewUser } = data;

            const subject = `ข้อสอบ "${quiz.title}" ถูกแชร์ให้กับคุณ`;

            const htmlBody = this.buildShareEmailTemplate({
                recipient,
                sender,
                quiz,
                shareToken,
                permissions,
                message,
                expiresAt,
                isNewUser
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: recipient.email,
                subject: subject,
                html: htmlBody
            };

            const result = await this.transporter.sendMail(mailOptions);

            logger.info('Quiz share email sent successfully', {
                to: recipient.email,
                messageId: result.messageId,
                quizTitle: quiz.title
            });

            return true;

        } catch (error) {
            logger.error('Email send error:', {
                to: data?.recipient?.email,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Build share email template
     * @param {Object} data - Template data
     * @returns {string} HTML email content
     */
    buildShareEmailTemplate(data) {
        const { recipient, sender, quiz, shareToken, permissions, message, expiresAt, isNewUser } = data;

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const quizUrl = `${baseUrl}/quiz/shared/${shareToken}`;
        const expiryText = expiresAt ? `ลิงก์นี้จะหมดอายุในวันที่ ${new Date(expiresAt).toLocaleDateString('th-TH')}` : '';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quiz Shared - Signal School</title>
    <style>
        body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .quiz-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .button:hover { background: #2980b9; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
        .message-box { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>โรงเรียนทหารสื่อสาร</h1>
            <p>Signal School Quiz Generator</p>
        </div>
        
        <div class="content">
            <h2>สวัสดี ${recipient.name}!</h2>
            
            <p><strong>${sender.name}</strong> ได้แชร์ข้อสอบให้กับคุณ</p>
            
            ${message ? `<div class="message-box"><strong>ข้อความจาก ${sender.name}:</strong><br>${message}</div>` : ''}
            
            <div class="quiz-info">
                <h3>${quiz.title}</h3>
                ${quiz.description ? `<p>${quiz.description}</p>` : ''}
                <p><strong>สิทธิ์การเข้าถึง:</strong> ${this.getPermissionText(permissions)}</p>
            </div>
            
            ${isNewUser ? `
            <div class="warning">
                <strong>หมายเหตุ:</strong> คุณยังไม่มีบัญชีผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งานข้อสอบ
            </div>
            ` : ''}
            
            <div style="text-align: center;">
                <a href="${quizUrl}" class="button">เข้าดูข้อสอบ</a>
            </div>
            
            ${expiryText ? `<p style="text-align: center; color: #e74c3c;"><small>${expiryText}</small></p>` : ''}
            
            <p>หากคุณไม่สามารถคลิกปุ่มได้ กรุณาคัดลอกลิงก์นี้ไปยังเบราว์เซอร์:</p>
            <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 4px;">${quizUrl}</p>
        </div>
        
        <div class="footer">
            <p>อีเมลนี้ส่งจากระบบ Quiz Generator ของโรงเรียนทหารสื่อสาร</p>
            <p>หากคุณไม่ต้องการรับอีเมลประเภทนี้ กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get permission text in Thai
     * @param {string} permission - Permission level
     * @returns {string} Thai permission text
     */
    getPermissionText(permission) {
        const permissions = {
            'view': 'ดูเท่านั้น',
            'edit': 'ดูและแก้ไข',
            'admin': 'ดู แก้ไข และจัดการ'
        };

        return permissions[permission] || 'ไม่ระบุ';
    }

    /**
     * Send password reset email
     * @param {Object} data - Reset data
     * @returns {boolean} Send success
     */
    async sendPasswordResetEmail(data) {
        if (!this.isConfigured) {
            logger.warn('Email service not configured, skipping password reset email');
            return false;
        }

        try {
            const { email, resetToken, userName } = data;
            const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: email,
                subject: 'รีเซ็ตรหัสผ่าน - โรงเรียนทหารสื่อสาร',
                html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>รีเซ็ตรหัสผ่าน</h2>
                <p>สวัสดี ${userName},</p>
                <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีในระบบ Quiz Generator</p>
                <p>กรุณาคลิกลิงก์ด้านล่างเพื่อสร้างรหัสผ่านใหม่:</p>
                <p><a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">รีเซ็ตรหัสผ่าน</a></p>
                <p>ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง</p>
                <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
            </div>
        </body>
        </html>`
            };

            await this.transporter.sendMail(mailOptions);

            logger.info('Password reset email sent', { email });
            return true;

        } catch (error) {
            logger.error('Password reset email error:', { email: data?.email, error: error.message });
            return false;
        }
    }

    /**
     * Test email configuration
     * @returns {Object} Test result
     */
    async testConnection() {
        if (!this.isConfigured) {
            return {
                success: false,
                message: 'Email service not configured'
            };
        }

        try {
            await this.transporter.verify();
            return {
                success: true,
                message: 'Email service connection successful'
            };
        } catch (error) {
            return {
                success: false,
                message: `Email service connection failed: ${error.message}`
            };
        }
    }

    /**
     * Health check for email service
     * @returns {Object} Health status
     */
    async healthCheck() {
        if (!this.isConfigured) {
            return {
                status: 'not_configured',
                message: 'Email service not configured'
            };
        }

        try {
            await this.transporter.verify();
            return {
                status: 'healthy',
                configured: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                configured: true,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export { CacheService, FileService, EmailService };