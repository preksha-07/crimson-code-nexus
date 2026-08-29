CREATE TABLE IF NOT EXISTS ai_analysis (
  id VARCHAR(64) PRIMARY KEY,
  issue_id VARCHAR(64) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL DEFAULT 'deterministic',
  model VARCHAR(64) NOT NULL DEFAULT 'v1',
  bug_dna JSONB NOT NULL DEFAULT '{}'::jsonb,
  triage_suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  reproduction_capsule JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_score JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_issue ON ai_analysis(issue_id);
