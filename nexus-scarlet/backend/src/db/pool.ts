import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });

export async function query<R extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = []
): Promise<pg.QueryResult<R>> {
  return pool.query<R>(text, params);
}
