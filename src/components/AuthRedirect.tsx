import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Avoid rendering a spinner during auth bootstrap.
    return <div className="min-h-screen bg-background" />;
  }

  // Se autenticado, redireciona para o dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Se não autenticado, renderiza o componente filho (e.g., LoginPage)
  return <>{children}</>;
};