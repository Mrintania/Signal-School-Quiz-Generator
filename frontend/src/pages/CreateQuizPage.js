import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Card, Nav, InputGroup } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { quizService } from '../services/api';
import { useQuizContext } from '../context/QuizContext';
import { sampleTopics, handleIdeasClick } from '../utils/ideas';

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const { setGeneratedQuiz, setLoading, loading, setError } = useQuizContext();

  const handleIdeasButtonClick = () => {
    handleIdeasClick(setFormData, setActiveSource);
  };
  

  // Input source tabs
  const [activeSource, setActiveSource] = useState('topic');

  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    text: '', // เพิ่ม state สำหรับข้อความในแท็บ Text
    webpage: '', // เพิ่ม state สำหรับ URL เว็บไซต์
    questionType: 'Multiple Choice',
    numberOfQuestions: '10', // เปลี่ยนค่าเริ่มต้นเป็น 10
    additionalInstructions: '',
    studentLevel: '',
    language: 'thai'
  });

  // Form validation state
  const [validated, setValidated] = useState(false);

  // สำหรับแท็บ Webpage
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

  // ฟังก์ชันโหลดเว็บเพจ (จำลองการโหลด)
  const handleLoadWebpage = () => {
    if (!formData.webpage) return;

    setIsLoadingWebpage(true);

    // จำลองการโหลดเว็บเพจ (ในการใช้งานจริงควรมีการเรียก API)
    setTimeout(() => {
      setIsLoadingWebpage(false);
      setWebpageLoaded(true);
    }, 1500);
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

    try {
      setLoading(true);
      setError(null);

      // เตรียมข้อมูลตามแท็บที่เลือก
      let dataToSend = { ...formData };

      // แก้ไขข้อมูลที่จะส่งไปตาม source ที่เลือก
      if (activeSource === 'text' && formData.text) {
        // ใช้ข้อความจากแท็บ Text เป็นเนื้อหาในการออกข้อสอบ
        dataToSend.additionalInstructions =
          `${dataToSend.additionalInstructions} Generate questions based on the following text content: ${formData.text}`;

        if (!dataToSend.topic || dataToSend.topic.trim() === '') {
          // ถ้าไม่มีหัวข้อ ให้ใช้ 'Text Content' เป็นหัวข้อ
          dataToSend.topic = 'Text Content';
        }
      } else if (activeSource === 'webpage' && formData.webpage) {
        // ใช้ URL เว็บไซต์เป็นเนื้อหาในการออกข้อสอบ
        dataToSend.additionalInstructions =
          `${dataToSend.additionalInstructions} Generate questions based on content from this webpage URL: ${formData.webpage}`;

        if (!dataToSend.topic || dataToSend.topic.trim() === '') {
          // ถ้าไม่มีหัวข้อ ให้ใช้ URL เป็นหัวข้อ
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
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
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

              {/* Input source tabs - UPDATED FOR BETTER VISIBILITY */}
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
                      <span className="ms-2 text-warning" style={{ fontSize: '0.7rem' }}>👑</span>
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

                {/* Text input section - ทำให้ใช้งานได้จริง */}
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

                {/* Webpage input section - ทำให้ใช้งานได้จริง */}
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

                {/* File input section - ยังเป็น feature ในอนาคต */}
                {activeSource === 'file' && (
                  <div className="mb-4">
                    <div className="border border-dashed border-light rounded p-5 text-center bg-light">
                      <span className="d-block mb-3" style={{ fontSize: '2rem' }}>📁</span>
                      <p className="mb-2">Drag and drop your file here, or click to browse</p>
                      <small className="text-muted">Supported formats: PDF, DOCX, TXT (Coming soon)</small>
                      <Form.Control
                        type="file"
                        className="d-none"
                        disabled
                      />
                      <Button variant="outline-primary" className="mt-3" disabled>
                        Browse Files
                      </Button>
                    </div>
                    <p className="text-muted mt-2 small">
                      This premium feature will be available soon. Please use Topic tab for now.
                    </p>
                  </div>
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