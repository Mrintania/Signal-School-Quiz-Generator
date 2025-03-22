// 1. First, modify the NavBar.js component:

import React, { useState, useEffect } from 'react';
import { Navbar, Container, Dropdown } from 'react-bootstrap';
import { Link, useLocation, useParams } from 'react-router-dom';
import { quizService } from '../services/api';

const NavbarComponent = () => {
  const location = useLocation();
  const params = useParams();
  const [quizTitle, setQuizTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Create state variable for user (same as original)
  const [user, setUser] = useState({
    isLoggedIn: true,
    name: 'Pornsupat Vutisuwan',
    profile: {
      initial: 'P',
      image: null,
      color: '#A8A8A8'
    }
  });

  // Add effect to fetch quiz title when on view quiz page
  useEffect(() => {
    const fetchQuizTitle = async () => {
      // Check if we're on a quiz view page (URL contains /view/ and an ID)
      if (location.pathname.includes('/view/')) {
        try {
          setIsLoading(true);
          const quizId = location.pathname.split('/view/')[1];
          
          // Fetch quiz data to get title
          const response = await quizService.getQuizById(quizId);
          
          if (response.success) {
            setQuizTitle(response.data.title);
          }
        } catch (error) {
          console.error('Error fetching quiz title:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Reset title when not on a quiz page
        setQuizTitle('');
      }
    };
    
    fetchQuizTitle();
  }, [location.pathname]);

  return (
    <Navbar 
      bg="white" 
      className="py-2 px-3 shadow-sm w-100"
      style={{
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        height: '64px'
      }}
    >
      <Container fluid className="d-flex justify-content-between align-items-center">
        {/* Left side - show current page/quiz title */}
        <div className="d-flex align-items-center">
          {/* Home page */}
          {location.pathname === '/' && (
            <div className="d-flex align-items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="me-2 text-primary d-none d-sm-block"
              >
                <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5Z"/>
                <path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293l6-6Z"/>
              </svg>
              <span className="fw-medium fs-6">Home</span>
            </div>
          )}

          {/* Library page */}
          {location.pathname === '/library' && (
            <div className="d-flex align-items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="me-2 text-primary d-none d-sm-block"
              >
                <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z"/>
              </svg>
              <span className="fw-medium fs-6">My Library</span>
            </div>
          )}

          {/* Create quiz page */}
          {location.pathname === '/create' && (
            <div className="d-flex align-items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="me-2 text-primary d-none d-sm-block"
              >
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              </svg>
              <span className="fw-medium fs-6">Create New Quiz</span>
            </div>
          )}

          {/* Quiz View page - Show breadcrumb with quiz title */}
          {location.pathname.includes('/view/') && (
            <div className="d-flex align-items-center">
              {/* Library icon with link */}
              <Link to="/library" className="text-decoration-none text-dark">
                <div className="d-flex align-items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="18" 
                    height="18" 
                    fill="currentColor" 
                    viewBox="0 0 16 16"
                    className="me-2 text-primary d-none d-sm-block"
                  >
                    <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z"/>
                  </svg>
                  <span className="fw-medium fs-6">My Library</span>
                </div>
              </Link>
              
              {/* Separator */}
              <span className="mx-2 text-muted">/</span>
              
              {/* Quiz icon and title */}
              <div className="d-flex align-items-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  fill="#F19158" 
                  viewBox="0 0 16 16"
                  className="me-2 d-none d-sm-block"
                >
                  <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
                </svg>
                {isLoading ? (
                  <span className="fw-medium fs-6 text-truncate" style={{ maxWidth: '300px' }}>
                    Loading...
                  </span>
                ) : (
                  <span className="fw-medium fs-6 text-truncate" style={{ maxWidth: '300px' }}>
                    {quizTitle}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Other routes handling remains the same */}
          {location.pathname === '/recent' && (
            <div className="d-flex align-items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="me-2 text-primary d-none d-sm-block"
              >
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
              </svg>
              <span className="fw-medium fs-6">Recent</span>
            </div>
          )}

          {location.pathname === '/account' && (
            <div className="d-flex align-items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                fill="currentColor" 
                viewBox="0 0 16 16"
                className="me-2 text-primary d-none d-sm-block"
              >
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
              </svg>
              <span className="fw-medium fs-6">Account</span>
            </div>
          )}
        </div>

        {/* Right side - user profile (unchanged) */}
        <div className="d-flex align-items-center">
          {user.isLoggedIn ? (
            <Dropdown align="end">
              <Dropdown.Toggle 
                as="div" 
                id="dropdown-user" 
                className="d-flex align-items-center cursor-pointer"
                style={{ cursor: 'pointer' }}
              >
                <div className="d-none d-md-flex flex-column align-items-end me-2">
                  <span className="fw-medium text-dark">{user.name}</span>
                  <small className="text-muted">{user.subscription}</small>
                </div>
                
                {user.profile.image ? (
                  <img 
                    src={user.profile.image}
                    width="36"
                    height="36"
                    className="rounded-circle border"
                    alt={user.name}
                  />
                ) : (
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle text-white"
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      backgroundColor: user.profile.color,
                      fontSize: '16px',
                      fontWeight: '500'
                    }}
                  >
                    {user.profile.initial}
                  </div>
                )}
                
                <span className="ms-2 d-none d-lg-inline">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </span>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item as={Link} to="/account">บัญชีของฉัน</Dropdown.Item>
                <Dropdown.Item as={Link} to="/settings">ตั้งค่า</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item>ออกจากระบบ</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div>
              <Link to="/login" className="btn btn-outline-success me-2">เข้าสู่ระบบ</Link>
              <Link to="/register" className="btn btn-success">สมัครสมาชิก</Link>
            </div>
          )}
        </div>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;