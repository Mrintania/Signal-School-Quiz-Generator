// สร้างไฟล์ src/context/Providers.js
import React from 'react';
import { QuizProvider } from './QuizContext';
import { ThemeProvider } from './ThemeContext';
import { NotificationProvider } from './NotificationContext';
import { LanguageProvider } from './LanguageContext';
import ErrorBoundary from '../components/ErrorBoundary';

const Providers = ({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <QuizProvider>
              {children}
            </QuizProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default Providers;