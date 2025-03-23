// frontend/src/components/auth/AuthRoutes.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingOverlay from '../LoadingOverlay';

// ProtectedRoute - Only authenticated users can access
export const ProtectedRoute = ({ requireRole = null }) => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay isLoading={true} message="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check for role requirement if specified
  if (requireRole && currentUser?.role !== requireRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

// PublicOnlyRoute - Redirect to home if already authenticated
export const PublicOnlyRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingOverlay isLoading={true} message="กำลังตรวจสอบสถานะ..." />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

// AdminRoute - Only admin users can access
export const AdminRoute = () => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingOverlay isLoading={true} message="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Outlet />;
};

// SchoolAdminRoute - Only school admin users can access
export const SchoolAdminRoute = () => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingOverlay isLoading={true} message="กำลังตรวจสอบสิทธิ์ผู้ดูแลโรงเรียน..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'school_admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Outlet />;
};

export default { ProtectedRoute, PublicOnlyRoute, AdminRoute, SchoolAdminRoute };