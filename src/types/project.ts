export interface ProjectStats {
  openIssues: number;
  criticalIssues: number;
  securityIssues: number;
  verifiedIssues: number;
  totalIssues: number;
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  key?: string;
  createdAt?: string;
  updatedAt?: string;
  statistics?: ProjectStats;
  activeReleases?: string[];
  recentActivity?: string[];
  members?: ProjectMember[];
}
