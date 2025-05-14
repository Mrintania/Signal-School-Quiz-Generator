// Updates for CreateQuizPage.js to add file upload functionality

import React, { useState, useRef } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Card, Nav, InputGroup, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { quizService } from '../services/api';
import { useQuizContext } from '../context/QuizContext';
import { sampleTopics, handleIdeasClick } from '../utils/ideas';

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const { setGeneratedQuiz, setLoading, loading, setError } = useQuizContext();
  const fileInputRef = useRef(null);

  const handleIdeasButtonClick = () => {
    handleIdeasClick(setFormData, setActiveSource);
  };

  // Input source tabs
  const [activeSource, setActiveSource] = useState('topic');

  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    text: '',
    webpage: '',
    questionType: 'Multiple Choice',
    numberOfQuestions: '10',
    additionalInstructions: '',
    studentLevel: '',
    language: 'thai'
  });

  const [quotaInfo, setQuotaInfo] = useState({
    isShowingQuotaInfo: false,
    message: '',
    isWaiting: false,
    retryCount: 0,
    maxRetries: 0
  });

  // File upload states
  const [fileData, setFileData] = useState({
    file: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    isUploading: false,
    uploadProgress: 0,
    isFileValid: true,
    fileError: ''
  });

  // Form validation state
  const [validated, setValidated] = useState(false);

  // State for webpage loading
  const [isLoadingWebpage, setIsLoadingWebpage] = useState(false);
  const [webpageLoaded, setWebpageLoaded] = useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    // Reset error state
    let isFileValid = true;
    let fileError = '';

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (file && !allowedTypes.includes(file.type)) {
      isFileValid = false;
      fileError = 'Unsupported file type. Only PDF, DOCX, and TXT files are supported.';

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setFileData({
        file: null,
        fileName: '',
        fileSize: 0,
        fileType: '',
        isUploading: false,
        uploadProgress: 0,
        isFileValid: false,
        fileError
      });

      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file && file.size > maxSize) {
      isFileValid = false;
      fileError = 'File is too large. Maximum file size is 10MB.';

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setFileData({
        file: null,
        fileName: '',
        fileSize: 0,
        fileType: '',
        isUploading: false,
        uploadProgress: 0,
        isFileValid: false,
        fileError
      });

      return;
    }

    // If file is valid, update state
    if (file) {
      setFileData({
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isUploading: false,
        uploadProgress: 0,
        isFileValid: true,
        fileError: ''
      });
    } else {
      setFileData({
        file: null,
        fileName: '',
        fileSize: 0,
        fileType: '',
        isUploading: false,
        uploadProgress: 0,
        isFileValid: true,
        fileError: ''
      });
    }
  };

  // Handle file drop
  const handleFileDrop = (e) => {
    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      // Set file in file input for consistency
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }

      // Process the file
      handleFileChange({ target: { files: [file] } });
    }
  };

  // Handle webpage loading (simulation)
  const handleLoadWebpage = () => {
    if (!formData.webpage) return;

    setIsLoadingWebpage(true);

    // Simulated loading
    setTimeout(() => {
      setIsLoadingWebpage(false);
      setWebpageLoaded(true);
    }, 1500);
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    // Validate based on active source
    if (activeSource === 'file' && !fileData.file) {
      setFileData(prev => ({
        ...prev,
        isFileValid: false,
        fileError: 'Please select a file to generate quiz questions.'
      }));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`Starting quiz generation from ${activeSource} source`);

      // Add loading state for file upload
      if (activeSource === 'file') {
        setFileData(prev => ({
          ...prev,
          isUploading: true,
          uploadProgress: 0
        }));
      }

      let response;

      // Handle different sources
      if (activeSource === 'file') {
        // Show file info for debugging
        console.log('File selected:', {
          name: fileData.fileName,
          size: fileData.fileSize,
          type: fileData.fileType
        });

        // Create FormData for file upload
        const formDataObj = new FormData();
        formDataObj.append('quizFile', fileData.file);
        formDataObj.append('questionType', formData.questionType);
        formDataObj.append('numberOfQuestions', formData.numberOfQuestions);
        formDataObj.append('studentLevel', formData.studentLevel || '');
        formDataObj.append('language', formData.language || 'thai');
        formDataObj.append('additionalInstructions', formData.additionalInstructions || '');

        console.log('Uploading file and generating quiz...');

        // Upload file and generate quiz with progress tracking
        try {
          // Set up progress tracking
          const uploadTracker = (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFileData(prev => ({
              ...prev,
              uploadProgress: percentCompleted
            }));
          };

          // Call the service with progress tracking
          response = await quizService.generateQuizFromFile(formDataObj, uploadTracker);
          console.log('Quiz generation response:', response);
        } catch (uploadError) {
          // Reset upload state
          setFileData(prev => ({
            ...prev,
            isUploading: false,
            isFileValid: false,
            fileError: uploadError.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
          }));

          throw uploadError; // Re-throw to be caught by outer error handler
        }
      } else {
        // Handle other source types (topic, text, webpage)
        let dataToSend = { ...formData };

        // Adjust data based on source type
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

        console.log('Generating quiz with data:', dataToSend);

        // Call API to generate quiz
        response = await quizService.generateQuiz(dataToSend);
        console.log('Quiz generation response:', response);
      }

      if (response.success) {
        // Store generated quiz in context
        setGeneratedQuiz({
          ...response.data,
          formData
        });

        // Navigate to result page
        navigate('/result');
      } else {
        console.error('API returned success=false:', response.message);
        setError(response.message || 'การสร้างข้อสอบล้มเหลว');

        // Update file data state for file uploads
        if (activeSource === 'file') {
          setFileData(prev => ({
            ...prev,
            isUploading: false,
            isFileValid: false,
            fileError: response.message || 'การสร้างข้อสอบจากไฟล์ล้มเหลว'
          }));
        }
      }
    } catch (error) {
      console.error('Error during quiz generation:', error);

      // Clear loading states
      setLoading(false);
      if (activeSource === 'file') {
        setFileData(prev => ({
          ...prev,
          isUploading: false
        }));
      }

      // Improved error message handling
      let errorMessage = 'เกิดข้อผิดพลาดในระหว่างการสร้างข้อสอบ';

      // Handle different error scenarios
      if (error.response) {
        // Handle HTTP error responses
        const status = error.response.status;
        const serverMessage = error.response.data?.message;

        if (status === 429) {
          errorMessage = 'เกินโควต้าการใช้งาน AI กรุณาลองใหม่ในภายหลัง (1-2 นาที)';

          // Show quota info alert
          setQuotaInfo({
            isShowingQuotaInfo: true,
            message: serverMessage || 'คุณได้ใช้โควต้า AI เกินกำหนด กรุณารอสักครู่ก่อนลองใหม่',
            isWaiting: false,
            retryCount: 0,
            maxRetries: 3
          });
        } else if (status === 413) {
          errorMessage = 'ไฟล์มีขนาดใหญ่เกินไป (ขนาดสูงสุด 10MB)';
        } else if (status === 415) {
          errorMessage = 'รูปแบบไฟล์ไม่รองรับ กรุณาใช้ไฟล์ PDF, DOCX หรือ TXT';
        } else if (status === 503 || status === 504) {
          errorMessage = 'บริการประมวลผลไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ในภายหลัง';
        } else if (serverMessage) {
          errorMessage = serverMessage;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'การเชื่อมต่อกับเซิร์ฟเวอร์หมดเวลา กรุณาลองใหม่ภายหลัง';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // For file uploads, update file state with error
      if (activeSource === 'file') {
        setFileData(prev => ({
          ...prev,
          isFileValid: false,
          fileError: errorMessage
        }));
      }
    } finally {
      setLoading(false);

      // Reset upload state
      if (activeSource === 'file') {
        setFileData(prev => ({
          ...prev,
          isUploading: false
        }));
      }
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
                      placeholder="Enter or paste your text content here. The quiz will be generated based on this content."
                      required={activeSource === 'text'}
                      className="border-light shadow-sm p-3"
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide some text content.
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted mt-2">
                      The AI will generate questions based on the text you provide here.
                    </Form.Text>
                  </div>
                )}

                {/* Webpage input section */}
                {activeSource === 'webpage' && (
                  <div className="mb-4">
                    <InputGroup className="mb-2">
                      <Form.Control
                        type="url"
                        name="webpage"
                        value={formData.webpage}
                        onChange={handleChange}
                        placeholder="Enter a webpage URL (https://...)"
                        required={activeSource === 'webpage'}
                        className="border-light shadow-sm p-3"
                        disabled={isLoadingWebpage}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={handleLoadWebpage}
                        disabled={!formData.webpage || isLoadingWebpage}
                      >
                        {isLoadingWebpage ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Loading...
                          </>
                        ) : 'Load'}
                      </Button>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      Please provide a valid URL.
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
                  <>
                    <div
                      className={`border rounded p-5 text-center ${fileData.isFileValid ? 'border-light bg-light' : 'border-danger bg-danger bg-opacity-10'}`}
                      style={{ borderStyle: 'dashed' }}
                      onDrop={handleFileDrop}
                      onDragOver={handleDragOver}
                    >
                      {!fileData.file ? (
                        // File selection UI - No changes
                        <>
                          <span className="d-block mb-3" style={{ fontSize: '2rem' }}>📁</span>
                          <p className="mb-2">Drag and drop your file here, or click to browse</p>
                          <small className="text-muted d-block mb-3">Supported formats: PDF, DOCX, TXT</small>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="d-none"
                            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            onChange={handleFileChange}
                          />
                          <Button
                            variant="outline-primary"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Browse Files
                          </Button>
                        </>
                      ) : fileData.isUploading ? (
                        // File upload progress UI - New section
                        <div className="py-3">
                          <div className="d-flex align-items-center justify-content-center mb-3">
                            <span style={{ fontSize: '2rem' }}>
                              {fileData.fileType === 'application/pdf' ? '📄' :
                                fileData.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '📝' :
                                  '📄'}
                            </span>
                          </div>
                          <h5>{fileData.fileName}</h5>
                          <p className="text-muted mb-3">{formatBytes(fileData.fileSize)}</p>

                          {/* Progress bar */}
                          <div className="progress mb-3" style={{ height: '20px' }}>
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated"
                              role="progressbar"
                              style={{ width: `${fileData.uploadProgress}%` }}
                              aria-valuenow={fileData.uploadProgress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            >
                              {fileData.uploadProgress}%
                            </div>
                          </div>

                          <p className="text-primary">
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            กำลังประมวลผลไฟล์ โปรดรอสักครู่...
                          </p>
                        </div>
                      ) : (
                        // Selected file UI - No changes
                        <div className="py-2">
                          <div className="d-flex align-items-center justify-content-center mb-3">
                            <span style={{ fontSize: '2rem' }}>
                              {fileData.fileType === 'application/pdf' ? '📄' :
                                fileData.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '📝' :
                                  '📄'}
                            </span>
                          </div>
                          <h5>{fileData.fileName}</h5>
                          <p className="text-muted mb-3">{formatBytes(fileData.fileSize)}</p>
                          <div className="d-flex gap-2 justify-content-center">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => {
                                setFileData({
                                  file: null,
                                  fileName: '',
                                  fileSize: 0,
                                  fileType: '',
                                  isUploading: false,
                                  uploadProgress: 0,
                                  isFileValid: true,
                                  fileError: ''
                                });
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                            >
                              Remove
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Change File
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File error message */}
                    {!fileData.isFileValid && (
                      <Alert variant="danger" className="mt-2">
                        {fileData.fileError || 'There was a problem with the selected file.'}
                      </Alert>
                    )}

                    <Form.Text className="text-muted mt-2">
                      The AI will analyze the document and generate questions based on its content.
                      Maximum file size: 10MB. Processing large documents may take a minute or more.
                    </Form.Text>
                    {/* เพิ่มส่วนแสดงข้อมูลโควต้า (เมื่อเกิดข้อผิดพลาด 429) */}
                    {quotaInfo.isShowingQuotaInfo && (
                      <Alert variant="warning" className="mt-2">
                        <Alert.Heading>ข้อจำกัดการใช้งาน AI</Alert.Heading>
                        <p>{quotaInfo.message || 'คุณกำลังเข้าใกล้ขีดจำกัดการใช้งาน AI โปรดรอสักครู่ก่อนลองใหม่อีกครั้ง'}</p>

                        {quotaInfo.isWaiting && (
                          <>
                            <div className="d-flex align-items-center mb-2">
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              <span>กำลังรอ... (ครั้งที่ {quotaInfo.retryCount}/{quotaInfo.maxRetries})</span>
                            </div>
                            <div className="progress mb-2" style={{ height: '10px' }}>
                              <div
                                className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                                role="progressbar"
                                style={{ width: `${(quotaInfo.retryCount / quotaInfo.maxRetries) * 100}%` }}
                                aria-valuenow={quotaInfo.retryCount}
                                aria-valuemin="0"
                                aria-valuemax={quotaInfo.maxRetries}
                              ></div>
                            </div>
                          </>
                        )}

                        <p className="mb-0">
                          <small>
                            Google Gemini API มีการจำกัดจำนวนคำขอที่สามารถทำได้ในระยะเวลาหนึ่งๆ
                            {quotaInfo.isWaiting ? ' ระบบกำลังรอเพื่อลองใหม่โดยอัตโนมัติ' : ' คุณอาจต้องรอ 1-2 นาทีก่อนลองใหม่อีกครั้ง'}
                          </small>
                        </p>
                      </Alert>
                    )}
                  </>
                )}

                {/* Quiz settings - displaying in a 2-column layout on wider screens */}
                <Row className="mb-4 gx-4">
                  <Col md={6} className="mb-3 mb-md-0">
                    <Form.Group controlId="questionType">
                      <Form.Label>Question type</Form.Label>
                      <Form.Select
                        name="questionType"
                        value={formData.questionType}
                        onChange={handleChange}
                        required
                        className="border-light shadow-sm"
                      >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Essay">Essay</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="numberOfQuestions">
                      <Form.Label>Number of questions</Form.Label>
                      <Form.Select
                        name="numberOfQuestions"
                        value={formData.numberOfQuestions}
                        onChange={handleChange}
                        required
                        className="border-light shadow-sm"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Additional instructions */}
                <Form.Group className="mb-4" controlId="additionalInstructions">
                  <Form.Label>Additional instructions (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="additionalInstructions"
                    value={formData.additionalInstructions}
                    onChange={handleChange}
                    placeholder="Specify any additional requirements for the quiz."
                    rows={3}
                    className="border-light shadow-sm"
                  />
                </Form.Group>

                {/* Two more settings in a 2-column layout */}
                <Row className="mb-4 gx-4">
                  <Col md={6} className="mb-3 mb-md-0">
                    <Form.Group controlId="studentLevel">
                      <Form.Label>Student level (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        name="studentLevel"
                        value={formData.studentLevel}
                        onChange={handleChange}
                        placeholder="Specify the level of your students. e.g. 5th grade"
                        className="border-light shadow-sm"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="language">
                      <Form.Label>Output language</Form.Label>
                      <Form.Select
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="border-light shadow-sm"
                      >
                        <option value="thai">Thai (ไทย)</option>
                        <option value="english">English</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Generate button */}
                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="py-3 rounded-pill"
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
                        Generating Quiz...
                      </>
                    ) : (
                      'Generate Quiz'
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