import React from 'react';
import { Container, Row, Col, Card, Button, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaBook, FaMagic } from 'react-icons/fa';
import logo from '../assets/logo.png';

const HomePage = () => {
  return (
    <Container fluid className="py-5 fade-in">
      <Row className="justify-content-center">
        <Col xs={12} className="text-center mb-5">
          <Image 
            src={logo} 
            alt="Signal School Logo" 
            width="80" 
            height="80" 
            className="mb-3"
          />
          <h1 className="display-4 fw-bold">Hi Pornsupat! 👋</h1>
          <p className="lead mt-3">Welcome to <span className="fw-bold" style={{ color: '#6f42c1' }}>Signal School Quiz Generator</span>. Create professional quizzes in seconds.</p>
        </Col>
      </Row>
      
      <Row className="justify-content-center g-4">
        <Col xs={12} md={6} lg={4}>
          <Link to="/create" className="text-decoration-none">
            <Card className="h-100 shadow-sm hover-card">
              <Card.Body className="text-center py-5">
                <div className="mb-4 rounded-circle bg-light d-inline-flex p-3">
                  <FaPlus size={40} color="#6f42c1" />
                </div>
                <Card.Title className="fw-bold">Create New Quiz</Card.Title>
                <Card.Text className="text-muted">
                  Create a new quiz using AI to generate questions based on your topic.
                </Card.Text>
                <Button variant="primary" className="mt-3">
                  Get Started
                </Button>
              </Card.Body>
            </Card>
          </Link>
        </Col>
        
        <Col xs={12} md={6} lg={4}>
          <Link to="/library" className="text-decoration-none">
            <Card className="h-100 shadow-sm hover-card">
              <Card.Body className="text-center py-5">
                <div className="mb-4 rounded-circle bg-light d-inline-flex p-3">
                  <FaBook size={40} color="#6f42c1" />
                </div>
                <Card.Title className="fw-bold">My Library</Card.Title>
                <Card.Text className="text-muted">
                  Access your previously created quizzes and manage your collection.
                </Card.Text>
                <Button variant="outline-primary" className="mt-3">
                  View Library
                </Button>
              </Card.Body>
            </Card>
          </Link>
        </Col>
      </Row>
      
      <Row className="mt-5 pt-4">
        <Col xs={12} className="text-center">
          <div className="d-inline-flex p-2 rounded-circle bg-light mb-3">
            <FaMagic size={30} color="#6f42c1" />
          </div>
          <h2 className="fw-bold">Powered by Sgt.Pornsupat Vutisuwan</h2>
          <p className="text-muted">
            Signal School Quiz Generator uses advanced AI to create high-quality, educational quizzes for any subject.
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;