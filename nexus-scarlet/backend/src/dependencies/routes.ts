import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertIssueAccess, param, type AuthUser } from '../security/rbac/authorization.js';

export const dependencyRouter = Router();

const schema = z.object({
  dependsOnIssueId: z.string().min(1),
  relation: z.enum(['BLOCKS', 'DEPENDS_ON', 'RELATES_TO', 'DUPLICATES']).default('BLOCKS')
});

dependencyRouter.get('/issues/:issueId/dependencies', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    await assertIssueAccess(user, issueId, 'issue');

    const r = await query(
      `SELECT d.*, i.title target_title
       FROM issue_dependencies d
       JOIN issues i ON i.id = d.depends_on_issue_id
       WHERE d.issue_id = $1`,
      [issueId]
    );

    res.json({
      data: r.rows.map(x => ({
        issueId: x.issue_id,
        dependsOnIssueId: x.depends_on_issue_id,
        relation: x.relation,
        createdAt: x.created_at,
        targetTitle: x.target_title
      }))
    });
  } catch (e) { next(e); }
});

dependencyRouter.post('/issues/:issueId/dependencies', checkPermission('update', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    const d = schema.parse(req.body);

    if (issueId === d.dependsOnIssueId) {
      throw new HttpError(422, 'SELF_DEPENDENCY', 'An issue cannot depend on itself.');
    }

    // BOLA check for both issues involved in the dependency link
    await assertIssueAccess(user, issueId, 'issue');
    await assertIssueAccess(user, d.dependsOnIssueId, 'issue');

    const r = await query(
      `INSERT INTO issue_dependencies(issue_id, depends_on_issue_id, relation)
       VALUES($1, $2, $3) RETURNING *`,
      [issueId, d.dependsOnIssueId, d.relation]
    );

    res.status(201).json({ data: r.rows[0] });
  } catch (e) { next(e); }
});

dependencyRouter.delete('/issues/:issueId/dependencies/:targetId/:relation', checkPermission('update', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    const targetId = param(req.params.targetId);
    const relation = param(req.params.relation);

    // BOLA check for both issues involved in the dependency link deletion
    await assertIssueAccess(user, issueId, 'issue');
    await assertIssueAccess(user, targetId, 'issue');

    const r = await query(
      'DELETE FROM issue_dependencies WHERE issue_id = $1 AND depends_on_issue_id = $2 AND relation = $3',
      [issueId, targetId, relation]
    );

    if (!r.rowCount) {
      throw new HttpError(404, 'DEPENDENCY_NOT_FOUND', 'Dependency does not exist.');
    }

    res.status(204).send();
  } catch (e) { next(e); }
});
