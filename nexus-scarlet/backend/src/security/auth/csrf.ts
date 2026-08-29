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

  res.append(
    'Set-Cookie',
    `${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax; Max-Age=86400;${
      isProduction ? ' Secure;' : ''
    }`
  );
}

/**
 * Validates the double-submit CSRF token for authenticated state-changing
 * requests.
 *
 * Safe/read-only methods do not require CSRF protection.
 * Login is excluded because the caller has no authenticated session yet.
 */
export function requireCsrf(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (req.path === '/login') {
    return next();
  }

  // Authentication/RBAC remains responsible for rejecting unauthenticated
  // state-changing requests.
  if (!req.user) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
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