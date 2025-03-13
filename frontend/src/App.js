import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
// import cors from 'cors';

// Context Provider
import { QuizProvider } from './context/QuizContext';

// Layout Component
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import QuizResultPage from './pages/QuizResultPage';
import LibraryPage from './pages/LibraryPage';
import ViewQuizPage from './pages/ViewQuizPage';

function App() {
  return (
    <QuizProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateQuizPage />} />
            <Route path="/result" element={<QuizResultPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/view/:id" element={<ViewQuizPage />} />
          </Routes>
        </Layout>
      </Router>
    </QuizProvider>
  );
}

export default App;