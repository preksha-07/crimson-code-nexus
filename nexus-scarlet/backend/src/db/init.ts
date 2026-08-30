import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

/**
 * Ensures the database schema is fully migrated and seeded with baseline data.
 * Safe to run on every startup: migrations are tracked via schema_migrations
 * and seed data is only applied if no users exist.
 */
export async function initializeDatabase(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const possibleDirs = [
    path.resolve(here, '../../migrations'),
    path.resolve(here, '../migrations'),
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(process.cwd(), 'nexus-scarlet/backend/migrations'),
    path.resolve(process.cwd(), 'backend/migrations')
  ];

  const dir = possibleDirs.find((d) => fsSync.existsSync(d));
  if (!dir) {
    console.warn(`[DATABASE] Migrations directory not found in: ${possibleDirs.join(', ')}`);
    return;
  }

  // 1. Create schema_migrations table if not exists
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  const appliedRows = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(appliedRows.rows.map((r) => r.id));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(id) VALUES($1)', [file]);
      await client.query('COMMIT');
      console.log(`[DATABASE] Applied migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[DATABASE] Failed applying migration ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  // 2. Check if baseline data exists before seeding
  const userCheck = await pool.query('SELECT 1 FROM users WHERE id = $1', ['usr_01']);
  if (userCheck.rowCount === 0) {
    console.log('[DATABASE] Seeding baseline users, project, and issues...');
    await pool.query(`
      INSERT INTO users (id, display_name, email, role, password_hash) VALUES
      ('usr_01','Aarav Sharma','aarav@nexus.local','ADMIN','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
      ('usr_02','Mira Patel','mira@nexus.local','PROJECT_MANAGER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
      ('usr_03','Dev Kumar','dev@nexus.local','DEVELOPER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
      ('usr_04','Riya Sen','riya@nexus.local','SECURITY_REVIEWER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf'),
      ('usr_05','Noah Das','noah@nexus.local','VIEWER','d395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf')
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

      INSERT INTO projects (id, name, key, description) VALUES
      ('proj_01','NEXUS Core','NEX','Evidence-driven security-first bug intelligence platform')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO project_members(project_id,user_id) VALUES
      ('proj_01','usr_01'),('proj_01','usr_02'),('proj_01','usr_03'),('proj_01','usr_04'),('proj_01','usr_05')
      ON CONFLICT DO NOTHING;

      INSERT INTO releases(id,project_id,version,name,status,target_date) VALUES
      ('rel_01','proj_01','2.4.0','Identity Hardening','IN_PROGRESS','2026-09-15'),
      ('rel_02','proj_01','2.5.0','Evidence Intelligence','PLANNED','2026-10-15')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO issues(id,project_id,title,description,status,severity,priority,issue_type,component,version,reporter_id,assignee_id,release_id) VALUES
      ('BUG-091','proj_01','Unicode identity mismatch','Unicode-normalized identity input can fail account matching.', 'RESOLVED','HIGH','P1','BUG','authentication','2.4.0','usr_01','usr_03','rel_01'),
      ('BUG-117','proj_01','Dependency graph exposes private summary','Dependency traversal must respect issue visibility.', 'TRIAGED','CRITICAL','P0','SECURITY','dependency-graph','2.4.0','usr_02','usr_04','rel_01'),
      ('BUG-142','proj_01','Unicode authentication failure','Authentication fails for a valid Unicode identity representation.', 'TRIAGED','HIGH','P1','BUG','authentication','2.4.0','usr_01','usr_03','rel_01'),
      ('BUG-155','proj_01','CSV export content type is unsafe','Export responses must not be interpreted as executable content.', 'ASSIGNED','HIGH','P1','SECURITY','exports','2.4.0','usr_02','usr_04','rel_01'),
      ('BUG-201','proj_01','Attachment upload accepts unexpected content','Attachment metadata and storage policy need validation.', 'REPORTED','MEDIUM','P2','BUG','attachments','2.5.0','usr_03',NULL,'rel_02')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO issue_dependencies(issue_id,depends_on_issue_id,relation) VALUES
      ('BUG-142','BUG-091','RELATES_TO'),
      ('BUG-117','BUG-142','BLOCKS'),
      ('BUG-155','BUG-117','DEPENDS_ON')
      ON CONFLICT DO NOTHING;

      INSERT INTO issue_comments(id,issue_id,author_id,body) VALUES
      ('com_01','BUG-142','usr_03','Reproduced with a Unicode identity variant.'),
      ('com_02','BUG-117','usr_04','Security review required before verification.')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO issue_events(issue_id,actor_id,event_type,from_status,to_status,metadata) VALUES
      ('BUG-142','usr_01','STATUS_CHANGED','REPORTED','TRIAGED','{"reason":"Initial triage"}'),
      ('BUG-117','usr_02','STATUS_CHANGED','REPORTED','TRIAGED','{"reason":"Security impact suspected"}'),
      ('BUG-091','usr_03','STATUS_CHANGED','IN_PROGRESS','RESOLVED','{"evidence":"fix branch"}')
      ON CONFLICT DO NOTHING;
    `);
    console.log('[DATABASE] Baseline seeding complete.');
  }
}
