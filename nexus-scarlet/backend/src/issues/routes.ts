import { Router } from 'express';
import { z } from 'zod';
import { createIssue, deleteIssue, getIssue, listIssues, transitionIssue, updateIssue } from './service.js';
import { transitionSchema } from './schema.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { recordAuditEvent } from '../audit/service.js';
import { enqueueNotificationForIssue } from '../notifications/queue.js';
import { query } from '../db/pool.js';

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
  const q = z.object({ projectId:z.string().optional(), status:z.string().optional(), assigneeId:z.string().optional(), limit:z.coerce.number().int().min(1).max(100).default(25), offset:z.coerce.number().int().min(0).default(0) }).parse(req.query);
  res.json({ data: await listIssues(q) });
} catch(e){next(e);} });

issueRouter.post('/', checkPermission('create', 'issue'), async (req,res,next) => {
  try {
    const actorId: string = (req as any).user.id;
    const data = await createIssue(req.body, actorId);

    await recordAuditEvent({
      actorId,
      action: 'issue.create',
      resourceType: 'issue',
      resourceId: ensureString(data.id),
      metadata: { projectId: data.projectId, title: data.title }
    });

    // 1. Primary DB operation committed; send the HTTP response immediately.
    res.status(201).json({ data });

    // 2. After response is sent, enqueue notification deterministically.
    //    Failure is isolated — it must never affect the already-sent 201.
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
  } catch(e){next(e);}
});

issueRouter.get('/:id', checkPermission('read', 'issue'), async (req,res,next) => { try { res.json({ data: await getIssue(param(req.params.id)) }); } catch(e){next(e);} });
issueRouter.patch('/:id', checkPermission('update', 'issue'), async (req,res,next) => { try { res.json({ data: await updateIssue(param(req.params.id), req.body) }); } catch(e){next(e);} });
issueRouter.delete('/:id', checkPermission('delete', 'issue'), async (req,res,next) => { try { await deleteIssue(param(req.params.id)); res.status(204).send(); } catch(e){next(e);} });

issueRouter.patch('/:id/status', checkPermission('update', 'issue'), async (req,res,next) => {
  try {
    const actorId: string = (req as any).user.id;
    const data = transitionSchema.parse(req.body);
    const result = await transitionIssue(param(req.params.id), data.toStatus, actorId, data.reason);

    await recordAuditEvent({
      actorId,
      action: 'issue.transition',
      resourceType: 'issue',
      resourceId: ensureString(result.id),
      metadata: { toStatus: data.toStatus, reason: data.reason }
    });

    // 1. Primary DB committed; send response first.
    res.json({ data: result });

    // 2. Enqueue deterministically after response; failures are isolated.
    const issueId = ensureString(result.id);
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
  } catch(e){next(e);}
});
