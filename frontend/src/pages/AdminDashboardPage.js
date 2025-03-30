// src/pages/AdminDashboardPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tab } from 'react-bootstrap';
import { Navigate } from 'react-router-dom'; // Fixed import from react-router-dom
import { useAuth } from '../context/AuthContext';
import { adminService, quizService } from '../services/api';

// Import new component modules
import AdminSidebar from '../components/admin/AdminSidebar';
import DashboardContent from '../components/admin/DashboardContent';
import UsersContent from '../components/admin/UsersContent';
import SchoolsContent from '../components/admin/SchoolsContent';
import ContentManagementTab from '../components/admin/ContentManagementTab';
import SettingsContent from '../components/admin/SettingsContent';

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

    // Moved useEffect above any conditionals to fix the React Hook error
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
                        quizzesCount: quizzesResponse.data?.length || 0,
                        pendingUsersCount: pendingUsersResponse.success ? pendingUsersResponse.users?.length || 0 : 0,
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

    // Redirect if not authenticated or not an admin/school admin
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin() && !isSchoolAdmin()) {
        return <Navigate to="/unauthorized" replace />;
    }

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
                    <AdminSidebar
                        currentUser={currentUser}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        pendingUsersCount={stats.pendingUsersCount}
                    />
                </Col>

                <Col md={9} lg={9}>
                    <Tab.Content>
                        <Tab.Pane active={activeTab === 'dashboard'}>
                            <DashboardContent stats={stats} setActiveTab={setActiveTab} />
                        </Tab.Pane>

                        <Tab.Pane active={activeTab === 'users'}>
                            <UsersContent />
                        </Tab.Pane>

                        <Tab.Pane active={activeTab === 'schools'}>
                            <SchoolsContent />
                        </Tab.Pane>

                        <Tab.Pane active={activeTab === 'content'}>
                            <ContentManagementTab />
                        </Tab.Pane>

                        <Tab.Pane active={activeTab === 'settings'}>
                            <SettingsContent />
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminDashboardPage;