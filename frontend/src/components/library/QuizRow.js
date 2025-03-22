import React from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// QuizIcon component
const QuizIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#F19158" strokeWidth="1" viewBox="0 0 24 24">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="#FFF1E6" stroke="#F19158" />
    <path fill="#F19158" d="M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
    <path d="M8 14h8M8 17h5" stroke="#F19158" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ThreeDotsIcon component
const ThreeDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </svg>
);

const QuizRow = ({ quiz, onAction }) => {
  const navigate = useNavigate();
  
  const handleQuizClick = () => {
    navigate(`/view/${quiz.id}`);
  };
  
  const handleAction = (action, e) => {
    e.stopPropagation();
    onAction(quiz, action);
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <tr onClick={handleQuizClick} style={{ cursor: 'pointer' }}>
      <td className="ps-4">
        <div className="d-flex align-items-center">
          <div className="me-2">
            <QuizIcon />
          </div>
          <span>{quiz.title}</span>
        </div>
      </td>
      <td>Quiz</td>
      <td>{formatDate(quiz.created_at)}</td>
      <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="cursor-pointer" style={{ cursor: 'pointer' }}>
            <ThreeDotsIcon />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={(e) => handleAction('view', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                </svg>
                View responses
              </div>
            </Dropdown.Item>
            <Dropdown.Item disabled onClick={(e) => handleAction('edit', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                </svg>
                Edit
              </div>
              <div className="small text-muted ms-4">อยู่ระหว่างการพัฒนา</div>
            </Dropdown.Item>
            <Dropdown.Item onClick={(e) => handleAction('export', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                </svg>
                Export <Badge pill bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.7em' }}>Pro</Badge>
              </div>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={(e) => handleAction('rename', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                </svg>
                Rename
              </div>
            </Dropdown.Item>
            <Dropdown.Item className="text-danger" onClick={(e) => handleAction('delete', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                </svg>
                <span className="text-danger">Delete</span>
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </td>
    </tr>
  );
};

export default QuizRow;