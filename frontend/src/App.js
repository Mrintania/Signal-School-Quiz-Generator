// frontend/src/App.js
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements
} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Layouts
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import LibraryPage from './pages/LibraryPage';
import QuizResultPage from './pages/QuizResultPage';
import ViewQuizPage from './pages/ViewQuizPage';
import AccountPage from './pages/AccountPage';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

// Create router with routes
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      {/* Public Routes */}
      <Route index element={<HomePage />} />
      <Route path="create" element={<CreateQuizPage />} />
      <Route path="result" element={<QuizResultPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="view/:id" element={<ViewQuizPage />} />
      <Route path="account" element={<AccountPage />} />
    </Route>
  )
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <QuizProvider>
            <RouterProvider router={router} />
          </QuizProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;