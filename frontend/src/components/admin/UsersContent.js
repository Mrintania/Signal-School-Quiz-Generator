import React from 'react';
import { Card, Button } from 'react-bootstrap';
import PendingUsers from './PendingUsers';

const UsersContent = () => {
    return (
        <>
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
        </>
    );
};

export default UsersContent;