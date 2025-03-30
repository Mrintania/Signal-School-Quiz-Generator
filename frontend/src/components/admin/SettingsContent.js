import React from 'react';
import { Card } from 'react-bootstrap';

const SettingsContent = () => {
    return (
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
    );
};

export default SettingsContent;