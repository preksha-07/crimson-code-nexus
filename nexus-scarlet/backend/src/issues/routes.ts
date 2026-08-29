import { Router } from 'express';
import { z } from 'zod';
import { createIssue, deleteIssue, getIssue, listIssues, transitionIssue, updateIssue } from './service.js';
import { transitionSchema } from './schema.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { recordAuditEvent } from '../audit/service.js';
import { enqueueNotificationForIssue } from '../notifications/queue.js';
import { query } from '../db/pool.js';
import { assertIssueAccess, assertProjectAccess, type AuthUser } from '../security/rbac/authorization.js';

export const issueRouter = Router();

const param = (value: string | string[] | undefined): string => {
  if (typeof value !== 'string') {
    throw new Error('Invalid route parameter');
  }
  return value;
};

const ensureString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

issueRouter.get('/', checkPermission('read', 'issue'), async (req,res,next) => { try {
  const user = (req as any).user as AuthUser;
  const q = z.object({ projectId:z.string().optional(), status:z.string().optional(), assigneeId:z.string().optional(), limit:z.coerce.number().int().min(1).max(100).default(25), offset:z.coerce.number().int().min(0).default(0) }).parse(req.query);
  if (q.projectId) {
    await assertProjectAccess(user, q.projectId, 'issue');
  }
  res.json({ data: await listIssues(q, user) });
} catch(e){next(e);} });

issueRouter.post('/', checkPermission('create', 'issue'), async (req,res,next) => {
  try {
    const user = (req as any).user as AuthUser;
    const actorId: string = user.id;
    const body = req.body ?? {};
    if (typeof body.projectId === 'string') {
      await assertProjectAccess(user, body.projectId, 'issue');
    }
    const data = await createIssue(body, actorId);

    await recordAuditEvent({
      actorId,
      action: 'issue.create',
      resourceType: 'issue',
      resourceId: ensureString(data.id),
      metadata: { projectId: data.projectId, title: data.title }
    });

    // Enqueue notification deterministically after primary DB operation & audit log.
    // Failure is isolated via try/catch — it must never cause the request to fail or roll back.
    const issueId = ensureString(data.id);
    if (issueId) {
      try {
        const userRes = await query('SELECT email FROM users WHERE id=$1', [actorId]);
        const email: string | undefined = userRes.rows[0]?.email;
        if (email) {
          await enqueueNotificationForIssue(
            actorId,
            email,
            `Issue Created: ${issueId}`,
            `An issue has been created: ${ensureString(data.title) ?? ''}`,
            issueId
          );
        }
      } catch (err) {
        console.error('[Notification Enqueue Failure]:', err);
      }
    }

    res.status(201).json({ data });
  } catch(e){next(e);}
});

issueRouter.get('/:id', checkPermission('read', 'issue'), async (req,res,next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    res.json({ data: await getIssue(issueId) });
  } catch(e){next(e);}
});

issueRouter.patch('/:id', checkPermission('update', 'issue'), async (req,res,next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    res.json({ data: await updateIssue(issueId, req.body) });
  } catch(e){next(e);}
});

issueRouter.delete('/:id', checkPermission('delete', 'issue'), async (req,res,next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    await deleteIssue(issueId);
    res.status(204).send();
  } catch(e){next(e);}
});

issueRouter.patch('/:id/status', checkPermission('update', 'issue'), async (req,res,next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const actorId: string = user.id;
    const data = transitionSchema.parse(req.body);
    const result = await transitionIssue(issueId, data.toStatus, actorId, data.reason);

    await recordAuditEvent({
      actorId,
      action: 'issue.transition',
      resourceType: 'issue',
      resourceId: ensureString(result.id),
      metadata: { toStatus: data.toStatus, reason: data.reason }
    });

    // Enqueue notification deterministically after primary DB operation & audit log.
    // Failure is isolated via try/catch — it must never cause the request to fail or roll back.
    if (issueId) {
      try {
        const userRes = await query('SELECT email FROM users WHERE id=$1', [actorId]);
        const email: string | undefined = userRes.rows[0]?.email;
        if (email) {
          await enqueueNotificationForIssue(
            actorId,
            email,
            `Issue Transitioned: ${issueId}`,
            `Issue ${issueId} is now ${data.toStatus}`,
            issueId
          );
        }
      } catch (err) {
        console.error('[Notification Enqueue Failure]:', err);
      }
    }

    res.json({ data: result });
  } catch(e){next(e);}
});
