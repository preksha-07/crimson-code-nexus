# Role-Based Access Control (RBAC) Module

This module implements the server-side authorization layer for project NEXUS. It is standalone and framework-agnostic.

## Key Design Principles
1. **Server-Side Enforcement:** Every sensitive action (reads, comments, attachments, graph traversal, and exports) must be verified on the backend.
2. **Explicit Permissions:** Access is determined by a role-to-permission matrix map, avoiding implicit bypass rules.
3. **Private Asset Redirection:** Standard actions (e.g. `read`) are converted to security-restricted actions (e.g. `read_private`) when a resource is flagged as `isPrivate: true`.

---

## Roles and Resources

### NEXUS Roles
- **`ADMIN`**: Full administrative access.
- **`PROJECT_MANAGER`**: Manages issues, exports, and plans.
- **`DEVELOPER`**: Standard issue creator, editor, and commenter.
- **`SECURITY_REVIEWER`**: Security auditor. Can view and modify security/private issues and access security logs/findings.
- **`VIEWER`**: Read-only stakeholder.

### NEXUS Protected Resources
- `issue`: Standard or private issue reports.
- `comment`: User commentaries.
- `attachment`: File uploads.
- `user`: Account metadata.
- `graph`: Trend visualization metrics.
- `security_finding`: Secret Sentinel leaks and vuln scans.

---

## [TEAM DECISION REQUIRED] Role-Permission Mapping

The current matrix is a **draft** designed by Raven for integration. Several authorization policies need team review:

> [!IMPORTANT]
> 1. **Project Manager Private Access:** Should `PROJECT_MANAGER` be permitted to read private issues (`read_private`) by default, or should they require security-cleared approval? (Currently: Allowed in draft).
> 2. **Developer Private Access:** Should `DEVELOPER` be completely blocked from `read_private` / `update_private`? (Currently: Blocked in draft; developers cannot view private issues unless they have another role).
> 3. **Owner/Assignee Override:** Do we allow individual assignees or issue creators to access private issues regardless of their role? (Currently: **Disabled**. All access is strictly role-permission based to prevent unauthorized token exposure/privilege escalation).
> 4. **Export Restrictions:** Export operations (`export`) are currently limited to `ADMIN` and `PROJECT_MANAGER`. Should `DEVELOPER` also be allowed to run exports? (Currently: Blocked).

---

## Integration Contract

Scarlet will import the authorization check into the router or service middleware:

```javascript
import { authorize } from './security/rbac/rbac.js';

// Inside router or controller:
const user = { id: req.user.id, role: req.user.role };
const resource = { id: issue.id, type: 'issue', isPrivate: issue.isPrivate };

if (!authorize(user, resource, 'read')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```
