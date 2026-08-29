# RAVEN Security Master Document (NEXUS Foundation)

This is the primary security handover document prepared by **Raven** (Security & Backend Reliability) for the NEXUS project. It outlines our security architecture, standalone code modules, security test plan, and integration contracts.

---

## 1. Raven Responsibilities
Raven is responsible for establishing the threat defenses and secure workflows within NEXUS. This includes:
- Role-Based Access Control (RBAC) and authorization checks.
- Request verification and schema validation conventions.
- Credentials and leaked secrets detection (Secret Sentinel).
- Security headers and Cookie directives specification.
- Threat modeling, vulnerability tracing, and test fixtures provision.

---

## 2. Handover Inventory

### Implemented & Integrated
- **RBAC Express Middleware (`src/security/rbac/middleware.ts`)**: Reusable authorization middleware factory `checkPermission(action, resourceType)`. It expects `req.user` to be set by upstream authentication and evaluates access using the standalone evaluator.
- **RBAC Issue API Mounts (`src/issues/routes.ts`)**: Mounted permissions checks on list, get, create, update, delete, and transition status routes.
- **Security Type Declarations (`src/security/**/*.d.ts`)**: Type definitions allowing Scarlet's TypeScript codebase to import and use the framework-agnostic JavaScript security foundation with strict compile checks.
- **API Security Coverage Audit (`docs/api-security-audit.md`)**: Comprehensive endpoint mapping audit outlining RBAC action models, verification enforcements, validation gaps, and future Phase 4B implementation orders.
- **Vitest Integration Tests (`tests/security/`)**:
  - `rbac-integration.test.ts`: Integration checks for Issue API endpoints using mocked user context.
  - `identity-integrity.test.ts`: Integration tests demonstrating identity impersonation risks on client-supplied ID parameters.
  - `headers.test.ts`: Confirms Helmet response headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) match project specifications.
  - `sqli.test.ts`: Exercises real database path safety checks (skips dynamically if DB is offline).
  - `xss.test.ts`: Exercises input and storage boundary testing for malicious payloads.
- **Standalone Unit Tests (`tests/security/`)**: Node native tests (`node --test`) checking `rbac.test.js`, `validation.test.js`, and `secrets.test.js` standalone logic.

### Waiting for Scarlet (DEFINED + BLOCKED BY BACKEND)
- **Authentication integration**: Validating secure session tokens, storing cookies, and setting `req.user` context upstream.
- **CSRF integration testing**: Active check of cookie token validation inside routes.
- **Attachment security integration**: Active storage handling, secure naming generation, origin configuration, and size limit checks on upload.
- **Notification resilience integration**: Stripping newlines (CRLF) in SMTP mail headers and configuring persistent outbox queues.

### Team Decisions Required
- **Private Issue Permissions**: Aligning developer and project manager access permissions for private issues.
- **Final Validation Schemas**: Aligning request schemas with core database models.
- **Attachment Serving Architecture**: Selecting whether to host attachments on a separate isolated subdomain sandbox or rely solely on download headers.
- **Notification Security Policies**: Logging boundaries (no raw secrets in alerts) and template encoding.

---

## 3. Current Implementation Status

Here is the test execution summary:

### Standalone Executable Tests (IMPLEMENTED + PASSING)
The following unit tests run locally using Node's native test runner with 25 passing assertions:
- **`tests/security/rbac/rbac.test.js`**: Exercises authorization check outputs for all roles and scenarios.
- **`tests/security/validation/validation.test.js`**: Exercises validation schema constraints and strict error checks.
- **`tests/security/secrets/secrets.test.js`**: Exercises Secret Sentinel detection regexes and redactions.

### Integration API Tests (IMPLEMENTED + PASSING)
The following integration tests run locally via Vitest + Supertest:
- **`tests/security/rbac-integration.test.ts`**: Verifies 401/403 route blocks and 200/201 permissions on the Issue API.
- **`tests/security/headers.test.ts`**: Verifies that Helmet's actual response headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) are configured correctly.

### Storage & Input Tests (DEFINED + BLOCKED BY TEST ENVIRONMENT / FRONTEND)
- **`tests/security/sqli.test.ts`**: Tests parameterized database safety. Classified as `DEFINED + BLOCKED BY TEST ENVIRONMENT` and skipped dynamically using Vitest `ctx.skip()` if the PostgreSQL database connection fails (`ECONNREFUSED`).
- **`tests/security/xss.test.ts`**: Tests API input/storage bounds. Classified as `DEFINED + BLOCKED BY TEST ENVIRONMENT` and skipped dynamically if the DB is down. XSS browser rendering protection is classified as `DEFINED + BLOCKED BY FRONTEND` because rendering safety resides in Vixen's browser sandbox, not the backend storage.
- **`tests/security/identity-integrity.test.ts`**: Verifies client-controlled identity spoofing. Classified as `DEFINED + BLOCKED BY TEST ENVIRONMENT` (exercises database path and audit logs; skipped dynamically if PostgreSQL is unreachable).

### Blocked Tests (DEFINED + BLOCKED BY BACKEND)
The following tests remain stubbed/skipped as they wait for Scarlet's upstream authentication, attachment, and notification infrastructure:
- `tests/security/auth/auth.test.js` (Stubbed)
- `tests/security/csrf/csrf.test.js` (Stubbed)
- `tests/security/attachments/attachments.test.js` (Stubbed)
- `tests/security/notifications/notifications.test.js` (Stubbed)

---

## 4. Security Findings & Authentication Dependencies

### [CRITICAL FINDING] CLIENT-CONTROLLED IDENTITY / AUDIT IMPERSONATION
- **Vulnerability**: User context and audit parameters are read directly from client-supplied request bodies, allowing actors to spoof reporter and actor identities on audits, comment threads, and file upload logs.
- **Affected Fields**:
  - `issues`: `reporterId` (creation), `actorId` (transitions)
  - `comments`: `authorId` (creation)
  - `attachments`: `uploadedBy` (creation)
- **Current Status**: `DEFINED / SECURITY FINDING / BLOCKED ON AUTHENTICATION INTEGRATION` (The vulnerability is active and must NOT be marked as fixed).
- **Impact**: Attacker can create issues, post comments, link attachments, and transition issue status on behalf of any other user.
- **Dependency**: Session validation is a **hard dependency**. The backend must never trust client-supplied identity fields in request bodies. Upstream authentication middleware must set `req.user` based on secure session tokens/cookies, and the route handlers must resolve user context exclusively from `req.user.id`:
  ```
  authenticated principal (from secure cookie/session)
             ↓
         req.user.id
             ↓
      service/controller
             ↓
      reporterId / actorId / authorId / uploadedBy
  ```

### [SECURITY ASSUMPTIONS]
1. **PostgreSQL isolation**: Database listener is locked down and only accepts requests originating from the backend container/process.
2. **Filesystem execution block**: Host system disables CGI/interpreter script execution (PHP, Perl, Bash, JS) inside storage directories allocated for user attachments.
3. **Environment variable secrets**: Session keys, JWT signers, and database credentials are stored in process environment configs, rotated periodically, and never committed to version control.
