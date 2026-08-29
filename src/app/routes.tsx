import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectOverviewPage from '../pages/ProjectOverviewPage';
import IssueCreatePage from '../pages/IssueCreatePage';
import IssueWorkspacePage from '../pages/IssueWorkspacePage';
import SecurityPage from '../pages/SecurityPage';
import ProtectedRoute from '../components/security/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Authentication */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Control Room */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Projects */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectOverviewPage />
          </ProtectedRoute>
        }
      />

      {/* Individual Project */}
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectOverviewPage />
          </ProtectedRoute>
        }
      />

      {/* Create Issue */}
      <Route
        path="/issues/create"
        element={
          <ProtectedRoute>
            <IssueCreatePage />
          </ProtectedRoute>
        }
      />

      {/* Issue Workspace */}
      <Route
        path="/issues/:issueId"
        element={
          <ProtectedRoute>
            <IssueWorkspacePage />
          </ProtectedRoute>
        }
      />

      {/* Security */}
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
      />

      {/* Unknown route */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
