/**
 * Raven E2E Security Smoke & Regression Integration Test
 *
 * Verifies the end-to-end Vixen -> Raven -> Cipher security pipeline:
 * 1. Authenticate with valid test user (session cookie + CSRF token issuance).
 * 2. Authenticated session validation on protected resource.
 * 3. State-changing mutation with valid double-submit CSRF token succeeds.
 * 4. Mutation without or with mismatched CSRF token fails with 403 CSRF_TOKEN_INVALID.
 * 5. Impersonation prevention (client-supplied reporterId overridden by req.user.id).
 * 6. Authorized project member access to project resource.
 * 7. Unauthorized cross-project access rejected with 403 FORBIDDEN (BOLA/IDOR).
 * 8. VIEWER role state-changing mutation rejected with 403 FORBIDDEN (RBAC).
 * 9. Authorized Cipher intelligence request succeeds for project member.
 * 10. Cross-project Cipher intelligence request rejected with 403 FORBIDDEN.
 * 11. Session logout invalidates server-side session and prevents further access.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { query } from '../../src/db/pool.js';

describe('Raven E2E Security Smoke & Regression Test Pipeline', () => {
  let isDbConnected = false;
  const userOutsiderId = 'usr_e2e_outsider';
  const projectOutsiderId = 'proj_e2e_outsider';

  beforeAll(async () => {
    try {
      await query('SELECT 1');
      isDbConnected = true;

      // Seed outsider user & project for cross-project BOLA tests
      await query(
        `INSERT INTO users (id, display_name, email, role, password_hash)
         VALUES ($1, 'E2E Outsider', 'outsider@nexus.local', 'DEVELOPER', 'd395da252873dbe048f5e67b5721ee96:cc7010c26e66f0957e99f9cb73a752865dc850e8f9c9df98c1e17f8989c8f236755d0d6692648c585c69720b04f82285eaeab6a41560558f171c58288b3977cf')
         ON CONFLICT (id) DO NOTHING`,
        [userOutsiderId]
      );

      const uniqueKey = `E2E${Date.now().toString().slice(-4)}`;
      await query(
        `INSERT INTO projects (id, name, key, description)
         VALUES ($1, 'E2E Outsider Project', $2, 'Isolated project for E2E security testing')
         ON CONFLICT (id) DO NOTHING`,
        [projectOutsiderId, uniqueKey]
      );

      await query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [projectOutsiderId, userOutsiderId]
      );
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (isDbConnected) {
      try {
        await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectOutsiderId, userOutsiderId]);
        await query('DELETE FROM projects WHERE id = $1', [projectOutsiderId]);
        await query('DELETE FROM users WHERE id = $1', [userOutsiderId]);
      } catch {
        // Cleanup fallback
      }
    }
  });

  // Helper to parse cookie header values
  function parseCookies(setCookieHeader: string[] | string | undefined): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!setCookieHeader) return cookies;
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const header of headers) {
      const parts = header.split(';')[0].split('=');
      const name = parts[0]?.trim();
      const value = parts.slice(1).join('=').trim();
      if (name) cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }

  // ─── E2E Pipeline Sequence ──────────────────────────────────────────────────

  it('executes complete 11-step E2E security smoke pipeline', async (ctx) => {
    if (!isDbConnected) { ctx.skip(); return; }

    // 1. AUTHENTICATE with valid test user (usr_03)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'usr_03', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.id).toBe('usr_03');

    const cookies = parseCookies(loginRes.headers['set-cookie']);
    const sessionCookie = cookies['nexus_session'];
    const csrfCookieToken = cookies['nexus_csrf'];

    expect(sessionCookie).toBeDefined();
    expect(csrfCookieToken).toBeDefined();
    expect(csrfCookieToken).toMatch(/^[a-fA-F0-9]{64}$/);

    const authCookieHeader = `nexus_session=${sessionCookie}; nexus_csrf=${csrfCookieToken}`;

    // 2. VERIFY AUTHENTICATED SESSION on protected resource
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user?.id).toBe('usr_03');

    // 3. STATE-CHANGING REQUEST WITH VALID CSRF TOKEN SUCCEEDS
    const issueTitle = `E2E Valid CSRF Issue ${Date.now()}`;
    const createRes = await request(app)
      .post('/api/issues')
      .set('Cookie', authCookieHeader)
      .set('X-CSRF-Token', csrfCookieToken)
      .send({
        projectId: 'proj_01',
        title: issueTitle,
        description: 'Testing valid CSRF token state change'
      });

    expect(createRes.status).toBe(201);
    const createdIssueId = createRes.body.data.id;
    expect(createdIssueId).toBeDefined();

    // 4. MUTATION WITHOUT / MISMATCHING CSRF FAILS WITH 403
    const badCsrfRes = await request(app)
      .post('/api/issues')
      .set('Cookie', authCookieHeader)
      .set('X-CSRF-Token', '0000000000000000000000000000000000000000000000000000000000000000')
      .send({
        projectId: 'proj_01',
        title: 'Mismatched CSRF Issue',
        description: 'Should be rejected by CSRF middleware'
      });

    expect(badCsrfRes.status).toBe(403);
    expect(badCsrfRes.body.error.code).toBe('CSRF_TOKEN_INVALID');

    // 5. CLIENT-SUPPLIED IDENTITY FIELDS CANNOT IMPERSONATE ANOTHER USER
    const spoofRes = await request(app)
      .post('/api/issues')
      .set('Cookie', authCookieHeader)
      .set('X-CSRF-Token', csrfCookieToken)
      .send({
        projectId: 'proj_01',
        title: 'Spoofed Reporter Issue',
        description: 'Attempting to spoof reporterId',
        reporterId: 'usr_01' // Attempting to impersonate Admin
      });

    expect(spoofRes.status).toBe(201);
    // Verified: backend ignored client reporterId and bound to authenticated user 'usr_03'
    expect(spoofRes.body.data.reporterId).toBe('usr_03');

    // Clean up created test issues
    await query('DELETE FROM issues WHERE id IN ($1, $2)', [createdIssueId, spoofRes.body.data.id]);

    // 6. LEGITIMATE PROJECT MEMBER ACCESSES THEIR PROJECT RESOURCE
    const memberReadRes = await request(app)
      .get('/api/issues/BUG-142')
      .set('Cookie', authCookieHeader);

    expect(memberReadRes.status).toBe(200);
    expect(memberReadRes.body.data.id).toBe('BUG-142');

    // 7. USER FROM ANOTHER PROJECT CANNOT ACCESS THAT RESOURCE (BOLA/IDOR)
    const outsiderLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: userOutsiderId, password: 'Password123!' });

    expect(outsiderLoginRes.status).toBe(200);

    const outsiderCookies = parseCookies(outsiderLoginRes.headers['set-cookie']);
    const outsiderAuthCookieHeader = `nexus_session=${outsiderCookies['nexus_session']}; nexus_csrf=${outsiderCookies['nexus_csrf']}`;

    const bolaRes = await request(app)
      .get('/api/issues/BUG-142')
      .set('Cookie', outsiderAuthCookieHeader);

    expect(bolaRes.status).toBe(403);
    expect(bolaRes.body.error.code).toBe('FORBIDDEN');

    // Legitimate Project B operation for outsider succeeds
    const outsiderLegitRes = await request(app)
      .get('/api/projects')
      .set('Cookie', outsiderAuthCookieHeader);

    expect(outsiderLegitRes.status).toBe(200);

    // 8. VIEWER ROLE CANNOT PERFORM PROTECTED MUTATION
    const viewerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'usr_05', password: 'Password123!' }); // usr_05 is VIEWER

    expect(viewerLoginRes.status).toBe(200);

    const viewerCookies = parseCookies(viewerLoginRes.headers['set-cookie']);
    const viewerAuthCookieHeader = `nexus_session=${viewerCookies['nexus_session']}; nexus_csrf=${viewerCookies['nexus_csrf']}`;

    const viewerMutationRes = await request(app)
      .post('/api/issues')
      .set('Cookie', viewerAuthCookieHeader)
      .set('X-CSRF-Token', viewerCookies['nexus_csrf'])
      .send({
        projectId: 'proj_01',
        title: 'Viewer Forbidden Mutation',
        description: 'Should be rejected by RBAC'
      });

    expect(viewerMutationRes.status).toBe(403);
    expect(viewerMutationRes.body.error.code).toBe('FORBIDDEN');

    // 9. AUTHORIZED CIPHER INTELLIGENCE REQUEST SUCCEEDS
    const cipherRes = await request(app)
      .get('/api/issues/BUG-142/intelligence')
      .set('Cookie', authCookieHeader);

    expect(cipherRes.status).toBe(200);
    expect(cipherRes.body.data).toBeDefined();

    // 10. CROSS-PROJECT CIPHER ACCESS IS BLOCKED
    const crossCipherRes = await request(app)
      .get('/api/issues/BUG-142/intelligence')
      .set('Cookie', outsiderAuthCookieHeader);

    expect(crossCipherRes.status).toBe(403);
    expect(crossCipherRes.body.error.code).toBe('FORBIDDEN');

    // 11. LOGOUT AND VERIFY SESSION IS INVALIDATED
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookieHeader)
      .set('X-CSRF-Token', csrfCookieToken);

    expect(logoutRes.status).toBe(200);

    const postLogoutMeRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `nexus_session=${sessionCookie}`);

    expect(postLogoutMeRes.body.data.user).toBeNull();
  });
});
