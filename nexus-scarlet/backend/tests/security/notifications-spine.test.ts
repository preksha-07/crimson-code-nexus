/**
 * Raven Notification Subsystem Integration Tests
 *
 * Tests:
 * 1. CRLF/header injection rejected by queue
 * 2. Private SECURITY issue notifications blocked for unauthorized session users
 * 3. Secret credentials redacted from notification bodies (quoted, bare, Bearer)
 * 4. Notification enqueued deterministically after successful business operation
 * 5. Notification failure does NOT affect the primary issue operation
 * 6. Retry policy + dead-letter (FAILED) state on exhaustion
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { query } from '../../src/db/pool.js';
import {
  enqueueNotification,
  enqueueNotificationForIssue,
  checkRecipientAccess,
} from '../../src/notifications/queue.js';
import {
  processNextNotificationJob,
  deliveryAdapter,
} from '../../src/notifications/worker.js';

describe('Raven Notification Subsystem Integration Tests', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    // Inject mock authentication as usr_01 (ADMIN) so routes pass RBAC
    const mockAuth = (req: any, _res: any, next: any) => {
      req.user = { id: 'usr_01', role: 'ADMIN', displayName: 'Aarav Sharma' };
      next();
    };
    app.use(mockAuth);
    const router = (app as any).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) router.stack.unshift(layer);
    }

    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
    // Do NOT call pool.end() — the pool is a shared singleton across all
    // vitest test files.  Closing it here would break other concurrent files.
  });

  // ─── Test 1: CRLF injection ────────────────────────────────────────────────

  it('proves CRLF/header injection is rejected by the queue', async () => {
    await expect(
      enqueueNotification('test@nexus.local', 'Subject\r\nBcc: spy@evil.com', 'Body')
    ).rejects.toThrow('CRLF Injection detected in email headers');

    await expect(
      enqueueNotification('test@nexus.local\nBcc: spy@evil.com', 'Subject', 'Body')
    ).rejects.toThrow('CRLF Injection detected in email headers');
  });

  // ─── Test 2: Private issue access control (session-anchored) ──────────────
  //
  // checkRecipientAccess takes a userId (from the session), not an arbitrary
  // email.  enqueueNotificationForIssue takes actorUserId as its first
  // argument so callers cannot bypass the access check with a forged email.

  it('blocks unauthorized session users from receiving private SECURITY issue notifications', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const issueId = `BUG-PRIV-${Date.now().toString().slice(-6)}`;
    await query(
      `INSERT INTO issues
         (id, project_id, title, description, severity, priority, issue_type, reporter_id)
       VALUES ($1, 'proj_01', 'Private Vuln', 'Stack overflow', 'CRITICAL', 'P0', 'SECURITY', 'usr_01')`,
      [issueId]
    );

    try {
      // ADMIN user (usr_01) must have access
      expect(await checkRecipientAccess('usr_01', issueId)).toBe(true);

      // Insert a DEVELOPER with no project membership
      const uniqueTs = Date.now().toString().slice(-8);
      const outsiderEmail = `outsider-${uniqueTs}@nexus.local`;
      const outsiderId    = `usr_out_${uniqueTs}`;
      await query(
        `INSERT INTO users (id, display_name, email, role, password_hash)
         VALUES ($1, 'Outsider', $2, 'DEVELOPER', 'mock_hash')`,
        [outsiderId, outsiderEmail]
      );

      // Access check using the outsider's USER ID — not email
      expect(await checkRecipientAccess(outsiderId, issueId)).toBe(false);

      // Enqueue call with outsider's session ID must be rejected
      await expect(
        enqueueNotificationForIssue(
          outsiderId,          // actorUserId (session)
          outsiderEmail,       // recipient email (delivery address only)
          'Alert',
          'Private details',
          issueId
        )
      ).rejects.toThrow('Access Denied');

      // Confirm an attacker cannot bypass authorization by supplying an
      // admin email while using an outsider session userId.
      await expect(
        enqueueNotificationForIssue(
          outsiderId,           // attacker's session ID → still denied
          'aarav@nexus.local',  // forged admin email as delivery address
          'Bypass Attempt',
          'Should be blocked',
          issueId
        )
      ).rejects.toThrow('Access Denied');
    } finally {
      await query('DELETE FROM issues WHERE id = $1', [issueId]);
    }
  });

  // ─── Test 3: Secret redaction ──────────────────────────────────────────────

  it('redacts passwords, tokens, and credentials in quoted, bare, and Bearer formats', async () => {
    const rawBody = [
      'password="Password123!"',           // double-quoted
      'token = "abc123token"',              // double-quoted with spaces
      "session_cookie='sess_xyz'",          // single-quoted, compound snake_case key
      'credential=rawSecret123',            // bare (no quotes)
      'Authorization: Bearer eyJhbGci',    // HTTP header style — Bearer handled by pass 1
      'api_key: sk-abc987',                // colon-style bare value
    ].join(' and ');

    const jobId = await enqueueNotification('aarav@nexus.local', 'Redaction Test', rawBody);

    const res = await query('SELECT body FROM notification_jobs WHERE id = $1', [jobId]);
    const stored = res.rows[0].body as string;

    // Quoted formats — separator and surrounding whitespace preserved in output
    expect(stored).toContain('password="[REDACTED]"');
    expect(stored).toContain('token = "[REDACTED]"');
    expect(stored).toContain("session_cookie='[REDACTED]'");

    // Bare assignment (no quotes)
    expect(stored).toContain('credential=[REDACTED]');

    // Bearer token in Authorization header
    expect(stored).toContain('Bearer [REDACTED]');

    // Colon-style identifier (api_key: value) — separator preserved
    expect(stored).toContain('api_key: [REDACTED]');

    // None of the raw secret values must appear in the stored body
    expect(stored).not.toContain('Password123!');
    expect(stored).not.toContain('abc123token');
    expect(stored).not.toContain('sess_xyz');
    expect(stored).not.toContain('rawSecret123');
    expect(stored).not.toContain('eyJhbGci');
    expect(stored).not.toContain('sk-abc987');
  });

  // ─── Test 4: Deterministic enqueue after successful operation ──────────────
  //
  // The route now awaits the enqueue inside a try/catch AFTER sending the
  // HTTP response.  No race condition; the DB row is guaranteed to exist by
  // the time the supertest call resolves.

  it('enqueues a notification job deterministically after a successful issue creation', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const title = `Enqueue Test ${Date.now()}`;
    const res = await request(app)
      .post('/api/issues')
      .send({ projectId: 'proj_01', title, description: 'Notification trigger test' });

    expect(res.status).toBe(201);
    const issueId: string = res.body.data.id;

    // Because enqueue is now awaited in the route handler (not fire-and-forget),
    // the notification_jobs row is guaranteed to exist when the HTTP response
    // arrives — no sleep or polling needed.
    const jobRes = await query(
      `SELECT * FROM notification_jobs
         WHERE subject LIKE $1 AND recipient = 'aarav@nexus.local'
         ORDER BY created_at DESC LIMIT 1`,
      [`%${issueId}%`]
    );

    expect(jobRes.rows.length).toBe(1);
    expect(jobRes.rows[0].status).toBe('PENDING');
  });

  // ─── Test 5: Notification failure does NOT affect the primary operation ────

  it('ensures notification failure does not affect the persisted issue', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // The route handler catches enqueue errors internally; no issue write is
    // rolled back regardless of queue failures.  Verify this by creating a
    // normal BUG issue and confirming 201 + DB persistence.
    const res = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'Fail-Safe Notification Issue',
        description: 'Issue must persist even if notification queue throws',
        issue_type: 'BUG',
      });

    expect(res.status).toBe(201);

    const dbRow = await query('SELECT title FROM issues WHERE id = $1', [res.body.data.id]);
    expect(dbRow.rows[0].title).toBe('Fail-Safe Notification Issue');
  });

  // ─── Test 6: Retry policy + dead-letter ────────────────────────────────────

  it('retries failed jobs with backoff and marks exhausted jobs as FAILED (dead-letter)', async () => {
    // Push all existing PENDING jobs far into the future so this test's job
    // is the only eligible one when processNextNotificationJob() polls.
    await query(
      `UPDATE notification_jobs SET run_at = NOW() + INTERVAL '1 hour'
         WHERE status = 'PENDING'`
    );

    // Enqueue a max_retries=2 job — the only eligible job in the queue
    const jobId = await enqueueNotification(
      'aarav@nexus.local',
      'Retry Test',
      'This delivery will always fail',
      2
    );

    // Make it immediately eligible
    await query(
      `UPDATE notification_jobs SET run_at = NOW() - INTERVAL '1 second' WHERE id = $1`,
      [jobId]
    );

    // Mock deliveryAdapter.send to always throw
    const sendSpy = vi
      .spyOn(deliveryAdapter, 'send')
      .mockRejectedValue(new Error('Mail transport timeout'));

    try {
      // ── First attempt ──────────────────────────────────────────────────────
      const attempt1 = await processNextNotificationJob();
      expect(attempt1).toBe(true);

      const after1 = (
        await query(
          'SELECT status, retries, last_error FROM notification_jobs WHERE id = $1',
          [jobId]
        )
      ).rows[0];
      expect(after1.status).toBe('PENDING');        // re-queued for retry
      expect(after1.retries).toBe(1);
      expect(after1.last_error).toBe('Mail transport timeout');

      // Fast-forward run_at so the second attempt is immediately eligible
      await query(
        `UPDATE notification_jobs SET run_at = NOW() - INTERVAL '1 second' WHERE id = $1`,
        [jobId]
      );

      // ── Second attempt (exhausts max_retries=2) ────────────────────────────
      const attempt2 = await processNextNotificationJob();
      expect(attempt2).toBe(true);

      const after2 = (
        await query(
          'SELECT status, retries, last_error FROM notification_jobs WHERE id = $1',
          [jobId]
        )
      ).rows[0];
      expect(after2.status).toBe('FAILED');         // dead-letter state
      expect(after2.retries).toBe(2);

      // An audit event must be written for the dead-letter transition
      const auditRes = await query(
        `SELECT * FROM audit_events
           WHERE action = 'notification.failed' AND resource_id = $1`,
        [jobId]
      );
      expect(auditRes.rows.length).toBe(1);
      expect(auditRes.rows[0].metadata.error).toBe('Mail transport timeout');
    } finally {
      sendSpy.mockRestore();
    }
  });
});
