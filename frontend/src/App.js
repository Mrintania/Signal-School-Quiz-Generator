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
import AdminLayout from './components/admin/AdminLayout';
import SchoolAdminLayout from './components/school/SchoolAdminLayout';

// Auth Components
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, SchoolAdminRoute } from './components/auth/AuthRoutes';

// Pages
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import LibraryPage from './pages/LibraryPage';
import QuizResultPage from './pages/QuizResultPage';
import ViewQuizPage from './pages/ViewQuizPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import AcceptInvitationPage from './pages/auth/AcceptInvitationPage';

// User Pages
import ProfilePage from './pages/user/ProfilePage';
import SettingsPage from './pages/user/SettingsPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminSchoolsPage from './pages/admin/SchoolsPage';

// School Admin Pages
import SchoolDashboardPage from './pages/school/DashboardPage';
import SchoolTeachersPage from './pages/school/TeachersPage';
import SchoolDepartmentsPage from './pages/school/DepartmentsPage';

// Error Pages
import NotFoundPage from './pages/errors/NotFoundPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';

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
      
      {/* Authentication Routes (Only for non-authenticated users) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="accept-invitation" element={<AcceptInvitationPage />} />
      </Route>
      
      {/* Protected Routes (Requires authentication) */}
      <Route element={<ProtectedRoute />}>
        <Route path="create" element={<CreateQuizPage />} />
        <Route path="result" element={<QuizResultPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="view/:id" element={<ViewQuizPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* School Admin Routes */}
      <Route element={<SchoolAdminRoute />}>
        <Route path="school" element={<SchoolAdminLayout />}>
          <Route index element={<SchoolDashboardPage />} />
          <Route path="teachers" element={<SchoolTeachersPage />} />
          <Route path="departments" element={<SchoolDepartmentsPage />} />
        </Route>
      </Route>
      
      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="schools" element={<AdminSchoolsPage />} />
        </Route>
      </Route>
      
      {/* Error Pages */}
      <Route path="unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
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