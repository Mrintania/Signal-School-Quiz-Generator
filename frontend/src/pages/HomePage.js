import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  
  // User data
  const [userData, setUserData] = useState({
    name: 'Pornsupat Vutisuwan',
    role: 'Teacher'
  });

  // State for recent content and stats
  const [quizzes, setQuizzes] = useState([]);
  const [categorizedQuizzes, setCategorizedQuizzes] = useState({
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: []
  });
  const [loading, setLoading] = useState(true);
  const [quizCount, setQuizCount] = useState(0);
  
  // Format date using native JavaScript methods
  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${monthName} ${year}`;
  };
  
  // Get current date formatted as shown in the design
  const currentDate = formatDate(new Date());
  
  // Function to categorize quizzes by date
  const categorizeQuizzesByDate = (quizzesList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastMonthStart = new Date(today);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    
    const result = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: []
    };
    
    quizzesList.forEach(quiz => {
      const quizDate = new Date(quiz.created_at);
      quizDate.setHours(0, 0, 0, 0);
      
      // เพิ่มการจัดรูปแบบวันที่สำหรับแสดงผล
      quiz.formattedDate = new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(quiz.created_at));
      
      if (quizDate.getTime() === today.getTime()) {
        result.today.push(quiz);
      } else if (quizDate.getTime() === yesterday.getTime()) {
        result.yesterday.push(quiz);
      } else if (quizDate >= lastWeekStart) {
        result.lastWeek.push(quiz);
      } else if (quizDate >= lastMonthStart) {
        result.lastMonth.push(quiz);
      } else {
        result.older.push(quiz);
      }
    });
    
    return result;
  };
  
  // Fetch user's quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        console.log('Fetching quizzes...');
        
        // ใช้ API getAllQuizzes ที่มีอยู่แล้ว
        const response = await quizService.getAllQuizzes();
        console.log('API Response:', response);
        
        if (response.success) {
          // Sort quizzes by created_at in descending order
          const sortedQuizzes = response.data.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          
          // แสดงจำนวนข้อสอบที่ได้รับ
          console.log(`Retrieved ${sortedQuizzes.length} quizzes`);
          
          // Store all quizzes
          setQuizzes(sortedQuizzes);
          
          // Update quiz count for stats
          setQuizCount(sortedQuizzes.length);
          
          // Categorize quizzes by date
          const categorized = categorizeQuizzesByDate(sortedQuizzes);
          
          // แสดงจำนวนในแต่ละหมวดหมู่
          console.log(`Categorized: Today: ${categorized.today.length}, Yesterday: ${categorized.yesterday.length}, Last Week: ${categorized.lastWeek.length}, Last Month: ${categorized.lastMonth.length}, Older: ${categorized.older.length}`);
          
          setCategorizedQuizzes(categorized);
        } else {
          console.error('API returned success=false:', response.message);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizzes();
  }, []);
  
  // Handle quiz click to navigate to view page
  const handleQuizClick = (quizId) => {
    navigate(`/view/${quizId}`);
  };
  
  // Stats
  const stats = {
    quiz: quizCount,
    lessonPlan: 0,
    teachingResources: 0,
    slideDeck: 0,
    flashcardSet: 0,
    customChatbot: 0
  };

  // Timeline section component
  const TimelineSection = ({ title, thaiTitle, quizzes }) => {
    if (!quizzes || quizzes.length === 0) return null;
    
    return (
      <>
        <div className="d-flex align-items-center mb-3">
          <div className="rounded-circle bg-success me-2" style={{ width: '12px', height: '12px' }}></div>
          <h5 className="mb-0">{thaiTitle || title}</h5>
        </div>
        
        {quizzes.map(quiz => (
          <div 
            key={quiz.id} 
            className="card mb-3 border-0 shadow-sm" 
            style={{ cursor: 'pointer' }}
            onClick={() => handleQuizClick(quiz.id)}
          >
            <div className="card-body">
              <div>
                <h6 className="mb-0">{quiz.title}</h6>
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <span className="badge bg-light text-dark rounded-pill px-3 py-1">
                    {quiz.question_type === 'Multiple Choice' ? 'ข้อสอบปรนัย' : 'ข้อสอบอัตนัย'}
                  </span>
                  <small className="text-muted">{quiz.formattedDate}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  // Check if there are any quizzes in any category
  const hasAnyQuizzes = () => {
    return (
      categorizedQuizzes.today.length > 0 ||
      categorizedQuizzes.yesterday.length > 0 ||
      categorizedQuizzes.lastWeek.length > 0 ||
      categorizedQuizzes.lastMonth.length > 0 ||
      categorizedQuizzes.older.length > 0
    );
  };

  return (
    <Container fluid className="py-4 px-4">
      {/* User greeting section */}
      <div className="mb-4 d-flex justify-content-between align-items-start">
        <div>
          <h1 className="mb-0">Hi, {userData.name}</h1>
          <p className="text-muted mb-0">{currentDate}</p>
        </div>
      </div>
      
      {/* Stats cards */}
      <Row className="mb-5 g-4">
        <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm" style={{ backgroundColor: '#f5faea' }}>
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold">{stats.quiz}</h1>
              <p className="mb-0 text-muted">Quiz</p>
            </Card.Body>
          </Card>
        </Col>
        
        {/* <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold text-secondary">{stats.lessonPlan}</h1>
              <p className="mb-0 text-muted">Lesson Plan</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold text-secondary">{stats.teachingResources}</h1>
              <p className="mb-0 text-muted">Teaching Resources</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold text-secondary">{stats.slideDeck}</h1>
              <p className="mb-0 text-muted">Slide Deck</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold text-secondary">{stats.flashcardSet}</h1>
              <p className="mb-0 text-muted">Flashcard Set</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xs={6} sm={4} md={2}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h1 className="display-4 fw-bold text-secondary">{stats.customChatbot}</h1>
              <p className="mb-0 text-muted">Custom Chatbot</p>
            </Card.Body>
          </Card>
        </Col> */}
      </Row>
      
      {/* Recent contents section */}
      <div className="mb-4">
        <h2 className="mb-4">Recent contents</h2>
        
        <div className="position-relative">
          {/* Vertical timeline line */}
          <div 
            className="position-absolute" 
            style={{ 
              left: '6px', 
              top: '24px', 
              bottom: '0', 
              width: '2px', 
              backgroundColor: '#ececec',
              zIndex: -1
            }}
          ></div>
          
          {/* Timeline content */}
          <div className="ps-4">
            <TimelineSection title="Today" thaiTitle="Today" quizzes={categorizedQuizzes.today} />
            <TimelineSection title="Yesterday" thaiTitle="Yesterday" quizzes={categorizedQuizzes.yesterday} />
            <TimelineSection title="Last week" thaiTitle="Last week" quizzes={categorizedQuizzes.lastWeek} />
            <TimelineSection title="Last month" thaiTitle="Last mount" quizzes={categorizedQuizzes.lastMonth} />
            <TimelineSection title="Older" thaiTitle="ก่อนหน้านั้น" quizzes={categorizedQuizzes.older} />
            
            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            
            {!loading && !hasAnyQuizzes() && (
              <div className="text-center py-4 text-muted">
                ยังไม่มีข้อสอบในระบบ กรุณาสร้างข้อสอบใหม่
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Developer Testing Section in Development Mode */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 border rounded bg-light">
          <h5>Developer Testing</h5>
          <div className="d-flex gap-2 mt-2">
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/quizzes');
                  const data = await response.json();
                  console.log('Quizzes API response:', data);
                  alert(`Found ${data.data?.length || 0} quizzes in database`);
                } catch (error) {
                  console.error('Error testing Quizzes API:', error);
                  alert('Error: ' + error.message);
                }
              }}
            >
              Test Quizzes API
            </button>
          </div>
        </div>
      )} */}
    </Container>
  );
};

export default HomePage;