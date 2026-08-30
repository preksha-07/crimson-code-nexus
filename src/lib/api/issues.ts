import type {
  Issue,
  Comment,
  Attachment,
  IssueStatus,
  Severity,
  Priority,
  IssueType,
  IssueVisibility,
} from '../../types/issue';

import { apiClient } from './client';

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description: string;
  severity?: Severity;
  priority?: Priority;
  issueType?: IssueType;
  component?: string | null;
  version?: string | null;
  environment?: string;
  visibility?: IssueVisibility;
  reporterId?: string;
  assigneeId?: string | null;
  releaseId?: string | null;
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

export const getComments = async (
  issueId: string
): Promise<Comment[]> => {
  try {
    const rows = await apiClient.get<any[]>(
      `/issues/${encodeURIComponent(issueId)}/comments`
    );
    if (!Array.isArray(rows)) return [];
    return rows.map((c) => ({
      id: c.id,
      issueId: c.issueId || c.issue_id,
      author: c.authorName || c.author_name || c.authorId || c.author_id || 'Developer',
      authorRole: c.authorRole || 'DEVELOPER',
      content: c.body || c.content || '',
      createdAt: c.createdAt || c.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
};

export const addComment = (
  issueId: string,
  input: AddCommentInput
): Promise<Comment> => {
  return apiClient.post<Comment>(
    `/issues/${encodeURIComponent(issueId)}/comments`,
    { body: input.content }
  );
};

export const getAttachments = async (
  issueId: string
): Promise<Attachment[]> => {
  try {
    const rows = await apiClient.get<any[]>(
      `/issues/${encodeURIComponent(issueId)}/attachments`
    );
    if (!Array.isArray(rows)) return [];
    return rows.map((a) => ({
      id: a.id,
      name: a.fileName || a.file_name || 'attachment',
      size: `${Math.round((a.sizeBytes || a.size_bytes || 1024) / 1024)} KB`,
      url: '#',
      uploadedBy: a.uploadedBy || a.uploaded_by || 'User',
      uploadedAt: a.createdAt || a.created_at || new Date().toISOString(),
      type: a.contentType || a.content_type || 'text'
    }));
  } catch {
    return [];
  }
};

export const getDependencies = async (
  issueId: string
): Promise<string[]> => {
  try {
    const rows = await apiClient.get<any[]>(
      `/issues/${encodeURIComponent(issueId)}/dependencies`
    );
    if (!Array.isArray(rows)) return [];
    return rows.map((d) => d.dependsOnIssueId || d.depends_on_issue_id || d.targetId);
  } catch {
    return [];
  }
};

export const updateIssueStatus = (
  issueId: string,
  status: IssueStatus,
  reason?: string
): Promise<Issue> => {
  return apiClient.patch<Issue>(
    `/issues/${encodeURIComponent(issueId)}/status`,
    { toStatus: status, reason: reason || 'Workflow status transition' }
  );
};
