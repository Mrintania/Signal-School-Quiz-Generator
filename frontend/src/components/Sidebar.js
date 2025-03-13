import React, { useState } from 'react';
import { Nav, Button, Image } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBook, FaPlus, FaBars, FaTimes } from 'react-icons/fa';
import logo from '../assets/logo.png';

const Sidebar = () => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  const closeSidebar = () => {
    setExpanded(false);
  };
  
  return (
    <>
      {/* Mobile toggle button */}
      <Button 
        variant="primary" 
        className="d-lg-none position-fixed"
        style={{ top: '10px', left: '10px', zIndex: 1030 }}
        onClick={toggleSidebar}
      >
        {expanded ? <FaTimes /> : <FaBars />}
      </Button>
      
      {/* Sidebar */}
      <div 
        className={`sidebar bg-dark text-white position-fixed h-100 ${expanded ? 'sidebar-expanded' : 'sidebar-collapsed'} d-flex flex-column`}
        style={{
          width: expanded ? '250px' : '70px',
          transition: 'width 0.3s ease',
          zIndex: 1020,
          overflowX: 'hidden'
        }}
      >
        <div className="d-flex flex-column p-3 h-100">
          {/* Logo and App Name */}
          <div className="text-center mb-4 mt-2">
            <Link to="/" className="text-decoration-none text-white">
              <Image 
                src={logo} 
                alt="Signal School Logo" 
                width={expanded ? '60' : '40'} 
                height={expanded ? '60' : '40'} 
                className="mb-2"
              />
              {expanded && (
                <div className="mt-2 fw-bold" style={{ color: '#6f42c1', fontSize: '14px' }}>
                  Signal School<br />Quiz Generator
                </div>
              )}
            </Link>
          </div>
          
          {/* Navigation Links */}
          <Nav className="flex-column mb-auto w-100">
            {/* Create New Quiz Button */}
            <Nav.Item className="mb-3">
              <Link 
                to="/create" 
                className={`btn btn-primary w-100 text-start ${location.pathname === '/create' ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <FaPlus className="me-2" />
                {expanded && 'Create New'}
              </Link>
            </Nav.Item>
            
            {/* Home Link */}
            <Nav.Item className="mb-2">
              <Link 
                to="/" 
                className={`nav-link text-white ${location.pathname === '/' ? 'active bg-primary' : ''}`}
                onClick={closeSidebar}
              >
                <FaHome className="me-2" />
                {expanded && 'Home'}
              </Link>
            </Nav.Item>
            
            {/* My Library Link */}
            <Nav.Item className="mb-2">
              <Link 
                to="/library" 
                className={`nav-link text-white ${location.pathname === '/library' ? 'active bg-primary' : ''}`}
                onClick={closeSidebar}
              >
                <FaBook className="me-2" />
                {expanded && 'My Library'}
              </Link>
            </Nav.Item>
          </Nav>
          
          {/* Toggle Button for Desktop */}
          <div className="mt-auto">
            <Button 
              variant="outline-light" 
              className="w-100 d-none d-lg-block"
              onClick={toggleSidebar}
            >
              {expanded ? <><FaTimes className="me-2" /> Collapse</> : <FaBars />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {expanded && (
        <div 
          className="position-fixed d-lg-none" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 1010 
          }}
          onClick={closeSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;