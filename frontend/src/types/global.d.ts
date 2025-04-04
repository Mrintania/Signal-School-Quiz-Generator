/// <reference types="react-scripts" />

declare namespace NodeJS {
    interface ProcessEnv {
        REACT_APP_API_URL: string;
        REACT_APP_ENVIRONMENT: 'development' | 'production' | 'test';
    }
}

// Optional: Add global type definitions for external libraries
declare module 'lodash' {
    // Add type definitions for lodash if needed
}