import { rateLimit, Options } from 'express-rate-limit';
import configService from '../services/configService.js';

// Get configuration values
const generalConfig = configService.get('rateLimiter.general');
const authConfig = configService.get('rateLimiter.auth');
const aiGenerationConfig = configService.get('rateLimiter.aiGeneration');

// Create a general rate limiter middleware
const generalLimiter = rateLimit({
  windowMs: generalConfig?.windowMs || 15 * 60 * 1000, // 15 minutes
  max: generalConfig?.max || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
} as Options);

// Create a more stringent limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: authConfig?.windowMs || 60 * 60 * 1000, // 1 hour
  max: authConfig?.max || 10, // limit each IP to 10 login/auth attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after an hour'
  }
} as Options);

// Create a specific limiter for AI generation to avoid abuse
const aiGenerationLimiter = rateLimit({
  windowMs: aiGenerationConfig?.windowMs || 60 * 60 * 1000, // 1 hour
  max: aiGenerationConfig?.max || 20, // limit each IP to 20 generation requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have reached the maximum number of quiz generations per hour'
  }
} as Options);

export { generalLimiter, authLimiter, aiGenerationLimiter };