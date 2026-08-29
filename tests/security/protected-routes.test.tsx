import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from '../../src/components/security/ProtectedRoute';

describe('ProtectedRoute Security Guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const ProtectedComponent = () => <div>Protected Content</div>;
  const LoginFallbackComponent = () => <div>Login Screen</div>;

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginFallbackComponent />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects to /login when no session exists (unauthenticated)', () => {
    renderWithRouter();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('permits access to protected component when valid session exists', () => {
    localStorage.setItem(
      'nexus_current_user',
      JSON.stringify({ name: 'sarah', token: 'valid-token-123' })
    );
    renderWithRouter();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
  });

  it('redirects to /login when session is malformed', () => {
    localStorage.setItem('nexus_current_user', 'invalid-json-data');
    renderWithRouter();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('redirects to /login when token is missing in session', () => {
    localStorage.setItem(
      'nexus_current_user',
      JSON.stringify({ name: 'sarah' }) // no token
    );
    renderWithRouter();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });
});
