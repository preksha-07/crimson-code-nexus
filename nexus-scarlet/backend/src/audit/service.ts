import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

export interface AuditEventInput {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Recursively redacts sensitive credential fields (passwords, tokens, cookies, secrets) from metadata.
 */
function redactMetadata(meta: Record<string, any> | undefined): Record<string, any> {
  if (!meta) return {};
  const redacted: Record<string, any> = {};
  const sensitivePatterns = [/password/i, /token/i, /cookie/i, /key/i, /secret/i, /session/i];
  
  for (const [k, v] of Object.entries(meta)) {
    const isSensitive = sensitivePatterns.some(p => p.test(k));
    if (isSensitive) {
      redacted[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      redacted[k] = redactMetadata(v);
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

/**
 * Persists an audit event to the database.
 * If query fails, logs error but returns cleanly to prevent breaking main business operations.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const id = `aud_${crypto.randomBytes(16).toString('hex')}`;
    const redactedMeta = redactMetadata(input.metadata);

    await pool.query(
      `INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.actorId ?? null,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        input.requestId ?? null,
        JSON.stringify(redactedMeta)
      ]
    );
  } catch (error) {
    // Fail-safe audit write fallback
    console.error('[Audit Log Failure]: Failed to persist audit event:', error);
  }
}
