# CIPHER — AI & Bug Intelligence Methodology

## Overview

Cipher is the intelligence engine of the NEXUS platform. NEXUS differentiates itself from traditional defect trackers by combining structured issue data with deterministic evidence extraction, relationship analysis, explainable risk scoring, and resolution confidence tracking.

Cipher operates on a **deterministic-first architecture**. If an external AI provider (OpenAI, Gemini, Claude, etc.) is configured, Cipher delegates to it via a provider abstraction. If the provider is unavailable, unconfigured, or fails, Cipher gracefully falls back to explainable, deterministic algorithms without breaking any application workflows or API contracts.

---

## 1. Bug DNA Extraction

Bug DNA is a semantic fingerprint of an issue captured as a structured schema:

```json
{
  "component": "authentication",
  "failureType": "identity_mismatch",
  "inputType": "unicode",
  "impact": "authentication_failure",
  "securityRelevant": true,
  "environment": "web_runtime"
}
```

### Extraction Rules
- **Security Relevance**: Evaluated to `true` if `issueType == 'SECURITY'` or if the title/description contains security keywords (`auth`, `unicode`, `xss`, `injection`, `leak`, `token`, `permission`, `csv`, `sanitize`).
- **Failure Type**: Extracted by parsing terminology (`identity_mismatch`, `runtime_exception`, `functional_failure`, `data_exposure`, `performance_degradation`).
- **Input Type**: Extracted based on payload context (`unicode`, `file_payload`, `structured_data`, `authentication_credentials`).
- **Impact**: Categorized by potential operational or security blast radius (`authentication_failure`, `data_leakage`, `code_execution_risk`, `high_severity_disruption`).
- **Environment**: Extracted from context keywords (`containerized`, `production`, `web_runtime`, etc.). Missing fields default to `unknown` or `null` rather than generating hallucinations.

---

## 2. AI Triage Methodology

AI Triage provides automated suggestions for categorization, severity, priority, and team owner roles.

### Decision Matrix
1. **Security Vulnerabilities**: If `securityRelevant == true`, category is set to `SECURITY_VULNERABILITY`, suggested owner role to `SECURITY_REVIEWER`, severity to `HIGH`/`CRITICAL`, and priority to `P1`/`P0`.
2. **Functional Defect**: If `failureType == 'runtime_exception'`, assigned `FUNCTIONAL_BUG`, owner role `DEVELOPER`, and priority `P1`/`P2`.
3. **Performance Defect**: If `failureType == 'performance_degradation'`, category set to `PERFORMANCE`, priority `P2`.

*Note: Human approval remains authoritative. AI triage suggestions are stored separately and do not overwrite canonical issue attributes.*

---

## 3. Duplicate Detection

Duplicates are detected using normalized tokenization and Jaccard similarity across title, description, component, and issue type.

### Formula
$$\text{Similarity}(A, B) = \frac{|A \cap B|}{|A \cup B|} + \text{Bonus}(\text{Component}) + \text{Bonus}(\text{IssueType})$$

- Component match bonus: $+0.15$
- Issue type match bonus: $+0.10$
- Candidate Threshold: Configurable default $\ge 0.35$

Candidates are returned with a similarity score (0.0 – 1.0) and concise evidence explanations.

---

## 4. Related Issue Detection

Identifies related context without misclassifying issues as duplicates.

### Signals
1. **Explicit Dependencies**: `BLOCKS`, `DEPENDS_ON`, `RELATES_TO`, `DUPLICATES` relations assigned high relevance ($\ge 0.90$).
2. **Component Overlap**: Shared project components assign baseline relevance ($\ge 0.50$).
3. **Term Overlap**: Normalized Jaccard term similarity.

---

## 5. Risk Engine

The Risk Engine calculates a reproducible, explainable risk score (0 – 100).

### Formula
$$\text{Risk Score} = \min(100, W_{\text{severity}} + W_{\text{priority}} + W_{\text{security}} + W_{\text{dependency}} + W_{\text{release}} + W_{\text{verification}})$$

Where:
- $W_{\text{severity}}$: `CRITICAL` = 40, `HIGH` = 30, `MEDIUM` = 20, `LOW` = 10
- $W_{\text{priority}}$: `P0` = 25, `P1` = 20, `P2` = 15, `P3` = 10, `P4` = 5
- $W_{\text{security}}$: Security relevant = 20, else 0
- $W_{\text{dependency}}$: Has blocked dependencies = 15, else 0
- $W_{\text{release}}$: Associated with planned release = 10, else 0
- $W_{\text{verification}}$: Unverified/open state = 10, else 0

### Risk Levels
- `80 - 100`: `CRITICAL`
- `60 - 79`: `HIGH`
- `35 - 59`: `MEDIUM`
- `0 - 34`: `LOW`

---

## 6. Reproduction Capsule

Parses unstructured issue descriptions into structured reproduction parameters:
- `environment`: OS, platform, or runtime environment.
- `steps`: Sequential list of steps to reproduce.
- `expectedResult`: Expected behavior.
- `actualResult`: Observed failure behavior.
- `evidenceProvided`: Boolean flag indicating presence of logs, stack traces, or attachments.

---

## 7. Resolution Confidence

NEXUS explicitly distinguishes `RESOLVED` (developer marked complete) from `VERIFIED` (QA/security verified).

### Factors
- **Workflow Status**: `VERIFIED` (40 pts), `CLOSED` (35 pts), `RESOLVED` (25 pts), `TESTING` (15 pts), `REPORTED` (5 pts).
- **Reproduction Quality**: Clear steps & environment (+25 pts).
- **Evidence Attached**: Logs, stack traces, or attachments (+25 pts).
- **Discussion Context**: Discussion activity (+10 pts max).

An issue in state `RESOLVED` receives a maximum confidence level of `HIGH` or `MEDIUM` with `verificationState: "DEVELOPER_RESOLVED_UNVERIFIED"`, requiring formal QA/security transition to `VERIFIED` for 100% confidence.

---

## 8. Release Risk Radar

Aggregates issue risk across all bugs assigned to a target release:

$$\text{Release Risk Score} = \min\left(100, \frac{(25 \times N_{\text{crit/high}}) + (30 \times N_{\text{sec}}) + (20 \times N_{\text{blocked}}) + (15 \times N_{\text{unverified}})}{\max(1, N_{\text{total}} / 2)}\right)$$

Returns overall release risk score, risk level, and factor breakdown to prevent high-risk releases.

---

## 9. Provider Abstraction & Fallback Behavior

Cipher uses `analyzeIssueWithIntelligence()` in `backend/src/intelligence/provider.ts`:
- Reads `AI_PROVIDER` and `AI_MODEL` environment variables.
- On any AI provider timeout, rate limit, network error, or missing configuration, automatically engages `deterministic-fallback` without throwing errors or returning broken JSON.
