import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { seedDemoData } from './seed.js';

/**
 * Ensures the database schema is fully migrated and seeded with baseline data.
 * Safe to run on every startup: migrations are tracked via schema_migrations
 * and seed data is applied idempotently without duplicates.
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

  // 2. Seed baseline / demo records idempotently
  await seedDemoData(pool);
  console.log('[DATABASE] Database initialization and verification complete.');
}
