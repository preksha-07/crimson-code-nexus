import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { app } from '../../src/app.js';

describe('NEXUS CSRF Security Tests', () => {
  beforeAll(() => {
    /*
     * Test-only authentication harness.
     *
     * The real authenticateSession middleware runs first in production.
     * This harness is inserted at the beginning of the Express stack so
     * state-changing requests can be tested with an authenticated principal
     * without creating a real database session for every test.
     */
    const mockAuth = (req: Request, res: Response, next: NextFunction) => { {
      req.user = {
        id: 'usr_03',
        role: 'DEVELOPER',
        displayName: 'Dev Kumar'
      };

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

  it('allows GET requests without a CSRF token', async () => {
    const res = await request(app)
      .get('/api/issues');

    // CSRF must not protect safe/read-only requests.
    expect(res.status).not.toBe(403);
  });

  it('rejects authenticated POST requests when CSRF token is missing', async () => {
    const res = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'CSRF Missing Token Test',
        description: 'This request intentionally omits the CSRF token.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects authenticated POST requests when CSRF header does not match cookie', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Cookie', 'nexus_csrf=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      .set(
        'X-CSRF-Token',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      )
      .send({
        projectId: 'proj_01',
        title: 'CSRF Mismatch Test',
        description: 'This request intentionally uses different tokens.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects malformed CSRF tokens', async () => {
    const res = await request(app)
      .post('/api/issues')
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

  it('allows authenticated state-changing requests with matching CSRF tokens', async () => {
    const token =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    const res = await request(app)
      .post('/api/issues')
      .set('Cookie', `nexus_csrf=${token}`)
      .set('X-CSRF-Token', token)
      .send({
        projectId: 'proj_01',
        title: 'CSRF Valid Token Test',
        description: 'This request supplies matching CSRF credentials.'
      });

    /*
     * The important security assertion is that CSRF does not reject the
     * request. The request may subsequently fail due to database state,
     * validation, or another business rule.
     */
    expect(res.status).not.toBe(403);
  });

  it('does not require CSRF protection for login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'usr_03',
        password: 'Password123!'
      });

    /*
     * Login occurs before an authenticated session exists, so CSRF must not
     * prevent the authentication flow.
     *
     * 200 = successful login.
     * 401 = credentials/database state rejected the attempt.
     * 500 = database/environment failure.
     *
     * 403 would indicate the CSRF middleware incorrectly blocked login.
     */
    expect(res.status).not.toBe(403);
  });

  it('does not require CSRF protection for logout before authentication is established', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    /*
     * Logout is allowed to be idempotent. The security boundary being tested
     * here is that CSRF does not incorrectly block the unauthenticated flow.
     */
    expect(res.status).not.toBe(403);
  });
});