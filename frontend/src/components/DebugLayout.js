import React from 'react';
import { Outlet } from 'react-router-dom';

const DebugLayout = () => {
    return (
        <div className="debug-layout" style={{ display: 'flex' }}>
            <div style={{
                width: '250px',
                background: '#f0f0f0',
                padding: '20px',
                minHeight: '100vh'
            }}>
                <h3>เมนูทดสอบ</h3>
                <ul>
                    <li><a href="/">หน้าหลัก</a></li>
                    <li><a href="/library">คลังข้อสอบ</a></li>
                    <li><a href="/create">สร้างข้อสอบ</a></li>
                </ul>
            </div>

            <div style={{
                flex: 1,
                padding: '20px',
                background: '#fff',
                border: '2px dashed red'
            }}>
                <h2>เนื้อหาหลัก (ควรแสดงตรงนี้)</h2>
                <Outlet />
            </div>
        </div>
    );
};

export default DebugLayout;