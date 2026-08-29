export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type IssueVisibility = 'PUBLIC' | 'RESTRICTED' | 'CONFIDENTIAL';

export type IssueStatus =
  | 'REPORTED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'CODE_REVIEW'
  | 'TESTING'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'CLOSED';

export interface Comment {
  id: string;
  issueId: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string;
  isSecuritySensitive?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string; // 'log' | 'pcap' | 'image' | 'text'
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  component: string;
  environment: string;
  severity: Severity;
  priority: Priority;
  version: string;
  visibility: IssueVisibility;
  status: IssueStatus;
  assignee: string | null;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  attachments: Attachment[];
  dependencies: string[]; // Issue IDs this issue depends on or blocks
}
