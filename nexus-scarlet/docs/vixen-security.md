# Vixen Frontend Security Assessment & Verification Report (Phase 5)

This report documents the security audit, verification tests, and architectural boundaries for the React-based **Vixen** frontend (`nexus-vixen`).

---

## 1. Confirmed Security Findings

* **Demo-Level Authentication**:
  Authentication remains demo-only. The login flow matches user entries (`sarah`, `sconnor`) client-side and stores a demo token (`nexus-session-token-abc123xyz`) inside `localStorage`. This must never be treated as a production security control.
* **Client-Side Storage**:
  Session information is kept in local browser storage (`nexus_current_user` and `nexus_database`). Real authentication must migrate to secure, server-managed, HTTP-Only cookies to protect tokens from script access.
* **Non-Authoritative Route Protection**:
  We introduced a `ProtectedRoute` wrapper component inside `src/app/routes.tsx` to guard authenticated views. While this improves the user experience, it acts purely as a UX helper; backend APIs remain the sole authoritative authorization boundary.
* **Safe HTML Output Rendering**:
  A repository-wide check confirmed that Vixen uses React's default text rendering (`{variable}`) throughout, which encodes inputs on display. No usages of `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval`, or `new Function` exist, ensuring complete client-side protection against persistent or reflected XSS execution.
* **Client-Side Secret Sentinel**:
  The `SecretSentinel` component performs regex-based warning scans client-side before text presentation. This acts as defense-in-depth only; backend scanners remain the authority.

---

## 2. Frontend / Backend Security Responsibility Boundaries

The security layout of NEXUS splits boundaries strictly between client rendering and backend authority:

| Security Domain | Vixen (Frontend) Responsibility | Scarlet (Backend) Authority |
| :--- | :--- | :--- |
| **Authentication** | Collect user input, clear local session storage on logout, request API session status. | Authoritative credential check, token signature, cryptographic session management via cookies. |
| **Authorization** | Toggle visual element visibility (buttons, headers, navigation options) based on role metadata. | Enforce RBAC checks (`checkPermission`) on all REST routes and database queries. |
| **Audit Identity** | Forward the API requests without asserting caller identities inside request bodies. | Ignore request body identifiers and resolve caller identity strictly via verified `req.user.id` sessions. |
| **Input Validation** | Client-side length limits and form feedback to improve usability. | Authoritative Zod schema validation, database foreign key constraints (`ensureUser`/`ensureProject`). |
| **XSS Defense** | Sanitize markdown, escape HTML strings during React interpolation. | Validate characters, strip CRLF mail headers, enforce strict Content-Security-Policy (CSP) headers. |
| **Secret Scanning** | Local client warning alerts on forms and comment creation boxes. | Global data scanning, redactions, logs filtering, and alerting before database persistence. |

---

## 3. Repository-Wide Code Audits

### A. Unsafe DOM/API Pattern Audit
We scanned all files in the `src/` directory for dangerous patterns:
* **`dangerouslySetInnerHTML`**: **0 occurrences**.
* **`innerHTML` / `outerHTML`**: **0 occurrences**.
* **`eval` / `new Function`**: **0 occurrences**.
* **Dynamic Script Injection**: **0 occurrences**.
* **`javascript:` URIs**: **0 occurrences**.

### B. Client-Side Storage Audit
* **`localStorage.getItem('nexus_current_user')`**: Holds the current demo session metadata:
  ```json
  {
    "name": "sconnor",
    "role": "Lead Security Engineer",
    "token": "nexus-session-token-abc123xyz"
  }
  ```
* **`localStorage.getItem('nexus_database')`**: Holds in-memory database mocks (e.g. mock project lists, issues, and mock users) utilized to run the dashboard seamlessly in standalone mode.

### C. Sensitive Data & Credentials Audit
* **Hardcoded Credentials**: None.
* **Demo Credentials**: The logins (`sarah`, `sconnor`) and tokens are clearly designated for mockup/demo UI flow inside `src/pages/LoginPage.tsx` and are not active or valid in production scopes.

---

## 4. Frontend / Backend API Contract Check

A critical audit was conducted comparing API payloads:
* **Audited Parameter Gaps**:
  - `POST /api/issues` expects `reporterId` in the body.
  - `PATCH /api/issues/:id/status` expects `actorId` in the body.
  - `POST /api/issues/:issueId/comments` expects `authorId` in the body.
  - `POST /api/issues/:issueId/attachments` expects `uploadedBy` in the body.
* **Resolution Rule**:
  Vixen must never supply or be trusted to assert these identity IDs in request bodies in production. Once Scarlet implements session authentication, all backend endpoints must resolve user IDs directly from `req.user.id` on the server.
