import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { recordAuditEvent } from '../audit/service.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertIssueAccess, param, type AuthUser } from '../security/rbac/authorization.js';

export const attachmentRouter = Router();

const schema = z.object({
  uploadedBy: z.string().min(1).optional(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(160),
  objectKey: z.string().trim().min(1).max(512),
  sizeBytes: z.coerce.number().int().nonnegative()
});

attachmentRouter.get('/issues/:issueId/attachments', checkPermission('read', 'attachment'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    await assertIssueAccess(user, issueId, 'attachment');

    const r = await query(
      'SELECT * FROM attachments WHERE issue_id = $1 ORDER BY created_at DESC',
      [issueId]
    );

    res.json({ data: r.rows });
  } catch (e) { next(e); }
});

attachmentRouter.post('/issues/:issueId/attachments', checkPermission('create', 'attachment'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.issueId);
    await assertIssueAccess(user, issueId, 'attachment');

    const d = schema.parse(req.body);
    const uploadedBy = user.id; // Derive exclusively from authenticated session

    const id = `att_${Date.now().toString(36)}`;
    const r = await query(
      `INSERT INTO attachments(id, issue_id, uploaded_by, file_name, content_type, object_key, size_bytes)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, issueId, uploadedBy, d.fileName, d.contentType, d.objectKey, d.sizeBytes]
    );

    await recordAuditEvent({
      actorId: uploadedBy,
      action: 'attachment.upload',
      resourceType: 'attachment',
      resourceId: r.rows[0].id,
      metadata: { issueId, fileName: d.fileName }
    });

    res.status(201).json({ data: r.rows[0] });
  } catch (e) { next(e); }
});
