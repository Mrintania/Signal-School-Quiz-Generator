import React from 'react';
import { QuizProvider } from './QuizContext';
import { ThemeProvider } from './ThemeContext';
import { NotificationProvider } from './NotificationContext';
import { LanguageProvider } from './LanguageContext';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Providers component combines all context providers in a single component.
 * This makes App.js cleaner and provides proper nesting order.
 */
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