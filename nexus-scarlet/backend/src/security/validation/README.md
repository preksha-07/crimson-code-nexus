# Input Validation Layer

This module provides deterministic, schema-based request validation for all incoming payloads. 

## Key Design Principles
1. **Defense-in-Depth:** Input validation is enforced at the controller level before parsing or executing business actions.
2. **Strict Structure:** Payloads with unexpected properties are rejected rather than sanitized to prevent parameter injection attacks.
3. **Encoding Separation:** This layer only validates structures, types, and length bounds. Output encoding and XSS sanitization occur immediately prior to rendering (delegated to Scarlet/Vixen).

---

## Schema Guidelines

### 1. Account / Authentication (`LoginRequest`)
- Checks for alphanumeric usernames/emails.
- Restricts length boundaries to prevent Denial of Service (DoS) via oversized payloads.

### 2. Issues (`CreateIssueRequest`, `UpdateIssueRequest`)
- Enforces min/max lengths on issue titles and descriptions.
- Restricts input strings to valid enums for severity and state types.

### 3. File Metadata (`AttachmentMetadata`)
- Validates clean filenames to block Directory Traversal attacks (e.g. `../../etc/passwd`).
- Restricts attachments to a whitelist of safe mime-types.
- Restricts attachment sizes strictly to `10MB` max.

---

## [TEAM DECISION REQUIRED]

These schemas represent Raven's draft boundaries. The following decisions must be synchronized:

> [!WARNING]
> 1. **Allowed File Formats:** The whitelist of allowed attachment types (`image/png`, `image/jpeg`, `image/gif`, `application/pdf`, `text/plain`, `text/csv`) needs validation against product requirements.
> 2. **Project String Formats:** Project keys are currently restricted to simple alphanumeric characters (`^[a-zA-Z0-9_\-]+$`). If complex characters are needed, this regex must be updated.
> 3. **Severity/Status Enums:** Scarlet must approve the status/severity states defined in `schemas.js` to ensure they map 1-to-1 with PostgreSQL database tables.

---

## Integration Contract

```javascript
import { validate } from './security/validation/validator.js';

// Inside Scarlet's Express router:
app.post('/api/issues', (req, res) => {
  const result = validate('CreateIssueRequest', req.body);
  
  if (!result.valid) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      details: result.errors 
    });
  }

  // Sanitized, validated value containing only safe fields
  const safePayload = result.value;
  
  // Proceed with issue creation...
});
```
