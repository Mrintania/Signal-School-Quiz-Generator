import React, { useRef } from 'react';
import { Button, Card } from 'react-bootstrap';

const PrintableQuiz = ({ quiz, includeAnswers = false }) => {
    const printRef = useRef();

    // Handle print function
    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;

        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'height=600,width=800');

        // Write content to print window
        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${quiz.title} - Printable Quiz</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .question {
              margin-bottom: 25px;
            }
            .question-text {
              font-weight: bold;
              margin-bottom: 10px;
            }
            .options {
              list-style-type: none;
              padding-left: 20px;
              margin-bottom: 10px;
            }
            .option {
              margin-bottom: 8px;
            }
            .explanation {
              font-style: italic;
              border-left: 3px solid #ddd;
              padding-left: 10px;
              color: #666;
              margin-top: 10px;
            }
            .answer-key {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
              page-break-before: always;
            }
            .correct-answer {
              font-weight: bold;
              color: #28a745;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

        // Finalize and print
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    // Generate alphabet letters for options (A, B, C, D)
    const getOptionLabel = (index) => String.fromCharCode(65 + index);

    if (!quiz) return null;

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Printable Quiz</h5>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePrint}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                        <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z" />
                        <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
                    </svg>
                    Print Quiz
                </Button>
            </Card.Header>
            <Card.Body>
                <div ref={printRef}>
                    {/* Quiz Header */}
                    <div className="header">
                        <h2>{quiz.title}</h2>
                        <p>Topic: {quiz.topic}</p>
                        {quiz.student_level && <p>Level: {quiz.student_level}</p>}
                        <p>Total Questions: {quiz.questions.length}</p>
                    </div>

                    {/* Questions Section */}
                    <div className="questions">
                        {quiz.questions.map((question, qIndex) => (
                            <div key={qIndex} className="question">
                                <div className="question-text">
                                    {qIndex + 1}. {question.questionText}
                                </div>

                                {/* Multiple Choice Options */}
                                {quiz.question_type === 'Multiple Choice' && (
                                    <ul className="options">
                                        {question.options.map((option, oIndex) => (
                                            <li key={oIndex} className="option">
                                                {getOptionLabel(oIndex)}. {option.text}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Space for essay answers */}
                                {quiz.question_type === 'Essay' && (
                                    <div className="essay-space" style={{ height: '150px', border: '1px solid #ddd', marginTop: '10px' }}></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Answer Key - Only shown if includeAnswers is true */}
                    {includeAnswers && (
                        <div className="answer-key page-break">
                            <h3>Answer Key</h3>

                            {quiz.questions.map((question, qIndex) => (
                                <div key={`answer-${qIndex}`} className="question">
                                    <div className="question-text">
                                        {qIndex + 1}. {question.questionText}
                                    </div>

                                    {/* Multiple Choice Answers */}
                                    {quiz.question_type === 'Multiple Choice' && (
                                        <>
                                            <div className="correct-answer">
                                                Correct Answer: {
                                                    getOptionLabel(question.options.findIndex(opt => opt.isCorrect))
                                                }. {
                                                    question.options.find(opt => opt.isCorrect)?.text
                                                }
                                            </div>

                                            {question.explanation && (
                                                <div className="explanation">
                                                    Explanation: {question.explanation}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Essay Answer Guidelines */}
                                    {quiz.question_type === 'Essay' && question.explanation && (
                                        <div className="explanation">
                                            Answer Guidelines: {question.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};

export default PrintableQuiz;