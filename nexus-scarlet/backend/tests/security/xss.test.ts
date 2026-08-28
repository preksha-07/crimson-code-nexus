import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/db/pool.js';

describe('NEXUS Cross-Site Scripting (XSS) Input & Storage Tests', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    // Inject mock authentication for test endpoints (so we don't block on RBAC)
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'usr_admin', role: 'ADMIN' };
      next();
    };

    // Safely mount using Express's own app.use to construct the Layer,
    // then move it to the beginning of the stack so it executes first.
    app.use(mockAuth);
    const router = (app as any).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) {
        router.stack.unshift(layer);
      }
    }

    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch (e: any) {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('XSS payload input and raw storage check (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const xssPayload = "<script>alert('xss')</script>";

    // Post an issue with XSS payload in description
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-user-role', 'ADMIN')
      .send({
        projectId: 'proj_01',
        title: 'XSS Test Issue',
        description: xssPayload,
        reporterId: 'usr_01'
      });

    expect(res.status).toBe(201);
    
    // The backend should return the payload literally, proving it does not modify/sanitize input 
    // on storage, delegating browser script execution safety entirely to the frontend (BLOCKED BY FRONTEND).
    expect(res.body.data.description).toBe(xssPayload);
  });
});
