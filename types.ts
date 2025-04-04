// Common Types for Services
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface Quiz {
    id?: number;
    title: string;
    topic: string;
    question_type: string;
    student_level?: string;
    language?: string;
    created_at?: string;
    updated_at?: string;
    questions?: QuizQuestion[];
}

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

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'school_admin' | 'teacher';
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    lastLogin?: string;
}

export interface School {
    id: number;
    name: string;
    userCount?: number;
}

export interface QuizParams {
    page?: number;
    limit?: number;
    search?: string;
    folder?: string | number | null;
    sortBy?: string;
    sortOrder?: string;
}

export interface UserParams {
    page?: number;
    limit?: number;
    search?: string;
    filter?: string;
}