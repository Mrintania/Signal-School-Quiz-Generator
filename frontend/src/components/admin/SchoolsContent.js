import React from 'react';
import { Card, Button } from 'react-bootstrap';

const SchoolsContent = () => {
    return (
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
    );
};

export default SchoolsContent;