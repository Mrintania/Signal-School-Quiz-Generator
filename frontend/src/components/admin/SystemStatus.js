import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { dashboardService } from '../../services/api';

const SystemStatus = () => {
    const [systemData, setSystemData] = useState({
        systems: [
            { name: 'API Server', status: 'online', health: 95 },
            { name: 'Database', status: 'online', health: 92 },
            { name: 'AI Service', status: 'online', health: 88 }
        ],
        overallHealth: 90,
        lastChecked: new Date(),
        loading: false
    });

    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                setSystemData(prev => ({ ...prev, loading: true }));
                const response = await dashboardService.getSystemStatus();

                if (response.success) {
                    setSystemData({
                        systems: response.data.systems,
                        overallHealth: response.data.overallHealth,
                        lastChecked: new Date(response.data.lastChecked),
                        loading: false
                    });
                }
            } catch (error) {
                console.error('Error fetching system status:', error);
                // Keep the default data if the API fails
                setSystemData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchSystemStatus();

        // Set up a refresh interval (every 60 seconds)
        const intervalId = setInterval(fetchSystemStatus, 60000);

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    // Function to determine badge and progress color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'success';
            case 'issues': return 'warning';
            case 'offline': return 'danger';
            default: return 'secondary';
        }
    };

    // Function to format timestamp
    const formatTime = (date) => {
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">System Status</h5>
                <Badge
                    bg={systemData.overallHealth > 90 ? 'success' : systemData.overallHealth > 70 ? 'warning' : 'danger'}
                    className="px-2 py-1"
                >
                    {systemData.overallHealth}% Healthy
                </Badge>
            </Card.Header>
            <Card.Body>
                {systemData.systems.map((system, index) => (
                    <div key={system.name} className={`${index < systemData.systems.length - 1 ? 'mb-3 pb-2 border-bottom' : ''}`}>
                        <Row className="align-items-center">
                            <Col xs={8}>
                                <div className="d-flex align-items-center">
                                    <div className="me-3">
                                        <span className={`badge bg-${getStatusColor(system.status)} rounded-circle p-2`}>
                                            {system.status === 'online' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                                </svg>
                                            ) : system.status === 'issues' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M7.002 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1.98-5a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h1.5V6a.5.5 0 0 1 .5-.5z" />
                                                    <path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                                                </svg>
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <h6 className="mb-0">{system.name}</h6>
                                        <small className={`text-${getStatusColor(system.status)}`}>
                                            {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
                                        </small>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={4} className="text-end">
                                <div className="mb-1">
                                    <Badge
                                        bg={system.health > 90 ? 'success' : system.health > 70 ? 'warning' : 'danger'}
                                        className="rounded-pill"
                                    >
                                        {system.health}%
                                    </Badge>
                                </div>
                                <ProgressBar
                                    variant={getStatusColor(system.status)}
                                    now={system.health}
                                    style={{ height: '4px' }}
                                />
                            </Col>
                        </Row>
                    </div>
                ))}

                <div className="text-center mt-3">
                    <small className="text-muted">
                        Last updated at {formatTime(systemData.lastChecked)}
                        {systemData.loading && ' • Refreshing...'}
                    </small>
                </div>
            </Card.Body>
        </Card>
    );
};

export default SystemStatus;