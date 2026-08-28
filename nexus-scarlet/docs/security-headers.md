# HTTP Security Headers & Cookie Specification (Raven)

This document establishes the security configurations for HTTP headers and cookies in project NEXUS. These must be implemented at the HTTP/web server layer once Scarlet selects the framework.

---

## 1. Content Security Policy (CSP)

CSP mitigates Cross-Site Scripting (XSS) and data injection attacks.

- **`default-src 'self';`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Block loading resources from external domains by default.
- **`script-src 'self';`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Do **not** allow `'unsafe-inline'` or `'unsafe-eval'`. If UI scripts require inline scripts, they must use cryptographic nonces (`nonce-SHA256`).
- **`object-src 'none';`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Disable plugins like Flash and Java to prevent exploitation.
- **`frame-ancestors 'none';`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Prevents framing/clickjacking of NEXUS dashboards.
- **Report-To / CSP Reporting Endpoint**
  - **Classification**: `TEAM DECISION REQUIRED`
  - *Details*: Establish a reporting endpoint (e.g. `/api/security/csp-report`) to monitor CSP violations in production.

---

## 2. Secure Cookie Settings

Cookies containing user session IDs must be protected against theft.

- **`HttpOnly`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Restricts access to cookies from JavaScript APIs, neutralizing XSS-based cookie theft.
- **`Secure`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Restricts transmission of session cookies to HTTPS only. Must be set in production.
- **`SameSite=Strict`** (or `SameSite=Lax`)
  - **Classification**: `IMPLEMENTATION DECISION`
  - *Details*: Mitigates Cross-Site Request Forgery (CSRF). `SameSite=Strict` is recommended for NEXUS because it handles highly sensitive security zero-day reports.
- **`__Host-` Prefix**
  - **Classification**: `IMPLEMENTATION DECISION`
  - *Details*: Prefix the cookie name with `__Host-SessionID` to lock the cookie to the exact origin domain, preventing subdomain sniffing.

---

## 3. Safe Content-Disposition & Sniffing Protections

When users download attachment proofs (such as PCAP logs, scripts, or images), browsers might parse them as HTML, executing code within the NEXUS context.

- **`X-Content-Type-Options: nosniff`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Forces browsers to respect the declared Content-Type header and prevents MIME sniffing.
- **`Content-Disposition: attachment; filename="filename.ext"`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Forces the browser to download files rather than rendering them inline, blocking script executions on HTML or text uploads.
- **Sandboxed Attachment Subdomain**
  - **Classification**: `TEAM DECISION REQUIRED`
  - *Details*: Host all attachments on a separate domain (e.g. `nexus-attachments.com`). If an uploaded file contains XSS payloads, it executes in an isolated origin sandbox and cannot access main cookies or session tokens of the primary `nexus.com` site.

---

## 4. Other Standard Security Headers

- **`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`**
  - **Classification**: `PROJECT REQUIREMENT`
  - *Details*: Enforces HTTPS (HSTS) on client browsers.
- **`X-Frame-Options: DENY`**
  - **Classification**: `IMPLEMENTATION DECISION`
  - *Details*: Legacy protection against Clickjacking (superseded by CSP `frame-ancestors 'none'`).
- **`X-XSS-Protection: 0`**
  - **Classification**: `IMPLEMENTATION DECISION`
  - *Details*: Disables old browser XSS filters which often introduced additional security bugs. Rely solely on CSP and output encoding.
