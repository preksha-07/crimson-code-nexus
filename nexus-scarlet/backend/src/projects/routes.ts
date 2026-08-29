import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';

export const projectRouter = Router();

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  key: z.string().trim().min(2).max(32).regex(/^[A-Z0-9_-]+$/),
  description: z.string().default('')
});

function mapProject(p: Record<string, unknown>) {
  return { id: p.id, name: p.name, key: p.key, description: p.description, createdAt: p.created_at, updatedAt: p.updated_at };
}

projectRouter.get('/', async (_req, res, next) => {
  try {
    const r = await query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ data: r.rows.map(mapProject) });
  } catch (e) { next(e); }
});

projectRouter.post('/', async (req, res, next) => {
  try {
    const d = schema.parse(req.body);
    const id = `proj_${Date.now().toString(36)}`;
    const r = await query(
      'INSERT INTO projects(id,name,key,description) VALUES($1,$2,$3,$4) RETURNING *',
      [id, d.name, d.key, d.description]
    );
    res.status(201).json({ data: mapProject(r.rows[0]) });
  } catch (e) { next(e); }
});

projectRouter.get('/:id', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!r.rowCount) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project does not exist.');
    res.json({ data: mapProject(r.rows[0]) });
  } catch (e) { next(e); }
});
