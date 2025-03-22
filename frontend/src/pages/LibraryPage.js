import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { LibraryProvider, useLibrary } from '../context/LibraryContext';

// Import components
import SearchBar from '../components/library/SearchBar';
import ActionButtons from '../components/library/ActionButtons';
import LibraryTable from '../components/library/LibraryTable';
import BreadcrumbNav from '../components/library/BreadcrumbNav';

// Import modals
import CreateFolderModal from '../components/library/modals/CreateFolderModal';
import RenameFolderModal from '../components/library/modals/RenameFolderModal';
import DeleteFolderModal from '../components/library/modals/DeleteFolderModal';
import RenameQuizModal from '../components/library/modals/RenameQuizModal';
import DeleteQuizModal from '../components/library/modals/DeleteQuizModal';
import MoveModal from '../components/library/modals/MoveModal';

// LibraryPageContent component (uses context)
const LibraryPageContent = () => {
  const { 
    successMessage, 
    setSuccessMessage,
    error,
    setError,
    selectedFolder,
    selectedQuiz,
    setSelectedQuiz
  } = useLibrary();
  
  // Modal visibility states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showRenameQuizModal, setShowRenameQuizModal] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  // Folder action handler
  const handleFolderAction = (folder, action) => {
    if (action === 'rename') {
      setShowRenameFolderModal(true);
    } else if (action === 'delete') {
      setShowDeleteFolderModal(true);
    }
  };
  
  // Quiz action handler
  const handleQuizAction = (quiz, action) => {
    setSelectedQuiz(quiz);
    
    if (action === 'rename') {
      setShowRenameQuizModal(true);
    } else if (action === 'delete') {
      setShowDeleteQuizModal(true);
    } else if (action === 'move') {
      setShowMoveModal(true);
    }
  };
  
  return (
    <Container fluid className="py-4 px-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">My Library</h2>
        </Col>
      </Row>
      
      {/* Breadcrumb navigation */}
      <BreadcrumbNav />
      
      {/* Search and Action Buttons */}
      <Row className="mb-4 align-items-center">
        <Col md={6} lg={4}>
          <SearchBar />
        </Col>
        <Col md={6} lg={8} className="text-md-end mt-3 mt-md-0">
          <ActionButtons onCreateFolder={() => setShowCreateFolderModal(true)} />
        </Col>
      </Row>
      
      {/* Alert Messages */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          {successMessage}
        </Alert>
      )}
      
      {/* Library Table */}
      <LibraryTable 
        onFolderAction={handleFolderAction}
        onQuizAction={handleQuizAction}
      />
      
      {/* Modals */}
      <CreateFolderModal 
        show={showCreateFolderModal} 
        onHide={() => setShowCreateFolderModal(false)} 
      />
      
      <RenameFolderModal 
        show={showRenameFolderModal}
        folder={selectedFolder}
        onHide={() => setShowRenameFolderModal(false)} 
      />
      
      <DeleteFolderModal 
        show={showDeleteFolderModal}
        folder={selectedFolder}
        onHide={() => setShowDeleteFolderModal(false)} 
      />
      
      <RenameQuizModal 
        show={showRenameQuizModal}
        quiz={selectedQuiz}
        onHide={() => setShowRenameQuizModal(false)} 
      />
      
      <DeleteQuizModal 
        show={showDeleteQuizModal}
        quiz={selectedQuiz}
        onHide={() => setShowDeleteQuizModal(false)} 
      />
      
      <MoveModal 
        show={showMoveModal}
        quiz={selectedQuiz}
        onHide={() => setShowMoveModal(false)} 
      />
    </Container>
  );
};

// Main Library Page component
const LibraryPage = () => {
  return (
    <LibraryProvider>
      <LibraryPageContent />
    </LibraryProvider>
  );
};

export default LibraryPage;