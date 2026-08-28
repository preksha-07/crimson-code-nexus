import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/db/pool.js';

describe('NEXUS SQL Injection (SQLi) Integration Tests', () => {
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

    // Check if the PostgreSQL test database is running and reachable
    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch (e: any) {
      isDbConnected = false;
      console.warn('PostgreSQL database not running. SQLi integration tests will be marked as BLOCKED BY TEST ENVIRONMENT.');
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('SQLi check on GET /api/issues search filters (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      // Dynamically skip test using Vitest context
      ctx.skip();
      return;
    }

    // Inject SQL payload in projectId filter
    const res = await request(app)
      .get("/api/issues?projectId=proj_01' OR '1'='1")
      .set('x-test-user-role', 'ADMIN');
    
    expect(res.status).toBe(200);
    // Should return 0 issues because the project ID should search literally for "proj_01' OR '1'='1" 
    // rather than running the injection.
    expect(res.body.data.length).toBe(0);
  });

  it('SQLi check on POST /api/issues creation inputs (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    // Try to create an issue with SQL payload in title/description
    const res = await request(app)
      .post('/api/issues')
      .set('x-test-user-role', 'ADMIN')
      .send({
        projectId: 'proj_01',
        title: "SQLi test title'; DROP TABLE issues; --",
        description: "SQLi test description; SELECT * FROM users;",
        reporterId: 'usr_01'
      });

    // Parameterized queries should handle this as literal text, not SQL statements
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("SQLi test title'; DROP TABLE issues; --");
  });

  it('SQLi check on GET /api/issues/:id parameter (BLOCKED BY TEST ENVIRONMENT if DB is down)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const res = await request(app)
      .get("/api/issues/BUG-101' OR '1'='1")
      .set('x-test-user-role', 'ADMIN');

    // Should return 404 Not Found (searching literally for that ID)
    expect(res.status).toBe(404);
  });
});
