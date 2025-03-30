// frontend/src/components/admin/PendingUsers.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';

const PendingUsers = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verifying, setVerifying] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);

    // Fetch pending users on component mount
    useEffect(() => {
        fetchPendingUsers();
    }, []);

    // Function to fetch pending users
    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/auth/pending-users');

            if (response.data.success) {
                setPendingUsers(response.data.users);
            } else {
                setError(response.data.message || 'Failed to fetch pending users');
            }
        } catch (error) {
            setError(error.message || 'An error occurred while fetching pending users');
        } finally {
            setLoading(false);
        }
    };

    // Function to verify a user
    const verifyUser = async (userId) => {
        try {
            setVerifying(prev => ({ ...prev, [userId]: true }));
            setError(null);

            const response = await api.post(`/auth/verify-user/${userId}`);

            if (response.data.success) {
                // Success - remove the user from the pending list
                setPendingUsers(prev => prev.filter(user => user.id !== userId));
                setSuccessMessage(response.data.message);

                // Clear success message after 5 seconds
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 5000);
            } else {
                setError(response.data.message || 'Failed to verify user');
            }
        } catch (error) {
            setError(error.message || 'An error occurred while verifying the user');
        } finally {
            setVerifying(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Render loading state
    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading pending users...</p>
            </div>
        );
    }

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Pending User Verifications</h4>
                <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={fetchPendingUsers}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                    </svg>
                    Refresh
                </Button>
            </Card.Header>
            <Card.Body>
                {/* Error message */}
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        {error}
                    </Alert>
                )}

                {/* Success message */}
                {successMessage && (
                    <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
                        {successMessage}
                    </Alert>
                )}

                {pendingUsers.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="mb-0 text-muted">No pending user verifications</p>
                    </div>
                ) : (
                    <Table responsive hover>
                        <thead className="bg-light">
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Date Registered</th>
                                <th>School/Organization</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.firstName} {user.lastName}</td>
                                    <td>{user.email}</td>
                                    <td>{new Date(user.createdAt).toLocaleString()}</td>
                                    <td>{user.schoolName || '-'}</td>
                                    <td>
                                        <Badge bg="warning">Pending</Badge>
                                    </td>
                                    <td>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => verifyUser(user.id)}
                                            disabled={verifying[user.id]}
                                        >
                                            {verifying[user.id] ? (
                                                <>
                                                    <Spinner
                                                        as="span"
                                                        animation="border"
                                                        size="sm"
                                                        role="status"
                                                        aria-hidden="true"
                                                        className="me-1"
                                                    />
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                                    </svg>
                                                    Verify User
                                                </>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

export default PendingUsers;