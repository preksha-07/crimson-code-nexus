/**
 * CSRF Security Layer Integration Tests
 *
 * Verifies the double-submit CSRF token mechanism implemented in
 * src/security/auth/csrf.ts and wired into app.ts.
 *
 * Test matrix:
 *  A  GET without CSRF token             → must NOT be blocked (safe method)
 *  B  Authenticated POST, no CSRF        → 403 CSRF_TOKEN_INVALID
 *  C  Authenticated POST, mismatched     → 403 CSRF_TOKEN_INVALID
 *  D  Authenticated POST, malformed      → 403 CSRF_TOKEN_INVALID
 *  E  Authenticated POST, valid pair     → passes CSRF (any downstream code)
 *  F  Login without CSRF token           → must NOT be blocked
 *  G  Authenticated logout, valid CSRF   → passes CSRF
 *  H  Authenticated logout, no CSRF      → 403 CSRF_TOKEN_INVALID
 *  I  Login/me response sets nexus_csrf  → cookie present in Set-Cookie
 *  J  Logout response clears nexus_csrf  → cookie cleared in Set-Cookie
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { generateCsrfToken } from '../../src/security/auth/csrf.js';
import { makeCsrfPair } from '../helpers/csrf.js';

describe('CSRF Security Layer', () => {

  /**
   * Inject a mock authentication middleware as the very first middleware so
   * that CSRF sees req.user populated (the condition for CSRF enforcement).
   *
   * We use the same approach established by the existing security tests.
   */
  beforeAll(() => {
    const mockAuth = (
      req: { headers: Record<string, string | string[] | undefined>; user?: unknown },
      _res: unknown,
      next: () => void
    ) => {
      // Only inject user when the test sets the sentinel header.
      // This avoids polluting unauthenticated test cases (F, login).
      if (req.headers['x-test-inject-user'] === 'true') {
        req.user = { id: 'usr_01', role: 'ADMIN', displayName: 'Aarav Sharma' };
      }
      next();
    };

    app.use(mockAuth as Parameters<typeof app.use>[0]);
    const router = (app as unknown as { router?: { stack: unknown[] } }).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) {
        router.stack.unshift(layer);
      }
    }
  });

  // ─── A: Safe method (GET) ─────────────────────────────────────────────────

  it('A: GET request without CSRF token is NOT blocked by CSRF middleware', async () => {
    const res = await request(app)
      .get('/api/issues')
      .set('x-test-inject-user', 'true');

    // CSRF must not reject safe methods. 401/403 CSRF is not acceptable.
    // The downstream RBAC/DB may produce 200 or 500; what matters is CSRF is not 403.
    expect(res.status).not.toBe(403);
    if (res.status === 403) {
      // Extra guard: even if 403 it must NOT be from CSRF
      expect(res.body?.error?.code).not.toBe('CSRF_TOKEN_INVALID');
    }
  });

  // ─── B: Authenticated POST, no CSRF token ────────────────────────────────

  it('B: Authenticated POST with no CSRF token returns 403 CSRF_TOKEN_INVALID', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .send({ projectId: 'proj_01', title: 'CSRF Test B', description: 'test' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── C: Mismatched cookie / header ───────────────────────────────────────

  it('C: Authenticated POST with CSRF cookie but mismatched header returns 403', async () => {
    const tokenA = generateCsrfToken(); // 64-char hex
    const tokenB = generateCsrfToken(); // different 64-char hex

    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', `nexus_csrf=${tokenA}`)
      .set('X-CSRF-Token', tokenB)
      .send({ projectId: 'proj_01', title: 'CSRF Test C', description: 'test' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── D: Malformed token ───────────────────────────────────────────────────

  it('D: Authenticated POST with malformed CSRF token returns 403', async () => {
    const malformed = 'not-a-valid-hex-token'; // not 64 hex chars

    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', `nexus_csrf=${malformed}`)
      .set('X-CSRF-Token', malformed)
      .send({ projectId: 'proj_01', title: 'CSRF Test D', description: 'test' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── E: Valid matching pair ───────────────────────────────────────────────

  it('E: Authenticated POST with valid matching CSRF pair passes CSRF middleware', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ projectId: 'proj_01', title: 'CSRF Test E', description: 'test' });

    // CSRF must not reject this. Downstream may return 201, 422, or 500.
    expect(res.status).not.toBe(403);
    if (res.status === 403) {
      expect(res.body?.error?.code).not.toBe('CSRF_TOKEN_INVALID');
    }
  });

  // ─── F: Login — exempted from CSRF ───────────────────────────────────────

  it('F: POST /api/auth/login without CSRF token is NOT blocked', async () => {
    // Login must be exempt; the user has no session/CSRF token yet.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody@nexus.local', password: 'wrongpassword' });

    // Must not be a CSRF 403. Could be 401 (wrong creds) or 500.
    expect(res.status).not.toBe(403);
    if (res.status === 403) {
      expect(res.body?.error?.code).not.toBe('CSRF_TOKEN_INVALID');
    }
  });

  // ─── G: Authenticated logout with valid CSRF ──────────────────────────────

  it('G: Authenticated POST /api/auth/logout with valid CSRF passes', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    // Must not be blocked by CSRF; logout succeeds (200) or errors on DB side.
    expect(res.status).not.toBe(403);
    if (res.status === 403) {
      expect(res.body?.error?.code).not.toBe('CSRF_TOKEN_INVALID');
    }
  });

  // ─── H: Authenticated logout without CSRF ────────────────────────────────

  it('H: Authenticated POST /api/auth/logout without CSRF returns 403', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true');
    // No CSRF cookie or header → must be blocked

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── I: Login / GET /me sets nexus_csrf ──────────────────────────────────

  it('I: GET /api/auth/me when authenticated issues the nexus_csrf cookie', async () => {
    // Simulate an authenticated /me call (req.user injected by mock)
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-test-inject-user', 'true');

    expect(res.status).toBe(200);

    // The Set-Cookie header(s) must include nexus_csrf
    const setCookieHeaders: string[] = [res.headers['set-cookie'] ?? []].flat();
    const csrfCookieHeader = setCookieHeaders.find((h) =>
      h.startsWith('nexus_csrf=')
    );

    expect(csrfCookieHeader).toBeDefined();
    // The cookie value (the token) must be 64 hex chars
    const tokenValue = csrfCookieHeader?.split('=')[1]?.split(';')[0];
    expect(tokenValue).toMatch(/^[a-fA-F0-9]{64}$/);
    // Must NOT be HttpOnly (JS must be able to read it)
    expect(csrfCookieHeader?.toLowerCase()).not.toContain('httponly');
    // Must have SameSite=Lax
    expect(csrfCookieHeader?.toLowerCase()).toContain('samesite=lax');
  });

  // ─── J: Logout clears nexus_csrf ─────────────────────────────────────────

  it('J: POST /api/auth/logout clears the nexus_csrf cookie', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    // Logout itself must succeed
    expect(res.status).not.toBe(403);

    // Set-Cookie must clear nexus_csrf (Max-Age=0)
    const setCookieHeaders: string[] = [res.headers['set-cookie'] ?? []].flat();
    const csrfClearHeader = setCookieHeaders.find((h) =>
      h.startsWith('nexus_csrf=')
    );

    expect(csrfClearHeader).toBeDefined();
    expect(csrfClearHeader?.toLowerCase()).toContain('max-age=0');
  });
});
