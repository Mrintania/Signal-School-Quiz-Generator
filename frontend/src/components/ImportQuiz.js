import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { quizService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ImportQuiz = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importFormat, setImportFormat] = useState('plain');
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFileName('');
      setPreview(null);
      return;
    }
    
    // Check file type (accept .txt, .gift, .json)
    const validTypes = ['text/plain', 'application/json'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.gift')) {
      setError('Invalid file type. Please upload a .txt, .json, or .gift file.');
      setFile(null);
      setFileName('');
      setPreview(null);
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
    
    // Create file preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result.substring(0, 500) + (e.target.result.length > 500 ? '...' : '');
      setPreview(content);
    };
    reader.readAsText(selectedFile);
  };
  
  // Handle import
  const handleImport = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to import');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Read file content
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
      
      // Process content based on format
      let quizData;
      
      if (importFormat === 'json' || file.type === 'application/json') {
        // Parse JSON format
        try {
          quizData = JSON.parse(fileContent);
          
          // Validate quiz structure
          if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Invalid quiz format. JSON must contain title and questions array');
          }
        } catch (jsonError) {
          throw new Error(`Failed to parse JSON: ${jsonError.message}`);
        }
      } else if (importFormat === 'gift' || file.name.endsWith('.gift')) {
        // Process GIFT format (simple parser, would need more comprehensive in production)
        quizData = parseGiftFormat(fileContent);
      } else {
        // Process plain text format
        quizData = parsePlainTextFormat(fileContent);
      }
      
      // Save the parsed quiz
      const response = await quizService.saveQuiz(quizData);
      
      if (response.success) {
        // Navigate to view the imported quiz
        navigate(`/view/${response.quizId}`);
      } else {
        throw new Error(response.message || 'Failed to import quiz');
      }
    } catch (error) {
      console.error('Import error:', error);
      setError(error.message || 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to parse GIFT format (very simplified version)
  const parseGiftFormat = (content) => {
    // Extract title from comments
    const titleMatch = content.match(/\/\/(.*)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Imported Quiz';
    
    // Extract questions
    const questionBlocks = content.split(/\n\s*\n/).filter(block => block.trim());
    const questions = [];
    
    for (const block of questionBlocks) {
      if (block.trim().startsWith('//')) continue; // Skip comment blocks
      
      // Extract question text
      const questionMatch = block.match(/::([^:]*)::\s*\[html\](.*?)(\{)/s);
      if (!questionMatch) continue;
      
      const questionText = questionMatch[2].trim();
      
      // Check if it's multiple choice or essay
      if (block.includes('=') || block.includes('~')) {
        // Multiple choice
        const options = [];
        const optionMatches = block.matchAll(/[=~]([^=~#\n]*)/g);
        
        let correctFound = false;
        for (const match of optionMatches) {
          const isCorrect = match[0].startsWith('=');
          options.push({
            text: match[1].trim(),
            isCorrect
          });
          
          if (isCorrect) correctFound = true;
        }
        
        // If no correct answer found, mark first as correct
        if (!correctFound && options.length > 0) {
          options[0].isCorrect = true;
        }
        
        questions.push({
          questionText,
          options,
          explanation: 'Imported from GIFT format'
        });
      } else {
        // Essay question
        questions.push({
          questionText,
          explanation: 'Imported from GIFT format - essay question'
        });
      }
    }
    
    return {
      title,
      topic: 'Imported Quiz',
      questionType: questions.some(q => q.options) ? 'Multiple Choice' : 'Essay',
      questions
    };
  };
  
  // Helper function to parse plain text format
  const parsePlainTextFormat = (content) => {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Use first line as title
    const title = lines.shift() || 'Imported Quiz';
    
    // Try to identify questions and options
    const questions = [];
    let currentQuestion = null;
    
    for (const line of lines) {
      // Check if this line starts a new question (numbered or with "Question:" prefix)
      if (line.match(/^\d+[\.\)]\s+/) || line.match(/^Question\s*\d*[\.\:]/) || line.match(/^Q\d+[\.\:]/) || line.match(/^ข้อที่\s*\d+/)) {
        // Save previous question if exists
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        // Start new question
        currentQuestion = {
          questionText: line.replace(/^\d+[\.\)]\s+/, '').replace(/^Question\s*\d*[\.\:]/, '').replace(/^Q\d+[\.\:]/, '').replace(/^ข้อที่\s*\d+/, '').trim(),
          options: [],
          explanation: ''
        };
      } 
      // Check if line is an option (A, B, C, D format)
      else if (currentQuestion && line.match(/^[A-Da-d][\.\)]\s+/)) {
        const optionText = line.replace(/^[A-Da-d][\.\)]\s+/, '').trim();
        currentQuestion.options.push({
          text: optionText,
          isCorrect: line.includes('*') || line.includes('(Correct)') || line.includes('(correct)')
        });
      }
      // If line contains "Answer:" or similar, treat it as explanation
      else if (currentQuestion && (line.includes('Answer:') || line.includes('Explanation:') || line.includes('เฉลย:'))) {
        currentQuestion.explanation = line.replace(/Answer\s*:/, '').replace(/Explanation\s*:/, '').replace(/เฉลย\s*:/, '').trim();
      }
      // Add to current question's text if no other pattern matches
      else if (currentQuestion) {
        // If it doesn't look like an option, append to question text
        currentQuestion.questionText += ' ' + line;
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    // Make sure we have at least one correct answer per question
    questions.forEach(question => {
      if (question.options && question.options.length > 0 && !question.options.some(opt => opt.isCorrect)) {
        // If no option is marked correct, mark the first one
        question.options[0].isCorrect = true;
      }
    });
    
    // Determine question type
    const hasOptions = questions.some(q => q.options && q.options.length > 0);
    
    return {
      title,
      topic: 'Imported Quiz',
      questionType: hasOptions ? 'Multiple Choice' : 'Essay',
      questions
    };
  };
  
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header>
        <h5 className="mb-0">Import Quiz</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleImport}>
          {/* File format selection */}
          <Form.Group className="mb-3">
            <Form.Label>Import Format</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="Plain Text"
                name="importFormat"
                id="format-plain"
                value="plain"
                checked={importFormat === 'plain'}
                onChange={(e) => setImportFormat(e.target.value)}
              />
              <Form.Check
                inline
                type="radio"
                label="Moodle GIFT"
                name="importFormat"
                id="format-gift"
                value="gift"
                checked={importFormat === 'gift'}
                onChange={(e) => setImportFormat(e.target.value)}
              />
              <Form.Check
                inline
                type="radio"
                label="JSON"
                name="importFormat"
                id="format-json"
                value="json"
                checked={importFormat === 'json'}
                onChange={(e) => setImportFormat(e.target.value)}
              />
            </div>
            <Form.Text className="text-muted">
              Select the format of the file you want to import
            </Form.Text>
          </Form.Group>
          
          {/* File input */}
          <Form.Group className="mb-3">
            <Form.Label>Select File</Form.Label>
            <div className="input-group">
              <Form.Control
                type="file"
                accept=".txt,.json,.gift"
                onChange={handleFileChange}
                required
              />
              <Button 
                variant="outline-secondary"
                onClick={() => {
                  setFile(null);
                  setFileName('');
                  setPreview(null);
                }}
                disabled={!file}
              >
                Clear
              </Button>
            </div>
            <Form.Text className="text-muted">
              {importFormat === 'plain' && 'Upload a plain text file with your quiz content'}
              {importFormat === 'gift' && 'Upload a Moodle GIFT format file'}
              {importFormat === 'json' && 'Upload a JSON file with quiz data structure'}
            </Form.Text>
          </Form.Group>
          
          {/* Preview */}
          {preview && (
            <Form.Group className="mb-3">
              <Form.Label>Preview</Form.Label>
              <div className="border p-3 bg-light rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{preview}</pre>
              </div>
            </Form.Group>
          )}
          
          {/* Import button */}
          <div className="d-grid">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <Spinner 
                    as="span" 
                    animation="border" 
                    size="sm" 
                    className="me-2" 
                    role="status"
                    aria-hidden="true"
                  />
                  Importing...
                </>
              ) : 'Import Quiz'}
            </Button>
          </div>
        </Form>
        
        {/* Format guidelines */}
        <div className="mt-4">
          <h6>Import Guidelines</h6>
          <div className="accordion" id="importGuides">
            <div className="accordion-item">
              <h2 className="accordion-header" id="plainTextHeader">
                <button 
                  className="accordion-button collapsed" 
                  type="button" 
                  data-bs-toggle="collapse" 
                  data-bs-target="#plainTextGuide" 
                  aria-expanded="false" 
                  aria-controls="plainTextGuide"
                >
                  Plain Text Format
                </button>
              </h2>
              <div 
                id="plainTextGuide" 
                className="accordion-collapse collapse" 
                aria-labelledby="plainTextHeader"
              >
                <div className="accordion-body">
                  <small>
                    <p>The first line will be used as the quiz title. Format questions like:</p>
                    <pre className="bg-light p-2 rounded">
                      {`1. What is the capital of France?
A. London
B. Paris *
C. Berlin
D. Madrid

2. What is the largest planet in our solar system?
A. Earth
B. Mars
C. Jupiter *
D. Venus`}
                    </pre>
                    <p>Mark correct answers with an asterisk (*) or (correct) after the option.</p>
                  </small>
                </div>
              </div>
            </div>
            
            <div className="accordion-item">
              <h2 className="accordion-header" id="giftHeader">
                <button 
                  className="accordion-button collapsed" 
                  type="button" 
                  data-bs-toggle="collapse" 
                  data-bs-target="#giftGuide" 
                  aria-expanded="false" 
                  aria-controls="giftGuide"
                >
                  Moodle GIFT Format
                </button>
              </h2>
              <div 
                id="giftGuide" 
                className="accordion-collapse collapse" 
                aria-labelledby="giftHeader"
              >
                <div className="accordion-body">
                  <small>
                    <p>Use Moodle GIFT format:</p>
                    <pre className="bg-light p-2 rounded">
                      {`// My Quiz
// Topic: Science

::Question 1::[html]What is photosynthesis?{
  =The process by which plants make food using sunlight
  ~The process of breaking down food
  ~The movement of water through a plant
  ~The process of cellular respiration
}`}
                    </pre>
                    <p>Correct answers start with = and incorrect answers with ~</p>
                  </small>
                </div>
              </div>
            </div>
            
            <div className="accordion-item">
              <h2 className="accordion-header" id="jsonHeader">
                <button 
                  className="accordion-button collapsed" 
                  type="button" 
                  data-bs-toggle="collapse" 
                  data-bs-target="#jsonGuide" 
                  aria-expanded="false" 
                  aria-controls="jsonGuide"
                >
                  JSON Format
                </button>
              </h2>
              <div 
                id="jsonGuide" 
                className="accordion-collapse collapse" 
                aria-labelledby="jsonHeader"
              >
                <div className="accordion-body">
                  <small>
                    <p>Use the following JSON structure:</p>
                    <pre className="bg-light p-2 rounded">
                      {`{
  "title": "My Quiz",
  "topic": "Science",
  "questionType": "Multiple Choice",
  "questions": [
    {
      "questionText": "What is the capital of France?",
      "options": [
        {"text": "London", "isCorrect": false},
        {"text": "Paris", "isCorrect": true},
        {"text": "Berlin", "isCorrect": false},
        {"text": "Madrid", "isCorrect": false}
      ],
      "explanation": "Paris is the capital of France."
    }
  ]
}`}
                    </pre>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ImportQuiz;