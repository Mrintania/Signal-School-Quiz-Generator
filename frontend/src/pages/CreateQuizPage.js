import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Spinner, ProgressBar, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQuizContext } from '../context/QuizContext';
import { quizService } from '../services/api';

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const { setGeneratedQuiz } = useQuizContext();
  const fileInputRef = useRef(null);

  // Existing states
  const [activeSource, setActiveSource] = useState('topic');
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webpageLoaded, setWebpageLoaded] = useState(false);

  // New file upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');

  const [formData, setFormData] = useState({
    topic: '',
    text: '',
    webpage: '',
    questionType: 'Multiple Choice',
    numberOfQuestions: 10,
    additionalInstructions: '',
    studentLevel: '',
    outputLanguage: 'Thai'
  });

  // Existing handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'webpage' && value) {
      setWebpageLoaded(true);
    }
  };

  const handleIdeasButtonClick = () => {
    const ideas = [
      "AI and Machine Learning Fundamentals",
      "Network Security and Cybersecurity",
      "Database Management Systems",
      "Software Engineering Principles",
      "Computer Architecture and Organization",
      "Data Structures and Algorithms"
    ];
    
    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
    setFormData(prev => ({
      ...prev,
      topic: randomIdea
    }));
    setActiveSource('topic');
  };

  // New file upload handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setFileError('รองรับเฉพาะไฟล์ PDF, DOCX และ TXT เท่านั้น');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
      return;
    }

    setSelectedFile(file);
    setFileError('');
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') return '📄';
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📝';
    if (fileType === 'text/plain') return '📋';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Updated submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      // Handle file upload separately
      if (activeSource === 'file') {
        if (!selectedFile) {
          setFileError('กรุณาเลือกไฟล์ที่ต้องการอัพโหลด');
          setLoading(false);
          return;
        }

        // Create FormData for file upload
        const formDataWithFile = new FormData();
        formDataWithFile.append('file', selectedFile);
        formDataWithFile.append('settings', JSON.stringify({
          questionType: formData.questionType,
          numberOfQuestions: formData.numberOfQuestions,
          additionalInstructions: formData.additionalInstructions,
          studentLevel: formData.studentLevel,
          outputLanguage: formData.outputLanguage
        }));

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 500);

        try {
          // Call file upload API
          const response = await quizService.generateQuizFromFile(formDataWithFile, {
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (response.success) {
            // Store generated quiz in context
            setGeneratedQuiz({
              ...response.data,
              formData: {
                ...formData,
                fileName: selectedFile.name,
                fileSize: selectedFile.size
              }
            });

            // Navigate to the result page
            navigate('/result');
          } else {
            setError(response.message || 'ไม่สามารถสร้างข้อสอบจากไฟล์ได้');
          }
        } catch (apiError) {
          clearInterval(progressInterval);
          setError('เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
          console.error('File upload error:', apiError);
        }
      } else {
        // Handle regular quiz generation (existing logic)
        let dataToSend = { ...formData };

        if (activeSource === 'text' && formData.text) {
          dataToSend.additionalInstructions =
            `${dataToSend.additionalInstructions} Generate questions based on the following text content: ${formData.text}`;

          if (!dataToSend.topic || dataToSend.topic.trim() === '') {
            dataToSend.topic = 'Text Content';
          }
        } else if (activeSource === 'webpage' && formData.webpage) {
          dataToSend.additionalInstructions =
            `${dataToSend.additionalInstructions} Generate questions based on content from this webpage URL: ${formData.webpage}`;

          if (!dataToSend.topic || dataToSend.topic.trim() === '') {
            dataToSend.topic = `Webpage: ${formData.webpage}`;
          }
        }

        // Call API to generate quiz
        const response = await quizService.generateQuiz(dataToSend);

        if (response.success) {
          // Store generated quiz in context
          setGeneratedQuiz({
            ...response.data,
            formData: dataToSend
          });

          // Navigate to the result page
          navigate('/result');
        } else {
          setError(response.message || 'Failed to generate quiz');
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 3000);
    }
  };

  return (
    <Container fluid className="py-4 px-4">
      {/* Header section with back and ideas buttons */}
      <Row className="mb-4">
        <Col xs={6} className="text-start">
          <Link to="/">
            <Button variant="light" className="rounded-pill shadow-sm">
              <span className="me-2">←</span> Back
            </Button>
          </Link>
        </Col>
        <Col xs={6} className="text-end">
          <Button
            variant="warning"
            className="rounded-pill shadow-sm"
            onClick={handleIdeasButtonClick}
          >
            <span className="me-2">💡</span> Ideas
          </Button>
        </Col>
      </Row>

      {/* Main content card */}
      <Row className="justify-content-center">
        <Col lg={10} xl={8}>
          <Card className="border-0 shadow">
            <Card.Body className="p-4">
              {/* Title and description */}
              <div className="text-center mb-4">
                <div className="d-inline-block p-3 mb-3 rounded-circle bg-light">
                  <span role="img" aria-label="light-bulb" style={{ fontSize: '2rem' }}>💡</span>
                </div>
                <h2 className="mb-3">Create Quiz</h2>
                <p className="text-muted">
                  Build a custom quiz from any source - topic, text, webpage, or document
                </p>
              </div>

              {/* Input source tabs */}
              <Nav
                variant="pills"
                className="nav-justified bg-light p-2 rounded-pill mb-4"
                activeKey={activeSource}
                onSelect={(key) => setActiveSource(key)}
              >
                <Nav.Item>
                  <Nav.Link
                    eventKey="topic"
                    className={`rounded-pill ${activeSource === 'topic' ? 'bg-white shadow-sm text-primary' : 'text-dark'}`}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      <span className="me-2">✏️</span>
                      <span className={activeSource === 'topic' ? 'fw-bold' : ''}>Topic</span>
                    </div>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="text"
                    className={`rounded-pill ${activeSource === 'text' ? 'bg-white shadow-sm text-primary' : 'text-dark'}`}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      <span className="me-2">📄</span>
                      <span className={activeSource === 'text' ? 'fw-bold' : ''}>Text</span>
                    </div>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="webpage"
                    className={`rounded-pill ${activeSource === 'webpage' ? 'bg-white shadow-sm text-primary' : 'text-dark'}`}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      <span className="me-2">🌐</span>
                      <span className={activeSource === 'webpage' ? 'fw-bold' : ''}>Webpage</span>
                    </div>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="file"
                    className={`rounded-pill ${activeSource === 'file' ? 'bg-white shadow-sm text-primary' : 'text-dark'}`}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      <span className="me-2">📁</span>
                      <span className={activeSource === 'file' ? 'fw-bold' : ''}>File</span>
                      <span className="ms-2" style={{ fontSize: '0.7rem' }}>🔥</span>
                    </div>
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              {/* Form content based on active source */}
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                {/* Topic input section */}
                {activeSource === 'topic' && (
                  <div className="mb-4">
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="topic"
                      value={formData.topic}
                      onChange={handleChange}
                      placeholder="Enter topic. eg: Solar system, Photosynthesis"
                      required
                      className="border-light shadow-sm p-3 mb-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a topic.
                    </Form.Control.Feedback>
                  </div>
                )}

                {/* Text input section */}
                {activeSource === 'text' && (
                  <div className="mb-4">
                    <Form.Control
                      as="textarea"
                      rows={6}
                      name="text"
                      value={formData.text}
                      onChange={handleChange}
                      placeholder="Enter or paste your text content here. The AI will generate questions based on this text."
                      required
                      className="border-light shadow-sm p-3 mb-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide text content.
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Paste any educational content, and the AI will create relevant questions from it.
                    </Form.Text>
                  </div>
                )}

                {/* Webpage input section */}
                {activeSource === 'webpage' && (
                  <div className="mb-4">
                    <Form.Control
                      type="url"
                      name="webpage"
                      value={formData.webpage}
                      onChange={handleChange}
                      placeholder="https://example.com/educational-content"
                      required
                      className="border-light shadow-sm p-3 mb-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a valid webpage URL.
                    </Form.Control.Feedback>
                    {webpageLoaded && (
                      <div className="alert alert-success mt-2">
                        <small>Webpage content loaded successfully! The AI will generate questions based on this webpage.</small>
                      </div>
                    )}
                    <Form.Text className="text-muted">
                      Enter a URL to a webpage with educational content. The AI will extract and use this content to generate questions.
                    </Form.Text>
                  </div>
                )}

                {/* File input section - NOW FUNCTIONAL */}
                {activeSource === 'file' && (
                  <div className="mb-4">
                    <div 
                      className={`border border-dashed rounded p-4 text-center mb-3 ${
                        isDragOver ? 'border-primary bg-light' : 'border-secondary'
                      } ${selectedFile ? 'border-success bg-light' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      style={{ cursor: 'pointer', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={!selectedFile ? handleBrowseClick : undefined}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                        disabled={loading}
                      />
                      
                      {!selectedFile ? (
                        <div>
                          <span className="d-block mb-3" style={{ fontSize: '2rem' }}>📁</span>
                          <p className="mb-2">Drag and drop your file here, or click to browse</p>
                          <small className="text-muted d-block mb-3">Supported formats: PDF, DOCX, TXT</small>
                          <Button variant="outline-primary" size="sm" disabled={loading}>
                            Browse Files
                          </Button>
                        </div>
                      ) : (
                        <div className="w-100">
                          <div className="d-flex align-items-center justify-content-between bg-white rounded p-3 border">
                            <div className="d-flex align-items-center">
                              <span className="me-2" style={{ fontSize: '1.5rem' }}>
                                {getFileIcon(selectedFile.type)}
                              </span>
                              <div>
                                <div className="fw-bold">{selectedFile.name}</div>
                                <small className="text-muted">{formatFileSize(selectedFile.size)}</small>
                              </div>
                            </div>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile();
                              }}
                              disabled={loading}
                            >
                              <i className="bi bi-x-lg"></i>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {fileError && (
                      <Alert variant="danger" className="mt-2">
                        {fileError}
                      </Alert>
                    )}
                    
                    <Form.Text className="text-muted">
                      Upload PDF, DOCX, or TXT files. The AI will analyze the content and generate relevant questions.
                    </Form.Text>
                  </div>
                )}

                {/* Quiz configuration section */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Question type</Form.Label>
                      <Form.Select
                        name="questionType"
                        value={formData.questionType}
                        onChange={handleChange}
                        className="border-light shadow-sm"
                        disabled={loading}
                      >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Essay">Essay</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Number of questions</Form.Label>
                      <Form.Select
                        name="numberOfQuestions"
                        value={formData.numberOfQuestions}
                        onChange={handleChange}
                        className="border-light shadow-sm"
                        disabled={loading}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Additional instructions */}
                <Form.Group className="mb-4">
                  <Form.Label>Additional instructions (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="additionalInstructions"
                    value={formData.additionalInstructions}
                    onChange={handleChange}
                    placeholder="Specify any additional requirements for the quiz."
                    className="border-light shadow-sm"
                    disabled={loading}
                  />
                </Form.Group>

                {/* Student level and output language */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Student level (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        name="studentLevel"
                        value={formData.studentLevel}
                        onChange={handleChange}
                        placeholder="Specify the level of your students. e.g"
                        className="border-light shadow-sm"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Output language</Form.Label>
                      <Form.Select
                        name="outputLanguage"
                        value={formData.outputLanguage}
                        onChange={handleChange}
                        className="border-light shadow-sm"
                        disabled={loading}
                      >
                        <option value="Thai">Thai (ไทย)</option>
                        <option value="English">English</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Progress Bar for file upload */}
                {loading && activeSource === 'file' && (
                  <div className="mb-3">
                    <ProgressBar 
                      now={uploadProgress} 
                      label={`${uploadProgress}%`}
                      className="mb-2"
                    />
                    <div className="text-center">
                      <small className="text-muted">
                        {uploadProgress < 30 && 'กำลังอัพโหลดไฟล์...'}
                        {uploadProgress >= 30 && uploadProgress < 70 && 'กำลังประมวลผลเอกสาร...'}
                        {uploadProgress >= 70 && uploadProgress < 100 && 'กำลังสร้างข้อสอบ...'}
                        {uploadProgress === 100 && 'เสร็จสิ้น!'}
                      </small>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                {/* Submit button */}
                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading || (activeSource === 'file' && !selectedFile)}
                    className="rounded-pill py-3"
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        {activeSource === 'file' ? 'กำลังประมวลผลไฟล์...' : 'กำลังสร้างข้อสอบ...'}
                      </>
                    ) : (
                      <>
                        <span className="me-2">✨</span>
                        Generate Quiz
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateQuizPage;