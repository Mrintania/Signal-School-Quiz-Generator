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
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminUsersPage from './pages/AdminUsersPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

// Auth routes
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, SchoolAdminRoute } from './components/auth/AuthRoutes';

// Create router with routes
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      {/* Public Routes */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes - need authentication */}
      <Route element={<ProtectedRoute />}>
        <Route index element={<HomePage />} />
        <Route path="create" element={<CreateQuizPage />} />
        <Route path="result" element={<QuizResultPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="view/:id" element={<ViewQuizPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      {/* Admin Routes - need admin privileges */}
      <Route element={<AdminRoute />}>
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/schools" element={<AdminUsersPage />} /> {/* Placeholder, can be replaced with actual SchoolsPage */}
        <Route path="admin/settings" element={<AdminUsersPage />} /> {/* Placeholder, can be replaced with actual SettingsPage */}
      </Route>
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