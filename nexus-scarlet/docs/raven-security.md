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

### Implemented now
- **RBAC foundation**: Standalone permission evaluator checks user objects `{ id, role }` against resource types.
- **Validation foundation**: Generic schema validator verifies primitive types, presence, lengths, and enums, rejecting unexpected properties. Does not silently trim inputs.
- **Secret Sentinel**: Detector scan utility matching context-aware secret patterns and standalone redaction helper.
- **Security fixtures**: Catalog of JSON test cases modeling XSS, SQLi, CSRF, Unicode confusables, secrets, validation edge cases, and privacy policies.
- **Standalone security tests**: Node native unit tests (`npm test`) passing cleanly for RBAC, Validation, and Secret Sentinel.
- **Threat model**: System threat analysis detailing 12 core threats mapped through: Threat → Attack scenario → Asset affected → Security boundary → NEXUS control → Planned test → Expected result.
- **CVE/control/test matrix**: Traces historical tracker vulnerabilities to NEXUS design decisions and verification scopes.
- **Security test plan**: Master plan mapping 12 test suites, conditions, and statuses.
- **Security header specification**: Outlines CSP, cookies, Content-Disposition, and MIME sniffing defenses.

### Waiting for Scarlet
- **Authentication integration**: Validating and signing secure session tokens and storing cookies securely.
- **HTTP middleware**: Implementing middleware in the selected backend framework (Express, etc.) to set security headers and run validator/RBAC checks.
- **XSS integration testing**: End-to-end output encoding and markdown sanitization verification inside API routes.
- **CSRF integration testing**: Active check of cookie token validation inside routes.
- **SQL injection integration testing**: Dynamic database level queries parameterized and verified against ORM injection vulnerabilities.
- **Private-data authorization integration**: Traversal graph filtering based on PostgreSQL rows and active user associations.
- **Attachment security integration**: Active storage handling, secure naming generation, origin configuration, and size limit checks on upload.
- **Notification resilience integration**: Stripping newlines (CRLF) in SMTP mail headers and configuring persistent outbox queues.

### Team decisions required
- **Private issue role permissions**: Aligning developer and project manager access permissions for private issues.
- **Final validation schemas**: Aligning the request validation schemas with the core database models and entities.
- **HTTP framework/security middleware**: Selecting the backend routing framework and integrating HTTP header controls.
- **Attachment serving architecture**: Selecting whether to host attachments on a separate isolated subdomain sandbox (recommended Homograph Homonym safeguard) or rely solely on download headers.
- **Notification/mail security decisions**: Configuring retry policies, logging boundaries (no raw secrets in alerts), and email templates.

---

## 3. Current Implementation Status

Here is the execution summary:

### Standalone Executable Tests (IMPLEMENTED + PASSING)
The following tests run locally via `npm test` with zero external dependencies:
- **`tests/security/rbac/rbac.test.js`**: Exercises authorization check outputs for all roles and scenarios.
- **`tests/security/validation/validation.test.js`**: Exercises validation schema constraints and strict error checks.
- **`tests/security/secrets/secrets.test.js`**: Exercises Secret Sentinel detection regexes and redactions.

### Blocked Tests (DEFINED + BLOCKED BY BACKEND / WAITING FOR SCARLET)
The following tests are stubbed and skipped via `test.skip` to prevent false passes during local test runs:
- `tests/security/auth/auth.test.js`
- `tests/security/xss/xss.test.js`
- `tests/security/csrf/csrf.test.js`
- `tests/security/sqli/sqli.test.js`
- `tests/security/privacy/privacy.test.js`
- `tests/security/attachments/attachments.test.js`
- `tests/security/headers/headers.test.js`
- `tests/security/notifications/notifications.test.js`

---

## 4. [SECURITY ASSUMPTION — REQUIRES INTEGRATION CONFIRMATION]
These assumptions represent external parameters that require backend server alignment (outside Raven's code boundaries):
1. **PostgreSQL isolation**: Database listener is locked down and only accepts requests originating from the backend server container/process.
2. **Filesystem execution block**: Host system disables CGI/interpreter script execution (PHP, Perl, Bash, JS) inside storage directories allocated for user attachments.
3. **Environment variable secrets**: Session keys, JWT signers, and database credentials are stored in process environment configs, rotated periodically, and never committed to version control.
