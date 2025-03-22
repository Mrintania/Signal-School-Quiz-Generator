import React, { useState, useEffect } from 'react';
import { Nav, Button, Image, Collapse } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const [folders, setFolders] = useState([]);
  const [showFolders, setShowFolders] = useState(true); // เปิดเมนูโฟลเดอร์
  
  // โหลดโฟลเดอร์จาก localStorage เมื่อ component โหลด
  useEffect(() => {
    const loadFolders = () => {
      const storedFolders = JSON.parse(localStorage.getItem('folders') || '[]');
      setFolders(storedFolders);
    };
    
    // โหลดตอนเริ่มต้น
    loadFolders();
    
    // ตั้ง event listener เพื่อดักจับการเปลี่ยนแปลงใน localStorage
    const handleStorageChange = () => {
      loadFolders();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // ทำความสะอาด event listener เมื่อ component ถูกทำลาย
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  return (
    <div 
      className="sidebar bg-white position-fixed h-100 d-flex flex-column"
      style={{
        width: '250px',
        flexShrink: 0,
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 1030,
        borderRight: '1px solid rgba(0,0,0,0.05)',
        padding: '20px 0',
        boxShadow: '0 0 15px rgba(0,0,0,0.02)'
      }}
    >
      <div className="d-flex flex-column h-100">
        {/* Logo */}
        <div className="text-center mb-4 px-4">
          <Link to="/" className="text-decoration-none text-dark">
            <div className="d-flex align-items-center gap-2">
              <Image 
                src={require('../assets/logo.png')} 
                alt="EdCafe Logo" 
                width="36" 
                height="36" 
              />
              <span className="fw-bold fs-4">edcafe</span>
            </div>
          </Link>
        </div>
        
        {/* Create New Button */}
        <div className="px-4 mb-4">
          <Link to="/create" className="text-decoration-none">
            <Button 
              variant="outline-success" 
              className="w-100 py-3 rounded-pill d-flex align-items-center justify-content-center"
              style={{ 
                borderColor: '#9EE37D', 
                color: '#333',
                backgroundColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>✧</span>
              <span className="fw-medium">Create new</span>
            </Button>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <Nav className="flex-column mb-auto w-100">
          {/* Home Link */}
          <Nav.Item>
            <Link 
              to="/" 
              className={`nav-link py-3 px-4 d-flex align-items-center ${location.pathname === '/' ? 'bg-light rounded-0' : 'text-secondary'}`}
            >
              <span className="me-3" style={{ width: '24px', textAlign: 'center' }}>
                {/* Home icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5Z"/>
                  <path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293l6-6Z"/>
                </svg>
              </span>
              <span className="fw-medium">Home</span>
            </Link>
          </Nav.Item>
          
          {/* My Library Link */}
          <Nav.Item>
            <div>
              <Link 
                to="/library" 
                className={`nav-link py-3 px-4 d-flex align-items-center ${location.pathname === '/library' ? 'bg-light rounded-0' : 'text-secondary'}`}
                onClick={(e) => {
                  if (location.pathname === '/library') {
                    e.preventDefault();
                    setShowFolders(!showFolders);
                  }
                }}
              >
                <span className="me-3" style={{ width: '24px', textAlign: 'center' }}>
                  {/* Library icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z"/>
                  </svg>
                </span>
                <span className="fw-medium flex-grow-1">My Library</span>
                {folders.length > 0 && (
                  <span>
                    {showFolders ? '▲' : '▼'}
                  </span>
                )}
              </Link>
              
              {/* Folders Submenu */}
              {folders.length > 0 && (
                <Collapse in={showFolders}>
                  <div>
                    {folders.map(folder => (
                      <Link 
                        key={folder.id}
                        to={`/library?folder=${folder.id}`} 
                        className="nav-link py-2 d-flex align-items-center text-secondary"
                        style={{ paddingLeft: '3.5rem' }}
                      >
                        <div 
                          className="me-2 rounded" 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            backgroundColor: folder.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z"/>
                          </svg>
                        </div>
                        <span className="fw-normal">{folder.name}</span>
                      </Link>
                    ))}
                  </div>
                </Collapse>
              )}
            </div>
          </Nav.Item>
          
          {/* Recent Link */}
          {/* <Nav.Item>
            <Link 
              to="/recent" 
              className={`nav-link py-3 px-4 d-flex align-items-center ${location.pathname === '/recent' ? 'bg-light rounded-0' : 'text-secondary'}`}
            >
              <span className="me-3" style={{ width: '24px', textAlign: 'center' }}>
                {/* Recent/Clock icon */}
                {/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
              </span>
              <span className="fw-medium">Recent</span>
            </Link>
          </Nav.Item> */} 
          
          {/* Account Link */}
          <Nav.Item>
            <Link 
              to="/account" 
              className={`nav-link py-3 px-4 d-flex align-items-center ${location.pathname === '/account' ? 'bg-light rounded-0' : 'text-secondary'}`}
            >
              <span className="me-3" style={{ width: '24px', textAlign: 'center' }}>
                {/* Settings/Gear icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                </svg>
              </span>
              <span className="fw-medium">Account</span>
            </Link>
          </Nav.Item>
        </Nav>
      </div>
    </div>
  );
};

export default Sidebar;