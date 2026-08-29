import type { Request, Response, NextFunction } from 'express';
import { pool } from '../../db/pool.js';

export interface AuthenticatedUser {
  id: string;
  role: string;
  displayName: string;
}

// Extend Request type representation for middleware
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Parses cookies natively from the Cookie header.
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(parts.join('='));
    }
  });
  return cookies;
}

/**
 * Global authentication middleware to resolve session cookie and populate req.user.
 */
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['nexus_session'];
    
    if (!sessionId) {
      return next();
    }
    
    const sessionRes = await pool.query<{ id: string; role: string; display_name: string }>(
      `SELECT u.id, u.role, u.display_name
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );
    
    if (sessionRes.rows.length > 0) {
      const row = sessionRes.rows[0];
      (req as any).user = {
        id: row.id,
        role: row.role,
        displayName: row.display_name
      };
    }
    
    next();
  } catch (error) {
    next(error);
  }
}
