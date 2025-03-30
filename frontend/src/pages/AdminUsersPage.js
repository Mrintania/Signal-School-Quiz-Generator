// frontend/src/pages/AdminUsersPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Nav, Tab, Card } from 'react-bootstrap';
import PendingUsers from '../components/admin/PendingUsers';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminUsersPage = () => {
    const { currentUser, isAuthenticated, isAdmin, isSchoolAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('pending');

    // Redirect if not authenticated or not an admin/school admin
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin() && !isSchoolAdmin()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">User Management</h2>

            <Row>
                <Col md={3} lg={3} className="mb-4">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <h5 className="mb-3">User Administration</h5>
                            <Nav variant="pills" className="flex-column" onSelect={(key) => setActiveTab(key)}>
                                <Nav.Item>
                                    <Nav.Link 
                                        eventKey="pending" 
                                        active={activeTab === 'pending'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                                            </svg>
                                            Pending Verifications
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link 
                                        eventKey="all" 
                                        active={activeTab === 'all'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                                            </svg>
                                            All Users
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link 
                                        eventKey="schools" 
                                        active={activeTab === 'schools'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916l-7.5-5zM12.375 6v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1H.5z"/>
                                            </svg>
                                            Schools
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link 
                                        eventKey="settings" 
                                        active={activeTab === 'settings'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                                            </svg>
                                            Settings
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={9} lg={9}>
                    <Tab.Content>
                        <Tab.Pane active={activeTab === 'pending'}>
                            <PendingUsers />
                        </Tab.Pane>
                        <Tab.Pane active={activeTab === 'all'}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-white">
                                    <h4 className="mb-0">All Users</h4>
                                </Card.Header>
                                <Card.Body>
                                    <p className="text-muted">This feature will be implemented in the future.</p>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>
                        <Tab.Pane active={activeTab === 'schools'}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-white">
                                    <h4 className="mb-0">Schools/Organizations</h4>
                                </Card.Header>
                                <Card.Body>
                                    <p className="text-muted">This feature will be implemented in the future.</p>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>
                        <Tab.Pane active={activeTab === 'settings'}>
                            <Card className="shadow-sm">
                                <Card.Header className="bg-white">
                                    <h4 className="mb-0">User Management Settings</h4>
                                </Card.Header>
                                <Card.Body>
                                    <p className="text-muted">This feature will be implemented in the future.</p>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminUsersPage;