import React from 'react';
import { Navbar as BSNavbar, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
// import { FaBrain } from 'react-icons/fa';
import logo from '../assets/logo.png';

const Navbar = () => {
  return (
    <BSNavbar bg="white" expand="lg" className="shadow-sm py-2 mb-4">
      <Container fluid>
        <Link to="/" className="navbar-brand d-flex align-items-center">
        {/* Logo from ./assets/logo.png */}
          <img src={logo} alt="Signal School Quiz Generator" width="32" height="32" className="me-2" />
          {/* <FaBrain size={32} className="me-2" style={{ color: '#6f42c1' }} /> */}
          <span className="fw-bold" style={{ color: '#6f42c1' }}>Signal School Quiz Generator</span>
        </Link>
        <div className="d-flex align-items-center">
          <span className="text-muted small">Teacher Assistant</span>
        </div>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;