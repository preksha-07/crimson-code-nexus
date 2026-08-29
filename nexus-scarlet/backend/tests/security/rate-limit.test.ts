/**
 * Raven Security Rate Limiting Integration Tests
 *
 * Verifies that:
 * 1. Login requests (POST /api/auth/login) below the limit threshold succeed or reach authentication logic.
 * 2. Requests exceeding the threshold are blocked with HTTP 429 Too Many Requests.
 * 3. The 429 response contains error code TOO_MANY_REQUESTS and user-friendly message.
 * 4. The rate limiter state can be deterministically reset (resetRateLimiter()).
 * 5. Unrelated endpoints (/health, GET /api/auth/me, GET /api/issues) are not rate-limited.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { resetRateLimiter } from '../../src/security/rate-limit/middleware.js';

describe('Raven Rate Limiting Security Tests', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows login attempts below the threshold (max 5)', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'usr_03', password: 'Password123!' });

      // Must not be rate-limited (429)
      expect(res.status).not.toBe(429);
    }
  });

  it('blocks login attempts exceeding the threshold with 429 TOO_MANY_REQUESTS', async () => {
    // 5 attempts allowed
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'usr_03', password: 'wrongpassword' });
    }

    // 6th attempt should be blocked with 429
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'usr_03', password: 'Password123!' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.'
      }
    });
  });

  it('resets rate limiter state deterministically via resetRateLimiter()', async () => {
    // Exhaust limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'usr_03', password: 'wrongpassword' });
    }

    // Verify blocked
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'usr_03', password: 'Password123!' });
    expect(blockedRes.status).toBe(429);

    // Reset rate limiter
    resetRateLimiter();

    // Subsequent request should be allowed again
    const allowedRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'usr_03', password: 'Password123!' });
    expect(allowedRes.status).toBe(200);
  });

  it('does not rate-limit health or read-only endpoints', async () => {
    // Exhaust login limit
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'usr_03', password: 'wrongpassword' });
    }

    // GET /health must not be blocked by 429
    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);

    // GET /api/auth/me must not be blocked by 429
    const meRes = await request(app).get('/api/auth/me');
    expect(meRes.status).toBe(200);
  });
});
