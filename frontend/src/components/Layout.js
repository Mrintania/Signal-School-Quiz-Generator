import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// ปรับปรุง Layout ให้รองรับ Outlet สำหรับการใช้งานกับ createBrowserRouter
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
          {/* ใช้ children หรือ Outlet ขึ้นอยู่กับว่าคุณเลือกวิธีไหน */}
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;