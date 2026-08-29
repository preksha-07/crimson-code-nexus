import { HttpError } from '../shared/http.js';

export const STATUSES = ['REPORTED','TRIAGED','ASSIGNED','IN_PROGRESS','CODE_REVIEW','TESTING','RESOLVED','VERIFIED','CLOSED'] as const;
export type IssueStatus = typeof STATUSES[number];

const allowed: Record<IssueStatus, IssueStatus[]> = {
  REPORTED: ['TRIAGED'],
  TRIAGED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['CODE_REVIEW'],
  CODE_REVIEW: ['TESTING'],
  TESTING: ['RESOLVED'],
  RESOLVED: ['VERIFIED'],
  VERIFIED: ['CLOSED'],
  CLOSED: []
};

export function assertTransition(from: IssueStatus, to: IssueStatus) {
  if (!STATUSES.includes(from) || !STATUSES.includes(to)) throw new HttpError(422, 'INVALID_STATUS', 'Unsupported workflow status.');
  if (!allowed[from].includes(to)) throw new HttpError(409, 'INVALID_WORKFLOW_TRANSITION', `Cannot transition issue from ${from} to ${to}.`, { allowed: allowed[from] });
}

export function allowedTransitions(status: IssueStatus) { return allowed[status]; }
