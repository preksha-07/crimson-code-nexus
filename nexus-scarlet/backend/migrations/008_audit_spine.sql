CREATE TABLE audit_events (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id VARCHAR(64),
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(120) NOT NULL,
  resource_id VARCHAR(120),
  request_id VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
