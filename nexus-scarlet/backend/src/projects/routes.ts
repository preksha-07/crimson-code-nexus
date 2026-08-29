import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertProjectAccess, type AuthUser } from '../security/rbac/authorization.js';

export const projectRouter = Router();

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  key: z.string().trim().min(2).max(32).regex(/^[A-Z0-9_-]+$/),
  description: z.string().default('')
});

function mapProject(p: Record<string, unknown>) {
  return { id: p.id, name: p.name, key: p.key, description: p.description, createdAt: p.created_at, updatedAt: p.updated_at };
}

projectRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    let r;
    if (user.role === 'ADMIN' || user.role === 'SECURITY_REVIEWER') {
      r = await query('SELECT * FROM projects ORDER BY created_at DESC');
    } else {
      r = await query(
        `SELECT p.* FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.user_id = $1
         ORDER BY p.created_at DESC`,
        [user.id]
      );
    }

    res.json({ data: r.rows.map(mapProject) });
  } catch (e) { next(e); }
});

projectRouter.post('/', checkPermission('manage_users', 'user'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const d = schema.parse(req.body);
    const id = `proj_${Date.now().toString(36)}`;
    const r = await query(
      'INSERT INTO projects(id,name,key,description) VALUES($1,$2,$3,$4) RETURNING *',
      [id, d.name, d.key, d.description]
    );

    // Automatically add creator to project_members
    await query(
      'INSERT INTO project_members(project_id, user_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
      [id, user.id]
    );

    res.status(201).json({ data: mapProject(r.rows[0]) });
  } catch (e) { next(e); }
});

projectRouter.get('/:id', async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }
    const projectId = req.params.id;
    await assertProjectAccess(user, projectId, 'project');

    const r = await query('SELECT * FROM projects WHERE id=$1', [projectId]);
    if (!r.rowCount) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project does not exist.');
    res.json({ data: mapProject(r.rows[0]) });
  } catch (e) { next(e); }
});
