# NEXUS API Contract v1 — Scarlet & Cipher

Base URL: `/api`

All timestamps are ISO-8601 UTC. Error responses contain `error.code`, `error.message`, `error.details`, and `error.requestId`.

## Health

`GET /health`

## Projects

`GET /api/projects`

`POST /api/projects`

```json
{"name":"NEXUS Core","key":"NEX","description":"Core workspace"}
```

`GET /api/projects/:id`

## Issues

`GET /api/issues?projectId=proj_01&status=TRIAGED&limit=25&offset=0`

`POST /api/issues`

```json
{
  "projectId":"proj_01",
  "title":"Unicode authentication failure",
  "description":"Valid Unicode identity cannot authenticate.",
  "severity":"HIGH",
  "priority":"P1",
  "issueType":"BUG",
  "component":"authentication",
  "version":"2.4.0",
  "reporterId":"usr_01",
  "assigneeId":"usr_03",
  "releaseId":"rel_01"
}
```

Response `201` returns the shared Issue object:

```json
{
  "id":"BUG-142",
  "projectId":"proj_01",
  "title":"Unicode authentication failure",
  "description":"...",
  "status":"TRIAGED",
  "severity":"HIGH",
  "priority":"P1",
  "issueType":"BUG",
  "component":"authentication",
  "version":"2.4.0",
  "reporterId":"usr_01",
  "assigneeId":"usr_08",
  "releaseId":"rel_01",
  "createdAt":"ISO-8601",
  "updatedAt":"ISO-8601"
}
```

`GET /api/issues/:id`

`PATCH /api/issues/:id`

`DELETE /api/issues/:id` → `204`

`PATCH /api/issues/:id/status`

```json
{"toStatus":"TRIAGED","actorId":"usr_02","reason":"Initial triage"}
```

### Workflow transition contract

`REPORTED → TRIAGED → ASSIGNED → IN_PROGRESS → CODE_REVIEW → TESTING → RESOLVED → VERIFIED → CLOSED`

Invalid transitions return `409`.

## Comments

`GET /api/issues/:issueId/comments`

`POST /api/issues/:issueId/comments`

```json
{"authorId":"usr_03","body":"Reproduced the issue."}
```

## Dependencies

`GET /api/issues/:issueId/dependencies`

`POST /api/issues/:issueId/dependencies`

```json
{"dependsOnIssueId":"BUG-091","relation":"RELATES_TO"}
```

Relations: `BLOCKS`, `DEPENDS_ON`, `RELATES_TO`, `DUPLICATES`.

`DELETE /api/issues/:issueId/dependencies/:targetId/:relation` -> `204`

## Attachment metadata

`GET /api/issues/:issueId/attachments`

`POST /api/issues/:issueId/attachments`

The Scarlet implementation stores metadata/object references. Raven owns secure upload validation, authorization, content disposition, and non-executable serving behavior.

## Releases

`GET /api/releases?projectId=proj_01`

`POST /api/releases`

```json
{"projectId":"proj_01","version":"2.6.0","name":"Release Candidate","status":"PLANNED","targetDate":"2026-11-15"}
```

`GET /api/releases/:id`

## Cipher Intelligence API Boundary

### 1. Trigger AI / Deterministic Analysis
`POST /api/issues/:id/analyze`

### 2. Get Intelligence Summary
`GET /api/issues/:id/intelligence`

Response `200`:
```json
{
  "data": {
    "issueId": "BUG-142",
    "provider": "deterministic-fallback",
    "model": "v1-deterministic",
    "bugDna": {
      "component": "authentication",
      "failureType": "identity_mismatch",
      "inputType": "unicode",
      "impact": "authentication_failure",
      "securityRelevant": true,
      "environment": "web_runtime"
    },
    "triage": {
      "category": "SECURITY_VULNERABILITY",
      "suggestedSeverity": "HIGH",
      "suggestedPriority": "P1",
      "suggestedOwnerRole": "SECURITY_REVIEWER",
      "riskFactor": 85,
      "reasoning": "Deterministic classification based on failure type 'identity_mismatch'...",
      "confidence": 0.9
    },
    "reproductionCapsule": {
      "environment": "Windows OS",
      "steps": ["Submit payload", "Observe system response"],
      "expectedResult": "Successful authentication",
      "actualResult": "Unicode authentication failure",
      "evidenceProvided": true
    },
    "resolutionConfidence": {
      "confidenceScore": 55,
      "confidenceLevel": "MEDIUM",
      "factors": {
        "statusWeight": 25,
        "reproductionWeight": 25,
        "verificationState": "DEVELOPER_RESOLVED_UNVERIFIED",
        "evidenceWeight": 5
      },
      "explanation": "Issue status is RESOLVED, but resolution confidence is rated MEDIUM (55/100) pending formal verification."
    },
    "risk": {
      "overallScore": 85,
      "riskLevel": "CRITICAL",
      "factors": {
        "severityWeight": 30,
        "priorityWeight": 20,
        "securityWeight": 20,
        "dependencyWeight": 0,
        "releaseWeight": 10,
        "verificationWeight": 5
      },
      "explanation": "Risk score 85/100 computed from Severity (30), Priority (20)..."
    },
    "analyzedAt": "2026-08-28T17:00:00.000Z"
  }
}
```

### 3. Duplicate Candidates
`GET /api/issues/:id/duplicates`

Response `200`:
```json
{
  "data": [
    {
      "issueId": "BUG-091",
      "similarityScore": 0.65,
      "title": "Unicode identity mismatch",
      "status": "RESOLVED",
      "reason": "High term overlap (65% similarity) and identical component"
    }
  ]
}
```

### 4. Related Issues
`GET /api/issues/:id/related`

Response `200`:
```json
{
  "data": [
    {
      "issueId": "BUG-117",
      "relevanceScore": 0.9,
      "relationshipSignal": "EXPLICIT_DEPENDENCY_BLOCKS",
      "reason": "Explicit BLOCKS dependency relationship established",
      "title": "Dependency graph exposes private summary",
      "status": "TRIAGED"
    }
  ]
}
```

### 5. Reproduction Capsule
`GET /api/issues/:id/reproduction-capsule`

### 6. Resolution Confidence
`GET /api/issues/:id/resolution-confidence`

### 7. Release Risk Radar
`GET /api/releases/:id/risk`

Response `200`:
```json
{
  "data": {
    "releaseId": "rel_01",
    "overallReleaseRiskScore": 80,
    "riskLevel": "CRITICAL",
    "totalIssues": 4,
    "criticalHighCount": 3,
    "securityIssueCount": 2,
    "blockedDependencyCount": 2,
    "unverifiedResolvedCount": 1,
    "factors": {
      "criticalHighWeight": 75,
      "securityWeight": 60,
      "blockedDependencyWeight": 40,
      "unverifiedResolvedWeight": 15
    },
    "explanation": "Release risk score 80/100 based on 3 Critical/High issues..."
  }
}
```

## HTTP standards

- `200` successful read/update
- `201` created
- `204` successful no-content
- `400` invalid request
- `401` unauthenticated (Raven integration)
- `403` authenticated but forbidden (Raven integration)
- `404` not found
- `409` workflow/state conflict
- `422` semantic/schema validation failure
- `429` rate limited (Raven integration)
- `500` unexpected server failure with `requestId`
