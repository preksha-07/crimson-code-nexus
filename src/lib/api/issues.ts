
import type {
  Issue,
  Comment,
  IssueStatus,
  Severity,
  Priority,
  IssueVisibility,
} from '../../types/issue';

import { apiClient } from './client';

export interface CreateIssueInput {
  title: string;
  description: string;
  component: string;
  environment: string;
  severity: Severity;
  priority: Priority;
  version: string;
  visibility: IssueVisibility;
}

export interface AddCommentInput {
  content: string;
  isSecuritySensitive?: boolean;
}

export const getIssues = async (): Promise<Issue[]> => {
  const data = await apiClient.get<Issue[]>('/issues');

  return Array.isArray(data) ? data : [];
};

export const getIssueById = (
  id: string
): Promise<Issue> => {
  return apiClient.get<Issue>(
    `/issues/${encodeURIComponent(id)}`
  );
};

export const createIssue = (
  input: CreateIssueInput
): Promise<Issue> => {
  return apiClient.post<Issue>('/issues', input);
};

export const addComment = (
  issueId: string,
  input: AddCommentInput
): Promise<Comment> => {
  return apiClient.post<Comment>(
    `/issues/${encodeURIComponent(issueId)}/comments`,
    input
  );
};

export const updateIssueStatus = (
  issueId: string,
  status: IssueStatus
): Promise<Issue> => {
  return apiClient.patch<Issue>(
    `/issues/${encodeURIComponent(issueId)}/status`,
    { status }
  );
};

