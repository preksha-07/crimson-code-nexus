import { authorize } from './rbac.js';
import { HttpError } from '../../shared/http.js';
import type { Request, Response, NextFunction } from 'express';

/**
 * Express authorization middleware factory.
 * Enforces server-side RBAC validation based on user role and resource action.
 * 
 * @param action - The action to authorize (e.g., 'read', 'create', 'update', 'delete')
 * @param resourceType - The resource type (e.g., 'issue', 'project', 'comment')
 * @returns Express middleware request handler.
 */
export function checkPermission(action: string, resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Authenticated User Check (expects req.user to be set upstream)
    // [SECURITY BOUNDARY]: Authentication is defined upstream.
    const user = (req as any).user;
    if (!user || typeof user.role !== 'string') {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }

    // 2. Resource Resolution
    // Construct the minimum resource representation required by the existing Raven RBAC contract.
    // Do not invent ownership, assignment, privacy, or database authorization rules.
    const resource = {
      id: req.params.id || req.params.issueId || 'new',
      type: resourceType
    };

    // 3. Evaluate Authorization
    if (!authorize(user, resource, action)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Access denied. You do not have permissions to perform this action.'));
    }

    next();
  };
}
