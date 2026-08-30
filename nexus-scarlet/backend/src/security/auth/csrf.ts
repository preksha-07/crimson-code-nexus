import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { HttpError } from '../../shared/http.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'nexus_csrf';

function parseCookies(
  cookieHeader: string | undefined
): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();

    if (name) {
      cookies[name] = decodeURIComponent(parts.join('='));
    }
  });

  return cookies;
}

function getHeaderToken(req: Request): string | undefined {
  const value = req.headers[CSRF_HEADER];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/**
 * Generates a cryptographically secure 256-bit CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets the CSRF token as a browser-readable cookie.
 *
 * Unlike nexus_session, this cookie is intentionally NOT HttpOnly.
 * JavaScript must be able to read it and copy it into X-CSRF-Token.
 */
export function setCsrfCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'None' : 'Lax';
  const secureFlag = isProduction ? ' Secure;' : '';

  res.append(
    'Set-Cookie',
    `${CSRF_COOKIE}=${token}; Path=/; SameSite=${sameSite}; Max-Age=86400;${secureFlag}`
  );
}

/**
 * Validates the double-submit CSRF token for authenticated state-changing
 * requests.
 *
 * Safe/read-only methods do not require CSRF protection.
 * Login is explicitly excluded because the caller has no authenticated session yet.
 * Unauthenticated logout is allowed to proceed to the auth router.
 */
export function requireCsrf(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const path = req.path.replace(/\/$/, '');

  // Login establishes authentication — cannot require an existing CSRF/session
  if (path === '/api/auth/login' || path === '/login') {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const hasSessionCookie = Boolean(cookies['nexus_session']);

  // Unauthenticated logout should proceed to the auth layer (idempotent),
  // whereas authenticated logout (session cookie or authenticated req.user present) is state-changing and requires CSRF.
  if (path === '/api/auth/logout' || path === '/logout') {
    if (!req.user && !hasSessionCookie) {
      return next();
    }
  }

  // If request is not authenticated, let authentication/RBAC handle it (returns 401)
  if (!req.user && !hasSessionCookie) {
    return next();
  }

  // Authenticated state-changing request (application routes or authenticated logout)
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = getHeaderToken(req);

  if (
    !cookieToken ||
    !headerToken ||
    !/^[a-fA-F0-9]{64}$/.test(cookieToken) ||
    !/^[a-fA-F0-9]{64}$/.test(headerToken)
  ) {
    return next(
      new HttpError(
        403,
        'CSRF_TOKEN_INVALID',
        'A valid CSRF token is required.'
      )
    );
  }

  const cookieBuffer = Buffer.from(cookieToken, 'utf8');
  const headerBuffer = Buffer.from(headerToken, 'utf8');

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return next(
      new HttpError(
        403,
        'CSRF_TOKEN_INVALID',
        'A valid CSRF token is required.'
      )
    );
  }

  return next();
}