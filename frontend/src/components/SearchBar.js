import React, { useState, useEffect, useCallback } from 'react';
import { InputGroup, Form, Dropdown, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { quizService } from '../services/api';

// Debounce function for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const SearchBar = () => {
  const { setSearchTerm } = useLibrary();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  
  // Debounce search query to avoid making too many requests
  const debouncedQuery = useDebounce(query, 300);
  
  // Search function
  const performSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      
      // Call API to search for quizzes
      const response = await quizService.getAllQuizzes();
      
      if (response.success) {
        // Filter results client-side for now
        // In production, this would be a server-side search
        const filteredResults = response.data.filter(quiz => 
          quiz.title.toLowerCase().includes(q.toLowerCase()) ||
          quiz.topic.toLowerCase().includes(q.toLowerCase())
        );
        
        // Limit to top 5 results for dropdown
        setSearchResults(filteredResults.slice(0, 5));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);
  
  // Handle search query changes
  useEffect(() => {
    // Don't search if query is empty
    if (debouncedQuery.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    performSearch(debouncedQuery);
    setShowResults(true);
  }, [debouncedQuery, performSearch]);
  
  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Pass search term to context for filtering in library
    setSearchTerm(value);
  };
  
  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowResults(false);
    
    // Navigate to library with search term
    if (query.trim()) {
      navigate(`/library?search=${encodeURIComponent(query.trim())}`);
    }
  };
  
  // Handle quiz selection from dropdown
  const handleSelectQuiz = (quizId) => {
    setShowResults(false);
    navigate(`/view/${quizId}`);
  };
  
  return (
    <div className="position-relative">
      <Form onSubmit={handleSearchSubmit}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </InputGroup.Text>
          
          <Form.Control
            type="text"
            placeholder="Search quizzes, topics..."
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowResults(true)}
            className="border-start-0"
            aria-label="Search"
            style={{ boxShadow: 'none' }}
          />
          
          <Button 
            variant="outline-secondary" 
            type="submit"
            disabled={searching}
          >
            {searching ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : 'Search'}
          </Button>
        </InputGroup>
      </Form>
      
      {/* Search results dropdown */}
      {showResults && query.trim() !== '' && (
        <div 
          className="position-absolute mt-1 w-100 border rounded shadow-sm bg-white z-index-1000"
          style={{ zIndex: 1000 }}
        >
          {searching ? (
            <div className="p-3 text-center text-muted">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              {searchResults.map(quiz => (
                <div 
                  key={quiz.id}
                  className="p-2 border-bottom hover-bg-light cursor-pointer"
                  onClick={() => handleSelectQuiz(quiz.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0 me-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#F19158" viewBox="0 0 16 16">
                        <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                        <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium">{quiz.title}</div>
                      <small className="text-muted">{quiz.topic}</small>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="p-2 text-center">
                <button 
                  className="btn btn-link btn-sm text-decoration-none"
                  onClick={handleSearchSubmit}
                >
                  See all results
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-muted">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;