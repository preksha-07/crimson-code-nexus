/**
 * Shared CSRF test utilities.
 *
 * Generates a matching (cookie, header) CSRF token pair for use in
 * supertest requests that go through the requireCsrf middleware.
 *
 * Usage:
 *   const { csrfCookie, csrfToken } = makeCsrfPair();
 *   await request(app)
 *     .post('/api/issues')
 *     .set('Cookie', csrfCookie)
 *     .set('X-CSRF-Token', csrfToken)
 *     .send({ ... });
 */
import crypto from 'node:crypto';

export interface CsrfPair {
  /** Full Cookie header value, e.g. "nexus_csrf=<hex>" */
  csrfCookie: string;
  /** Raw token to supply in the X-CSRF-Token header */
  csrfToken: string;
}

/**
 * Generates a cryptographically valid, matching CSRF token pair.
 * Both values are 32 random bytes encoded as 64 hex characters.
 */
export function makeCsrfPair(): CsrfPair {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    csrfToken: token,
    csrfCookie: `nexus_csrf=${token}`,
  };
}
