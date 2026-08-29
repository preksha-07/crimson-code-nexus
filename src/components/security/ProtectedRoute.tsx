import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const sessionStr = localStorage.getItem('nexus_current_user');
  
  if (!sessionStr) {
    return <Navigate to="/login" replace />;
  }

  let hasValidSession = false;
  try {
    const session = JSON.parse(sessionStr);
    if (session && typeof session === 'object' && session.token) {
      hasValidSession = true;
    }
  } catch {
    // Malformed JSON falls through
  }

  if (!hasValidSession) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
