# Secret Sentinel Module

The **Secret Sentinel** module is a standalone, deterministic scanner designed to check issue descriptions and comments for credentials, API keys, tokens, and private key blocks before they are committed or permanently stored.

## Key Design Principles
1. **Deterministic Rules:** Uses optimized, context-specific regular expressions.
2. **Leak Prevention:** Findings communicate `POSSIBLE_SECRET` with confidence levels (0.0 - 1.0) rather than claiming absolute certainty.
3. **No Key Leakage in Logs:** Detected key values are never outputted to application logs or console traces.
4. **Selective Redaction:** Redacts secrets in text while preserving syntax and non-secret text (e.g. `password = "secret"` becomes `password = "[REDACTED_PASSWORD]"`).

---

## Finding Schema (NEXUS Compliant)

When a secret is detected, a finding is generated in the following contract format:

```json
{
  "id": "sec_b39d1bcf5e19",
  "issueId": "BUG-142",
  "type": "POSSIBLE_SECRET",
  "severity": "HIGH",
  "confidence": 0.85,
  "source": "comment_scan",
  "action": "REDACT_RECOMMENDED",
  "createdAt": "2026-08-28T22:20:34.000Z"
}
```

---

## Limitations

> [!WARNING]
> Secret Sentinel is a heuristic-based scanner and has inherent limitations:
> - **False Positives:** Complex assignments or code blocks resembling credentials might trigger alerts.
> - **False Negatives:** Random strings not matching regex length limits or formats will bypass the filter.
> - **Scope:** It is designed for plaintext checks and does not inspect binary attachments or encrypted blobs.

---

## Integration Contract

Scarlet will invoke Secret Sentinel prior to saving issues or comments:

```javascript
import { scanText, redactText } from './security/secrets/sentinel.js';

// Pre-save trigger:
const findings = scanText(comment.content, { 
  issueId: comment.issueId, 
  source: 'comment_scan' 
});

if (findings.length > 0) {
  // Flag issue, trigger audit alerts, or suggest redaction
  const safeContent = redactText(comment.content);
  comment.content = safeContent;
}
```
