import React from 'react';

const LoadingOverlay = ({ isLoading, message = 'Loading...' }) => {
    if (!isLoading) return null;

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                zIndex: 9999
            }}
        >
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="h5 text-center">{message}</p>
        </div>
    );
};

export default LoadingOverlay;