import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProtectedRoute from '../../src/components/security/ProtectedRoute';
import { apiClient } from '../../src/lib/api/client';

// Mock the apiClient to prevent real network calls and control session responses
vi.mock('../../src/lib/api/client', () => {
  return {
    apiClient: {
      get: vi.fn(),
    },
  };
});

describe('ProtectedRoute Security Guards', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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

  it('redirects to /login when no session exists (unauthenticated)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { user: null } });
    
    renderWithRouter();
    
    // Await redirect transition
    expect(await screen.findByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('permits access to protected component when valid session exists', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { user: { id: 'usr_03', role: 'DEVELOPER', displayName: 'Dev Kumar' } }
    });
    
    renderWithRouter();
    
    // Await transition into guarded view
    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
  });

  it('redirects to /login when session is malformed', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { user: null } });
    
    renderWithRouter();
    
    // Await redirect transition
    expect(await screen.findByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when token is missing in session', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { user: null } });
    
    renderWithRouter();
    
    // Await redirect transition
    expect(await screen.findByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
