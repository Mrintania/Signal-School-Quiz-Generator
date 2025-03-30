import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';

const QuickActions = ({ setActiveTab }) => {
    return (
        <Row className="mb-4">
            <Col>
                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white">
                        <h5 className="mb-0">Quick Actions</h5>
                    </Card.Header>
                    <Card.Body>
                        <Row className="g-3">
                            <Col sm={6} md={4}>
                                <Card className="h-100 border">
                                    <Card.Body className="d-flex flex-column">
                                        <div className="mb-3 text-center">
                                            <div className="rounded-circle bg-primary bg-opacity-10 p-3 mx-auto" style={{ width: 'fit-content' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                                                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <h6 className="text-center mb-3">New User</h6>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            className="mt-auto"
                                            onClick={() => setActiveTab('users')}
                                        >
                                            Add User
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col sm={6} md={4}>
                                <Card className="h-100 border">
                                    <Card.Body className="d-flex flex-column">
                                        <div className="mb-3 text-center">
                                            <div className="rounded-circle bg-success bg-opacity-10 p-3 mx-auto" style={{ width: 'fit-content' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                                                    <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916l-7.5-5zM12.375 6v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1H.5z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <h6 className="text-center mb-3">New School</h6>
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            className="mt-auto"
                                            onClick={() => setActiveTab('schools')}
                                        >
                                            Add School
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col sm={6} md={4}>
                                <Card className="h-100 border">
                                    <Card.Body className="d-flex flex-column">
                                        <div className="mb-3 text-center">
                                            <div className="rounded-circle bg-danger bg-opacity-10 p-3 mx-auto" style={{ width: 'fit-content' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-danger" viewBox="0 0 16 16">
                                                    <path d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1H2zm12-1a2 2 0 0 1 2 2v12.793a.5.5 0 0 1-.854.353l-2.853-2.853a1 1 0 0 0-.707-.293H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z" />
                                                    <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <h6 className="text-center mb-3">System Logs</h6>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            className="mt-auto"
                                            onClick={() => setActiveTab('settings')}
                                        >
                                            View Logs
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default QuickActions;