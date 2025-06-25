// components/PDFQuizGenerator.jsx
import React, { useState } from 'react';
import { Card, Form, Button, ProgressBar, Alert } from 'react-bootstrap';
import axios from 'axios';

const PDFQuizGenerator = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [quizSettings, setQuizSettings] = useState({
    questionCount: 10,
    language: 'Thai',
    difficulty: 'Medium',
    questionType: 'Multiple Choice',
    subject: ''
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('กรุณาเลือกไฟล์ PDF เท่านั้น');
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('กรุณาเลือกไฟล์ PDF');
      return;
    }

    setLoading(true);
    setProgress(20);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('quizSettings', JSON.stringify(quizSettings));

      setProgress(50);

      const response = await axios.post('/api/quiz/generate-from-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const uploadProgress = Math.round(
            (progressEvent.loaded * 50) / progressEvent.total
          );
          setProgress(50 + uploadProgress);
        }
      });

      setProgress(100);
      setSuccess('สร้างข้อสอบสำเร็จ! กำลังเปลี่ยนหน้า...');
      
      // Redirect to quiz view
      setTimeout(() => {
        window.location.href = `/quiz/${response.data.quiz.id}`;
      }, 1500);

    } catch (error) {
      setError(error.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างข้อสอบ');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-file-pdf me-2"></i>
          สร้างข้อสอบจากไฟล์ PDF
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {/* File Upload Section */}
          <Form.Group className="mb-3">
            <Form.Label>เลือกไฟล์ PDF</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={loading}
            />
            {selectedFile && (
              <div className="mt-2 text-success">
                <i className="bi bi-check-circle me-1"></i>
                เลือกไฟล์: {selectedFile.name}
              </div>
            )}
          </Form.Group>

          {/* Quiz Settings */}
          <Form.Group className="mb-3">
            <Form.Label>จำนวนข้อ</Form.Label>
            <Form.Select 
              value={quizSettings.questionCount}
              onChange={(e) => setQuizSettings({
                ...quizSettings, 
                questionCount: parseInt(e.target.value)
              })}
              disabled={loading}
            >
              <option value={5}>5 ข้อ</option>
              <option value={10}>10 ข้อ</option>
              <option value={15}>15 ข้อ</option>
              <option value={20}>20 ข้อ</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>ระดับความยาก</Form.Label>
            <Form.Select 
              value={quizSettings.difficulty}
              onChange={(e) => setQuizSettings({
                ...quizSettings, 
                difficulty: e.target.value
              })}
              disabled={loading}
            >
              <option value="Easy">ง่าย</option>
              <option value="Medium">ปานกลาง</option>
              <option value="Hard">ยาก</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>หัวข้อวิชา (ไม่บังคับ)</Form.Label>
            <Form.Control
              type="text"
              placeholder="เช่น AI, Computer Science, Signal Processing"
              value={quizSettings.subject}
              onChange={(e) => setQuizSettings({
                ...quizSettings, 
                subject: e.target.value
              })}
              disabled={loading}
            />
          </Form.Group>

          {/* Progress Bar */}
          {loading && (
            <div className="mb-3">
              <ProgressBar now={progress} label={`${progress}%`} />
              <small className="text-muted">กำลังประมวลผล PDF และสร้างข้อสอบ...</small>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading || !selectedFile}
            className="w-100"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                กำลังสร้างข้อสอบ...
              </>
            ) : (
              <>
                <i className="bi bi-magic me-2"></i>
                สร้างข้อสอบจาก PDF
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default PDFQuizGenerator;