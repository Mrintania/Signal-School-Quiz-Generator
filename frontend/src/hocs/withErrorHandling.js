// frontend/src/hocs/withErrorHandling.js
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * HOC ที่ครอบคอมโพเนนต์ด้วย ErrorBoundary
 * @param {React.ComponentType} Component - คอมโพเนนต์ที่ต้องการครอบ
 * @param {React.ReactNode} fallback - UI สำรองเมื่อเกิดข้อผิดพลาด (ถ้าไม่กำหนดจะใช้ค่าเริ่มต้น)
 * @returns {React.ComponentType} คอมโพเนนต์ที่ถูกครอบด้วย ErrorBoundary
 */
const withErrorHandling = (Component, fallback = null) => {
    const displayName = Component.displayName || Component.name || 'Component';

    const WithErrorHandling = (props) => (
        <ErrorBoundary fallback={fallback}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WithErrorHandling.displayName = `WithErrorHandling(${displayName})`;

    return WithErrorHandling;
};

export default withErrorHandling;