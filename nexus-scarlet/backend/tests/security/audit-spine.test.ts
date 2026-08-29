import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/db/pool.js';
import { recordAuditEvent } from '../../src/audit/service.js';

describe('Raven Audit Spine Integration Tests', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    // Inject mock authentication for tests (usr_03 Developer)
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'usr_03', role: 'DEVELOPER', displayName: 'Dev Kumar' };
      next();
    };

    app.use(mockAuth);
    const router = (app as any).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) {
        router.stack.unshift(layer);
      }
    }

    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch (e) {
      isDbConnected = false;
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
    // pool is a shared singleton — do not call pool.end() here.
  });

  it('correctly persists security audit events in the database (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const testDescription = `Audit Test Title ${Date.now()}`;

    // 1. Create an issue to trigger issue.create audit event
    const res = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: testDescription,
        description: 'Testing audit spine logging'
      });

    expect(res.status).toBe(201);
    const issueId = res.body.data.id;

    // 2. Fetch the corresponding event from audit_events table
    const auditRes = await query(
      `SELECT * FROM audit_events 
       WHERE action = 'issue.create' AND resource_id = $1 
       ORDER BY timestamp DESC LIMIT 1`,
      [issueId]
    );

    expect(auditRes.rows.length).toBe(1);
    const auditEvent = auditRes.rows[0];
    
    expect(auditEvent.actor_id).toBe('usr_03');
    expect(auditEvent.resource_type).toBe('issue');
    expect(auditEvent.resource_id).toBe(issueId);
    expect(auditEvent.metadata.title).toBe(testDescription);
  });

  it('redacts sensitive fields recursively in audit event metadata', async () => {
    // Directly invoke recordAuditEvent with mock sensitive metadata
    const testMeta = {
      userEmail: 'aarav@nexus.local',
      authDetails: {
        password: 'mySecretPassword123',
        sessionToken: 'xyz123abcTokenValue'
      },
      nexus_cookie: 'session_id=12345'
    };

    const actionId = `test_${Date.now()}`;

    await recordAuditEvent({
      actorId: 'usr_03',
      action: actionId,
      resourceType: 'auth',
      metadata: testMeta
    });

    const auditRes = await query(
      'SELECT * FROM audit_events WHERE action = $1 LIMIT 1',
      [actionId]
    );

    expect(auditRes.rows.length).toBe(1);
    const metadata = auditRes.rows[0].metadata;

    expect(metadata.userEmail).toBe('aarav@nexus.local');
    // Ensure all sensitive items are redacted
    expect(metadata.authDetails.password).toBe('[REDACTED]');
    expect(metadata.authDetails.sessionToken).toBe('[REDACTED]');
    expect(metadata.nexus_cookie).toBe('[REDACTED]');
  });

  it('ensures audit logger failures do not prevent primary operation from completing (fail-safe check) (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    // Intercept pool.query and reject calls to INSERT INTO audit_events to simulate database failure
    const originalQuery = pool.query;
    const querySpy = vi.spyOn(pool, 'query').mockImplementation((sql: any, values: any) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO audit_events')) {
        return Promise.reject(new Error('Simulated database write crash during audit logging'));
      }
      return originalQuery.call(pool, sql, values);
    });

    try {
      // Perform issue creation
      const res = await request(app)
        .post('/api/issues')
        .send({
          projectId: 'proj_01',
          title: 'Fail-Safe Audit Test Issue',
          description: 'This issue must successfully insert even if the audit log crashes'
        });

      // The API response status should STILL be 201 Created (the crash was ignored safely)
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');

      // Verify that the issue database record itself WAS successfully saved
      const dbIssue = await query('SELECT title FROM issues WHERE id = $1', [res.body.data.id]);
      expect(dbIssue.rows[0].title).toBe('Fail-Safe Audit Test Issue');

    } finally {
      // Cleanup mock implementation
      querySpy.mockRestore();
    }
  });
});
