import { Router } from 'express';
import { z } from 'zod';
import { createIssue, deleteIssue, getIssue, listIssues, transitionIssue, updateIssue } from './service.js';
import { transitionSchema } from './schema.js';

export const issueRouter = Router();

issueRouter.get('/', async (req,res,next) => { try {
  const q = z.object({ projectId:z.string().optional(), status:z.string().optional(), assigneeId:z.string().optional(), limit:z.coerce.number().int().min(1).max(100).default(25), offset:z.coerce.number().int().min(0).default(0) }).parse(req.query);
  res.json({ data: await listIssues(q) });
} catch(e){next(e);} });

issueRouter.post('/', async (req,res,next) => { try { res.status(201).json({ data: await createIssue(req.body) }); } catch(e){next(e);} });
issueRouter.get('/:id', async (req,res,next) => { try { res.json({ data: await getIssue(req.params.id) }); } catch(e){next(e);} });
issueRouter.patch('/:id', async (req,res,next) => { try { res.json({ data: await updateIssue(req.params.id, req.body) }); } catch(e){next(e);} });
issueRouter.delete('/:id', async (req,res,next) => { try { await deleteIssue(req.params.id); res.status(204).send(); } catch(e){next(e);} });
issueRouter.patch('/:id/status', async (req,res,next) => { try { const data = transitionSchema.parse(req.body); res.json({ data: await transitionIssue(req.params.id, data.toStatus, data.actorId, data.reason) }); } catch(e){next(e);} });
