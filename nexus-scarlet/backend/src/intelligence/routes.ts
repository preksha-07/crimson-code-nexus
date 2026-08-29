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

export const intelligenceRouter = Router();

// POST /api/issues/:id/analyze
intelligenceRouter.post('/issues/:id/analyze', async (req, res, next) => {
  try {
    const data = await analyzeIssue(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/intelligence
intelligenceRouter.get('/issues/:id/intelligence', async (req, res, next) => {
  try {
    const data = await getIntelligence(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/duplicates
intelligenceRouter.get('/issues/:id/duplicates', async (req, res, next) => {
  try {
    const data = await getIssueDuplicates(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/related
intelligenceRouter.get('/issues/:id/related', async (req, res, next) => {
  try {
    const data = await getIssueRelated(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/reproduction-capsule
intelligenceRouter.get('/issues/:id/reproduction-capsule', async (req, res, next) => {
  try {
    const data = await getIssueReproductionCapsule(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/issues/:id/resolution-confidence
intelligenceRouter.get('/issues/:id/resolution-confidence', async (req, res, next) => {
  try {
    const data = await getIssueResolutionConfidence(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/releases/:id/risk
intelligenceRouter.get('/releases/:id/risk', async (req, res, next) => {
  try {
    const data = await getReleaseRiskScore(req.params.id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});
