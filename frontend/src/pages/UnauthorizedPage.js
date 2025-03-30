import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const UnauthorizedPage = () => {
    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="border-0 shadow-sm text-center">
                        <Card.Body className="p-5">
                            <div className="mb-4 text-danger">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                </svg>
                            </div>
                            
                            <h2 className="mb-3">ขออภัย คุณไม่มีสิทธิ์เข้าถึงพื้นที่นี้</h2>
                            <p className="text-muted mb-4">
                                คุณไม่ได้รับอนุญาตให้เข้าถึงพื้นที่ที่ร้องขอ เนื่องจากคุณไม่มีสิทธิ์ที่เพียงพอ
                            </p>
                            
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
                </Col>
            </Row>
        </Container>
    );
};

export default UnauthorizedPage;