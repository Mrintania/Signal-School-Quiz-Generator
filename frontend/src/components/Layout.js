import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="d-flex">
      <Sidebar />
      <div 
        className="content-wrapper" 
        style={{ 
          flexGrow: 1,
          marginLeft: '70px', // Same as collapsed sidebar width
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Navbar />
        <main className="px-3 py-3">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;