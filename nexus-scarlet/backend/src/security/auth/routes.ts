import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { verifyPassword, hashPassword } from './hash.js';
import { HttpError } from '../../shared/http.js';
import { recordAuditEvent } from '../../audit/service.js';
import { generateCsrfToken, setCsrfCookie } from './csrf.js';
import { loginRateLimiter } from '../rate-limit/middleware.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

authRouter.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Support matching by ID, email, or display_name (case-insensitive)
    let userRes = await pool.query<{ id: string; display_name: string; email: string; role: string; password_hash: string | null }>(
      `SELECT id, display_name, email, role, password_hash
       FROM users
       WHERE LOWER(id) = LOWER($1) OR LOWER(email) = LOWER($1) OR LOWER(display_name) = LOWER($1)`,
      [username]
    );
    
    // If user does not exist, automatically provision as a VIEWER demo account
    if (userRes.rows.length === 0) {
      const cleanInput = username.trim();
      const normalizedEmail = cleanInput.includes('@')
        ? cleanInput.toLowerCase()
        : `${cleanInput.toLowerCase()}@nexus.local`;
      const localPart = normalizedEmail.split('@')[0];
      const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      const hashId = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12);
      const newUserId = `usr_${hashId}`;

      // Newly created demo accounts use Password123!
      if (password !== 'Password123!') {
        await recordAuditEvent({
          action: 'auth.login.failure',
          resourceType: 'auth',
          metadata: { username, reason: 'invalid_password' }
        });
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      }

      const defaultHash = await hashPassword('Password123!');
      await pool.query(
        `INSERT INTO users (id, display_name, email, role, password_hash)
         VALUES ($1, $2, $3, 'VIEWER', $4)
         ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [newUserId, displayName, normalizedEmail, defaultHash]
      );

      // Add user to default project proj_01
      await pool.query(
        `INSERT INTO project_members (project_id, user_id)
         VALUES ('proj_01', $1)
         ON CONFLICT DO NOTHING`,
        [newUserId]
      );

      userRes = await pool.query<{ id: string; display_name: string; email: string; role: string; password_hash: string | null }>(
        `SELECT id, display_name, email, role, password_hash
         FROM users
         WHERE id = $1`,
        [newUserId]
      );
    }
    
    const user = userRes.rows[0];
    if (!user.password_hash) {
      await recordAuditEvent({
        action: 'auth.login.failure',
        resourceType: 'auth',
        metadata: { username, reason: 'missing_password_hash' }
      });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await recordAuditEvent({
        action: 'auth.login.failure',
        resourceType: 'auth',
        metadata: { username, reason: 'incorrect_password' }
      });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    
    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, user.id, expiresAt]
    );
    
    await recordAuditEvent({
      actorId: user.id,
      action: 'auth.login.success',
      resourceType: 'auth',
      resourceId: user.id,
      metadata: { username, email: user.email }
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'None' : 'Lax';
    const secureFlag = isProduction ? ' Secure;' : '';

    res.setHeader(
      'Set-Cookie',
      `nexus_session=${sessionId}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=86400;${secureFlag}`
    );

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
    
    res.json({
      data: {
        user: {
          id: user.id,
          role: user.role,
          displayName: user.display_name
        },
        csrfToken
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie;
    let sessionId: string | undefined;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, c) => {
        const parts = c.split('=');
        const name = parts.shift()?.trim();
        if (name) acc[name] = decodeURIComponent(parts.join('='));
        return acc;
      }, {} as Record<string, string>);
      sessionId = cookies['nexus_session'];
    }
    
    if (req.user) {
      await recordAuditEvent({
        actorId: req.user.id,
        action: 'auth.logout',
        resourceType: 'auth',
        resourceId: req.user.id
      });
    }

    if (sessionId) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'None' : 'Lax';
    const secureFlag = isProduction ? ' Secure;' : '';

    res.append(
      'Set-Cookie',
      `nexus_session=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0;${secureFlag}`
    );

    res.append(
      'Set-Cookie',
      `nexus_csrf=; Path=/; SameSite=${sameSite}; Max-Age=0;${secureFlag}`
    );
    
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', (req, res) => {
  let csrfToken: string | undefined;
  if (req.user) {
    csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
  }

  res.json({
    data: {
      user: req.user || null,
      ...(csrfToken ? { csrfToken } : {})
    }
  });
});
