# NEXUS Master Security Test Plan (Raven Security Foundation)

This document is the master index for security validation tests in project NEXUS.

## Status Classification
- **`IMPLEMENTED + PASSING`**: Security control is active and verified by green test runs (standalone or integration).
- **`DEFINED + BLOCKED BY BACKEND`**: The security control/test is defined but blocked until Scarlet implements the corresponding upstream backend framework infrastructure (e.g. auth sessions, CSRF headers, notification SMTP handlers).
- **`DEFINED + BLOCKED BY FRONTEND`**: The security control/test is defined but blocked until Vixen implements frontend-side sandboxing and escaping (e.g. HTML/Rich-Text client-side rendering).
- **`DEFINED + BLOCKED BY TEST ENVIRONMENT`**: The security control/test is fully written, but execution is dynamically skipped because of missing local test environment dependencies (e.g. offline PostgreSQL container).
- **`TEAM DECISION REQUIRED`**: The policy remains undecided and is blocked on product decisions.
- **`DEFINED / SECURITY FINDING / BLOCKED ON AUTHENTICATION INTEGRATION`**: The vulnerability is active and tracked as a security finding.

---

## 1. Authentication
* **Test ID**: `TST-SEC-01`
* **Objective**: Ensure session cookies are secure, HTTP-only, and signed cryptographically.
* **Preconditions**: User authentication system configured.
* **Attack/Input**: Forged Session Cookie or altered JWT payload.
* **Test Procedure**: Send API request to a protected route with an altered session cookie signature.
* **Expected Result**: HTTP 401 Unauthorized.
* **Failure Condition**: The server accepts the altered token.
* **Severity**: `CRITICAL`
* **Test Type**: Integration / API
* **Current Status**: `DEFINED + BLOCKED BY BACKEND` (Upstream session validation middleware is not yet implemented by Scarlet).

---

## 2. Identity / Unicode Handling
* **Test ID**: `TST-SEC-02`
* **Objective**: Reject Cyrillic look-alike homographs or invalid normalization variants in identity registrations.
* **Preconditions**: Username validation logic active.
* **Attack/Input**: Confusable unicode string `\u0430dmin` (Cyrillic 'a').
* **Test Procedure**: Try to register/authenticate username with confusable Cyrillic letters.
* **Expected Result**: Validation rejects homograph or maps it distinctly.
* **Failure Condition**: User registers Cyrillic username that collision-matches standard Latin 'admin'.
* **Severity**: `HIGH`
* **Test Type**: Unit / Validation
* **Current Status**: `IMPLEMENTED + PASSING` (Enforced in Raven's standalone validation engine).

---

## 3. RBAC (Role-Based Access Control)
* **Test ID**: `TST-SEC-03`
* **Objective**: Ensure roles cannot perform actions outside their assigned permission matrix.
* **Preconditions**: RBAC engine configured with the draft matrix and middleware mounted.
* **Attack/Input**: Viewer requesting issue creation or status updates.
* **Test Procedure**: Call POST `/api/issues` or PATCH `/api/issues/:id` under a VIEWER session.
* **Expected Result**: HTTP 403 Forbidden.
* **Failure Condition**: The request succeeds (HTTP 201/200).
* **Severity**: `HIGH`
* **Test Type**: Integration / API
* **Current Status**: `IMPLEMENTED + PASSING` (Middleware check permission mapped correctly on the Issue API).

---

## 4. Cross-Site Scripting (XSS)
* **Test ID**: `TST-SEC-04`
* **Objective**: Escape script blocks or event handlers before output rendering.
* **Preconditions**: Issue description or comments display.
* **Attack/Input**: `<img src="x" onerror="alert(1)">`
* **Test Procedure**: Post comment payload containing the payload and inspect rendered HTML payload.
* **Expected Result**: Script tags/handlers are stripped or escaped by client-side browser logic.
* **Failure Condition**: Script executes in client browser.
* **Severity**: `HIGH`
* **Test Type**: E2E / Browser Rendering
* **Current Status**: `DEFINED + BLOCKED BY FRONTEND` (Input and storage boundary test is `DEFINED + BLOCKED BY TEST ENVIRONMENT`; client rendering security remains blocked by frontend implementation).

---

## 5. Cross-Site Request Forgery (CSRF)
* **Test ID**: `TST-SEC-05`
* **Objective**: Block state-changing POST/PUT requests lacking a valid anti-CSRF token.
* **Preconditions**: CSRF validation active.
* **Attack/Input**: State change request with missing or incorrect `X-CSRF-Token` header.
* **Test Procedure**: Send POST request to `/api/issues/101/update` without the header.
* **Expected Result**: HTTP 403 Forbidden.
* **Failure Condition**: The issue is successfully updated.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `DEFINED + BLOCKED BY BACKEND` (Upstream CSRF middleware is not yet implemented by Scarlet).

---

## 6. SQL Injection (SQLi)
* **Test ID**: `TST-SEC-06`
* **Objective**: Prevent query syntax injection in search and filter parameters.
* **Preconditions**: Database layer active with user search routes.
* **Attack/Input**: `id = '1 OR 1=1'`
* **Test Procedure**: Query the issues endpoint with SQL syntax injection.
* **Expected Result**: Search yields 0 results or parses input as a literal search string; no database crash.
* **Failure Condition**: Database returns all records or execution error shows SQL trace.
* **Severity**: `CRITICAL`
* **Test Type**: Integration / DB
* **Current Status**: `DEFINED + BLOCKED BY TEST ENVIRONMENT` (Test written, exercises database path, skipped if PostgreSQL is offline).

---

## 7. Private-Data Isolation
* **Test ID**: `TST-SEC-07`
* **Objective**: Prevent reading security/private issues without permission.
* **Preconditions**: Issue repository populated with public and private issues.
* **Attack/Input**: Unauthorized role (e.g. VIEWER) requesting a private issue.
* **Test Procedure**: Request `/api/issues/private-vuln` under a VIEWER session.
* **Expected Result**: HTTP 403 Forbidden.
* **Failure Condition**: Access granted, private contents exposed.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `TEAM DECISION REQUIRED` (Undecided privacy boundaries).

---

## 8. Attachment Security
* **Test ID**: `TST-SEC-08`
* **Objective**: Block path traversal in attachment file uploads and validate sizes/types.
* **Preconditions**: Attachment upload endpoint active.
* **Attack/Input**: Filename: `../../../../etc/passwd`
* **Test Procedure**: Send upload payload containing path traversal sequences in filename metadata.
* **Expected Result**: Validation rejects filename and enforces MIME type/size limits.
* **Failure Condition**: Server saves file outside the uploads folder or accepts oversized/executable files.
* **Severity**: `CRITICAL`
* **Test Type**: Integration / Validation
* **Current Status**: `DEFINED + BLOCKED BY BACKEND` (Upstream storage configurations and routes are not yet implemented).

---

## 9. Secret Detection (Secret Sentinel)
* **Test ID**: `TST-SEC-09`
* **Objective**: Identify credentials, passwords, and private keys in comment blocks.
* **Preconditions**: Secret Sentinel rules loaded.
* **Attack/Input**: Comment with AWS credentials or private key.
* **Test Procedure**: Run `scanText` over text containing keys.
* **Expected Result**: Returns `POSSIBLE_SECRET` findings with high confidence.
* **Failure Condition**: Secret is not detected, or plain prose "password" is falsely flagged.
* **Severity**: `HIGH`
* **Test Type**: Unit
* **Current Status**: `IMPLEMENTED + PASSING` (Validated via standalone JS test suite).

---

## 10. Security Headers
* **Test ID**: `TST-SEC-10`
* **Objective**: Verify standard security headers and Content-Security-Policy (CSP) are present.
* **Preconditions**: Web server initialization.
* **Attack/Input**: Plain HTTP GET request.
* **Test Procedure**: Inspect HTTP response headers of GET `/health`.
* **Expected Result**: CSP, HSTS, X-Content-Type-Options: nosniff are present.
* **Failure Condition**: Headers are missing or weak.
* **Severity**: `MEDIUM`
* **Test Type**: Integration / Headers
* **Current Status**: `IMPLEMENTED + PASSING` (Validated via Supertest response header assertions).

---

## 11. Audit Logging / Identity Impersonation
* **Test ID**: `TST-SEC-11`
* **Objective**: Ensure that audit log events and database fields (reporterId, actorId, authorId, uploadedBy) cannot be controlled or spoofed by request bodies.
* **Preconditions**: Authentication session verification active.
* **Attack/Input**: Attempted creation/transition of issues or comments containing spoofed IDs in JSON bodies.
* **Test Procedure**: Send POST `/api/issues` or PATCH `/api/issues/:id/status` under caller session context, specifying a spoofed ID in the body payload.
* **Expected Result**: Audit events and issue tables record only the authenticated user context; client-supplied body overrides are ignored or rejected.
* **Failure Condition**: Audit logs record the spoofed ID instead of the caller's verified identity.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `DEFINED / SECURITY FINDING / BLOCKED ON AUTHENTICATION INTEGRATION` (Demonstrated in integration tests; blocked until Scarlet implements session middleware).

---

## 12. Notification Reliability
* **Test ID**: `TST-SEC-12`
* **Objective**: Block carriage return/line feed injections in mail headers.
* **Preconditions**: Mail dispatch queues configured.
* **Attack/Input**: Subject: `Bug Alert\r\nBcc: spy@evil.com`
* **Test Procedure**: Trigger mail dispatch with injected subject metadata.
* **Expected Result**: CRLF characters are stripped, header injection blocked.
* **Failure Condition**: Mail headers are split, sending copy to unauthorized BCC email.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `DEFINED + BLOCKED BY BACKEND` (SMTP routes and notification mailers are not yet implemented by Scarlet).
