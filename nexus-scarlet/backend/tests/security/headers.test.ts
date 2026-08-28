import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

describe('NEXUS Security Headers Integration Tests', () => {

  afterAll(async () => {
    await pool.end();
  });

  it('GET /health returns Helmet security headers', async () => {
    const res = await request(app).get('/health');
    
    // 1. MIME Sniffing Defense
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    
    // 2. Clickjacking Defense
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');

    // 3. Content Security Policy (CSP)
    expect(res.headers).toHaveProperty('content-security-policy');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");

    // 4. Strict Transport Security (HSTS)
    // Note: Helmet typically sets HSTS by default, let's verify presence
    expect(res.headers).toHaveProperty('strict-transport-security');
  });
});
