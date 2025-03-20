import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Dropdown, Modal, Alert, Form } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { quizService } from '../services/api';
import { FaArrowLeft, FaFileExport, FaTrashAlt, FaPlus, FaRedo } from 'react-icons/fa';

const ViewQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for quiz data
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // State for generating additional questions
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [forceThai, setForceThai] = useState(true); // เพิ่ม state สำหรับบังคับภาษาไทย
  
  // ฟังก์ชันตรวจจับภาษาไทยที่ปรับปรุงแล้ว
  const determineQuizLanguage = (quiz) => {
    console.log("Quiz data for language detection:", {
      title: quiz.title,
      topic: quiz.topic,
      student_level: quiz.student_level
    });
    
    // ถ้ามีการระบุภาษาไว้แล้ว ให้ใช้ค่านั้น
    if (quiz.language) {
      console.log("Language specified in quiz:", quiz.language);
      return quiz.language;
    }
    
    // ตรวจสอบภาษาไทยโดยใช้ regex ของอักษรไทย
    const thaiPattern = /[\u0E00-\u0E7F]/; // ช่วงของตัวอักษรไทยใน Unicode
    
    // สร้างฟังก์ชันตรวจสอบข้อความว่ามีภาษาไทยหรือไม่
    const containsThai = (text) => {
      if (!text) return false;
      return thaiPattern.test(text);
    };
    
    // เช็คในชื่อและหัวข้อ
    if (containsThai(quiz.title)) {
      console.log("Thai detected in title");
      return 'thai';
    }
    
    if (containsThai(quiz.topic)) {
      console.log("Thai detected in topic");
      return 'thai';
    }
    
    if (containsThai(quiz.student_level)) {
      console.log("Thai detected in student level");
      return 'thai';
    }
    
    // ตรวจสอบในคำถามทั้งหมด
    if (quiz.questions && quiz.questions.length > 0) {
      // สุ่มตรวจสอบไม่เกิน 5 คำถาม เพื่อประหยัดเวลา
      const samplesToCheck = Math.min(5, quiz.questions.length);
      
      for (let i = 0; i < samplesToCheck; i++) {
        const question = quiz.questions[i];
        
        // ตรวจสอบในตัวคำถาม
        if (containsThai(question.questionText)) {
          console.log(`Thai detected in question ${i+1} text`);
          return 'thai';
        }
        
        // ตรวจสอบในคำอธิบาย
        if (containsThai(question.explanation)) {
          console.log(`Thai detected in question ${i+1} explanation`);
          return 'thai';
        }
        
        // ตรวจสอบในตัวเลือกคำตอบ (สำหรับข้อสอบแบบปรนัย)
        if (question.options && question.options.length > 0) {
          for (let j = 0; j < question.options.length; j++) {
            if (containsThai(question.options[j].text)) {
              console.log(`Thai detected in question ${i+1}, option ${j+1}`);
              return 'thai';
            }
          }
        }
      }
    }
    
    // หากตรวจสอบทั้งหมดแล้วไม่พบภาษาไทย ให้ส่งคืนค่าเป็นภาษาอังกฤษ
    console.log("No Thai detected, defaulting to English");
    return 'english';
  };
  
  // Fetch quiz function wrapped in useCallback to use as dependency in useEffect
  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quizService.getQuizById(id);
      
      if (response.success) {
        setQuiz(response.data);
      } else {
        setError(response.message || 'Failed to fetch quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  // Fetch quiz data on component mount
  useEffect(() => {
    fetchQuiz();
    
    // Clear location state after using it
    if (location.state?.message) {
      window.history.replaceState({}, document.title);
    }
  }, [fetchQuiz, location.state]);
  
  // Functions to handle export
  const handleExportToMoodle = () => {
    quizService.exportQuizToMoodle(id);
  };
  
  const handleExportToText = () => {
    quizService.exportQuizToText(id);
  };
  
  // Function to handle delete
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };
  
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };
  
  const handleDeleteQuiz = async () => {
    try {
      setDeleteLoading(true);
      
      const response = await quizService.deleteQuiz(id);
      
      if (response.success) {
        navigate('/library', { state: { message: `Quiz "${quiz.title}" has been deleted.` } });
      } else {
        setError(response.message || 'Failed to delete quiz');
        handleCloseDeleteModal();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
      handleCloseDeleteModal();
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Functions for generating additional questions
  const handleShowGenerateModal = () => {
    setShowGenerateModal(true);
  };
  
  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
  };
  
  // Function to generate additional questions and save to database
  const handleGenerateAdditionalQuestions = async () => {
    try {
      setGeneratingQuestions(true);
      setError(null);
      
      // ตรวจสอบภาษาของข้อสอบ แต่ถ้าผู้ใช้เลือกบังคับภาษาไทย ให้ใช้ภาษาไทย
      const detectedLanguage = determineQuizLanguage(quiz);
      const quizLanguage = forceThai ? 'thai' : detectedLanguage;
      
      console.log("Detected quiz language:", detectedLanguage);
      console.log("Using language for generation:", quizLanguage);
      
      // เพิ่มคำสั่งพิเศษในคำแนะนำเพิ่มเติมเพื่อบังคับให้สร้างในภาษาไทย
      let additionalInstructions = "Please generate different questions from the previous ones to avoid duplication.";
      if (quizLanguage === 'thai') {
        additionalInstructions += " IMPORTANT: You must generate questions in Thai language only. กรุณาสร้างคำถามเป็นภาษาไทยเท่านั้น.";
      }
      
      // Prepare data for generating additional questions
      const additionalQuizData = {
        topic: quiz.topic,
        questionType: quiz.question_type,
        numberOfQuestions: questionCount.toString(),
        additionalInstructions: additionalInstructions,
        studentLevel: quiz.student_level,
        language: quizLanguage // ใช้ภาษาที่กำหนด
      };
      
      // Generate new questions
      const generateResponse = await quizService.generateQuiz(additionalQuizData);
      
      if (generateResponse.success) {
        try {
          // Save the existing questions plus the new questions
          const updatedQuiz = {
            ...quiz,
            questions: [...quiz.questions, ...generateResponse.data.questions]
          };
          
          // Create a new version of the quiz with the updated questions
          const cloneResponse = await quizService.saveQuiz({
            title: quiz.title,
            topic: quiz.topic,
            questionType: quiz.question_type,
            studentLevel: quiz.student_level,
            language: quizLanguage,
            questions: updatedQuiz.questions
          });
          
          if (cloneResponse.success) {
            // Delete the original quiz
            await quizService.deleteQuiz(id);
            
            // Close modal first
            handleCloseGenerateModal();
            
            // แสดงข้อความสำเร็จและนำทางไปยังข้อสอบใหม่
            const isThai = quizLanguage === 'thai';
            const message = isThai 
              ? `เพิ่มข้อสอบอีก ${questionCount} ข้อสำเร็จแล้ว!` 
              : `Successfully added ${questionCount} more questions!`;
            
            navigate(`/view/${cloneResponse.quizId}`, { 
              state: { message }
            });
          } else {
            throw new Error('Failed to save updated quiz');
          }
        } catch (backendError) {
          // Fallback to a client-side update if database update fails
          console.error('Database update failed, falling back to client-side update:', backendError);
          
          // Update our local state with the new questions
          setQuiz({
            ...quiz,
            questions: [...quiz.questions, ...generateResponse.data.questions]
          });
          
          // Close modal
          handleCloseGenerateModal();
          
          // Set success message based on language
          const isThai = quizLanguage === 'thai';
          setSuccessMessage(isThai 
            ? `เพิ่มข้อสอบอีก ${questionCount} ข้อสำเร็จแล้ว! เลื่อนลงเพื่อดูข้อสอบใหม่` 
            : `Successfully added ${questionCount} more questions! Scroll down to see the new questions.`
          );
          
          // Scroll to the bottom after a short delay to see new questions
          setTimeout(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }, 1000);
          
          // Show a warning that this update is temporary (not saved to database)
          setError('Note: Questions have been added temporarily. The changes will be lost on page refresh.');
        }
      } else {
        setError(generateResponse.message || 'Failed to generate additional questions');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setGeneratingQuestions(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }
  
  if (error || !quiz) {
    return (
      <Container className="py-4">
        <div className="alert alert-danger" role="alert">
          {error || 'Quiz not found'}
        </div>
        <Button variant="primary" onClick={() => navigate('/library')}>
          Back to Library
        </Button>
      </Container>
    );
  }
  
  // ตรวจสอบภาษาของข้อสอบ
  const detectedLanguage = determineQuizLanguage(quiz);
  const isThai = detectedLanguage === 'thai';
  
  return (
    <Container className="py-4">
      {/* Error/Success Messages */}
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
      
      {/* Header with quiz info and actions */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="d-flex gap-2 mb-2">
              <Button
                variant="outline-primary"
                onClick={() => navigate('/library')}
              >
                <FaArrowLeft className="me-2" />
                {isThai ? 'กลับไปคลังข้อสอบ' : 'Back to Library'}
              </Button>
              
              <Dropdown>
                <Dropdown.Toggle variant="outline-success" id="dropdown-export">
                  <FaFileExport className="me-2" />
                  {isThai ? 'ส่งออก' : 'Export'}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleExportToText}>
                    {isThai ? 'ส่งออกเป็นไฟล์ข้อความ (.txt)' : 'Export as Text (.txt)'}
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleExportToMoodle}>
                    {isThai ? 'ส่งออกสำหรับ Moodle (GIFT format)' : 'Export for Moodle (GIFT format)'}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              <Button
                variant="outline-danger"
                onClick={handleDeleteClick}
              >
                <FaTrashAlt className="me-2" />
                {isThai ? 'ลบข้อสอบ' : 'Delete Quiz'}
              </Button>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Quiz details */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h2 className="mb-0">{quiz.title}</h2>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p className="mb-2">
                <strong>{isThai ? 'หัวข้อ:' : 'Topic:'}</strong> {quiz.topic}
              </p>
              <p className="mb-2">
                <strong>{isThai ? 'สร้างเมื่อ:' : 'Created:'}</strong> {formatDate(quiz.created_at)}
              </p>
              <p className="mb-2">
                <strong>Language:</strong> {isThai ? 'ภาษาไทย (Thai)' : 'English'}
              </p>
            </Col>
            <Col md={6}>
              <p className="mb-2">
                <Badge bg="primary" className="me-2">
                  {quiz.question_type === 'Multiple Choice' 
                    ? (isThai ? 'ปรนัย' : 'Multiple Choice') 
                    : (isThai ? 'อัตนัย' : 'Essay')}
                </Badge>
                {quiz.student_level && (
                  <Badge bg="secondary">
                    {quiz.student_level}
                  </Badge>
                )}
              </p>
              <p className="mb-2">
                <strong>{isThai ? 'จำนวนข้อ:' : 'Questions:'}</strong> {quiz.questions.length}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Questions List */}
      {quiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">{isThai ? `ข้อที่ ${questionIndex + 1}` : `Question ${questionIndex + 1}`}</h5>
            <small className="text-muted">
              {isThai 
                ? `ข้อที่ ${questionIndex + 1} จาก ${quiz.questions.length}`
                : `Question ${questionIndex + 1} of ${quiz.questions.length}`
              }
            </small>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* Multiple Choice Options */}
            {quiz.question_type === 'Multiple Choice' && (
              <div className="mb-4">
                {question.options && question.options.map((option, optionIndex) => {
                  const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D, ...
                  return (
                    <div key={optionIndex} className="mb-3 ps-2">
                      <span className={option.isCorrect ? 'text-success fw-bold' : ''}>
                        <strong>{optionLabel}.</strong> {option.text}
                        {option.isCorrect && ' ✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Explanation */}
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-2">{isThai ? 'คำอธิบาย:' : 'Explanation:'}</h6>
                <p className="mb-0">{question.explanation}</p>
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      ))}
      
      {/* Bottom navigation */}
      <Row className="mb-5">
        <Col className="d-flex justify-content-between align-items-center flex-wrap">
          <Button
            variant="outline-primary"
            onClick={() => navigate('/library')}
          >
            <FaArrowLeft className="me-2" />
            {isThai ? 'กลับไปคลังข้อสอบ' : 'Back to Library'}
          </Button>
          
          <Button
            variant="success"
            onClick={handleShowGenerateModal}
          >
            <FaRedo className="me-2" />
            {isThai ? 'สร้างข้อสอบเพิ่ม' : 'Generate More Questions'}
          </Button>
        </Col>
      </Row>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isThai ? 'ลบข้อสอบ' : 'Delete Quiz'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isThai 
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบ "${quiz.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`
            : `Are you sure you want to delete the quiz "${quiz.title}"? This action is irreversible.`
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            {isThai ? 'ยกเลิก' : 'Cancel'}
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
                {isThai ? 'กำลังลบ...' : 'Deleting...'}
              </>
            ) : (
              isThai ? 'ลบ' : 'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Generate Additional Questions Modal */}
      <Modal show={showGenerateModal} onHide={handleCloseGenerateModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isThai ? 'สร้างข้อสอบเพิ่มเติม' : 'Generate Additional Questions'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {isThai 
              ? `สร้างข้อสอบเพิ่มเติมสำหรับ "${quiz.title}" โดยใช้หัวข้อและการตั้งค่าเดิม ข้อสอบใหม่จะถูกเพิ่มเข้าไปในชุดเดิม`
              : `Generate more questions for "${quiz.title}" using the same topic and settings. The new questions will be added to the existing set.`
            }
          </p>
          
          <div className="mb-3">
            <label htmlFor="questionCount" className="form-label">
              {isThai ? 'จำนวนข้อสอบที่ต้องการสร้าง:' : 'Number of questions to generate:'}
            </label>
            <select 
              id="questionCount" 
              className="form-select"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            >
              <option value="5">{isThai ? '5 ข้อ' : '5 questions'}</option>
              <option value="10">{isThai ? '10 ข้อ' : '10 questions'}</option>
              <option value="15">{isThai ? '15 ข้อ' : '15 questions'}</option>
              <option value="20">{isThai ? '20 ข้อ' : '20 questions'}</option>
            </select>
          </div>
          
          <Form.Check 
            type="checkbox"
            id="forceThai"
            label={isThai ? "บังคับให้ใช้ภาษาไทยเท่านั้น" : "Force Thai language only"}
            checked={forceThai}
            onChange={(e) => setForceThai(e.target.checked)}
            className="mb-3"
          />
          
          <div className="alert alert-info">
            <small>
              {isThai 
                ? `หมายเหตุ: ระบบจะพยายามสร้างข้อสอบที่ไม่ซ้ำกับข้อสอบที่มีอยู่ โดยใช้หัวข้อเดิม: "${quiz.topic}" ${forceThai ? 'และใช้ภาษาไทยตามที่เลือก' : 'และตรวจจับภาษาอัตโนมัติ'}`
                : `Note: The system will attempt to generate questions that don't duplicate the existing ones. This will use the original quiz topic: "${quiz.topic}" ${forceThai ? 'and will force Thai language as selected' : 'and will detect language automatically'}`
              }
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseGenerateModal}>
            {isThai ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerateAdditionalQuestions}
            disabled={generatingQuestions}
          >
            {generatingQuestions ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {isThai ? 'กำลังสร้าง...' : 'Generating...'}
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                {isThai ? 'สร้างข้อสอบ' : 'Generate Questions'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewQuizPage;