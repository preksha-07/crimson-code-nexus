import { pool } from './pool.js';

export async function seedDemoData(targetPool = pool): Promise<void> {
  // 1. Users
  await targetPool.query(`
    INSERT INTO users (id, display_name, email, role, password_hash) VALUES
    ('usr_01','Aarav Sharma','aarav@nexus.local','ADMIN','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
    ('usr_02','Mira Patel','mira@nexus.local','PROJECT_MANAGER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
    ('usr_03','Dev Kumar','dev@nexus.local','DEVELOPER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
    ('usr_04','Riya Sen','riya@nexus.local','SECURITY_REVIEWER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
    ('usr_05','Noah Das','noah@nexus.local','VIEWER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf')
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `);

  // 2. Project
  await targetPool.query(`
    INSERT INTO projects (id, name, key, description) VALUES
    ('proj_01','NEXUS Core','NEX','Evidence-driven security-first bug intelligence platform')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 3. Project Members
  await targetPool.query(`
    INSERT INTO project_members(project_id,user_id) VALUES
    ('proj_01','usr_01'),('proj_01','usr_02'),('proj_01','usr_03'),('proj_01','usr_04'),('proj_01','usr_05')
    ON CONFLICT DO NOTHING;
  `);

  // 4. Releases
  await targetPool.query(`
    INSERT INTO releases(id,project_id,version,name,status,target_date) VALUES
    ('rel_01','proj_01','2.4.0','Identity Hardening','IN_PROGRESS','2026-09-15'),
    ('rel_02','proj_01','2.5.0','Evidence Intelligence','PLANNED','2026-10-15')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 5. 25 Representative Issues
  await targetPool.query(`
    INSERT INTO issues(id,project_id,title,description,status,severity,priority,issue_type,component,version,reporter_id,assignee_id,release_id) VALUES
    ('BUG-091','proj_01','Unicode identity mismatch','Unicode-normalized identity input can fail account matching.', 'RESOLVED','HIGH','P1','BUG','authentication','2.4.0','usr_01','usr_03','rel_01'),
    ('BUG-117','proj_01','Dependency graph exposes private summary','Dependency traversal must respect issue visibility.', 'TRIAGED','CRITICAL','P0','SECURITY','dependency-graph','2.4.0','usr_02','usr_04','rel_01'),
    ('BUG-142','proj_01','Unicode authentication failure','Authentication fails for a valid Unicode identity representation.', 'TRIAGED','HIGH','P1','BUG','authentication','2.4.0','usr_01','usr_03','rel_01'),
    ('BUG-155','proj_01','CSV export content type is unsafe','Export responses must not be interpreted as executable content.', 'ASSIGNED','HIGH','P1','SECURITY','exports','2.4.0','usr_02','usr_04','rel_01'),
    ('BUG-201','proj_01','Attachment upload accepts unexpected content','Attachment metadata and storage policy need validation.', 'REPORTED','MEDIUM','P2','BUG','attachments','2.5.0','usr_03',NULL,'rel_02'),
    ('BUG-202','proj_01','Rate limiting evasion via forwarded header spoofing','X-Forwarded-For headers from untrusted proxies can bypass auth rate limits.','IN_PROGRESS','CRITICAL','P0','SECURITY','authentication','2.4.0','usr_04','usr_03','rel_01'),
    ('BUG-203','proj_01','Audit spine failsafe fallback during database network partition','Ensure audit log errors do not block primary state mutations and log fallback events.','CODE_REVIEW','HIGH','P1','IMPROVEMENT','audit-spine','2.4.0','usr_02','usr_03','rel_01'),
    ('BUG-204','proj_01','Secret sentinel false positives on example RSA keys','Refine secret scanner regex patterns to reduce noise on documentation markdown.','TESTING','LOW','P3','BUG','secrets-scanner','2.5.0','usr_03','usr_01','rel_02'),
    ('BUG-205','proj_01','Strict Content-Security-Policy headers for Web UI','Enforce script-src nonce restrictions and object-src none across dashboard.','VERIFIED','MEDIUM','P2','SECURITY','ui-core','2.4.0','usr_04','usr_01','rel_01'),
    ('BUG-206','proj_01','Session cookie invalidation on user password change','Revoke all active sessions in the database when user credentials are updated.','CLOSED','HIGH','P1','TASK','authentication','2.4.0','usr_01','usr_03','rel_01'),
    ('BUG-207','proj_01','Implement asynchronous notification webhook retry pipeline','Use exponential backoff when dispatching security notifications to external webhooks.','IN_PROGRESS','MEDIUM','P2','IMPROVEMENT','notifications','2.5.0','usr_02','usr_03','rel_02'),
    ('BUG-208','proj_01','Role-based access matrix check for project member invitations','Ensure only project managers and admins can invite new members to a workspace.','TRIAGED','HIGH','P1','SECURITY','rbac-engine','2.4.0','usr_04','usr_02','rel_01'),
    ('BUG-209','proj_01','Database connection pool exhaustion under spike loads','Configure pool acquire timeouts and max connection limits gracefully.','ASSIGNED','CRITICAL','P0','BUG','database','2.5.0','usr_03','usr_01','rel_02'),
    ('BUG-210','proj_01','Intelligence provider schema parsing error on empty payload','Handle null response objects safely when upstream AI provider returns empty completion.','REPORTED','LOW','P4','BUG','intelligence','2.5.0','usr_05',NULL,'rel_02'),
    ('BUG-211','proj_01','Sanitize SVG image uploads to prevent stored XSS','Strip inline script tags and foreign objects from uploaded SVG attachments.','IN_PROGRESS','CRITICAL','P0','SECURITY','attachments','2.4.0','usr_04','usr_03','rel_01'),
    ('BUG-212','proj_01','Dark mode contrast ratios fail WCAG 2.1 AA in issue graph','Increase node boundary and edge contrast in dependency topology view.','RESOLVED','LOW','P3','IMPROVEMENT','ui-core','2.4.0','usr_05','usr_02','rel_01'),
    ('BUG-213','proj_01','Implement batch issue status transitions in control room','Allow security reviewers to triage and transition multiple related issues simultaneously.','CODE_REVIEW','MEDIUM','P2','TASK','ui-core','2.5.0','usr_02','usr_03','rel_02'),
    ('BUG-214','proj_01','CSRF double-submit token mismatch on simultaneous browser tabs','Ensure fresh CSRF cookie tokens do not invalidate in-flight form submissions.','VERIFIED','HIGH','P1','BUG','authentication','2.4.0','usr_03','usr_01','rel_01'),
    ('BUG-215','proj_01','Exported JSON schema validation for compliance reporting','Provide standard JSON-Schema definitions for automated vulnerability exports.','TESTING','LOW','P3','IMPROVEMENT','exports','2.5.0','usr_04','usr_03','rel_02'),
    ('BUG-216','proj_01','Circular dependency detection in issue relationship graph','Reject dependency links that would introduce a cycle before committing transaction.','CLOSED','MEDIUM','P2','BUG','dependency-graph','2.4.0','usr_01','usr_03','rel_01'),
    ('BUG-217','proj_01','Audit event log retention and archiving policy','Implement automated partitioning and archival strategy for audit_events table.','REPORTED','MEDIUM','P3','TASK','audit-spine','2.5.0','usr_02',NULL,'rel_02'),
    ('BUG-218','proj_01','Sanitize error stack traces in production JSON responses','Prevent internal error details and database query strings from leaking to clients.','VERIFIED','HIGH','P1','SECURITY','authentication','2.4.0','usr_04','usr_01','rel_01'),
    ('BUG-219','proj_01','Optimize issue list query index for multi-facet filtering','Add composite index on (project_id, severity, status) for faster control room queries.','RESOLVED','MEDIUM','P2','IMPROVEMENT','database','2.4.0','usr_03','usr_03','rel_01'),
    ('BUG-220','proj_01','Object-level authorization check on attachment downloads','Verify user has read access to the parent project before generating download stream.','ASSIGNED','HIGH','P1','SECURITY','attachments','2.5.0','usr_04','usr_03','rel_02'),
    ('BUG-221','proj_01','Automated vulnerability classification triage suggestions','Use evidence analysis service to recommend initial severity and component tags.','REPORTED','LOW','P3','TASK','intelligence','2.5.0','usr_02',NULL,'rel_02')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 6. Dependencies
  await targetPool.query(`
    INSERT INTO issue_dependencies(issue_id,depends_on_issue_id,relation) VALUES
    ('BUG-142','BUG-091','RELATES_TO'),
    ('BUG-117','BUG-142','BLOCKS'),
    ('BUG-155','BUG-117','DEPENDS_ON'),
    ('BUG-202','BUG-142','BLOCKS'),
    ('BUG-211','BUG-201','RELATES_TO'),
    ('BUG-220','BUG-201','DEPENDS_ON')
    ON CONFLICT DO NOTHING;
  `);

  // 7. Comments
  await targetPool.query(`
    INSERT INTO issue_comments(id,issue_id,author_id,body) VALUES
    ('com_01','BUG-142','usr_03','Reproduced with a Unicode identity variant.'),
    ('com_02','BUG-117','usr_04','Security review required before verification.'),
    ('com_03','BUG-202','usr_04','Observed forwarded header manipulation in access logs.'),
    ('com_04','BUG-211','usr_03','Drafting SVG sanitization sanitizer with DOMPurify parser.')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 8. Issue Events (checked idempotently)
  const existingEvents = await targetPool.query(
    'SELECT 1 FROM issue_events WHERE issue_id IN ($1, $2, $3) LIMIT 1',
    ['BUG-091', 'BUG-117', 'BUG-142']
  );
  if (existingEvents.rowCount === 0) {
    await targetPool.query(`
      INSERT INTO issue_events(issue_id,actor_id,event_type,from_status,to_status,metadata) VALUES
      ('BUG-142','usr_01','STATUS_CHANGED','REPORTED','TRIAGED','{"reason":"Initial triage"}'),
      ('BUG-117','usr_02','STATUS_CHANGED','REPORTED','TRIAGED','{"reason":"Security impact suspected"}'),
      ('BUG-091','usr_03','STATUS_CHANGED','IN_PROGRESS','RESOLVED','{"evidence":"fix branch"}')
    `);
  }
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  try {
    await seedDemoData();
    console.log('Demo seed complete (25 issues).');
  } finally {
    await pool.end();
  }
}

