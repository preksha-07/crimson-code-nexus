/**
 * NEXUS CSRF Security Integration Tests
 *
 * Verifies the double-submit CSRF token mechanism.
 *
 * Scenarios tested (A-J):
 *  A: GET request without CSRF token → must NOT be rejected with 403 by CSRF
 *  B: Authenticated POST with no CSRF token → returns 403 CSRF_TOKEN_INVALID
 *  C: Authenticated POST with CSRF cookie but mismatched header → returns 403 CSRF_TOKEN_INVALID
 *  D: Authenticated POST with malformed token → returns 403 CSRF_TOKEN_INVALID
 *  E: Authenticated POST with matching valid cookie/header → passes CSRF layer (not 403)
 *  F: Login without an existing CSRF token → must NOT be blocked by CSRF with 403
 *  G: Authenticated logout with a valid CSRF token → allowed through CSRF
 *  H: Authenticated logout without a valid CSRF token → returns 403 CSRF_TOKEN_INVALID
 *  I: GET /api/auth/me when authenticated → issues nexus_csrf cookie (64 hex, SameSite=Lax, NOT HttpOnly)
 *  J: Authenticated POST /api/auth/logout with valid CSRF → clears nexus_csrf using Max-Age=0
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { app } from '../../../src/app.js';
import { generateCsrfToken } from '../../../src/security/auth/csrf.js';
import { makeCsrfPair } from '../../helpers/csrf.js';

describe('NEXUS CSRF Security Tests', () => {
  beforeAll(() => {
    /*
     * Test-only authentication harness.
     *
     * Injected at the top of the Express stack. Only populates req.user when
     * `x-test-inject-user: true` header is present, preserving genuine
     * unauthenticated state for unauthenticated test cases.
     */
    const mockAuth = (req: Request, _res: Response, next: NextFunction) => {
      if (req.headers['x-test-inject-user'] === 'true') {
        req.user = {
          id: 'usr_03',
          role: 'DEVELOPER',
          displayName: 'Dev Kumar'
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
  });

  // ─── A: Safe methods ──────────────────────────────────────────────────────

  it('A: allows GET requests without a CSRF token', async () => {
    const res = await request(app)
      .get('/api/issues')
      .set('x-test-inject-user', 'true');

    expect(res.status).not.toBe(403);
  });

  // ─── B: Missing token ─────────────────────────────────────────────────────

  it('B: rejects authenticated POST requests when CSRF token is missing', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .send({
        projectId: 'proj_01',
        title: 'CSRF Missing Token Test',
        description: 'This request intentionally omits the CSRF token.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── C: Mismatched token ──────────────────────────────────────────────────

  it('C: rejects authenticated POST requests when CSRF header does not match cookie', async () => {
    const tokenA = generateCsrfToken();
    const tokenB = generateCsrfToken();

    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', `nexus_csrf=${tokenA}`)
      .set('X-CSRF-Token', tokenB)
      .send({
        projectId: 'proj_01',
        title: 'CSRF Mismatch Test',
        description: 'This request intentionally uses different tokens.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── D: Malformed token ───────────────────────────────────────────────────

  it('D: rejects malformed CSRF tokens', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', 'nexus_csrf=not-a-valid-token')
      .set('X-CSRF-Token', 'not-a-valid-token')
      .send({
        projectId: 'proj_01',
        title: 'CSRF Malformed Token Test',
        description: 'This request intentionally uses malformed tokens.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── E: Matching valid tokens ─────────────────────────────────────────────

  it('E: allows authenticated state-changing requests with matching CSRF tokens', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/issues')
      .set('x-test-inject-user', 'true')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        projectId: 'proj_01',
        title: 'CSRF Valid Token Test',
        description: 'This request supplies matching CSRF credentials.'
      });

    expect(res.status).not.toBe(403);
  });

  // ─── F: Login bypass ──────────────────────────────────────────────────────

  it('F: does not require CSRF protection for login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'usr_03',
        password: 'Password123!'
      });

    expect(res.status).not.toBe(403);
  });

  it('F2: allows unauthenticated logout without CSRF protection', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).not.toBe(403);
  });

  // ─── G: Authenticated logout with valid CSRF ──────────────────────────────

  it('G: allows authenticated logout with valid CSRF token', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true')
      .set('Cookie', `nexus_session=sess_test; ${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).not.toBe(403);
  });

  // ─── H: Authenticated logout without CSRF ─────────────────────────────────

  it('H: rejects authenticated logout without a valid CSRF token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true')
      .set('Cookie', 'nexus_session=sess_test');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  // ─── I: Me endpoint issues nexus_csrf cookie ──────────────────────────────

  it('I: GET /api/auth/me when authenticated issues a valid nexus_csrf cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-test-inject-user', 'true');

    expect(res.status).toBe(200);

    const setCookieHeaders: string[] = [res.headers['set-cookie'] ?? []].flat();
    const csrfHeader = setCookieHeaders.find((h) => h.startsWith('nexus_csrf='));

    expect(csrfHeader).toBeDefined();

    const tokenValue = csrfHeader?.split('=')[1]?.split(';')[0];
    expect(tokenValue).toMatch(/^[a-fA-F0-9]{64}$/);
    expect(csrfHeader?.toLowerCase()).not.toContain('httponly');
    expect(csrfHeader?.toLowerCase()).toContain('samesite=lax');
  });

  // ─── J: Logout clears nexus_csrf cookie ───────────────────────────────────

  it('J: authenticated logout clears the nexus_csrf cookie with Max-Age=0', async () => {
    const { csrfCookie, csrfToken } = makeCsrfPair();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('x-test-inject-user', 'true')
      .set('Cookie', `nexus_session=sess_test; ${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).not.toBe(403);

    const setCookieHeaders: string[] = [res.headers['set-cookie'] ?? []].flat();
    const csrfClearHeader = setCookieHeaders.find((h) => h.startsWith('nexus_csrf='));

    expect(csrfClearHeader).toBeDefined();
    expect(csrfClearHeader?.toLowerCase()).toContain('max-age=0');
  });
});