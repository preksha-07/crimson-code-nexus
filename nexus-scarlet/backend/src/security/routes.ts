import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { recordAuditEvent } from '../audit/service.js';
import { scanText, redactText } from './secrets/sentinel.js';
import { checkPermission } from './rbac/middleware.js';
import { type AuthUser } from './rbac/authorization.js';

export const securityRouter = Router();

const scanSchema = z.object({
  content: z.string().min(1).max(50000)
});

securityRouter.get('/security/audit-logs', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const _user = (req as any).user as AuthUser;
    const r = await query(
      `SELECT a.id, a.actor_id, COALESCE(u.display_name, a.actor_id, 'SYSTEM') as actor,
              COALESCE(u.role, 'SYSTEM') as actor_role, a.action,
              COALESCE(a.resource_id, a.resource_type) as target, a.timestamp,
              CASE
                WHEN a.action LIKE '%permission%' THEN 'PERMISSION'
                WHEN a.action LIKE '%visibility%' THEN 'VISIBILITY'
                WHEN a.action LIKE '%triage%' THEN 'AI_TRIAGE'
                WHEN a.action LIKE '%transition%' OR a.action LIKE '%status%' THEN 'STATE_TRANSITION'
                ELSE 'SECURITY_FINDING'
              END as type
       FROM audit_events a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.timestamp DESC
       LIMIT 50`
    );
    res.json({
      data: r.rows.map(row => ({
        id: row.id,
        actor: row.actor,
        actorRole: row.actor_role,
        action: row.action,
        target: row.target,
        timestamp: row.timestamp,
        type: row.type
      }))
    });
  } catch (e) { next(e); }
});

securityRouter.post('/security/audit-logs', checkPermission('create', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const body = req.body ?? {};
    await recordAuditEvent({
      actorId: user.id,
      action: body.action || 'security.event',
      resourceType: body.type || 'security',
      resourceId: body.target || user.id,
      metadata: body.metadata || {}
    });
    res.status(201).json({ data: { success: true } });
  } catch (e) { next(e); }
});

securityRouter.post('/security/secret-sentinel/scan', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const { content } = scanSchema.parse(req.body);
    const findings = scanText(content);
    const redactedContent = redactText(content);

    const warnings = findings.map((f: any, idx: number) => ({
      lineIndex: idx + 1,
      characterIndex: 1,
      typeOfSecret: f.severity,
      snippet: 'Detected confidential credential matching Raven security policy',
      redactedSnippet: `[REDACTED_${f.severity}]`
    }));

    res.json({
      data: {
        hasSecrets: findings.length > 0,
        warnings,
        redactedContent
      }
    });
  } catch (e) { next(e); }
});
