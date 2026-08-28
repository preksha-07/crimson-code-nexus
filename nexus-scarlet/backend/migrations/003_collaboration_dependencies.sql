CREATE TABLE issue_comments (
  id VARCHAR(64) PRIMARY KEY,
  issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id VARCHAR(64) NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_issue_created ON issue_comments(issue_id, created_at DESC);

CREATE TABLE issue_dependencies (
  issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  depends_on_issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  relation VARCHAR(32) NOT NULL DEFAULT 'BLOCKS' CHECK (relation IN ('BLOCKS','DEPENDS_ON','RELATES_TO','DUPLICATES')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (issue_id, depends_on_issue_id, relation),
  CHECK (issue_id <> depends_on_issue_id)
);

CREATE INDEX idx_issue_dependencies_target ON issue_dependencies(depends_on_issue_id);

CREATE TABLE attachments (
  id VARCHAR(64) PRIMARY KEY,
  issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(64) NOT NULL REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(160) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_issue ON attachments(issue_id);

CREATE TABLE issue_events (
  id BIGSERIAL PRIMARY KEY,
  issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id VARCHAR(64) REFERENCES users(id),
  event_type VARCHAR(64) NOT NULL,
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_events_issue_created ON issue_events(issue_id, created_at DESC);
