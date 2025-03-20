import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Modal, Form, Alert, InputGroup, Dropdown, DropdownButton } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { quizService } from '../services/api';
import { FaEye, FaTrashAlt, FaPlus, FaEdit, FaSearch, FaSortAlphaDown, FaSortAlphaUp, FaSortNumericDown, FaSortNumericUp, FaCheckSquare, FaTasks } from 'react-icons/fa';

const LibraryPage = () => {
  // State for quizzes list and filtered quizzes
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questionCounts, setQuestionCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // State for rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [quizToRename, setQuizToRename] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for sorting functionality
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc' // Newest first by default
  });

  // State for bulk actions
  const [selectedQuizzes, setSelectedQuizzes] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Function to fetch quizzes from API
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await quizService.getAllQuizzes();

      if (response.success) {
        setQuizzes(response.data);
        setFilteredQuizzes(response.data);
        // After fetching quizzes, get question counts
        fetchAllQuestionCounts(response.data);
      } else {
        setError(response.message || 'Failed to fetch quizzes');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Function to fetch question counts for all quizzes
  const fetchAllQuestionCounts = async (quizzesList) => {
    try {
      setLoadingCounts(true);

      // ทำการดึงข้อมูลแบบละเอียดสำหรับแต่ละ quiz ที่ไม่มีข้อมูล questions
      const counts = {};

      // สร้าง array of promises สำหรับการดึงรายละเอียด quiz
      const countPromises = quizzesList.map(async (quiz) => {
        if (!quiz.questions || !Array.isArray(quiz.questions)) {
          try {
            // ดึงข้อมูล quiz แบบละเอียด แทนที่จะใช้ endpoint count ที่ไม่มี
            const response = await quizService.getQuizById(quiz.id);
            if (response.success && response.data && response.data.questions) {
              counts[quiz.id] = response.data.questions.length;
            } else {
              console.warn(`Could not get questions for quiz ID ${quiz.id}`);
              counts[quiz.id] = 0;
            }
          } catch (error) {
            console.error(`Error fetching quiz details for ID ${quiz.id}:`, error);
            counts[quiz.id] = 0;
          }
        } else {
          // ถ้ามีข้อมูล questions อยู่แล้ว ให้ใช้ค่าความยาวของ array
          counts[quiz.id] = quiz.questions.length;
        }
      });

      // รอให้ทุก promise เสร็จสิ้น
      await Promise.all(countPromises);

      setQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching question counts:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  // Function to get question count for a quiz
  const getQuestionCount = (quiz) => {
    // ถ้ามีข้อมูล questions และเป็น array ให้ใช้ค่าความยาวของ array
    if (quiz.questions && Array.isArray(quiz.questions)) {
      return quiz.questions.length;
    }

    // ถ้าไม่มี ให้ใช้ค่าจาก questionCounts หรือ 0
    return questionCounts[quiz.id] || 0;
  };

  // Function to handle single delete button click
  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };

  // Function to close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setQuizToDelete(null);
  };

  // Function to delete a single quiz
  const handleDeleteQuiz = async () => {
    try {
      setDeleteLoading(true);

      const response = await quizService.deleteQuiz(quizToDelete.id);

      if (response.success) {
        // Remove the deleted quiz from the list
        const updatedQuizzes = quizzes.filter(quiz => quiz.id !== quizToDelete.id);
        setQuizzes(updatedQuizzes);
        setFilteredQuizzes(updatedQuizzes);
        // Also remove from selected quizzes if it was selected
        setSelectedQuizzes(prevSelected => prevSelected.filter(id => id !== quizToDelete.id));
        handleCloseDeleteModal();
      } else {
        setError(response.message || 'Failed to delete quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Function to handle rename button click
  const handleRenameClick = (quiz) => {
    setQuizToRename(quiz);
    setNewTitle(quiz.title);
    setShowRenameModal(true);
    setValidated(false);
  };

  // Function to close rename modal
  const handleCloseRenameModal = () => {
    setShowRenameModal(false);
    setQuizToRename(null);
    setNewTitle('');
  };

  // Function to rename quiz
  const handleRenameQuiz = async (e) => {
    e.preventDefault();

    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setRenameLoading(true);

      const response = await quizService.renameQuiz(quizToRename.id, newTitle);

      if (response.success) {
        // Update the quiz name in the list
        const updatedQuizzes = quizzes.map(quiz =>
          quiz.id === quizToRename.id
            ? { ...quiz, title: newTitle }
            : quiz
        );
        setQuizzes(updatedQuizzes);
        setFilteredQuizzes(updatedQuizzes);
        handleCloseRenameModal();
      } else {
        setError(response.message || 'Failed to rename quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setRenameLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredQuizzes(quizzes);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = quizzes.filter(quiz => 
        quiz.title.toLowerCase().includes(lowercasedTerm) || 
        quiz.topic.toLowerCase().includes(lowercasedTerm) ||
        (quiz.student_level && quiz.student_level.toLowerCase().includes(lowercasedTerm))
      );
      setFilteredQuizzes(filtered);
    }
  }, [searchTerm, quizzes]);

  // Function to handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Sorting functionality
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Update selectAll state when selections change
  
  useEffect(() => {
    setSelectAll(selectedQuizzes.length > 0 && selectedQuizzes.length === filteredQuizzes.length);
  }, [selectedQuizzes, filteredQuizzes, sortConfig]);

  // Apply sorting to filtered quizzes
  useEffect(() => {
    let sortedQuizzes = [...filteredQuizzes];
    if (sortConfig.key) {
      sortedQuizzes.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // For string comparison (title, topic)
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Use localeCompare for proper string sorting (handles Thai characters)
          const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        // For date comparison
        if (sortConfig.key === 'created_at') {
          const dateA = new Date(aValue);
          const dateB = new Date(bValue);
          return sortConfig.direction === 'asc' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        
        // For numeric comparison
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      });
    }
    setFilteredQuizzes(sortedQuizzes);
  }, [sortConfig, filteredQuizzes]);

  // Bulk selection functionality
  const handleSelectAll = () => {
    if (selectAll) {
      // If currently all selected, deselect all
      setSelectedQuizzes([]);
    } else {
      // Select all filtered quizzes
      setSelectedQuizzes(filteredQuizzes.map(quiz => quiz.id));
    }
    setSelectAll(!selectAll);
  };
  
  // Function to clear all selections
  const clearAllSelections = () => {
    setSelectedQuizzes([]);
    setSelectAll(false);
  };

  const handleSelectQuiz = (quizId) => {
    setSelectedQuizzes(prevSelected => {
      if (prevSelected.includes(quizId)) {
        // Deselect the quiz
        return prevSelected.filter(id => id !== quizId);
      } else {
        // Select the quiz
        return [...prevSelected, quizId];
      }
    });
  };
  
  // Bulk delete functionality
  const handleBulkDeleteClick = () => {
    if (selectedQuizzes.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const handleCloseBulkDeleteModal = () => {
    setShowBulkDeleteModal(false);
  };

  const handleBulkDeleteQuizzes = async () => {
    try {
      setBulkDeleteLoading(true);
      
      // Create an array of promises for deleting each quiz
      const deletePromises = selectedQuizzes.map(quizId => 
        quizService.deleteQuiz(quizId)
      );
      
      // Execute all delete requests in parallel
      const results = await Promise.allSettled(deletePromises);
      
      // Check results and count successful deletions
      const successCount = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
      
      if (successCount > 0) {
        // Remove deleted quizzes from the state
        const remainingQuizzes = quizzes.filter(quiz => !selectedQuizzes.includes(quiz.id));
        setQuizzes(remainingQuizzes);
        setFilteredQuizzes(remainingQuizzes);
        setSelectedQuizzes([]);
        handleCloseBulkDeleteModal();
        
        // Show success message
        setError(`Successfully deleted ${successCount} ${successCount === 1 ? 'quiz' : 'quizzes'}.`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError('Failed to delete quizzes. Please try again.');
      }
    } catch (error) {
      setError('An error occurred during bulk deletion.');
      console.error('Bulk deletion error:', error);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h2>Library</h2>
            <Link to="/create">
              <Button variant="primary">
                <FaPlus className="me-2" />
                Create New Quiz
              </Button>
            </Link>
          </div>
        </Col>
      </Row>

      {/* Error Message */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Search and Sort Controls */}
      {!loading && !error && quizzes.length > 0 && (
        <Row className="mb-4">
          {/* Search Bar */}
          <Col md={6} className="mb-3 mb-md-0">
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search quizzes by title, topic, or level..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </InputGroup>
          </Col>
          
          {/* Sort Controls */}
          <Col md={6} className="d-flex justify-content-md-end">
            <DropdownButton 
              variant="outline-secondary" 
              title={
                <>
                  Sort by: {sortConfig.key === 'title' 
                  ? 'Alphabetical' 
                  : sortConfig.key === 'created_at' 
                  ? 'Date Created' 
                  : 'Custom'}
                </>
              }
              className="me-2"
            >
              <Dropdown.Item 
                onClick={() => requestSort('title')} 
                active={sortConfig.key === 'title'}
              >
                {sortConfig.key === 'title' && sortConfig.direction === 'asc' 
                  ? <FaSortAlphaDown className="me-2" /> 
                  : <FaSortAlphaUp className="me-2" />}
                Alphabetical (A-Z / ก-ฮ)
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => requestSort('created_at')} 
                active={sortConfig.key === 'created_at'}
              >
                {sortConfig.key === 'created_at' && sortConfig.direction === 'asc' 
                  ? <FaSortNumericDown className="me-2" /> 
                  : <FaSortNumericUp className="me-2" />}
                Date Created
              </Dropdown.Item>
            </DropdownButton>
            
            {/* Bulk Action Dropdown */}
            <DropdownButton
              variant={selectedQuizzes.length > 0 ? "primary" : "outline-secondary"}
              title={
                <>
                  <FaTasks className="me-2" />
                  Bulk Action {selectedQuizzes.length > 0 ? `(${selectedQuizzes.length})` : ""}
                </>
              }
              disabled={selectedQuizzes.length === 0}
            >
              <Dropdown.Item 
                onClick={handleBulkDeleteClick}
                disabled={selectedQuizzes.length === 0}
                className="text-danger"
              >
                <FaTrashAlt className="me-2" />
                Delete Selected
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item 
                onClick={clearAllSelections}
                disabled={selectedQuizzes.length === 0}
              >
                <FaCheckSquare className="me-2" />
                Clear Selection
              </Dropdown.Item>
              {/* Additional bulk actions can be added here */}
            </DropdownButton>
          </Col>
        </Row>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {/* No Quizzes Message */}
      {!loading && !error && quizzes.length === 0 && (
        <Card className="text-center py-5">
          <Card.Body>
            <h4>คุณยังไม่มีข้อสอบ</h4>
            <p className="text-muted mb-4">สร้างข้อสอบแรกของคุณเพื่อเริ่มต้น</p>
            <Link to="/create">
              <Button variant="primary" size="lg">
                <FaPlus className="me-2" />
                สร้างข้อสอบใหม่
              </Button>
            </Link>
          </Card.Body>
        </Card>
      )}
      
      {/* Search Results Info */}
      {!loading && !error && quizzes.length > 0 && searchTerm && (
        <div className="mb-3">
          <p className="text-muted">
            Showing {filteredQuizzes.length} of {quizzes.length} quizzes for search term: "{searchTerm}"
          </p>
        </div>
      )}

      {/* Select All Checkbox */}
      {!loading && !error && filteredQuizzes.length > 0 && (
        <div className="mb-3 d-flex align-items-center">
          <Form.Check
            type="checkbox"
            id="select-all-checkbox"
            checked={selectAll}
            onChange={handleSelectAll}
            label={`Select All (${filteredQuizzes.length})`}
          />
        </div>
      )}

      {/* Quizzes List */}
      {!loading && !error && filteredQuizzes.length > 0 && (
        <Row xs={1} md={2} lg={3} className="g-4">
          {filteredQuizzes.map(quiz => (
            <Col key={quiz.id}>
              <Card className={`h-100 shadow-sm ${selectedQuizzes.includes(quiz.id) ? 'border-primary' : ''}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Form.Check
                      type="checkbox"
                      id={`quiz-checkbox-${quiz.id}`}
                      checked={selectedQuizzes.includes(quiz.id)}
                      onChange={() => handleSelectQuiz(quiz.id)}
                      className="me-2"
                    />
                    <div className="flex-grow-1">
                      <Card.Title>{quiz.title}</Card.Title>
                      <Card.Subtitle className="mb-3 text-muted">
                        {quiz.topic}
                      </Card.Subtitle>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Badge bg="primary" className="me-2">
                      {quiz.question_type === 'Multiple Choice' ? 'Multiple Choice' : 'Essay'}
                    </Badge>
                    {quiz.student_level && (
                      <Badge bg="secondary">
                        {quiz.student_level}
                      </Badge>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <p className="text-muted mb-0">
                      Created: {formatDate(quiz.created_at)}
                    </p>
                    <Badge bg="info">
                      {getQuestionCount(quiz)} Questions
                      {loadingCounts && !questionCounts[quiz.id] && !quiz.questions &&
                        <Spinner animation="border" size="sm" className="ms-1" />}
                    </Badge>
                  </div>

                </Card.Body>
                <Card.Footer className="bg-white border-top-0">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Link to={`/view/${quiz.id}`}>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          <FaEye className="me-1" />
                          See Quiz
                        </Button>
                      </Link>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleRenameClick(quiz)}
                      >
                        <FaEdit className="me-1" />
                        Rename
                      </Button>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteClick(quiz)}
                    >
                      <FaTrashAlt className="me-1" />
                      Delete
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the quiz "{quizToDelete?.title}"? This action is irreversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteQuiz}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal show={showBulkDeleteModal} onHide={handleCloseBulkDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Multiple Quizzes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete {selectedQuizzes.length} {selectedQuizzes.length === 1 ? 'quiz' : 'quizzes'}? This action is irreversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBulkDeleteModal}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDeleteQuizzes}
            disabled={bulkDeleteLoading}
          >
            {bulkDeleteLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              `Delete ${selectedQuizzes.length} ${selectedQuizzes.length === 1 ? 'Quiz' : 'Quizzes'}`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rename Modal */}
      <Modal show={showRenameModal} onHide={handleCloseRenameModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rename Quiz</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={validated} onSubmit={handleRenameQuiz}>
          <Modal.Body>
            <Form.Group controlId="quizTitle">
              <Form.Label>New Quiz Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a new name for the quiz"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <Form.Control.Feedback type="invalid">
                Please enter a new name for the quiz
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRenameModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={renameLoading}>
              {renameLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default LibraryPage;