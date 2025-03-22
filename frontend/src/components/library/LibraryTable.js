import React from 'react';
import { Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../context/LibraryContext';
import FolderRow from './FolderRow';
import QuizRow from './QuizRow';

const LibraryTable = ({ onFolderAction, onQuizAction }) => {
  const { sortConfig, requestSort, sortedItems, changeFolder } = useLibrary();
  const navigate = useNavigate();
  
  const handleQuizAction = (quiz, action) => {
    if (action === 'view') {
      navigate(`/view/${quiz.id}`);
    } else if (action === 'export') {
      window.open(`/api/quizzes/${quiz.id}/export/text`, '_blank');
    } else {
      onQuizAction(quiz, action);
    }
  };
  
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">
        <Table responsive hover className="mb-0">
          <thead className="bg-light border-bottom">
            <tr>
              <th
                className="ps-4 cursor-pointer"
                onClick={() => requestSort('name')}
                style={{ cursor: 'pointer' }}
              >
                Name
                <span>
                  {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </span>
              </th>
              <th
                className="cursor-pointer"
                onClick={() => requestSort('type')}
                style={{ cursor: 'pointer' }}
              >
                Type
                <span>
                  {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </span>
              </th>
              <th
                className="cursor-pointer"
                onClick={() => requestSort('modified')}
                style={{ cursor: 'pointer' }}
              >
                Modified
                <span>
                  {sortConfig.key === 'modified' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </span>
              </th>
              <th></th> {/* for actions */}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => {
              if (item.id && item.parentId !== undefined) {
                // This is a folder
                return (
                  <FolderRow
                    key={`folder-${item.id}`}
                    folder={item}
                    onAction={onFolderAction}
                  />
                );
              } else {
                // This is a quiz
                return (
                  <QuizRow
                    key={`quiz-${item.id}`}
                    quiz={item}
                    onAction={handleQuizAction}
                  />
                );
              }
            })}
            
            {/* Show empty state message if no items */}
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-5">
                  <p className="mb-0">ไม่พบข้อมูลในโฟลเดอร์นี้</p>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default LibraryTable;