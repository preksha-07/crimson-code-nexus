import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

export interface NotificationJob {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retries: number;
  maxRetries: number;
  lastError?: string;
  createdAt: Date;
  runAt: Date;
}

/**
 * Checks whether a given user (identified by their DB user ID from the
 * authenticated session) is authorized to receive notifications about an issue.
 *
 * For SECURITY issues only ADMIN, SECURITY_REVIEWER, or a project member is
 * permitted.  All other issue types are open.
 *
 * Taking userId (not email) as the parameter means the authorization decision
 * is always anchored to the authenticated session identity — a caller cannot
 * bypass it by supplying an arbitrary email address.
 */
export async function checkRecipientAccess(
  userId: string,
  issueId: string
): Promise<boolean> {
  const issueRes = await pool.query<{ project_id: string; issue_type: string }>(
    'SELECT project_id, issue_type FROM issues WHERE id = $1',
    [issueId]
  );
  if (issueRes.rows.length === 0) return true; // issue not found — no restriction

  const issue = issueRes.rows[0];
  if (issue.issue_type !== 'SECURITY') return true;

  const userRes = await pool.query<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) return false;

  const { role } = userRes.rows[0];
  if (role === 'ADMIN' || role === 'SECURITY_REVIEWER') return true;

  const memberRes = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [issue.project_id, userId]
  );
  return memberRes.rows.length > 0;
}

/**
 * Redacts obvious credential / secret patterns from a notification body.
 *
 * Covers:
 *   key="value"    (double-quoted)
 *   key='value'    (single-quoted)
 *   key=value      (bare assignment, no quotes)
 *   key: value     (colon-style, YAML / HTTP header)
 *   Bearer <token> (Authorization header value)
 *
 * The original separator (= or :) and surrounding whitespace are preserved
 * in the output so surrounding context is not mangled.
 */
function redactBody(body: string): string {
  // Pass 1: Bearer tokens in Authorization headers
  let out = body.replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]');

  // Pass 2: Match any identifier (including snake_case/camelCase) that contains
  // an unambiguous credential keyword as a substring, followed by a separator.
  //
  // Excluded: 'auth' alone — it is a prefix of 'Authorization' which is a
  // header name, not a secret value.  Use 'credential' or 'apikey/api_key'
  // for generic cases; 'auth_token', 'authsecret' etc. are caught by 'token'
  // and 'secret' sub-patterns.
  //
  // Capture groups:
  //   $1 — full identifier (may contain underscores, camelCase prefix/suffix)
  //   $2 — separator + surrounding whitespace ("=", ": ", " = ", etc.)
  //   $3 — optional opening quote
  out = out.replace(
    /\b(\w*(?:password|passwd|token|secret|session|cookie|credential|apikey|api[_-]?key)\w*)(\s*[:=]\s*)(['"]?)([^\s'"\r\n,;\])}]+)\3/gi,
    (_match, key: string, sep: string, quote: string) =>
      `${key}${sep}${quote}[REDACTED]${quote}`
  );

  return out;
}

/**
 * Core enqueue: validates headers, redacts body, and inserts into notification_jobs.
 * This function is intentionally low-level — authorization must be checked by
 * the caller (enqueueNotificationForIssue) before calling this.
 */
export async function enqueueNotification(
  recipient: string,
  subject: string,
  body: string,
  maxRetries = 3
): Promise<string> {
  // CRLF injection guard — prevents header splitting attacks
  if (/[\r\n]/.test(recipient) || /[\r\n]/.test(subject)) {
    throw new Error('CRLF Injection detected in email headers');
  }

  const id = `job_${crypto.randomBytes(16).toString('hex')}`;
  const sanitizedBody = redactBody(body);

  await pool.query(
    `INSERT INTO notification_jobs (id, recipient, subject, body, max_retries)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, recipient, subject, sanitizedBody, maxRetries]
  );

  return id;
}

/**
 * Enqueues a notification for a specific issue.
 *
 * Authorization is checked using the authenticated userId (from session), NOT
 * the recipient email.  The email is only used as the delivery address after
 * the access decision passes.
 */
export async function enqueueNotificationForIssue(
  actorUserId: string,
  recipientEmail: string,
  subject: string,
  body: string,
  issueId: string,
  maxRetries = 3
): Promise<string> {
  // Authorization check is keyed on the session user ID — not the email.
  const hasAccess = await checkRecipientAccess(actorUserId, issueId);
  if (!hasAccess) {
    throw new Error(
      'Access Denied: Recipient is not authorized to receive private security issue notifications'
    );
  }
  return enqueueNotification(recipientEmail, subject, body, maxRetries);
}
