import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { verifyPassword } from './hash.js';
import { HttpError } from '../../shared/http.js';
import { recordAuditEvent } from '../../audit/service.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Support matching by ID, email, or display_name (case-insensitive)
    const userRes = await pool.query<{ id: string; display_name: string; email: string; role: string; password_hash: string | null }>(
      `SELECT id, display_name, email, role, password_hash
       FROM users
       WHERE LOWER(id) = LOWER($1) OR LOWER(email) = LOWER($1) OR LOWER(display_name) = LOWER($1)`,
      [username]
    );
    
    if (userRes.rows.length === 0) {
      await recordAuditEvent({
        action: 'auth.login.failure',
        resourceType: 'auth',
        metadata: { username, reason: 'user_not_found', password }
      });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    
    const user = userRes.rows[0];
    if (!user.password_hash) {
      await recordAuditEvent({
        action: 'auth.login.failure',
        resourceType: 'auth',
        metadata: { username, reason: 'missing_password_hash', password }
      });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await recordAuditEvent({
        action: 'auth.login.failure',
        resourceType: 'auth',
        metadata: { username, reason: 'incorrect_password', password }
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
    res.setHeader(
      'Set-Cookie',
      `nexus_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400;${isProduction ? ' Secure;' : ''}`
    );
    
    res.json({
      data: {
        user: {
          id: user.id,
          role: user.role,
          displayName: user.display_name
        }
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
    
    res.setHeader(
      'Set-Cookie',
      'nexus_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;'
    );
    
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', (req, res) => {
  res.json({
    data: {
      user: req.user || null
    }
  });
});
