import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/db/pool.js';

describe('CLIENT-CONTROLLED IDENTITY / AUDIT IMPERSONATION Finding', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    // Upstream Authentication Dependency Mock:
    // We mock req.user internally in tests to bypass the RBAC middleware boundary.
    // We mock the caller identity as Developer (usr_03), who is authorized to create/edit issues.
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'usr_03', role: 'DEVELOPER' };
      next();
    };

    // Safely mount using Express's own app.use to construct the Layer,
    // then move it to the beginning of the stack so it executes first.
    app.use(mockAuth);
    const router = (app as any).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) {
        router.stack.unshift(layer);
      }
    }

    // Check PostgreSQL connectivity
    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch (e) {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  /**
   * Expected Future Secure Architecture:
   * 
   *   authenticated principal (from secure cookie/session)
   *             ↓
   *         req.user.id
   *             ↓
   *      service/controller
   *             ↓
   *      reporterId / actorId
   * 
   * Client-supplied identity fields must not override the authenticated principal.
   */

  it('demonstrates that reporterId is accepted from request payload on creation (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    // The authenticated caller is Dev Kumar (usr_03), but we supply Aarav Sharma (usr_01 - Admin)
    // as the reporterId in the request body.
    const impersonatedUser = 'usr_01'; // Aarav Sharma (Admin)
    
    const res = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'Impersonation Issue',
        description: 'Testing if reporterId can be spoofed',
        reporterId: impersonatedUser
      });

    // The backend should accept the request and create the issue using the body's reporterId
    expect(res.status).toBe(201);
    expect(res.body.data.reporterId).toBe(impersonatedUser);

    // Verify database record and audit log integrity record the spoofed identity instead of caller
    const issueId = res.body.data.id;
    const dbIssue = await query('SELECT reporter_id FROM issues WHERE id = $1', [issueId]);
    expect(dbIssue.rows[0].reporter_id).toBe(impersonatedUser);

    const dbEvents = await query('SELECT actor_id FROM issue_events WHERE issue_id = $1 AND event_type = \'ISSUE_CREATED\'', [issueId]);
    expect(dbEvents.rows[0].actor_id).toBe(impersonatedUser);
  });

  it('demonstrates that actorId is accepted from transition payload on status update (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    // First create a temporary issue using Developer (usr_03)
    const createRes = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'Status Transition Impersonation',
        description: 'Testing if actorId can be spoofed on transition',
        reporterId: 'usr_03'
      });
    
    const issueId = createRes.body.data.id;
    const impersonatedUser = 'usr_01'; // Aarav Sharma (Admin)

    // Transition status and pass client-controlled actorId in request body
    const transitionRes = await request(app)
      .patch(`/api/issues/${issueId}/status`)
      .send({
        toStatus: 'TRIAGED',
        actorId: impersonatedUser,
        reason: 'Impersonated transition'
      });

    expect(transitionRes.status).toBe(200);

    // Verify audit logs record the spoofed identity instead of caller (usr_03)
    const dbEvents = await query('SELECT actor_id FROM issue_events WHERE issue_id = $1 AND event_type = \'STATUS_CHANGED\'', [issueId]);
    expect(dbEvents.rows[0].actor_id).toBe(impersonatedUser);
  });
});
