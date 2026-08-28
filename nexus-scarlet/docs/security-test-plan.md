# NEXUS Master Security Test Plan (Raven Security Foundation)

This document is the master index for security validation tests in project NEXUS.

## Status Classification
- **`READY NOW`**: Test cases run locally without dependencies. Checked during `npm test`.
- **`BACKEND REQUIRED`**: Blocked by database/routes owned by Scarlet.
- **`INTEGRATION REQUIRED`**: Blocked by integration between multiple backend modules.
- **`E2E REQUIRED`**: Blocked by full environment, database, and client interface.

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
* **Current Status**: `BACKEND REQUIRED`

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
* **Current Status**: `READY NOW`

---

## 3. RBAC (Role-Based Access Control)
* **Test ID**: `TST-SEC-03`
* **Objective**: Ensure roles cannot perform actions outside their assigned permission matrix.
* **Preconditions**: RBAC engine configured with the draft matrix.
* **Attack/Input**: Viewer requesting issue export (`export`).
* **Test Procedure**: Call `authorize` with user role `VIEWER`, resource type `issue`, and action `export`.
* **Expected Result**: Return `false` (access denied).
* **Failure Condition**: Return `true` (access granted).
* **Severity**: `HIGH`
* **Test Type**: Unit
* **Current Status**: `READY NOW`

---

## 4. Cross-Site Scripting (XSS)
* **Test ID**: `TST-SEC-04`
* **Objective**: Escape script blocks or event handlers before output rendering.
* **Preconditions**: Issue description or comments display.
* **Attack/Input**: `<img src="x" onerror="alert(1)">`
* **Test Procedure**: Post comment payload containing the payload and inspect rendered HTML payload.
* **Expected Result**: Script tags/handlers are stripped or escaped (`&lt;img...&gt;`).
* **Failure Condition**: Script executes in client browser.
* **Severity**: `HIGH`
* **Test Type**: E2E
* **Current Status**: `INTEGRATION REQUIRED`

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
* **Current Status**: `BACKEND REQUIRED`

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
* **Current Status**: `BACKEND REQUIRED`

---

## 7. Private-Data Isolation
* **Test ID**: `TST-SEC-07`
* **Objective**: Prevent reading security/private issues without permission.
* **Preconditions**: Issue repository populated with public and private issues.
* **Attack/Input**: Unauthorized role (e.g. VIEWER) requesting a private issue.
* **Test Procedure**: Request `/api/issues/private-vuln` under a VIEWER session.
* **Expected Result**: HTTP 403 Forbidden.
* **Failure Condition**: Access granted, private bug contents exposed.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `BACKEND REQUIRED`

---

## 8. Attachment Security
* **Test ID**: `TST-SEC-08`
* **Objective**: Block path traversal in attachment file uploads.
* **Preconditions**: Attachment upload endpoint active.
* **Attack/Input**: Filename: `../../../../etc/passwd`
* **Test Procedure**: Send upload payload containing path traversal sequences in filename metadata.
* **Expected Result**: Validation strips path characters or rejects the request.
* **Failure Condition**: Server saves file outside the dedicated uploads folder.
* **Severity**: `CRITICAL`
* **Test Type**: Unit / Validation
* **Current Status**: `READY NOW` (Metadata check)

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
* **Current Status**: `READY NOW`

---

## 10. Security Headers
* **Test ID**: `TST-SEC-10`
* **Objective**: Verify standard security headers and Content-Security-Policy (CSP) are present.
* **Preconditions**: Web server initialization.
* **Attack/Input**: Plain HTTP GET request.
* **Test Procedure**: Inspect HTTP response headers of GET `/index.html`.
* **Expected Result**: CSP, HSTS, X-Content-Type-Options: nosniff are present.
* **Failure Condition**: Headers are missing or weak.
* **Severity**: `MEDIUM`
* **Test Type**: E2E / Headers
* **Current Status**: `BACKEND REQUIRED`

---

## 11. Audit Logging
* **Test ID**: `TST-SEC-11`
* **Objective**: Ensure access attempts on private issues and administrative tasks are logged.
* **Preconditions**: Auditing logging system active.
* **Attack/Input**: Attempted access of private resource.
* **Test Procedure**: Trigger a rejected private issue read request; check audit log file.
* **Expected Result**: Log created containing action, user, timestamp, resource ID, and outcome.
* **Failure Condition**: Log is not recorded or contains raw passwords/tokens.
* **Severity**: `HIGH`
* **Test Type**: Integration
* **Current Status**: `BACKEND REQUIRED`

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
* **Current Status**: `BACKEND REQUIRED`
