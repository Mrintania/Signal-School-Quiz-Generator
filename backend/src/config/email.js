// backend/src/config/email.js
/**
 * Email Configuration
 * การตั้งค่าระบบอีเมล
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Email Configuration Object
 */
const emailConfig = {
    // Email service enabled/disabled
    enabled: process.env.EMAIL_ENABLED === 'true',
    
    // Default from address
    from: process.env.EMAIL_FROM || 'Signal School Quiz Generator <no-reply@signalschool.army.mi.th>',
    
    // SMTP Configuration for Production
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        },
        tls: {
            rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
    },
    
    // Development SMTP (for testing)
    devSmtp: {
        host: process.env.DEV_SMTP_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.DEV_SMTP_PORT) || 2525,
        auth: {
            user: process.env.DEV_SMTP_USER || '',
            pass: process.env.DEV_SMTP_PASS || ''
        }
    },
    
    // Email templates configuration
    templates: {
        directory: './src/templates/email',
        engine: 'handlebars',
        defaultLayout: 'main',
        
        // Template definitions
        welcome: {
            subject: 'ยินดีต้อนรับสู่ระบบสร้างข้อสอบ โรงเรียนทหารสื่อสาร',
            template: 'welcome'
        },
        
        passwordReset: {
            subject: 'ขอรีเซ็ตรหัสผ่าน - ระบบสร้างข้อสอบ',
            template: 'password-reset'
        },
        
        quizCreated: {
            subject: 'ข้อสอบใหม่ถูกสร้างเรียบร้อยแล้ว',
            template: 'quiz-created'
        },
        
        quizShared: {
            subject: 'มีข้อสอบถูกแชร์ให้คุณ',
            template: 'quiz-shared'
        },
        
        userInvitation: {
            subject: 'คำเชิญเข้าร่วมระบบสร้างข้อสอบ',
            template: 'user-invitation'
        },
        
        accountActivation: {
            subject: 'ยืนยันบัญชีผู้ใช้งาน',
            template: 'account-activation'
        }
    },
    
    // Queue configuration for email sending
    queue: {
        enabled: process.env.EMAIL_QUEUE_ENABLED === 'true',
        concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY) || 5,
        retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3,
        retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY) || 5000 // 5 seconds
    },
    
    // Rate limiting for email sending
    rateLimit: {
        enabled: process.env.EMAIL_RATE_LIMIT_ENABLED === 'true',
        maxEmails: parseInt(process.env.EMAIL_MAX_EMAILS) || 100,
        timeWindow: parseInt(process.env.EMAIL_TIME_WINDOW) || 3600000 // 1 hour in ms
    },
    
    // Email notification settings
    notifications: {
        // Admin notifications
        admin: {
            enabled: process.env.ADMIN_EMAIL_NOTIFICATIONS === 'true',
            emails: (process.env.ADMIN_EMAILS || '').split(',').filter(email => email.trim()),
            events: [
                'user_registration',
                'quiz_creation',
                'system_error',
                'security_alert'
            ]
        },
        
        // User notifications
        user: {
            welcomeEmail: process.env.USER_WELCOME_EMAIL === 'true',
            quizNotifications: process.env.USER_QUIZ_NOTIFICATIONS === 'true',
            weeklyDigest: process.env.USER_WEEKLY_DIGEST === 'true',
            securityAlerts: process.env.USER_SECURITY_ALERTS === 'true'
        }
    },
    
    // Email content settings
    content: {
        // Footer content
        footer: {
            organization: 'โรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร',
            address: 'ค่ายนวมินทราชินี กรุงเทพมหานคร',
            website: 'https://signalschool.army.mi.th',
            unsubscribeText: 'หากต้องการยกเลิกการรับอีเมล กรุณาติดต่อผู้ดูแลระบบ'
        },
        
        // Branding
        branding: {
            logo: process.env.EMAIL_LOGO_URL || '',
            primaryColor: '#1f2937',
            secondaryColor: '#059669',
            fontFamily: 'Arial, sans-serif'
        }
    },
    
    // Tracking and analytics
    tracking: {
        enabled: process.env.EMAIL_TRACKING_ENABLED === 'true',
        openTracking: process.env.EMAIL_OPEN_TRACKING === 'true',
        clickTracking: process.env.EMAIL_CLICK_TRACKING === 'true',
        unsubscribeTracking: process.env.EMAIL_UNSUBSCRIBE_TRACKING === 'true'
    },
    
    // Testing and development
    testing: {
        // Test email recipient for development
        testRecipient: process.env.EMAIL_TEST_RECIPIENT || 'test@example.com',
        
        // Preview emails in browser (development only)
        previewEnabled: process.env.NODE_ENV === 'development',
        previewPort: parseInt(process.env.EMAIL_PREVIEW_PORT) || 3001
    }
};

export default emailConfig;