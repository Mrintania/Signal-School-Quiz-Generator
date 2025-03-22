import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  
  // User data - can be connected to authentication system later
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
        // Get all quizzes from API
        const response = await quizService.getAllQuizzes();
        
        if (response.success) {
          // Sort quizzes by created_at in descending order
          const sortedQuizzes = response.data.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          
          // Store all quizzes
          setQuizzes(sortedQuizzes);
          
          // Update quiz count for stats
          setQuizCount(sortedQuizzes.length);
          
          // Categorize quizzes by date
          const categorized = categorizeQuizzesByDate(sortedQuizzes.slice(0, 10));
          setCategorizedQuizzes(categorized);
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
  const TimelineSection = ({ title, quizzes }) => {
    if (!quizzes || quizzes.length === 0) return null;
    
    return (
      <>
        <div className="d-flex align-items-center mb-3">
          <div className="rounded-circle bg-success me-2" style={{ width: '12px', height: '12px' }}></div>
          <h5 className="mb-0">{title}</h5>
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
                <div className="mt-1">
                  <span className="badge bg-light text-dark rounded-pill px-3 py-1">QUIZ</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
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
        <div>
          <img 
            src="https://cdn.pixabay.com/photo/2023/05/25/08/06/girl-8016935_1280.png" 
            alt="Working girl" 
            style={{ height: '100px' }} 
          />
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
        
        <Col xs={6} sm={4} md={2}>
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
        </Col>
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
            <TimelineSection title="Today" quizzes={categorizedQuizzes.today} />
            <TimelineSection title="Last week" quizzes={categorizedQuizzes.lastWeek} />
            <TimelineSection title="Last month" quizzes={categorizedQuizzes.lastMonth} />
            <TimelineSection title="Older" quizzes={categorizedQuizzes.older} />
            
            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            
            {!loading && Object.values(categorizedQuizzes).every(arr => arr.length === 0) && (
              <div className="text-center py-4 text-muted">
                No recent content found
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default HomePage;