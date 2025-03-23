import React, { Suspense } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingOverlay from '../components/LoadingOverlay';

/**
 * Wraps a component with ErrorBoundary and Suspense for lazy loading
 * @param {React.ComponentType} Component - React component to wrap
 * @param {React.ReactNode} fallback - Custom fallback UI for errors
 * @returns {React.ReactNode} Wrapped component
 */
export const withErrorBoundary = (Component, fallback = null) => {
  return (props) => (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<LoadingOverlay isLoading={true} />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};