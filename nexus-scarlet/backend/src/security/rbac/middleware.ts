import { authorize } from './rbac.js';
import { HttpError } from '../../shared/http.js';
import type { Request, Response, NextFunction } from 'express';
import { recordAuditEvent } from '../../audit/service.js';

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
      recordAuditEvent({
        action: 'auth.unauthorized',
        resourceType: resourceType,
        metadata: { path: req.path, method: req.method }
      });
      return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }

    const getParam = (value: string | string[] | undefined): string | undefined =>
      typeof value === 'string' ? value : undefined;

    const resource = {
      id: getParam(req.params.id) ?? getParam(req.params.issueId) ?? 'new',
      type: resourceType
    };

    // 3. Evaluate Authorization
    if (!authorize(user, resource, action)) {
      recordAuditEvent({
        actorId: user.id,
        action: 'auth.denied',
        resourceType: resource.type,
        resourceId: resource.id,
        metadata: { requiredAction: action, role: user.role }
      });
      return next(new HttpError(403, 'FORBIDDEN', 'Access denied. You do not have permissions to perform this action.'));
    }

    next();
  };
}
