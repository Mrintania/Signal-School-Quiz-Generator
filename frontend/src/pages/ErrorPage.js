
import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { Link, useRouteError } from 'react-router-dom';

const ErrorPage = () => {
  const error = useRouteError();
  
  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="border-0 shadow-sm text-center" style={{ maxWidth: '500px' }}>
        <Card.Body className="p-5">
          <div className="mb-4 text-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
          </div>
          
          <h2 className="mb-3">ไม่พบหน้าที่คุณต้องการ</h2>
          <p className="text-muted mb-4">
            URL ที่คุณเข้าถึงไม่มีอยู่หรืออาจถูกย้ายไปแล้ว
          </p>
          
          {error && process.env.NODE_ENV !== 'production' && (
            <div className="alert alert-danger mb-4 text-start">
              <strong>ข้อผิดพลาด:</strong> {error.message || 'ไม่ทราบข้อผิดพลาด'}
            </div>
          )}
          
          <div className="d-grid gap-2">
            <Link to="/" className="btn btn-primary">
              กลับไปยังหน้าหลัก
            </Link>
            <Button variant="outline-secondary" onClick={() => window.history.back()}>
              กลับไปยังหน้าก่อนหน้า
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ErrorPage;