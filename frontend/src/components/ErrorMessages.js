import React from 'react';
import { Alert, Button } from 'react-bootstrap';

export const NetworkErrorMessage = () => (
    <Alert variant="danger">
        <h4>การเชื่อมต่อล้มเหลว</h4>
        <p>ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณและลองอีกครั้ง</p>
        <Button variant="primary" onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>
    </Alert>
);

export const DataLoadErrorMessage = ({ entityName = 'ข้อมูล' }) => (
    <Alert variant="warning">
        <h4>ไม่สามารถโหลด{entityName}ได้</h4>
        <p>เกิดข้อผิดพลาดในการโหลด{entityName} โปรดลองอีกครั้งในภายหลัง</p>
    </Alert>
);