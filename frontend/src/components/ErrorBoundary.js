import React, { Component } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // In a production app, you would log to a service like Sentry here
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <Card className="border-0 shadow-sm my-5 mx-auto" style={{ maxWidth: '600px' }}>
          <Card.Body className="p-5 text-center">
            <div className="mb-4 text-danger">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
              </svg>
            </div>
            <h2 className="mb-3">Something went wrong</h2>
            <p className="text-muted mb-4">
              We apologize for the inconvenience. The error has been logged and we're working on fixing it.
            </p>
            
            {process.env.NODE_ENV !== 'production' && (
              <Alert variant="danger" className="mb-4 text-start">
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary>Show error details</summary>
                  <p>{this.state.error && this.state.error.toString()}</p>
                  <p>Component Stack:</p>
                  <p>{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
                </details>
              </Alert>
            )}
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                onClick={this.handleReset}
                className="mb-2"
              >
                Try Again
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => window.location.href = '/'}
              >
                Go to Home Page
              </Button>
            </div>
          </Card.Body>
        </Card>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;