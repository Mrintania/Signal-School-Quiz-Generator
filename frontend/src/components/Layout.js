// frontend/src/components/Layout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const location = useLocation();
  
  // Check if current route is an authentication route (login, register, etc.)
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(location.pathname);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Only show sidebar and navbar if user is authenticated and not on auth routes
  if (!isAuthenticated && isAuthRoute) {
    return (
      <div className="auth-layout">
        <Outlet />
      </div>
    );
  }
  
  return (
    <div className="d-flex">
      {/* Sidebar - only show if authenticated */}
      {isAuthenticated && <Sidebar />}
      
      {/* Main content area */}
      <div 
        className="content-wrapper" 
        style={{ 
          width: '100%',
          minHeight: '100vh',
          marginLeft: (isAuthenticated && !isMobile) ? '250px' : '0',
          transition: 'margin 0.3s ease'
        }}
      >
        {/* Navbar - only show if authenticated */}
        {isAuthenticated && <Navbar />}
        
        {/* Main content */}
        <main className="py-3 px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;