import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
}

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 5; // 5 login attempts per minute per IP

export class MemoryRateLimiter {
  private hits = new Map<string, RateLimitEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  public windowMs: number;
  public maxRequests: number;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  }

  public check(ip: string): boolean {
    const now = Date.now();
    const entry = this.hits.get(ip);

    if (!entry || now > entry.resetTime) {
      this.hits.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      this.scheduleCleanup();
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  public reset(): void {
    this.hits.clear();
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setTimeout(() => {
      const now = Date.now();
      for (const [ip, entry] of this.hits.entries()) {
        if (now > entry.resetTime) {
          this.hits.delete(ip);
        }
      }
      this.cleanupTimer = null;
    }, this.windowMs);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

export const loginLimiterInstance = new MemoryRateLimiter();

/**
 * Resets the in-memory rate limiter state.
 * Deterministic helper for security regression test suites.
 */
export function resetRateLimiter(): void {
  loginLimiterInstance.reset();
}

/**
 * Server-side Express middleware for login rate limiting.
 * Keys strictly by client IP address before expensive credential verification.
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const allowed = loginLimiterInstance.check(clientIp);

  if (!allowed) {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.'
      }
    });
    return;
  }

  next();
}
