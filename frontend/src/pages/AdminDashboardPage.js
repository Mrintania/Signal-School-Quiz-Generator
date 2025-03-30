import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PendingUsers from '../components/admin/PendingUsers';
import { adminService, quizService } from '../services/api';

const AdminDashboardPage = () => {
    const { currentUser, isAuthenticated, isAdmin, isSchoolAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({
        usersCount: 0,
        schoolsCount: 0,
        quizzesCount: 0,
        pendingUsersCount: 0,
        loading: true,
        error: null
    });
    const navigate = useNavigate();

    // Redirect if not authenticated or not an admin/school admin
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin() && !isSchoolAdmin()) {
        return <Navigate to="/unauthorized" replace />;
    }

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                // Fetch dashboard statistics
                setStats(prev => ({ ...prev, loading: true }));

                // In a production app, you would have a dedicated API endpoint for admin stats
                // For now, we'll simulate by using existing endpoints
                const [quizzesResponse, pendingUsersResponse] = await Promise.all([
                    quizService.getAllQuizzes(),
                    adminService.getPendingUsers()
                ]);

                if (quizzesResponse.success) {
                    setStats(prev => ({
                        ...prev,
                        quizzesCount: quizzesResponse.data.length || 0,
                        pendingUsersCount: pendingUsersResponse.success ? pendingUsersResponse.users.length : 0,
                        // Mock data for other stats that might not be available yet
                        usersCount: 120,
                        schoolsCount: 8,
                        loading: false
                    }));
                } else {
                    throw new Error('Failed to fetch statistics');
                }
            } catch (error) {
                console.error('Error fetching admin dashboard stats:', error);
                setStats(prev => ({
                    ...prev,
                    error: error.message || 'An error occurred while fetching dashboard statistics',
                    loading: false
                }));
            }
        };

        fetchDashboardStats();
    }, []);

    return (
        <Container fluid className="py-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="mb-0">Admin Dashboard</h2>
                    <p className="text-muted">ระบบจัดการสำหรับผู้ดูแล</p>
                </Col>
            </Row>

            <Row>
                <Col md={3} lg={3} className="mb-4">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center mb-4">
                                <div className="rounded-circle bg-primary text-white p-3 me-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                    </svg>
                                </div>
                                <div>
                                    <h5 className="mb-0">{currentUser?.firstName} {currentUser?.lastName}</h5>
                                    <span className="badge bg-success">Administrator</span>
                                </div>
                            </div>

                            <Nav variant="pills" className="flex-column" onSelect={(key) => setActiveTab(key)}>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="dashboard"
                                        active={activeTab === 'dashboard'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                                <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                                            </svg>
                                            Dashboard
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="users"
                                        active={activeTab === 'users'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                            </svg>
                                            User Management
                                            {stats.pendingUsersCount > 0 && (
                                                <Badge bg="danger" className="ms-auto">{stats.pendingUsersCount}</Badge>
                                            )}
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
                                                <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916l-7.5-5zM12.375 6v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zm-2.5 0v7h-1.25V6h1.25zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1H.5z" />
                                            </svg>
                                            School Management
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="content"
                                        active={activeTab === 'content'}
                                        className="mb-2"
                                    >
                                        <div className="d-flex align-items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2z" />
                                                <path d="M9.828 4.172a1 1 0 0 0-1.414 0L6.025 6.56c-.392.39-.392 1.023 0 1.414l2.389 2.39c.392.391 1.023.391 1.414 0 .392-.391.392-1.024 0-1.415L8.307 7.428l1.521-1.521c.392-.391.392-1.024 0-1.414l-1.414-1.414z" />
                                            </svg>
                                            Content Management
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
                                                <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                                            </svg>
                                            System Settings
                                        </div>
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>

                            <hr className="my-4" />

                            <div className="d-grid">
                                <Button variant="outline-primary" size="sm" as={Link} to="/">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                                    </svg>
                                    กลับสู่หน้าหลัก
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={9} lg={9}>
                    <Tab.Content>
                        {/* Dashboard Tab */}
                        <Tab.Pane active={activeTab === 'dashboard'}>
                            {stats.error ? (
                                <Alert variant="danger">
                                    <Alert.Heading>Error loading statistics</Alert.Heading>
                                    <p>{stats.error}</p>
                                </Alert>
                            ) : stats.loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-3">Loading dashboard statistics...</p>
                                </div>
                            ) : (
                                <>
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
                                                            <h6 className="mb-0 text-muted">Total Users</h6>
                                                            <h3 className="mb-0">{stats.usersCount}</h3>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="mt-auto align-self-end"
                                                        onClick={() => setActiveTab('users')}
                                                    >
                                                        Manage Users
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
                                                            <h6 className="mb-0 text-muted">Schools</h6>
                                                            <h3 className="mb-0">{stats.schoolsCount}</h3>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        className="mt-auto align-self-end"
                                                        onClick={() => setActiveTab('schools')}
                                                    >
                                                        Manage Schools
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
                                                            <h6 className="mb-0 text-muted">Total Quizzes</h6>
                                                            <h3 className="mb-0">{stats.quizzesCount}</h3>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        className="mt-auto align-self-end"
                                                        onClick={() => setActiveTab('content')}
                                                    >
                                                        Manage Content
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
                                                            <h6 className="mb-0 text-muted">Pending Verifications</h6>
                                                            <h3 className="mb-0">{stats.pendingUsersCount}</h3>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline-warning"
                                                        size="sm"
                                                        className="mt-auto align-self-end"
                                                        onClick={() => setActiveTab('users')}
                                                        disabled={stats.pendingUsersCount === 0}
                                                    >
                                                        Verify Users
                                                    </Button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

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

                                    <Row>
                                        <Col lg={6}>
                                            <Card className="border-0 shadow-sm mb-4">
                                                <Card.Header className="bg-white">
                                                    <h5 className="mb-0">Recent User Registrations</h5>
                                                </Card.Header>
                                                <Card.Body>
                                                    <div className="text-center py-4">
                                                        <p className="mb-0 text-muted">This feature will be implemented in the future.</p>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col lg={6}>
                                            <Card className="border-0 shadow-sm mb-4">
                                                <Card.Header className="bg-white">
                                                    <h5 className="mb-0">System Status</h5>
                                                </Card.Header>
                                                <Card.Body>
                                                    <div className="d-flex align-items-center mb-3">
                                                        <div className="me-3">
                                                            <span className="badge bg-success rounded-circle p-2">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                                                </svg>
                                                            </span>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between">
                                                                <h6 className="mb-0">API Server</h6>
                                                                <small className="text-success">Online</small>
                                                            </div>
                                                            <div className="progress mt-1" style={{ height: '4px' }}>
                                                                <div className="progress-bar bg-success" style={{ width: '95%' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center mb-3">
                                                        <div className="me-3">
                                                            <span className="badge bg-success rounded-circle p-2">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                                                </svg>
                                                            </span>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between">
                                                                <h6 className="mb-0">Database</h6>
                                                                <small className="text-success">Online</small>
                                                            </div>
                                                            <div className="progress mt-1" style={{ height: '4px' }}>
                                                                <div className="progress-bar bg-success" style={{ width: '92%' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <div className="me-3">
                                                            <span className="badge bg-success rounded-circle p-2">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                                                </svg>
                                                            </span>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between">
                                                                <h6 className="mb-0">AI Service</h6>
                                                                <small className="text-success">Online</small>
                                                            </div>
                                                            <div className="progress mt-1" style={{ height: '4px' }}>
                                                                <div className="progress-bar bg-success" style={{ width: '88%' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </Tab.Pane>

                        {/* User Management Tab */}
                        <Tab.Pane active={activeTab === 'users'}>
                            <PendingUsers />
                            <Card className="border-0 shadow-sm mt-4">
                                <Card.Header className="bg-white">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">All Users</h5>
                                        <Button variant="primary" size="sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                            </svg>
                                            Add New User
                                        </Button>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center py-4">
                                        <p className="mb-0 text-muted">This feature will be implemented in the future.</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>

                        {/* School Management Tab */}
                        <Tab.Pane active={activeTab === 'schools'}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">Schools/Organizations</h5>
                                        <Button variant="success" size="sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                            </svg>
                                            Add New School
                                        </Button>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center py-4">
                                        <p className="mb-0 text-muted">This feature will be implemented in the future.</p>
                                        <p className="text-muted">School management will allow you to organize users and content by educational institution.</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>

                        {/* Content Management Tab */}
                        <Tab.Pane active={activeTab === 'content'}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">Content Management</h5>
                                        <div>
                                            <Button variant="outline-primary" size="sm" className="me-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z" />
                                                    <path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z" />
                                                    <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z" />
                                                </svg>
                                                Topics
                                            </Button>
                                            <Button variant="outline-primary" size="sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                                                </svg>
                                                Quizzes
                                            </Button>
                                        </div>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center py-4">
                                        <p className="mb-0 text-muted">This feature will be implemented in the future.</p>
                                        <p className="text-muted">Content management will allow you to review, modify and organize quiz content across the platform.</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>

                        {/* Settings Tab */}
                        <Tab.Pane active={activeTab === 'settings'}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white">
                                    <h5 className="mb-0">System Settings</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center py-4">
                                        <p className="mb-0 text-muted">This feature will be implemented in the future.</p>
                                        <p className="text-muted">System settings will allow you to configure application behavior, appearance, and APIs.</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminDashboardPage;