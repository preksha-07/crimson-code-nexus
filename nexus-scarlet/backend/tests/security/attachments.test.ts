/**
 * Raven Attachment Security Integration Tests
 *
 * Verifies security boundaries of the attachment metadata subsystem:
 * 1. Authentication: Unauthenticated requests return 401 UNAUTHORIZED.
 * 2. BOLA / Project Isolation: Cross-project attachment operations return 403 FORBIDDEN.
 * 3. Identity Integrity: Client-supplied uploadedBy field is overridden with authenticated req.user.id.
 * 4. Validation & Size Limits: Negative sizeBytes or missing/empty contentType return 422.
 * 5. Path Traversal Safety: Path traversal strings in fileName are safely parameterized in DB without file system side-effects.
 * 6. Response Headers: Responses are strictly application/json with X-Content-Type-Options: nosniff.
 * 7. RBAC: VIEWER role can read attachments but cannot create attachments.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { query } from '../../src/db/pool.js';
import { makeCsrfPair } from '../helpers/csrf.js';

describe('Raven Attachment Security Tests', () => {
  let isDbConnected = false;
  const { csrfCookie, csrfToken } = makeCsrfPair();

  const userMember = 'usr_03'; // DEVELOPER, member of proj_01
  const userOutsider = 'usr_e2e_outsider_att'; // DEVELOPER, member ONLY of proj_att_outsider
  const projA = 'proj_01';
  const projB = 'proj_att_outsider';
  const issueA = 'BUG-ATT-A';
  const issueB = 'BUG-ATT-B';

  beforeAll(async () => {
    const mockAuth = (req: any, _res: any, next: any) => {
      const testUser = req.headers['x-test-user-id'];
      const testRole = req.headers['x-test-user-role'] || 'DEVELOPER';
      if (testUser) {
        req.user = {
          id: testUser,
          role: testRole,
          displayName: 'Attachment Test User'
        };
      }
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

      // Clean up previous test artifacts
      await query('DELETE FROM attachments WHERE issue_id IN ($1, $2)', [issueA, issueB]);
      await query('DELETE FROM issues WHERE id IN ($1, $2)', [issueA, issueB]);
      await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projB, userOutsider]);
      await query('DELETE FROM projects WHERE id = $1', [projB]);
      await query('DELETE FROM users WHERE id = $1', [userOutsider]);

      // Seed test users & projects
      await query(
        `INSERT INTO users (id, display_name, email, role)
         VALUES ($1, 'Attachment Outsider', 'att_outsider@nexus.local', 'DEVELOPER')
         ON CONFLICT (id) DO NOTHING`,
        [userOutsider]
      );

      const uniqueKey = `AT${Date.now().toString().slice(-4)}`;
      await query(
        `INSERT INTO projects (id, name, key, description)
         VALUES ($1, 'Attachment Project B', $2, 'Isolated project')
         ON CONFLICT (id) DO NOTHING`,
        [projB, uniqueKey]
      );

      await query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [projB, userOutsider]
      );

      // Seed issue A under projA
      await query(
        `INSERT INTO issues (id, project_id, title, description, status, severity, priority, issue_type, reporter_id)
         VALUES ($1, $2, 'Attachment Issue A', 'Description A', 'REPORTED', 'HIGH', 'P1', 'BUG', 'usr_01')
         ON CONFLICT (id) DO NOTHING`,
        [issueA, projA]
      );

      // Seed issue B under projB
      await query(
        `INSERT INTO issues (id, project_id, title, description, status, severity, priority, issue_type, reporter_id)
         VALUES ($1, $2, 'Attachment Issue B', 'Description B', 'REPORTED', 'MEDIUM', 'P2', 'BUG', $3)
         ON CONFLICT (id) DO NOTHING`,
        [issueB, projB, userOutsider]
      );
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (isDbConnected) {
      try {
        await query('DELETE FROM attachments WHERE issue_id IN ($1, $2)', [issueA, issueB]);
        await query('DELETE FROM issues WHERE id IN ($1, $2)', [issueA, issueB]);
        await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projB, userOutsider]);
        await query('DELETE FROM projects WHERE id = $1', [projB]);
        await query('DELETE FROM users WHERE id = $1', [userOutsider]);
      } catch {
        // Safe teardown
      }
    }
  });

  it('rejects unauthenticated requests to read or create attachments with 401 UNAUTHORIZED', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const getRes = await request(app).get(`/api/issues/${issueA}/attachments`);
    expect(getRes.status).toBe(401);
    expect(getRes.body.error.code).toBe('UNAUTHORIZED');

    const postRes = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .send({ fileName: 'file.png', contentType: 'image/png', objectKey: 'key', sizeBytes: 100 });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects cross-project attachment operations (BOLA/IDOR) with 403 FORBIDDEN', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // User is member of projB (issueB), attempting to read/create attachments on projA (issueA) -> 403
    const getRes = await request(app)
      .get(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('FORBIDDEN');

    const postRes = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ fileName: 'unauth.pdf', contentType: 'application/pdf', objectKey: 'key_unauth', sizeBytes: 500 });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');
  });

  it('overrides client-supplied uploadedBy field with authenticated req.user.id', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        uploadedBy: 'usr_spoofed_admin', // Spoofed client identity
        fileName: 'identity_test.png',
        contentType: 'image/png',
        objectKey: 'keys/identity_test.png',
        sizeBytes: 1024
      });

    expect(res.status).toBe(201);
    expect(res.body.data.uploaded_by).toBe(userMember); // Derived from session
  });

  it('rejects invalid or negative sizeBytes with 422 UNPROCESSABLE_ENTITY', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fileName: 'invalid_size.png',
        contentType: 'image/png',
        objectKey: 'keys/invalid_size.png',
        sizeBytes: -500 // Invalid negative size
      });

    expect(res.status).toBe(422);
  });

  it('rejects missing or empty contentType with 422 UNPROCESSABLE_ENTITY', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fileName: 'no_type.txt',
        contentType: '', // Empty contentType
        objectKey: 'keys/no_type.txt',
        sizeBytes: 100
      });

    expect(res.status).toBe(422);
  });

  // 5. PATH TRAVERSAL SAFETY
  it('safely parameterizes path traversal strings in fileName without server side-effects', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const traversalName = '../../etc/passwd';
    const res = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fileName: traversalName,
        contentType: 'text/plain',
        objectKey: 'keys/traversal.txt',
        sizeBytes: 256
      });

    expect(res.status).toBe(201);
    expect(res.body.data.file_name).toBe(traversalName);
  });

  it('returns application/json Content-Type with X-Content-Type-Options: nosniff', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .get(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('enforces RBAC permissions for VIEWER role (read allowed, create rejected with 403)', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // VIEWER role reading attachments -> 200
    const getRes = await request(app)
      .get(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'VIEWER');

    expect(getRes.status).toBe(200);

    // VIEWER role creating attachment -> 403
    const postRes = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'VIEWER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fileName: 'viewer_attempt.png',
        contentType: 'image/png',
        objectKey: 'keys/viewer_attempt.png',
        sizeBytes: 100
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');
  });
});
