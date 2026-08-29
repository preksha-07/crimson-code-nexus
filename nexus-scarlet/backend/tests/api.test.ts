import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('NEXUS Scarlet API Integration Tests', () => {
  let createdProjectId: string;
  let createdIssueId: string;
  let createdReleaseId: string;

  beforeAll(() => {
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'usr_01', role: 'ADMIN' };
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
  });

  afterAll(() => {
    // pool is a shared singleton — do not close it here.
  });

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'nexus-backend' });
    });
  });

  describe('Projects API', () => {
    it('GET /api/projects lists projects', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('key');
    });

    it('POST /api/projects creates a new project', async () => {
      const uniqueKey = `TST${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          key: uniqueKey,
          description: 'A temporary test project'
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Test Project');
      expect(res.body.data.key).toBe(uniqueKey);
      createdProjectId = res.body.data.id;
    });

    it('GET /api/projects/:id returns the created project with camelCase fields', async () => {
      const res = await request(app).get(`/api/projects/${createdProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdProjectId);
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).toHaveProperty('updatedAt');
    });

    it('GET /api/projects/:id returns 404 for nonexistent project', async () => {
      const res = await request(app).get('/api/projects/proj_nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
      expect(res.body.error).toHaveProperty('requestId');
    });
  });

  describe('Releases API', () => {
    it('POST /api/releases creates a release', async () => {
      const res = await request(app)
        .post('/api/releases')
        .send({
          projectId: 'proj_01',
          version: `9.${Date.now().toString().slice(-4)}.0`,
          name: 'Integration Test Release',
          status: 'PLANNED'
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.projectId).toBe('proj_01');
      createdReleaseId = res.body.data.id;
    });

    it('GET /api/releases lists releases (camelCase)', async () => {
      const res = await request(app).get('/api/releases?projectId=proj_01');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('projectId');
      expect(res.body.data[0]).toHaveProperty('createdAt');
    });

    it('GET /api/releases/:id returns single release', async () => {
      const res = await request(app).get(`/api/releases/${createdReleaseId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdReleaseId);
    });

    it('GET /api/releases/:id returns 404 for invalid release id', async () => {
      const res = await request(app).get('/api/releases/rel_nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RELEASE_NOT_FOUND');
    });
  });

  describe('Issues API', () => {
    it('POST /api/issues creates an issue', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({
          projectId: 'proj_01',
          title: 'API Test Issue',
          description: 'Testing issue creation via API endpoint',
          severity: 'HIGH',
          priority: 'P1',
          issueType: 'BUG',
          component: 'test-suite',
          version: '1.0.0',
          reporterId: 'usr_01',
          assigneeId: 'usr_03',
          releaseId: 'rel_01'
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('API Test Issue');
      expect(res.body.data.status).toBe('REPORTED');
      createdIssueId = res.body.data.id;
    });

    it('GET /api/issues lists issues with filter & pagination', async () => {
      const res = await request(app).get('/api/issues?projectId=proj_01&limit=10&offset=0');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/issues/:id returns issue details', async () => {
      const res = await request(app).get(`/api/issues/${createdIssueId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdIssueId);
      expect(res.body.data.reporterId).toBe('usr_01');
    });

    it('PATCH /api/issues/:id updates issue fields', async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}`)
        .send({
          title: 'Updated API Test Issue',
          priority: 'P0'
        });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated API Test Issue');
      expect(res.body.data.priority).toBe('P0');
    });

    it('PATCH /api/issues/:id returns 422 when no fields sent', async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}`)
        .send({});
      expect(res.status).toBe(422);
    });

    it('PATCH /api/issues/:id/status performs valid workflow transition', async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}/status`)
        .send({
          toStatus: 'TRIAGED',
          actorId: 'usr_02',
          reason: 'Verified in triage'
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('TRIAGED');
    });

    it('PATCH /api/issues/:id/status rejects invalid transition with 409', async () => {
      const res = await request(app)
        .patch(`/api/issues/${createdIssueId}/status`)
        .send({
          toStatus: 'RESOLVED',
          actorId: 'usr_02'
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_WORKFLOW_TRANSITION');
    });

    it('DELETE /api/issues/:id deletes issue', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .send({
          projectId: 'proj_01',
          title: 'Temporary Issue to Delete',
          description: 'To be deleted',
          reporterId: 'usr_01'
        });
      const tempId = createRes.body.data.id;

      const delRes = await request(app).delete(`/api/issues/${tempId}`);
      expect(delRes.status).toBe(204);

      const getRes = await request(app).get(`/api/issues/${tempId}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Comments API', () => {
    it('POST /api/issues/:issueId/comments adds a comment', async () => {
      const res = await request(app)
        .post(`/api/issues/${createdIssueId}/comments`)
        .send({
          authorId: 'usr_03',
          body: 'Automated test comment.'
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.body).toBe('Automated test comment.');
    });

    it('GET /api/issues/:issueId/comments retrieves comments', async () => {
      const res = await request(app).get(`/api/issues/${createdIssueId}/comments`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].body).toBe('Automated test comment.');
    });
  });

  describe('Dependencies API', () => {
    it('POST /api/issues/:issueId/dependencies links issues', async () => {
      const res = await request(app)
        .post(`/api/issues/${createdIssueId}/dependencies`)
        .send({
          dependsOnIssueId: 'BUG-091',
          relation: 'RELATES_TO'
        });
      expect(res.status).toBe(201);
      expect(res.body.data.issue_id).toBe(createdIssueId);
      expect(res.body.data.depends_on_issue_id).toBe('BUG-091');
    });

    it('GET /api/issues/:issueId/dependencies lists dependencies', async () => {
      const res = await request(app).get(`/api/issues/${createdIssueId}/dependencies`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('DELETE /api/issues/:issueId/dependencies/:targetId/:relation removes dependency', async () => {
      const res = await request(app).delete(`/api/issues/${createdIssueId}/dependencies/BUG-091/RELATES_TO`);
      expect(res.status).toBe(204);
    });
  });

  describe('Attachments API', () => {
    it('POST /api/issues/:issueId/attachments creates attachment metadata', async () => {
      const res = await request(app)
        .post(`/api/issues/${createdIssueId}/attachments`)
        .send({
          uploadedBy: 'usr_01',
          fileName: 'log_dump.txt',
          contentType: 'text/plain',
          objectKey: 'attachments/2026/log_dump.txt',
          sizeBytes: 2048
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.file_name).toBe('log_dump.txt');
    });

    it('GET /api/issues/:issueId/attachments lists attachments', async () => {
      const res = await request(app).get(`/api/issues/${createdIssueId}/attachments`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Error & 404 Handling', () => {
    it('returns 404 for unknown route', async () => {
      const res = await request(app).get('/api/unknown-route-path');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error).toHaveProperty('requestId');
    });

    it('returns 422 for invalid request body schema', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: '' }); // Invalid name length
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error).toHaveProperty('requestId');
    });
  });
});
