import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectOverviewPage from '../pages/ProjectOverviewPage';
import IssueCreatePage from '../pages/IssueCreatePage';
import IssueWorkspacePage from '../pages/IssueWorkspacePage';
import SecurityPage from '../pages/SecurityPage';

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
        element={<DashboardPage />}
      />

      {/* Projects */}
      <Route
        path="/projects"
        element={<ProjectOverviewPage />}
      />

      {/* Individual Project */}
      <Route
        path="/projects/:projectId"
        element={<ProjectOverviewPage />}
      />

      {/* Create Issue */}
      <Route
        path="/issues/create"
        element={<IssueCreatePage />}
      />

      {/* Issue Workspace */}
      <Route
        path="/issues/:issueId"
        element={<IssueWorkspacePage />}
      />

      {/* Security */}
      <Route
        path="/security"
        element={<SecurityPage />}
      />

      {/* Unknown route */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
