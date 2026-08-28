# NEXUS API Contract v1 — Scarlet

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
