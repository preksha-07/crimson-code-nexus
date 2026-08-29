import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { recordAuditEvent } from '../audit/service.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertIssueAccess, param, type AuthUser } from '../security/rbac/authorization.js';

export const commentRouter = Router();
const schema = z.object({
  authorId: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(10000)
});

commentRouter.get('/issues/:issueId/comments', checkPermission('read', 'comment'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    await assertIssueAccess(user, issueId, 'comment');

    const r = await query(
      `SELECT c.*, u.display_name author_name
       FROM issue_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.issue_id = $1
       ORDER BY c.created_at ASC`,
      [issueId]
    );

    res.json({
      data: r.rows.map(c => ({
        id: c.id,
        issueId: c.issue_id,
        authorId: c.author_id,
        authorName: c.author_name,
        body: c.body,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (e) { next(e); }
});

commentRouter.post('/issues/:issueId/comments', checkPermission('create', 'comment'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    await assertIssueAccess(user, issueId, 'comment');

    const d = schema.parse(req.body);
    const authorId = user.id; // Derive exclusively from authenticated session

    const id = `com_${Date.now().toString(36)}`;
    const r = await query(
      'INSERT INTO issue_comments(id, issue_id, author_id, body) VALUES($1, $2, $3, $4) RETURNING *',
      [id, issueId, authorId, d.body]
    );

    await recordAuditEvent({
      actorId: authorId,
      action: 'comment.create',
      resourceType: 'comment',
      resourceId: r.rows[0].id,
      metadata: { issueId }
    });

    res.status(201).json({ data: r.rows[0] });
  } catch (e) { next(e); }
});
