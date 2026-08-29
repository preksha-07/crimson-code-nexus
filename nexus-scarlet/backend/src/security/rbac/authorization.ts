import { query } from '../../db/pool.js';
import { HttpError } from '../../shared/http.js';
import { recordAuditEvent } from '../../audit/service.js';

export interface AuthUser {
  id: string;
  role: string;
  displayName?: string;
}

export const param = (value: string | string[] | undefined): string => {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_PARAMETER', 'Invalid route parameter.');
  }
  return value;
};

/**
 * Checks if a user is a direct member of a project in project_members.
 */
export async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  const r = await query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * Evaluates whether a user has access to a given project.
 * ADMIN and SECURITY_REVIEWER roles have system-wide access.
 * PROJECT_MANAGER, DEVELOPER, and VIEWER require project membership.
 */
export async function checkProjectAccess(
  user: AuthUser,
  projectId: string
): Promise<boolean> {
  if (user.role === 'ADMIN' || user.role === 'SECURITY_REVIEWER') {
    return true;
  }
  return isProjectMember(user.id, projectId);
}

/**
 * Asserts project access for a user. Throws 403 FORBIDDEN if access is denied.
 * Also records an audit event on authorization denial.
 */
export async function assertProjectAccess(
  user: AuthUser,
  projectId: string,
  resourceType = 'project',
  resourceId = projectId
): Promise<void> {
  const hasAccess = await checkProjectAccess(user, projectId);
  if (!hasAccess) {
    await recordAuditEvent({
      actorId: user.id,
      action: 'auth.denied',
      resourceType,
      resourceId,
      metadata: { reason: 'not_project_member', projectId, role: user.role }
    });
    throw new HttpError(403, 'FORBIDDEN', 'Access denied. You are not a member of this project.');
  }
}

/**
 * Resolves an issue's project_id. Throws 404 if the issue does not exist.
 */
export async function getIssueProjectId(issueId: string): Promise<string> {
  const r = await query('SELECT project_id FROM issues WHERE id = $1', [issueId]);
  if (!r.rowCount) {
    throw new HttpError(404, 'ISSUE_NOT_FOUND', 'Issue does not exist.');
  }
  return r.rows[0].project_id as string;
}

/**
 * Asserts that the user is authorized to access the given issue.
 * Resolves the issue's parent project and checks project access.
 */
export async function assertIssueAccess(
  user: AuthUser,
  issueId: string,
  resourceType = 'issue'
): Promise<string> {
  const projectId = await getIssueProjectId(issueId);
  await assertProjectAccess(user, projectId, resourceType, issueId);
  return projectId;
}

/**
 * Resolves a release's project_id. Throws 404 if the release does not exist.
 */
export async function getReleaseProjectId(releaseId: string): Promise<string> {
  const r = await query('SELECT project_id FROM releases WHERE id = $1', [releaseId]);
  if (!r.rowCount) {
    throw new HttpError(404, 'RELEASE_NOT_FOUND', 'Release does not exist.');
  }
  return r.rows[0].project_id as string;
}

/**
 * Asserts that the user is authorized to access the given release.
 */
export async function assertReleaseAccess(
  user: AuthUser,
  releaseId: string,
  resourceType = 'release'
): Promise<string> {
  const projectId = await getReleaseProjectId(releaseId);
  await assertProjectAccess(user, projectId, resourceType, releaseId);
  return projectId;
}
