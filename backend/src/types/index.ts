import { Request } from 'express';

// Extend Express Request
export interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
    };
    logActivity?: (activityType: string, description: string) => Promise<void>;
}

// User roles
export type UserRole = 'admin' | 'school_admin' | 'teacher';

// User status
export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive';

// Quiz types
export type QuestionType = 'Multiple Choice' | 'Essay';

// Quiz structure
export interface QuizQuestion {
    id?: number;
    questionText: string;
    explanation?: string;
    options?: QuizOption[];
}

export interface QuizOption {
    id?: number;
    text: string;
    isCorrect: boolean;
}

export interface Quiz {
    id?: number;
    title: string;
    topic: string;
    questionType: QuestionType;
    studentLevel?: string;
    language?: string;
    userId?: number;
    questions: QuizQuestion[];
    created_at?: Date;
    updated_at?: Date;
}

// Database models
export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    role: UserRole;
    status: UserStatus;
    profile_image?: string;
    email_verified: boolean;
    reset_password_token?: string;
    reset_token_expires_at?: Date;
    last_login?: Date;
    created_at: Date;
    updated_at?: Date;
}

export interface School {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    subscription_plan?: string;
    subscription_status?: string;
    subscription_expires_at?: Date;
    created_at: Date;
    updated_at?: Date;
}

// Generic response type
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

// Configuration types
export interface DatabaseConfig {
    host: string;
    user: string;
    password: string;
    name: string;
    connectionLimit: number;
    queueLimit: number;
}

export interface ServerConfig {
    port: number;
    environment: string;
    frontendUrl: string;
    skipAuth: boolean;
    logAuth: boolean;
}

export interface JwtConfig {
    secret: string;
    expiresIn: string;
}

export interface AppConfig {
    server: ServerConfig;
    database: DatabaseConfig;
    jwt: JwtConfig;
    email: any;
    apiKeys: any;
    rateLimiter: any;
    cache: any;
    upload: any;
}

