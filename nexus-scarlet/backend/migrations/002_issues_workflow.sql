CREATE TABLE issues (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(240) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED','TRIAGED','ASSIGNED','IN_PROGRESS','CODE_REVIEW','TESTING','RESOLVED','VERIFIED','CLOSED')),
  severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority VARCHAR(16) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3','P4')),
  issue_type VARCHAR(32) NOT NULL DEFAULT 'BUG' CHECK (issue_type IN ('BUG','TASK','IMPROVEMENT','SECURITY')),
  component VARCHAR(120),
  version VARCHAR(64),
  reporter_id VARCHAR(64) NOT NULL REFERENCES users(id),
  assignee_id VARCHAR(64) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issues_project_status ON issues(project_id, status);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_component ON issues(component);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
