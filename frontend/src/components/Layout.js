import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div 
        className="content-wrapper" 
        style={{ 
          width: '100%',
          minHeight: '100vh',
          marginLeft: isMobile ? '0' : '250px',
          transition: 'margin 0.3s ease'
        }}
      >
        {/* Navbar */}
        <Navbar />
        
        {/* Main content */}
        <main className="py-3 px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;