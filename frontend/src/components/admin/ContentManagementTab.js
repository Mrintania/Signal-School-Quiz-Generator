import React from 'react';
import { Card, Button } from 'react-bootstrap';

const ContentManagementTab = () => {
  return (
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
  );
};

export default ContentManagementTab;