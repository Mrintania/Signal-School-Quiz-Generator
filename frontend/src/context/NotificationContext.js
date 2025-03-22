import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

// Create context
const NotificationContext = createContext();

// Create notification provider
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add a notification
  const addNotification = useCallback((message, type = 'info', autoHideDuration = 5000) => {
    const id = Date.now();
    
    setNotifications(prev => [
      ...prev,
      {
        id,
        message,
        type,
        autoHideDuration
      }
    ]);
    
    // Auto-remove notification after duration
    if (autoHideDuration) {
      setTimeout(() => {
        removeNotification(id);
      }, autoHideDuration);
    }
    
    return id;
  }, []);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Shorthand functions for different notification types
  const showSuccess = useCallback((message, autoHideDuration) => {
    return addNotification(message, 'success', autoHideDuration);
  }, [addNotification]);

  const showError = useCallback((message, autoHideDuration) => {
    return addNotification(message, 'danger', autoHideDuration);
  }, [addNotification]);

  const showInfo = useCallback((message, autoHideDuration) => {
    return addNotification(message, 'info', autoHideDuration);
  }, [addNotification]);

  const showWarning = useCallback((message, autoHideDuration) => {
    return addNotification(message, 'warning', autoHideDuration);
  }, [addNotification]);

  // Context value
  const value = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container */}
      <ToastContainer 
        className="p-3" 
        position="top-end"
        style={{ zIndex: 1090 }}
      >
        {notifications.map(notification => (
          <Toast 
            key={notification.id} 
            onClose={() => removeNotification(notification.id)} 
            bg={notification.type}
            className="mb-2"
          >
            <Toast.Header>
              <strong className="me-auto">
                {notification.type === 'success' && 'Success'}
                {notification.type === 'danger' && 'Error'}
                {notification.type === 'info' && 'Information'}
                {notification.type === 'warning' && 'Warning'}
              </strong>
            </Toast.Header>
            <Toast.Body className={notification.type === 'danger' || notification.type === 'dark' ? 'text-white' : ''}>
              {notification.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </NotificationContext.Provider>
  );
};

// Custom hook for using notifications
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};

export default NotificationContext;