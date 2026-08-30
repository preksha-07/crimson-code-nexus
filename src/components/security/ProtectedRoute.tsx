import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface SessionResponse {
  user?: {
    id: string;
    role: string;
    displayName: string;
  } | null;
  data?: {
    user?: {
      id: string;
      role: string;
      displayName: string;
    } | null;
  };
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get<SessionResponse>('/auth/me')
      .then(res => {
        if (!active) return;
        const user = res?.user ?? res?.data?.user;
        if (user) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          localStorage.removeItem('nexus_current_user');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAuthenticated(false);
        localStorage.removeItem('nexus_current_user');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0B0F19', color: '#8892B0' }}>
        <span>Authenticating session...</span>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
