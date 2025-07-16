// backend/src/services/common/EmailService.js
import nodemailer from 'nodemailer';
import logger from '../../utils/common/Logger.js';
import { ExternalServiceError } from '../../errors/CustomErrors.js';

/**
 * Email Service
 * จัดการการส่งอีเมลสำหรับ application
 * รองรับ templates และการส่งอีเมลประเภทต่างๆ
 */
export class EmailService {
    constructor(config = {}) {
        this.config = {
            host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: config.port || process.env.SMTP_PORT || 587,
            secure: config.secure || process.env.SMTP_SECURE === 'true' || false,
            user: config.user || process.env.SMTP_USER,
            password: config.password || process.env.SMTP_PASSWORD,
            from: config.from || process.env.SMTP_FROM || 'Signal School Quiz Generator <noreply@signalschool.ac.th>',
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 2000,
            ...config
        };

        this.transporter = null;
        this.isInitialized = false;

        // Initialize transporter
        this.initialize();

        // Email templates
        this.templates = {
            welcome: this.getWelcomeTemplate(),
            quizShare: this.getQuizShareTemplate(),
            passwordReset: this.getPasswordResetTemplate(),
            accountActivation: this.getAccountActivationTemplate(),
            notification: this.getNotificationTemplate()
        };
    }

    /**
     * Initialize email transporter
     */
    async initialize() {
        try {
            if (!this.config.user || !this.config.password) {
                logger.warn('Email service not configured - missing credentials');
                return;
            }

            // Create transporter
            this.transporter = nodemailer.createTransporter({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: {
                    user: this.config.user,
                    pass: this.config.password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verify connection
            await this.verifyConnection();

            this.isInitialized = true;
            logger.info('Email service initialized successfully');

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'initializeEmailService',
                host: this.config.host,
                port: this.config.port
            });

            this.isInitialized = false;
        }
    }

    /**
     * Verify email connection
     */
    async verifyConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            await this.transporter.verify();
            return true;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'verifyEmailConnection'
            });
            throw new ExternalServiceError('Email service connection failed');
        }
    }

    /**
     * Send email with retry mechanism
     */
    async sendEmail(mailOptions) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.isInitialized) {
                throw new ExternalServiceError('Email service not available');
            }

            // Validate email options
            this.validateEmailOptions(mailOptions);

            // Prepare mail options
            const options = {
                from: mailOptions.from || this.config.from,
                to: mailOptions.to,
                subject: mailOptions.subject,
                text: mailOptions.text,
                html: mailOptions.html,
                attachments: mailOptions.attachments || []
            };

            // Send with retry
            const result = await this.sendWithRetry(options);

            logger.info('Email sent successfully', {
                to: options.to,
                subject: options.subject,
                messageId: result.messageId
            });

            return {
                success: true,
                messageId: result.messageId,
                response: result.response
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendEmail',
                to: mailOptions?.to,
                subject: mailOptions?.subject
            });

            throw new ExternalServiceError(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(userEmail, userData) {
        try {
            const { username, loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000' } = userData;

            const template = this.templates.welcome;
            const html = template.html
                .replace('{{username}}', username)
                .replace('{{loginUrl}}', loginUrl)
                .replace('{{supportEmail}}', this.config.from);

            const text = template.text
                .replace('{{username}}', username)
                .replace('{{loginUrl}}', loginUrl);

            return await this.sendEmail({
                to: userEmail,
                subject: template.subject,
                text,
                html
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendWelcomeEmail',
                userEmail,
                username: userData?.username
            });
            throw error;
        }
    }

    /**
     * Send quiz share notification
     */
    async sendQuizShareNotification(recipientEmail, shareData) {
        try {
            const {
                quizTitle,
                shareUrl,
                senderName,
                message = '',
                expiresAt
            } = shareData;

            const template = this.templates.quizShare;
            const html = template.html
                .replace('{{recipientEmail}}', recipientEmail)
                .replace('{{quizTitle}}', quizTitle)
                .replace('{{senderName}}', senderName)
                .replace('{{shareUrl}}', shareUrl)
                .replace('{{message}}', message)
                .replace('{{expiresAt}}', expiresAt ? new Date(expiresAt).toLocaleDateString('th-TH') : 'ไม่หมดอายุ');

            const text = template.text
                .replace('{{quizTitle}}', quizTitle)
                .replace('{{senderName}}', senderName)
                .replace('{{shareUrl}}', shareUrl)
                .replace('{{message}}', message);

            return await this.sendEmail({
                to: recipientEmail,
                subject: template.subject.replace('{{quizTitle}}', quizTitle),
                text,
                html
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendQuizShareNotification',
                recipientEmail,
                quizTitle: shareData?.quizTitle
            });
            throw error;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(userEmail, resetData) {
        try {
            const {
                username,
                resetUrl,
                expiresIn = '1 hour'
            } = resetData;

            const template = this.templates.passwordReset;
            const html = template.html
                .replace('{{username}}', username)
                .replace('{{resetUrl}}', resetUrl)
                .replace('{{expiresIn}}', expiresIn)
                .replace('{{supportEmail}}', this.config.from);

            const text = template.text
                .replace('{{username}}', username)
                .replace('{{resetUrl}}', resetUrl)
                .replace('{{expiresIn}}', expiresIn);

            return await this.sendEmail({
                to: userEmail,
                subject: template.subject,
                text,
                html
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendPasswordResetEmail',
                userEmail,
                username: resetData?.username
            });
            throw error;
        }
    }

    /**
     * Send account activation email
     */
    async sendAccountActivationEmail(userEmail, activationData) {
        try {
            const {
                username,
                activationUrl,
                expiresIn = '24 hours'
            } = activationData;

            const template = this.templates.accountActivation;
            const html = template.html
                .replace('{{username}}', username)
                .replace('{{activationUrl}}', activationUrl)
                .replace('{{expiresIn}}', expiresIn)
                .replace('{{supportEmail}}', this.config.from);

            const text = template.text
                .replace('{{username}}', username)
                .replace('{{activationUrl}}', activationUrl)
                .replace('{{expiresIn}}', expiresIn);

            return await this.sendEmail({
                to: userEmail,
                subject: template.subject,
                text,
                html
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendAccountActivationEmail',
                userEmail,
                username: activationData?.username
            });
            throw error;
        }
    }

    /**
     * Send general notification email
     */
    async sendNotificationEmail(userEmail, notificationData) {
        try {
            const {
                title,
                message,
                actionUrl = null,
                actionText = 'ดูรายละเอียด',
                priority = 'normal'
            } = notificationData;

            const template = this.templates.notification;
            let html = template.html
                .replace('{{title}}', title)
                .replace('{{message}}', message);

            let text = template.text
                .replace('{{title}}', title)
                .replace('{{message}}', message);

            // Add action button if URL is provided
            if (actionUrl) {
                const actionButton = `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${actionUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${actionText}</a>
                </div>`;

                html = html.replace('{{actionButton}}', actionButton);
                text += `\n\n${actionText}: ${actionUrl}`;
            } else {
                html = html.replace('{{actionButton}}', '');
            }

            // Set priority
            const mailOptions = {
                to: userEmail,
                subject: template.subject.replace('{{title}}', title),
                text,
                html
            };

            if (priority === 'high') {
                mailOptions.priority = 'high';
                mailOptions.headers = { 'X-Priority': '1' };
            }

            return await this.sendEmail(mailOptions);

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendNotificationEmail',
                userEmail,
                title: notificationData?.title
            });
            throw error;
        }
    }

    /**
     * Send bulk emails
     */
    async sendBulkEmails(emailList, templateData, templateType = 'notification') {
        try {
            if (!Array.isArray(emailList) || emailList.length === 0) {
                throw new Error('Email list is required');
            }

            const results = [];
            const batchSize = 10; // Send emails in batches to avoid overwhelming SMTP server

            for (let i = 0; i < emailList.length; i += batchSize) {
                const batch = emailList.slice(i, i + batchSize);
                const batchPromises = batch.map(async (email) => {
                    try {
                        let result;

                        switch (templateType) {
                            case 'welcome':
                                result = await this.sendWelcomeEmail(email, templateData);
                                break;
                            case 'notification':
                                result = await this.sendNotificationEmail(email, templateData);
                                break;
                            case 'quizShare':
                                result = await this.sendQuizShareNotification(email, templateData);
                                break;
                            default:
                                throw new Error(`Unknown template type: ${templateType}`);
                        }

                        return { email, success: true, result };

                    } catch (error) {
                        logger.errorWithContext(error, {
                            operation: 'sendBulkEmails',
                            email,
                            templateType
                        });

                        return { email, success: false, error: error.message };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Add delay between batches
                if (i + batchSize < emailList.length) {
                    await this.delay(1000); // 1 second delay
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info('Bulk email sending completed', {
                total: emailList.length,
                successful,
                failed,
                templateType
            });

            return {
                total: emailList.length,
                successful,
                failed,
                results
            };

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'sendBulkEmails',
                emailCount: emailList?.length,
                templateType
            });
            throw error;
        }
    }

    /**
     * Get email queue status (if using queue system)
     */
    getQueueStatus() {
        return {
            isInitialized: this.isInitialized,
            config: {
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                from: this.config.from
            },
            templates: Object.keys(this.templates)
        };
    }

    /**
     * Private helper methods
     */

    /**
     * Send email with retry mechanism
     */
    async sendWithRetry(options, attempt = 1) {
        try {
            return await this.transporter.sendMail(options);

        } catch (error) {
            if (attempt < this.config.retryAttempts) {
                logger.warn(`Email sending failed (attempt ${attempt}), retrying...`, {
                    error: error.message,
                    attempt,
                    maxAttempts: this.config.retryAttempts
                });

                await this.delay(this.config.retryDelay * attempt);
                return this.sendWithRetry(options, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Validate email options
     */
    validateEmailOptions(options) {
        if (!options.to) {
            throw new Error('Recipient email is required');
        }

        if (!options.subject) {
            throw new Error('Email subject is required');
        }

        if (!options.text && !options.html) {
            throw new Error('Email content (text or html) is required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const recipients = Array.isArray(options.to) ? options.to : [options.to];

        recipients.forEach(email => {
            if (!emailRegex.test(email)) {
                throw new Error(`Invalid email format: ${email}`);
            }
        });
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Email Templates
     */

    getWelcomeTemplate() {
        return {
            subject: 'ยินดีต้อนรับสู่ระบบสร้างข้อสอบ โรงเรียนทหารสื่อสาร',
            text: `
สวัสดี {{username}},

ยินดีต้อนรับสู่ระบบสร้างข้อสอบของโรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร

คุณสามารถเข้าสู่ระบบได้ที่: {{loginUrl}}

หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมสนับสนุน

ขอบคุณครับ
ทีมพัฒนาระบบ โรงเรียนทหารสื่อสาร
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to Signal School Quiz Generator</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563EB;">โรงเรียนทหารสื่อสาร</h1>
            <h2 style="color: #64748B;">ระบบสร้างข้อสอบ</h2>
        </div>
        
        <div style="background-color: #F8FAFC; padding: 30px; border-radius: 8px; border-left: 4px solid #2563EB;">
            <h3>สวัสดี {{username}},</h3>
            
            <p>ยินดีต้อนรับสู่ระบบสร้างข้อสอบของโรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร</p>
            
            <p>ระบบของเราจะช่วยให้คุณสามารถ:</p>
            <ul>
                <li>สร้างข้อสอบด้วย AI อัตโนมัติ</li>
                <li>จัดการและแก้ไขข้อสอบ</li>
                <li>ส่งออกข้อสอบในรูปแบบต่างๆ</li>
                <li>แชร์ข้อสอบกับเพื่อนร่วมงาน</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{loginUrl}}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">เข้าสู่ระบบ</a>
            </div>
            
            <p style="font-size: 14px; color: #64748B;">
                หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อ {{supportEmail}}
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94A3B8;">
            <p>ขอบคุณครับ<br>ทีมพัฒนาระบบ โรงเรียนทหารสื่อสาร</p>
        </div>
    </div>
</body>
</html>
            `.trim()
        };
    }

    getQuizShareTemplate() {
        return {
            subject: 'มีคนแชร์ข้อสอบ "{{quizTitle}}" ให้คุณ',
            text: `
{{senderName}} ได้แชร์ข้อสอบ "{{quizTitle}}" ให้คุณ

{{message}}

เข้าดูข้อสอบได้ที่: {{shareUrl}}

ข้อสอบนี้หมดอายุ: {{expiresAt}}
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quiz Shared</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #F0F9FF; padding: 30px; border-radius: 8px; border-left: 4px solid #0EA5E9;">
            <h3 style="color: #0EA5E9;">มีคนแชร์ข้อสอบให้คุณ!</h3>
            
            <p><strong>{{senderName}}</strong> ได้แชร์ข้อสอบ "<strong>{{quizTitle}}</strong>" ให้คุณ</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="font-style: italic; color: #64748B;">{{message}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{shareUrl}}" style="background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">เข้าดูข้อสอบ</a>
            </div>
            
            <p style="font-size: 14px; color: #64748B;">
                ข้อสอบนี้หมดอายุ: {{expiresAt}}
            </p>
        </div>
    </div>
</body>
</html>
            `.trim()
        };
    }

    getPasswordResetTemplate() {
        return {
            subject: 'รีเซ็ตรหัสผ่าน - โรงเรียนทหารสื่อสาร',
            text: `
สวัสดี {{username}},

คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ

กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:
{{resetUrl}}

ลิงก์นี้จะหมดอายุใน {{expiresIn}}

หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #FEF3F2; padding: 30px; border-radius: 8px; border-left: 4px solid #EF4444;">
            <h3 style="color: #EF4444;">รีเซ็ตรหัสผ่าน</h3>
            
            <p>สวัสดี <strong>{{username}}</strong>,</p>
            
            <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">รีเซ็ตรหัสผ่าน</a>
            </div>
            
            <p style="font-size: 14px; color: #64748B;">
                ลิงก์นี้จะหมดอายุใน {{expiresIn}}
            </p>
            
            <p style="font-size: 14px; color: #64748B;">
                หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้ หรือติดต่อ {{supportEmail}}
            </p>
        </div>
    </div>
</body>
</html>
            `.trim()
        };
    }

    getAccountActivationTemplate() {
        return {
            subject: 'ยืนยันบัญชีผู้ใช้ - โรงเรียนทหารสื่อสาร',
            text: `
สวัสดี {{username}},

กรุณายืนยันบัญชีผู้ใช้ของคุณโดยคลิกลิงก์ด้านล่าง:
{{activationUrl}}

ลิงก์นี้จะหมดอายุใน {{expiresIn}}
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Activation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #F0FDF4; padding: 30px; border-radius: 8px; border-left: 4px solid #22C55E;">
            <h3 style="color: #22C55E;">ยืนยันบัญชีผู้ใช้</h3>
            
            <p>สวัสดี <strong>{{username}}</strong>,</p>
            
            <p>กรุณายืนยันบัญชีผู้ใช้ของคุณเพื่อเริ่มใช้งานระบบ</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{activationUrl}}" style="background-color: #22C55E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">ยืนยันบัญชี</a>
            </div>
            
            <p style="font-size: 14px; color: #64748B;">
                ลิงก์นี้จะหมดอายุใน {{expiresIn}}
            </p>
            
            <p style="font-size: 14px; color: #64748B;">
                หากมีปัญหา กรุณาติดต่อ {{supportEmail}}
            </p>
        </div>
    </div>
</body>
</html>
            `.trim()
        };
    }

    getNotificationTemplate() {
        return {
            subject: 'แจ้งเตือน: {{title}}',
            text: `
{{title}}

{{message}}
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #F8FAFC; padding: 30px; border-radius: 8px; border-left: 4px solid #6366F1;">
            <h3 style="color: #6366F1;">{{title}}</h3>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px;">
                {{message}}
            </div>
            
            {{actionButton}}
        </div>
    </div>
</body>
</html>
            `.trim()
        };
    }
}

export default EmailService;