import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  // กำหนดความกว้างของ Sidebar คงที่
  const SIDEBAR_WIDTH = 250; // px
  
  return (
    <div className="d-flex">
      {/* Sidebar ด้านซ้าย - กำหนดความกว้างคงที่ */}
      <div 
        className="sidebar-wrapper"
        style={{ 
          width: `${SIDEBAR_WIDTH}px`, 
          flexShrink: 0,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 1030
        }}
      >
        <Sidebar />
      </div>
      
      {/* พื้นที่หลักด้านขวา - ความกว้างจะเป็นส่วนที่เหลือ */}
      <div 
        className="content-wrapper" 
        style={{ 
          width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
          marginLeft: `${SIDEBAR_WIDTH}px`,
          minHeight: '100vh'
        }}
      >
        {/* Navbar จะอยู่ด้านบนของพื้นที่หลัก */}
        <Navbar />
        
        {/* เนื้อหาหลัก */}
        <main className="py-3 px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;