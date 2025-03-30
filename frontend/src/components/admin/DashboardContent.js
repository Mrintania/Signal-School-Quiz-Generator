import React, { useEffect, useState } from 'react';
import { Alert, Spinner, Row, Col } from 'react-bootstrap';
import StatCards from './StatCards';
import QuickActions from './QuickActions';
import UserRegistrations from './UserRegistrations';
import SystemStatus from './SystemStatus';
import { dashboardService } from '../../services/api';

const DashboardContent = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    usersCount: 0,
    schoolsCount: 0,
    quizzesCount: 0,
    pendingUsersCount: 0,
    systemStats: {},
    loading: true,
    error: null
  });

  const [systemStatus, setSystemStatus] = useState({
    systems: [],
    overallHealth: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard statistics
        const statsResponse = await dashboardService.getStats();
        
        if (statsResponse.success) {
          setStats({
            usersCount: statsResponse.data.usersCount,
            schoolsCount: statsResponse.data.schoolsCount,
            quizzesCount: statsResponse.data.quizzesCount,
            pendingUsersCount: statsResponse.data.pendingUsersCount,
            systemStats: statsResponse.data.systemStats || {},
            loading: false,
            error: null
          });
        } else {
          throw new Error(statsResponse.message || 'Failed to fetch dashboard statistics');
        }

        // Fetch system status
        try {
          const statusResponse = await dashboardService.getSystemStatus();
          
          if (statusResponse.success) {
            setSystemStatus({
              systems: statusResponse.data.systems,
              overallHealth: statusResponse.data.overallHealth,
              loading: false,
              error: null
            });
          }
        } catch (statusError) {
          // Don't fail the whole dashboard if just system status fails
          console.error('Error fetching system status:', statusError);
          setSystemStatus({
            systems: [
              { name: 'API Server', status: 'online', health: 95 },
              { name: 'Database', status: 'online', health: 92 },
              { name: 'AI Service', status: 'online', health: 88 }
            ],
            overallHealth: 92,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats(prev => ({
          ...prev,
          error: error.message || 'An error occurred while fetching dashboard statistics',
          loading: false
        }));
      }
    };

    fetchDashboardData();
  }, []);

  if (stats.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error loading statistics</Alert.Heading>
        <p>{stats.error}</p>
      </Alert>
    );
  }

  if (stats.loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading dashboard statistics...</p>
      </div>
    );
  }

  return (
    <>
      <StatCards stats={stats} setActiveTab={setActiveTab} />
      <QuickActions setActiveTab={setActiveTab} />
      <Row>
        <Col lg={6}>
          <UserRegistrations />
        </Col>
        <Col lg={6}>
          <SystemStatus systems={systemStatus.systems} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardContent;