import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

// FolderIcon component
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
  </svg>
);

// StarIcon component
const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 0.25a0.75 0.75 0 0 1 0.673 0.418l1.882 3.815 4.21 0.612a0.75 0.75 0 0 1 0.416 1.279l-3.046 2.97 0.719 4.192a0.75 0.75 0 0 1-1.088 0.791L8 12.347l-3.766 1.98a0.75 0.75 0 0 1-1.088-0.79l0.72-4.194L0.818 6.374a0.75 0.75 0 0 1 0.416-1.28l4.21-0.611L7.327 0.668A0.75 0.75 0 0 1 8 0.25z" />
  </svg>
);

const ActionButtons = ({ onCreateFolder }) => {
  return (
    <div className="text-md-end">
      <Button
        variant="light"
        className="me-2 border"
        onClick={onCreateFolder}
      >
        <FolderIcon /> Folder
      </Button>
      <Link to="/create">
        <Button variant="warning" style={{ backgroundColor: '#D7FC70', color: '#000', borderColor: '#D7FC70' }}>
          <StarIcon className="me-1" /> Create new
        </Button>
      </Link>
    </div>
  );
};

export default ActionButtons;