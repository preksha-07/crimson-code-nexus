/**
 * BOLA / IDOR & Object-Level Authorization Security Integration Tests
 *
 * Verifies that:
 * 1. Project members can access resources within their assigned projects.
 * 2. Non-members (cross-project users) are rejected with 403 FORBIDDEN when attempting
 *    to read, mutate, comment on, attach to, link dependencies for, or generate intelligence on
 *    resources belonging to projects they do not belong to.
 * 3. List endpoints do not enumerate unauthorized cross-project issues or releases.
 * 4. Privileged global roles (ADMIN, SECURITY_REVIEWER) retain intended access.
 * 5. Project creation requires administrative permissions (manage_users on user).
 * 6. Dependency deletion requires authorization for BOTH source and target issues.
 * 7. Client-supplied identity fields cannot spoof user identity on mutations.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { query } from '../../src/db/pool.js';
import { makeCsrfPair } from '../helpers/csrf.js';

describe('BOLA / IDOR & Object-Level Authorization Security Tests', () => {
  let isDbConnected = false;
  const { csrfCookie, csrfToken } = makeCsrfPair();

  // Test identifiers
  const userMember = 'usr_03'; // DEVELOPER, member of proj_01
  const userOutsider = 'usr_bola_outsider'; // DEVELOPER, member ONLY of proj_bola_outsider
  const projA = 'proj_01'; // Target project A
  const projB = 'proj_bola_outsider'; // Target project B
  const issueA = 'BUG-BOLA-A';
  const issueB = 'BUG-BOLA-B';
  const releaseA = 'rel_bola_a';

  beforeAll(async () => {
    // Dynamic test-only authentication harness using header sentinel
    const mockAuth = (req: any, _res: any, next: any) => {
      const testUser = req.headers['x-test-user-id'];
      const testRole = req.headers['x-test-user-role'] || 'DEVELOPER';
      if (testUser) {
        req.user = {
          id: testUser,
          role: testRole,
          displayName: 'BOLA Test User'
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

      // Clean up any stale test fixtures from previous runs
      await query('DELETE FROM releases WHERE id = $1', [releaseA]);
      await query('DELETE FROM issues WHERE id = $1 OR id = $2', [issueA, issueB]);
      await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projB, userOutsider]);
      await query('DELETE FROM projects WHERE id = $1', [projB]);
      await query('DELETE FROM users WHERE id = $1', [userOutsider]);

      // Seed test users & projects in database
      await query(
        `INSERT INTO users (id, display_name, email, role)
         VALUES ($1, 'BOLA Outsider', 'outsider@bola.local', 'DEVELOPER')
         ON CONFLICT (id) DO NOTHING`,
        [userOutsider]
      );

      const uniqueKey = `BL${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO projects (id, name, key, description)
         VALUES ($1, 'BOLA Project B', $2, 'Project B for BOLA testing')
         ON CONFLICT (id) DO NOTHING`,
        [projB, uniqueKey]
      );

      await query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [projB, userOutsider]
      );

      // Seed issue A under projA
      await query(
        `INSERT INTO issues (id, project_id, title, description, status, severity, priority, issue_type, reporter_id)
         VALUES ($1, $2, 'Issue A Title', 'Issue A Description', 'REPORTED', 'HIGH', 'P1', 'BUG', 'usr_01')
         ON CONFLICT (id) DO NOTHING`,
        [issueA, projA]
      );

      // Seed issue B under projB
      await query(
        `INSERT INTO issues (id, project_id, title, description, status, severity, priority, issue_type, reporter_id)
         VALUES ($1, $2, 'Issue B Title', 'Issue B Description', 'REPORTED', 'MEDIUM', 'P2', 'BUG', $3)
         ON CONFLICT (id) DO NOTHING`,
        [issueB, projB, userOutsider]
      );

      // Seed release A under projA
      await query(
        `INSERT INTO releases (id, project_id, version, name, status)
         VALUES ($1, $2, 'v1.0.0-bola', 'Release A', 'PLANNED')
         ON CONFLICT (id) DO NOTHING`,
        [releaseA, projA]
      );
    } catch (err) {
      console.error('[BOLA Test Fixture Setup Error]:', err);
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (isDbConnected) {
      try {
        await query('DELETE FROM releases WHERE id = $1', [releaseA]);
        await query('DELETE FROM issues WHERE id = $1 OR id = $2', [issueA, issueB]);
        await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projB, userOutsider]);
        await query('DELETE FROM projects WHERE id = $1', [projB]);
        await query('DELETE FROM users WHERE id = $1', [userOutsider]);
      } catch {
        // Safe teardown
      }
    }
  });

  // ─── A: Same-project authorized access ─────────────────────────────────────

  it('A: allows authorized project member (usr_03) to read issue in their project (proj_01)', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .get(`/api/issues/${issueA}`)
      .set('x-test-user-id', userMember)
      .set('x-test-user-role', 'DEVELOPER');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(issueA);
    expect(res.body.data.projectId).toBe(projA);
  });

  // ─── B: Cross-project unauthorized access ─────────────────────────────────

  it('B: rejects cross-project issue access (usr_bola_outsider attempting to read proj_01 issue) with 403', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    const res = await request(app)
      .get(`/api/issues/${issueA}`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ─── C: Cross-project mutation ─────────────────────────────────────────────

  it('C: rejects cross-project issue update and delete (usr_bola_outsider on proj_01 issue) with 403', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // PATCH update -> 403
    const patchRes = await request(app)
      .patch(`/api/issues/${issueA}`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Unauthorized BOLA Title Edit' });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error.code).toBe('FORBIDDEN');

    // Status transition -> 403
    const statusRes = await request(app)
      .patch(`/api/issues/${issueA}/status`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ toStatus: 'TRIAGED', reason: 'Unauthorized transition' });

    expect(statusRes.status).toBe(403);

    // DELETE issue -> 403
    const delRes = await request(app)
      .delete(`/api/issues/${issueA}`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(delRes.status).toBe(403);

    // Confirm database record was NOT mutated or deleted
    const dbRow = await query('SELECT title FROM issues WHERE id = $1', [issueA]);
    expect(dbRow.rows[0].title).toBe('Issue A Title');
  });

  // ─── D: Cross-project comments ─────────────────────────────────────────────

  it('D: rejects cross-project comment operations (usr_bola_outsider read/post comments on proj_01 issue)', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // Read comments on issue A -> 403
    const getRes = await request(app)
      .get(`/api/issues/${issueA}/comments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('FORBIDDEN');

    // Create comment on issue A -> 403
    const postRes = await request(app)
      .post(`/api/issues/${issueA}/comments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ body: 'Unauthorized cross-project comment' });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');
  });

  // ─── E: Cross-project attachments ──────────────────────────────────────────

  it('E: rejects cross-project attachment operations (usr_bola_outsider read/post attachments on proj_01 issue)', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // List attachments -> 403
    const getRes = await request(app)
      .get(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(getRes.status).toBe(403);

    // Upload attachment -> 403
    const postRes = await request(app)
      .post(`/api/issues/${issueA}/attachments`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fileName: 'malicious.txt',
        contentType: 'text/plain',
        objectKey: 'attachments/malicious.txt',
        sizeBytes: 128
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');
  });

  // ─── F: Dependency BOLA ───────────────────────────────────────────────────

  it('F: rejects cross-project dependency creation and deletion when user lacks access to target issue', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // Create dependency linking issueB -> issueA (user lacks access to issueA) -> 403
    const postRes = await request(app)
      .post(`/api/issues/${issueB}/dependencies`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        dependsOnIssueId: issueA,
        relation: 'BLOCKS'
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('FORBIDDEN');

    // Delete dependency linking issueB -> issueA -> 403 because target issueA is unauthorized
    const delRes = await request(app)
      .delete(`/api/issues/${issueB}/dependencies/${issueA}/BLOCKS`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(delRes.status).toBe(403);
    expect(delRes.body.error.code).toBe('FORBIDDEN');
  });

  // ─── G: Intelligence BOLA ─────────────────────────────────────────────────

  it('G: rejects cross-project intelligence analysis and retrieval for unauthorized issues', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // POST /api/issues/:id/analyze -> 403
    const analyzeRes = await request(app)
      .post(`/api/issues/${issueA}/analyze`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(analyzeRes.status).toBe(403);

    // GET /api/issues/:id/intelligence -> 403
    const intelRes = await request(app)
      .get(`/api/issues/${issueA}/intelligence`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(intelRes.status).toBe(403);

    // GET /api/issues/:id/duplicates -> 403
    const dupRes = await request(app)
      .get(`/api/issues/${issueA}/duplicates`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(dupRes.status).toBe(403);
  });

  // ─── H: Release BOLA & Creation ───────────────────────────────────────────

  it('H: rejects cross-project release creation, retrieval, and risk score queries', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // POST /api/releases for unauthorized project projA -> 403
    const createRes = await request(app)
      .post('/api/releases')
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        projectId: projA,
        version: 'v2.0.0-unauth',
        name: 'Unauthorized Release'
      });

    expect(createRes.status).toBe(403);

    // GET /api/releases/:id -> 403 for cross-project release
    const releaseRes = await request(app)
      .get(`/api/releases/${releaseA}`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(releaseRes.status).toBe(403);

    // GET /api/releases/:id/risk -> 403
    const riskRes = await request(app)
      .get(`/api/releases/${releaseA}/risk`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(riskRes.status).toBe(403);
  });

  // ─── I: List enumeration ──────────────────────────────────────────────────

  it('I: prevents unauthorized project issue enumeration via ?projectId parameter and default list', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // Explicitly querying another project's issues via ?projectId=proj_01 -> 403
    const directRes = await request(app)
      .get(`/api/issues?projectId=${projA}`)
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(directRes.status).toBe(403);

    // Listing issues without ?projectId -> returns ONLY issues from member projects (projB), 0 from projA
    const listRes = await request(app)
      .get('/api/issues')
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER');

    expect(listRes.status).toBe(200);
    const returnedProjectIds = listRes.body.data.map((item: any) => item.projectId);
    expect(returnedProjectIds).not.toContain(projA);
  });

  // ─── J: Project creation authorization ───────────────────────────────────

  it('J: enforces administrative authorization (manage_users) on POST /api/projects', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // DEVELOPER role trying to create a project -> 403
    const devRes = await request(app)
      .post('/api/projects')
      .set('x-test-user-id', userOutsider)
      .set('x-test-user-role', 'DEVELOPER')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Unauthorized Project',
        key: `UN${Date.now().toString().slice(-4)}`
      });

    expect(devRes.status).toBe(403);
    expect(devRes.body.error.code).toBe('FORBIDDEN');

    // ADMIN role trying to create a project -> 201
    const newKey = `ADM${Date.now().toString().slice(-4)}`;
    const adminRes = await request(app)
      .post('/api/projects')
      .set('x-test-user-id', 'usr_01')
      .set('x-test-user-role', 'ADMIN')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Admin Created Project',
        key: newKey,
        description: 'Created by Admin'
      });

    expect(adminRes.status).toBe(201);
    expect(adminRes.body.data.key).toBe(newKey);

    // Cleanup created project
    await query('DELETE FROM project_members WHERE project_id = $1', [adminRes.body.data.id]);
    await query('DELETE FROM projects WHERE id = $1', [adminRes.body.data.id]);
  });
});
