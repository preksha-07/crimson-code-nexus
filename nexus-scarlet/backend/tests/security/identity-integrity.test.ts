import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/db/pool.js';

describe('IDENTITY INTEGRITY & IMPERSONATION REGRESSION TESTS (Phase 6)', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    // Mock user context as usr_03 (Developer) to represent the authenticated session
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'usr_03', role: 'DEVELOPER', displayName: 'Dev Kumar' };
      next();
    };

    app.use(mockAuth);
    const router = (app as any).router;
    if (router && Array.isArray(router.stack)) {
      const layer = router.stack.pop();
      if (layer) {
        router.stack.unshift(layer);
      }
    }

    // Check PostgreSQL connectivity
    try {
      await query('SELECT 1');
      isDbConnected = true;
    } catch (e) {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('proves usr_03 cannot impersonate usr_01 on issue creation (reporterId is derived from session) (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const attackerUser = 'usr_03'; // Authenticated user
    const victimUser = 'usr_01'; // Attempted spoofed user

    const res = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'Impersonation Regression Test Issue',
        description: 'Testing if spoofed reporterId is ignored',
        reporterId: victimUser // Spoofed parameter in request body
      });

    expect(res.status).toBe(201);
    // The API response must report reporterId as the authenticated user, NOT the spoofed one
    expect(res.body.data.reporterId).toBe(attackerUser);

    // Verify database record has reporter_id as usr_03
    const issueId = res.body.data.id;
    const dbIssue = await query('SELECT reporter_id FROM issues WHERE id = $1', [issueId]);
    expect(dbIssue.rows[0].reporter_id).toBe(attackerUser);

    // Verify creation event has actor_id as usr_03
    const dbEvents = await query(
      'SELECT actor_id FROM issue_events WHERE issue_id = $1 AND event_type = \'ISSUE_CREATED\'',
      [issueId]
    );
    expect(dbEvents.rows[0].actor_id).toBe(attackerUser);
  });

  it('proves usr_03 cannot impersonate usr_01 on status transitions (actorId is derived from session) (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const attackerUser = 'usr_03'; // Authenticated user
    const victimUser = 'usr_01'; // Attempted spoofed user

    // 1. Create issue
    const createRes = await request(app)
      .post('/api/issues')
      .send({
        projectId: 'proj_01',
        title: 'Transition Impersonation Test',
        description: 'Testing transition actorId spoofing',
        reporterId: attackerUser
      });
    
    const issueId = createRes.body.data.id;

    // 2. Perform transition attempting to spoof actorId
    const res = await request(app)
      .patch(`/api/issues/${issueId}/status`)
      .send({
        toStatus: 'TRIAGED',
        actorId: victimUser, // Spoofed parameter
        reason: 'Attempted transition impersonation'
      });

    expect(res.status).toBe(200);

    // Verify transition status event in database has actor_id as usr_03
    const dbEvents = await query(
      'SELECT actor_id FROM issue_events WHERE issue_id = $1 AND event_type = \'STATUS_CHANGED\'',
      [issueId]
    );
    expect(dbEvents.rows[0].actor_id).toBe(attackerUser);
  });

  it('proves usr_03 cannot impersonate usr_01 on comment creation (authorId is derived from session) (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const attackerUser = 'usr_03'; // Authenticated user
    const victimUser = 'usr_01'; // Attempted spoofed user

    const res = await request(app)
      .post('/api/issues/BUG-091/comments')
      .send({
        authorId: victimUser, // Spoofed parameter
        body: 'Impersonation comment check.'
      });

    expect(res.status).toBe(201);
    
    // Verify database record has author_id as usr_03
    const commentId = res.body.data.id;
    const dbComment = await query('SELECT author_id FROM issue_comments WHERE id = $1', [commentId]);
    expect(dbComment.rows[0].author_id).toBe(attackerUser);
  });

  it('proves usr_03 cannot impersonate usr_01 on attachment upload (uploadedBy is derived from session) (BLOCKED BY DB if offline)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const attackerUser = 'usr_03'; // Authenticated user
    const victimUser = 'usr_01'; // Attempted spoofed user

    const res = await request(app)
      .post('/api/issues/BUG-091/attachments')
      .send({
        uploadedBy: victimUser, // Spoofed parameter
        fileName: 'impersonation_test.txt',
        contentType: 'text/plain',
        objectKey: 'attachments/impersonation_test.txt',
        sizeBytes: 1024
      });

    expect(res.status).toBe(201);

    // Verify database record has uploaded_by as usr_03
    const attachmentId = res.body.data.id;
    const dbAttachment = await query('SELECT uploaded_by FROM attachments WHERE id = $1', [attachmentId]);
    expect(dbAttachment.rows[0].uploaded_by).toBe(attackerUser);
  });
});
