import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { makeCsrfPair } from '../helpers/csrf.js';

describe('NEXUS RBAC Middleware Integration Tests', () => {

  // A single CSRF pair used for all state-changing requests. Both VIEWER and
  // DEVELOPER role tests need valid CSRF so the CSRF layer lets the request
  // through — only then does RBAC make the role-based decision.
  const { csrfCookie, csrfToken } = makeCsrfPair();

  beforeAll(() => {
    // Inject a mock authentication middleware at the beginning of the Express stack.
    // This is strictly a test-only harness and is never active in production.
    const mockAuth = (req: any, _res: any, next: any) => {
      const userRole = req.headers['x-test-user-role'];
      if (userRole) {
        req.user = {
          id: req.headers['x-test-user-id'] || 'usr_03',
          role: userRole
        };
      }
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
  });

  afterAll(() => {});

  it('GET /api/issues without authenticated user returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/issues');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/issues with VIEWER role returns 200 or 500 (not 401/403)', async () => {
    const res = await request(app)
      .get('/api/issues')
      .set('x-test-user-role', 'VIEWER');

    // Status is 200 if DB is up, or 500 DB error, but must NOT be 401/403
    expect([200, 500]).toContain(res.status);
    if (res.status === 403) {
      throw new Error('Should not return 403 Forbidden for authorized read');
    }
  });

  it('POST /api/issues with VIEWER role returns 403 Forbidden (RBAC, not CSRF)', async () => {
    // CSRF tokens are supplied so the CSRF layer passes through.
    // The 403 FORBIDDEN must come from RBAC (VIEWER cannot create issues).
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-user-role', 'VIEWER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        projectId: 'proj_01',
        title: 'Forbidden Issue Title',
        description: 'Trying to create issue as VIEWER',
        reporterId: 'usr_01'
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/issues with DEVELOPER role is allowed (returns 201 or database/validation code, not 403)', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        projectId: 'proj_01',
        title: 'Developer Issue Title',
        description: 'Developer is allowed to create standard issue',
        reporterId: 'usr_01'
      });

    // Should pass the RBAC boundary. It can fail with 422 (if project/user doesn't exist in DB) or 500 (DB down) or 201.
    // The key check is that it must NOT return 403 Forbidden.
    expect(res.status).not.toBe(403);
  });
});
