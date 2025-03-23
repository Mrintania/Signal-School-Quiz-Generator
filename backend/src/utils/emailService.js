// backend/src/utils/emailService.js
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Create email transporter based on environment
const createTransporter = () => {
  // For production, use actual SMTP settings
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  
  // For development, use testing account or log emails
  if (process.env.DEV_SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.DEV_SMTP_HOST,
      port: process.env.DEV_SMTP_PORT || 587,
      secure: process.env.DEV_SMTP_SECURE === 'true',
      auth: {
        user: process.env.DEV_SMTP_USER,
        pass: process.env.DEV_SMTP_PASSWORD
      }
    });
  }
  
  // If no SMTP is configured, create a preview-only transport for development
  logger.info('No SMTP configuration found. Creating preview-only transporter for development.');
  
  // Create a preview-only "transport" that logs emails to console
  return {
    sendMail: (mailOptions) => {
      logger.info('📧 Email would be sent with the following options:');
      logger.info(`From: ${mailOptions.from || process.env.EMAIL_FROM || 'no-reply@signalschool.com'}`);
      logger.info(`To: ${mailOptions.to}`);
      logger.info(`Subject: ${mailOptions.subject}`);
      logger.info(`HTML: ${mailOptions.html.substring(0, 150)}...`);
      
      return Promise.resolve({
        accepted: [mailOptions.to],
        rejected: [],
        response: 'Development mode - Email logged to console',
        messageId: `dev-${Date.now()}`
      });
    }
  };
};

// Get or create transporter (lazy loading)
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.text] - Email text content (optional)
 * @param {string} [options.from] - Sender email address (optional, defaults to configured FROM address)
 * @returns {Promise} - Resolves with the email sending result
 */
export const sendEmail = async (options) => {
  try {
    if (!options.to || !options.subject || !options.html) {
      throw new Error('Email options are incomplete. Required: to, subject, html');
    }
    
    const mailOptions = {
      from: options.from || process.env.EMAIL_FROM || 'Signal School Quiz Generator <no-reply@signalschool.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    
    // Add text version if provided
    if (options.text) {
      mailOptions.text = options.text;
    }
    
    // Send email
    const result = await getTransporter().sendMail(mailOptions);
    
    logger.info(`Email sent successfully to ${options.to}`);
    return result;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

export default { sendEmail };