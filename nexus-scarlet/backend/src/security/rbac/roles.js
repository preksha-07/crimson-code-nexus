/**
 * Role Definitions, Actions, and Draft Role-Permission Matrix for NEXUS.
 * 
 * [TEAM DECISION REQUIRED] 
 * - The following roles and permissions represent a temporary DRAFT architecture.
 * - This matrix is NOT the final production policy. Scarlet and the core backend team must 
 *   review and approve the entire matrix before integration into production.
 * - Under no circumstances should this draft matrix be treated as official requirements.
 * - Do NOT implement owner-based or assignee-based authorization checks, or implicit viewer bypasses.
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  DEVELOPER: 'DEVELOPER',
  SECURITY_REVIEWER: 'SECURITY_REVIEWER',
  VIEWER: 'VIEWER'
};

export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  COMMENT: 'comment',
  EXPORT: 'export',
  VIEW_GRAPHS: 'view_graphs',
  VIEW_SECURITY_FINDINGS: 'view_security_findings',
  MANAGE_USERS: 'manage_users',
  EDIT_ATTACHMENTS: 'edit_attachments',
  
  // Private variants for secure assets
  READ_PRIVATE: 'read_private',
  UPDATE_PRIVATE: 'update_private',
  COMMENT_PRIVATE: 'comment_private',
  EDIT_ATTACHMENTS_PRIVATE: 'edit_attachments_private'
};

export const RESOURCES = {
  ISSUE: 'issue',
  COMMENT: 'comment',
  ATTACHMENT: 'attachment',
  USER: 'user',
  GRAPH: 'graph',
  SECURITY_FINDING: 'security_finding'
};

/**
 * Draft Role-Permission Matrix.
 * Maps: Role -> Resource Type -> Set of Allowed Actions.
 * 
 * [TEAM DECISION REQUIRED]
 * - Should DEVELOPER be allowed to read private issues (read_private)?
 * - Should PROJECT_MANAGER be allowed to read/update private issues (read_private, update_private)?
 * - Should VIEWER be allowed to view graphs?
 */
export const ROLE_PERMISSION_MATRIX = {
  [ROLES.ADMIN]: {
    [RESOURCES.ISSUE]: [
      ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, 
      ACTIONS.READ_PRIVATE, ACTIONS.UPDATE_PRIVATE
    ],
    [RESOURCES.COMMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.COMMENT_PRIVATE],
    [RESOURCES.ATTACHMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.EDIT_ATTACHMENTS, ACTIONS.EDIT_ATTACHMENTS_PRIVATE],
    [RESOURCES.USER]: [ACTIONS.MANAGE_USERS],
    [RESOURCES.GRAPH]: [ACTIONS.VIEW_GRAPHS],
    [RESOURCES.SECURITY_FINDING]: [ACTIONS.VIEW_SECURITY_FINDINGS]
  },

  [ROLES.PROJECT_MANAGER]: {
    [RESOURCES.ISSUE]: [
      ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.EXPORT,
      // [TEAM DECISION REQUIRED] PM access to private issues is disabled by default in draft
      ACTIONS.READ_PRIVATE
    ],
    [RESOURCES.COMMENT]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.ATTACHMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.EDIT_ATTACHMENTS],
    [RESOURCES.USER]: [],
    [RESOURCES.GRAPH]: [ACTIONS.VIEW_GRAPHS],
    [RESOURCES.SECURITY_FINDING]: []
  },

  [ROLES.DEVELOPER]: {
    [RESOURCES.ISSUE]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [RESOURCES.COMMENT]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.ATTACHMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.EDIT_ATTACHMENTS],
    [RESOURCES.USER]: [],
    [RESOURCES.GRAPH]: [ACTIONS.VIEW_GRAPHS],
    [RESOURCES.SECURITY_FINDING]: []
  },

  [ROLES.SECURITY_REVIEWER]: {
    [RESOURCES.ISSUE]: [
      ACTIONS.READ, ACTIONS.UPDATE,
      ACTIONS.READ_PRIVATE, ACTIONS.UPDATE_PRIVATE // Allowed for security audit
    ],
    [RESOURCES.COMMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.COMMENT_PRIVATE],
    [RESOURCES.ATTACHMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.EDIT_ATTACHMENTS, ACTIONS.EDIT_ATTACHMENTS_PRIVATE],
    [RESOURCES.USER]: [],
    [RESOURCES.GRAPH]: [ACTIONS.VIEW_GRAPHS],
    [RESOURCES.SECURITY_FINDING]: [ACTIONS.VIEW_SECURITY_FINDINGS]
  },

  [ROLES.VIEWER]: {
    [RESOURCES.ISSUE]: [ACTIONS.READ],
    [RESOURCES.COMMENT]: [ACTIONS.READ],
    [RESOURCES.ATTACHMENT]: [ACTIONS.READ],
    [RESOURCES.USER]: [],
    [RESOURCES.GRAPH]: [ACTIONS.VIEW_GRAPHS],
    [RESOURCES.SECURITY_FINDING]: []
  }
};
