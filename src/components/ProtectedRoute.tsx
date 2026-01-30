import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, profile } = useAuth();
  const hasShownAdminDeniedToastRef = useRef(false);

  const isAdminDenied = adminOnly && profile?.role !== 'admin';

  useEffect(() => {
    if (!loading && isAuthenticated && isAdminDenied && !hasShownAdminDeniedToastRef.current) {
      hasShownAdminDeniedToastRef.current = true;
      showError('Acesso negado. Você não tem permissão de administrador.');
    }
    if (!isAdminDenied) {
      hasShownAdminDeniedToastRef.current = false;
    }
  }, [loading, isAuthenticated, isAdminDenied]);

  if (loading) {
    // Avoid rendering a spinner during auth bootstrap.
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminDenied) {
    return <Navigate to="/" replace />;
  }

  // Se autenticado (e admin, se adminOnly for true), permite o acesso.
  return <>{children}</>;
};