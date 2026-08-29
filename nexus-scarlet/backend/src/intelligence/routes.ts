import { Router } from 'express';
import {
  analyzeIssue,
  getIntelligence,
  getIssueDuplicates,
  getIssueRelated,
  getIssueReproductionCapsule,
  getIssueResolutionConfidence,
  getReleaseRiskScore
} from './service.js';
import { checkPermission } from '../security/rbac/middleware.js';
import { assertIssueAccess, assertReleaseAccess, param, type AuthUser } from '../security/rbac/authorization.js';

export const intelligenceRouter = Router();

// POST /api/issues/:id/analyze
intelligenceRouter.post('/issues/:id/analyze', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await analyzeIssue(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/intelligence
intelligenceRouter.get('/issues/:id/intelligence', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await getIntelligence(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/duplicates
intelligenceRouter.get('/issues/:id/duplicates', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await getIssueDuplicates(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/related
intelligenceRouter.get('/issues/:id/related', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await getIssueRelated(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/reproduction-capsule
intelligenceRouter.get('/issues/:id/reproduction-capsule', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await getIssueReproductionCapsule(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/resolution-confidence
intelligenceRouter.get('/issues/:id/resolution-confidence', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const issueId = param(req.params.id);
    await assertIssueAccess(user, issueId, 'issue');
    const data = await getIssueResolutionConfidence(issueId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/releases/:id/risk
intelligenceRouter.get('/releases/:id/risk', checkPermission('read', 'issue'), async (req, res, next) => {
  try {
    const user = (req as any).user as AuthUser;
    const releaseId = param(req.params.id);
    await assertReleaseAccess(user, releaseId, 'release');
    const data = await getReleaseRiskScore(releaseId);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});
