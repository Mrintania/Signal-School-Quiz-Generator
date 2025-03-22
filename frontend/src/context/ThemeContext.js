import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const ThemeContext = createContext();

// Define theme colors
const themes = {
  light: {
    primary: '#6f42c1',
    secondary: '#5a32a3',
    accent: '#9b71d5',
    background: '#f8f9fa',
    cardBackground: '#ffffff',
    text: '#343a40',
    border: 'rgba(0,0,0,0.1)',
    shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  dark: {
    primary: '#9b71d5',
    secondary: '#7952b3',
    accent: '#6f42c1',
    background: '#212529',
    cardBackground: '#343a40',
    text: '#f8f9fa',
    border: 'rgba(255,255,255,0.1)',
    shadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
  }
};

export const ThemeProvider = ({ children }) => {
  // Check if user prefers dark mode
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Try to get saved theme from localStorage or use system preference
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || (prefersDarkMode ? 'dark' : 'light');
  });

  // Update localStorage and apply theme when it changes
  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Apply theme to document
  const applyTheme = (theme) => {
    const root = document.documentElement;
    const colors = themes[theme];
    
    // Set CSS variables
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(`--${property}`, value);
    });
    
    // Add/remove dark class on body
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  // Toggle theme function
  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Set specific theme
  const setTheme = (theme) => {
    if (theme === 'light' || theme === 'dark') {
      setCurrentTheme(theme);
    }
  };

  // Context value
  const value = {
    currentTheme,
    toggleTheme,
    setTheme,
    colors: themes[currentTheme],
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;