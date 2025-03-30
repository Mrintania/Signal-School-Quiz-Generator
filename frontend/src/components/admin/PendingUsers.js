import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { adminService } from '../../services/api';

const PendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyingUser, setVerifyingUser] = useState(null);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        setLoading(true);
        const response = await adminService.getPendingUsers();
        
        if (response.success) {
          setPendingUsers(response.users || []);
        } else {
          throw new Error(response.message || 'Failed to fetch pending users');
        }
      } catch (error) {
        console.error('Error fetching pending users:', error);
        setError(error.message || 'An error occurred while fetching pending users');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingUsers();
  }, []);

  const handleVerifyUser = async (userId) => {
    try {
      setVerifyingUser(userId);
      const response = await adminService.verifyUser(userId);
      
      if (response.success) {
        // Remove the verified user from the list
        setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      } else {
        throw new Error(response.message || 'Failed to verify user');
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      setError(error.message || 'An error occurred while verifying the user');
    } finally {
      setVerifyingUser(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Pending User Verifications</h5>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading pending users...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Pending User Verifications</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Pending User Verifications</h5>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="text-success mb-3" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
            </svg>
            <p className="mb-0 text-muted">No pending user verifications.</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Pending User Verifications</h5>
          <Badge bg="warning">{pendingUsers.length} Pending</Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <Table responsive hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>School</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map(user => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.schoolName || '-'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleVerifyUser(user.id)}
                    disabled={verifyingUser === user.id}
                  >
                    {verifyingUser === user.id ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="visually-hidden">Loading...</span>
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default PendingUsers;