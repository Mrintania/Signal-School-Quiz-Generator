// frontend/src/components/admin/AdminStats.js
import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';

const AdminStats = ({ stats, onTabChange }) => {
    return (
        <Row className="mb-4 g-3">
            <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                            <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                </svg>
                            </div>
                            <div>
                                <h6 className="mb-0 text-muted">ผู้ใช้ทั้งหมด</h6>
                                <h3 className="mb-0">{stats.usersCount}</h3>
                            </div>
                        </div>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            className="mt-auto align-self-end"
                            onClick={() => onTabChange('users')}
                        >
                            จัดการผู้ใช้
                        </Button>
                    </Card.Body>
                </Card>
            </Col>

            <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                            <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                                    <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916l-7.5-5zM12.375 6v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1H.5z" />
                                </svg>
                            </div>
                            <div>
                                <h6 className="mb-0 text-muted">โรงเรียน</h6>
                                <h3 className="mb-0">{stats.schoolsCount}</h3>
                            </div>
                        </div>
                        <Button
                            variant="outline-success"
                            size="sm"
                            className="mt-auto align-self-end"
                            onClick={() => onTabChange('schools')}
                        >
                            จัดการโรงเรียน
                        </Button>
                    </Card.Body>
                </Card>
            </Col>

            <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                            <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-info" viewBox="0 0 16 16">
                                    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
                                    <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z" />
                                </svg>
                            </div>
                            <div>
                                <h6 className="mb-0 text-muted">ข้อสอบทั้งหมด</h6>
                                <h3 className="mb-0">{stats.quizzesCount}</h3>
                            </div>
                        </div>
                        <Button
                            variant="outline-info"
                            size="sm"
                            className="mt-auto align-self-end"
                            onClick={() => onTabChange('content')}
                        >
                            จัดการเนื้อหา
                        </Button>
                    </Card.Body>
                </Card>
            </Col>

            <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                            <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-warning" viewBox="0 0 16 16">
                                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                                </svg>
                            </div>
                            <div>
                                <h6 className="mb-0 text-muted">รอการยืนยัน</h6>
                                <h3 className="mb-0">{stats.pendingUsersCount}</h3>
                            </div>
                        </div>
                        <Button
                            variant="outline-warning"
                            size="sm"
                            className="mt-auto align-self-end"
                            onClick={() => onTabChange('users')}
                            disabled={stats.pendingUsersCount === 0}
                        >
                            ยืนยันผู้ใช้
                        </Button>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default AdminStats;