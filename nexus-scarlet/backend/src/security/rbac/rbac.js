import { ROLE_PERMISSION_MATRIX, ACTIONS, ROLES } from './roles.js';

/**
 * Server-side authorization check.
 * Evaluates whether a user can perform an action on a specific resource.
 * 
 * @param {Object} user - The user requesting access. Format: { id: string, role: string }
 * @param {Object} resource - The resource being accessed. Format: { id: string, type: string, isPrivate: boolean }
 * @param {string} action - The action verb (e.g. 'read', 'create', 'update', etc.)
 * @returns {boolean} - True if authorized, false otherwise.
 */
export function authorize(user, resource, action) {
  // 1. Basic parameter presence check
  if (!user || typeof user.role !== 'string') {
    return false;
  }
  if (!resource || typeof resource.type !== 'string') {
    return false;
  }
  if (typeof action !== 'string') {
    return false;
  }

  // 2. Validate role existence in matrix
  const rolePermissions = ROLE_PERMISSION_MATRIX[user.role];
  if (!rolePermissions) {
    // Unknown or invalid role
    return false;
  }

  // 3. Validate resource type existence in role permissions
  const allowedActions = rolePermissions[resource.type];
  if (!allowedActions) {
    // Resource type not managed under this role's permission matrix
    return false;
  }

  // 4. Determine target action based on privacy attribute
  let targetAction = action;
  if (resource.isPrivate === true) {
    if (action === ACTIONS.READ) {
      targetAction = ACTIONS.READ_PRIVATE;
    } else if (action === ACTIONS.UPDATE) {
      targetAction = ACTIONS.UPDATE_PRIVATE;
    } else if (action === ACTIONS.COMMENT) {
      targetAction = ACTIONS.COMMENT_PRIVATE;
    } else if (action === ACTIONS.EDIT_ATTACHMENTS) {
      targetAction = ACTIONS.EDIT_ATTACHMENTS_PRIVATE;
    }
    // Note: Other actions (like delete) do not have separate private variants in draft,
    // they follow standard permissions if not specifically mapped.
  }

  // 5. Evaluate authorization
  return allowedActions.includes(targetAction);
}
