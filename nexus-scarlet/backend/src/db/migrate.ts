import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../migrations');

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
const applied = new Set((await pool.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map(r => r.id));
const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(id) VALUES($1)', [file]);
    await client.query('COMMIT');
    console.log(`Applied ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
await pool.end();
