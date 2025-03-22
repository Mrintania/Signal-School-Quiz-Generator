import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useLibrary } from '../../context/LibraryContext';

// FolderIcon component
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
  </svg>
);

// ThreeDotsIcon component
const ThreeDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </svg>
);

const FolderRow = ({ folder, onAction }) => {
  const { changeFolder, setSelectedFolder } = useLibrary();
  
  const handleFolderClick = (e) => {
    e.stopPropagation();
    changeFolder(folder.id);
  };
  
  const handleAction = (action, e) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    onAction(folder, action);
  };
  
  return (
    <tr onClick={handleFolderClick} style={{ cursor: 'pointer' }}>
      <td className="ps-4">
        <div className="d-flex align-items-center">
          <div
            className="me-2 rounded"
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: folder.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FolderIcon />
          </div>
          <span>{folder.name}</span>
        </div>
      </td>
      <td>Folder</td>
      <td>-</td>
      <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
        <Dropdown align="end">
          <Dropdown.Toggle as="div" className="cursor-pointer" style={{ cursor: 'pointer' }}>
            <ThreeDotsIcon />
          </Dropdown.Toggle>
          <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>
            <Dropdown.Item onClick={(e) => handleAction('rename', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                </svg>
                Rename
              </div>
            </Dropdown.Item>
            <Dropdown.Item onClick={(e) => handleAction('move', e)}>
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                </svg>
                Move
              </div>
            </Dropdown.Item>
            <Dropdown.Item onClick={(e) => handleAction('delete', e)} className="text-danger">
              <div className="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                </svg>
                <span className="text-danger">Delete</span>
              </div>
            </Dropdown.Item>
            <div className="px-2 py-2">
              <div className="d-flex justify-content-between flex-wrap" style={{ gap: '8px' }}>
                {['#F9E852', '#FF9A9A', '#FFA07A', '#90EE90', '#87CEFA', '#9370DB', '#DDA0DD', '#D3D3D3'].map(color => (
                  <div
                    key={color}
                    className={`rounded-circle ${folder.color === color ? 'border border-2 border-dark' : ''}`}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: color,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => handleAction('changeColor', e)}
                  />
                ))}
              </div>
            </div>
          </Dropdown.Menu>
        </Dropdown>
      </td>
    </tr>
  );
};

export default FolderRow;