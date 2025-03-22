import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';

const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  maxPageNumbers = 5
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Don't show pagination if we have only one page
  if (totalPages <= 1) return null;
  
  // Calculate page numbers to show
  const getPageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      // If total pages is less than max page numbers, show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Otherwise show a range around current page
      const leftSide = Math.floor(maxPageNumbers / 2);
      const rightSide = maxPageNumbers - leftSide - 1;
      
      // If current page is close to start
      if (currentPage <= leftSide + 1) {
        return [...Array.from({ length: maxPageNumbers - 1 }, (_, i) => i + 1), totalPages];
      }
      
      // If current page is close to end
      if (currentPage >= totalPages - rightSide) {
        return [1, ...Array.from({ length: maxPageNumbers - 1 }, (_, i) => totalPages - maxPageNumbers + i + 2)];
      }
      
      // If current page is in the middle
      return [
        1,
        ...Array.from(
          { length: maxPageNumbers - 2 }, 
          (_, i) => currentPage - leftSide + i
        ),
        totalPages
      ];
    }
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="d-flex justify-content-center mt-4">
      <BootstrapPagination>
        {/* Previous button */}
        <BootstrapPagination.Prev
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />
        
        {/* First page if not in visible range */}
        {pageNumbers[0] > 1 && (
          <>
            <BootstrapPagination.Item
              onClick={() => onPageChange(1)}
              active={currentPage === 1}
            >
              1
            </BootstrapPagination.Item>
            {pageNumbers[0] > 2 && <BootstrapPagination.Ellipsis disabled />}
          </>
        )}
        
        {/* Page numbers */}
        {pageNumbers.map(number => (
          <BootstrapPagination.Item
            key={number}
            onClick={() => onPageChange(number)}
            active={currentPage === number}
          >
            {number}
          </BootstrapPagination.Item>
        ))}
        
        {/* Last page if not in visible range */}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <BootstrapPagination.Ellipsis disabled />
            )}
            <BootstrapPagination.Item
              onClick={() => onPageChange(totalPages)}
              active={currentPage === totalPages}
            >
              {totalPages}
            </BootstrapPagination.Item>
          </>
        )}
        
        {/* Next button */}
        <BootstrapPagination.Next
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
      </BootstrapPagination>
    </div>
  );
};

export default Pagination;