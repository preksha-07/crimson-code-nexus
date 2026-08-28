import { z } from 'zod';

export const issueCreateSchema = z.object({
  projectId: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(240),
  description: z.string().min(1),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  priority: z.enum(['P0','P1','P2','P3','P4']).default('P2'),
  issueType: z.enum(['BUG','TASK','IMPROVEMENT','SECURITY']).default('BUG'),
  component: z.string().max(120).nullable().optional(),
  version: z.string().max(64).nullable().optional(),
  reporterId: z.string().min(1).max(64),
  assigneeId: z.string().min(1).max(64).nullable().optional(),
  releaseId: z.string().min(1).max(64).nullable().optional()
});

export const issueUpdateSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  description: z.string().min(1).optional(),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  priority: z.enum(['P0','P1','P2','P3','P4']).optional(),
  issueType: z.enum(['BUG','TASK','IMPROVEMENT','SECURITY']).optional(),
  component: z.string().max(120).nullable().optional(),
  version: z.string().max(64).nullable().optional(),
  assigneeId: z.string().min(1).max(64).nullable().optional(),
  releaseId: z.string().min(1).max(64).nullable().optional()
}).refine(v => Object.keys(v).length > 0, { message: 'At least one field is required.' });

export const transitionSchema = z.object({
  toStatus: z.enum(['REPORTED','TRIAGED','ASSIGNED','IN_PROGRESS','CODE_REVIEW','TESTING','RESOLVED','VERIFIED','CLOSED']),
  actorId: z.string().min(1).max(64),
  reason: z.string().max(500).optional()
});
