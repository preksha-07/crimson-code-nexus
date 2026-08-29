import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertProjectAccess, assertReleaseAccess, param, type AuthUser } from '../security/rbac/authorization.js';

export const releaseRouter = Router();

const schema = z.object({
  projectId: z.string().min(1),
  version: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'RELEASED', 'CANCELLED']).default('PLANNED'),
  targetDate: z.string().date().nullable().optional()
});

function mapRelease(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    version: r.version,
    name: r.name,
    status: r.status,
    targetDate: r.target_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

releaseRouter.get('/', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const reqProjectId = typeof req.query.projectId === 'string' ? req.query.projectId : null;

    if (reqProjectId) {
      await assertProjectAccess(user, reqProjectId, 'release');
    }

    let r;
    if (user.role === 'ADMIN' || user.role === 'SECURITY_REVIEWER') {
      r = await query(
        'SELECT * FROM releases WHERE ($1::varchar IS NULL OR project_id=$1) ORDER BY target_date NULLS LAST, created_at DESC',
        [reqProjectId]
      );
    } else {
      if (reqProjectId) {
        r = await query(
          'SELECT * FROM releases WHERE project_id = $1 ORDER BY target_date NULLS LAST, created_at DESC',
          [reqProjectId]
        );
      } else {
        r = await query(
          `SELECT r.* FROM releases r
           JOIN project_members pm ON r.project_id = pm.project_id
           WHERE pm.user_id = $1
           ORDER BY r.target_date NULLS LAST, r.created_at DESC`,
          [user.id]
        );
      }
    }

    res.json({ data: r.rows.map(mapRelease) });
  } catch (e) { next(e); }
});

releaseRouter.post('/', checkPermission('create', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const d = schema.parse(req.body);
    await assertProjectAccess(user, d.projectId, 'release');

    if (!(await query('SELECT 1 FROM projects WHERE id=$1', [d.projectId])).rowCount) {
      throw new HttpError(422, 'PROJECT_NOT_FOUND', 'Project does not exist.');
    }
    const id = `rel_${Date.now().toString(36)}`;
    const r = await query(
      'INSERT INTO releases(id,project_id,version,name,status,target_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, d.projectId, d.version, d.name, d.status, d.targetDate ?? null]
    );
    res.status(201).json({ data: mapRelease(r.rows[0]) });
  } catch (e) { next(e); }
});

releaseRouter.get('/:id', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const releaseId = param(req.params.id);
    await assertReleaseAccess(user, releaseId, 'release');

    const r = await query('SELECT * FROM releases WHERE id=$1', [releaseId]);
    if (!r.rowCount) throw new HttpError(404, 'RELEASE_NOT_FOUND', 'Release does not exist.');
    res.json({ data: mapRelease(r.rows[0]) });
  } catch (e) { next(e); }
});
