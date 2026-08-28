# NEXUS Architecture — Scarlet

## System shape

React/TypeScript UI → REST/WebSocket boundary → Node/Express modular backend → PostgreSQL → background event/job infrastructure → notification worker.

The backend is organized into modules so ownership is explicit:

- `issues` — Scarlet core tracked defects and lifecycle
- `projects` — workspace/configuration boundary
- `comments` — collaboration history
- `dependencies` — blocks/depends-on/related/duplicate relationships
- `attachments` — evidence metadata; Raven owns secure storage/serving policy
- `releases` — release/version boundary and issue association
- `intelligence` — Cipher
- `security`, `audit`, `notifications` — Raven

## Core entities

`users`, `projects`, `project_members`, `issues`, `issue_comments`, `issue_dependencies`, `attachments`, `issue_events`, `releases`.

Cipher later adds `ai_analysis` and related intelligence records; Raven adds security/audit/notification records.

## Workflow

`REPORTED → TRIAGED → ASSIGNED → IN_PROGRESS → CODE_REVIEW → TESTING → RESOLVED → VERIFIED → CLOSED`

The backend rejects skipped or backwards transitions with HTTP 409.

## Integration rules

1. Migrations are ordered and one responsibility each.
2. API field names remain stable.
3. Errors include `requestId`.
4. Core database writes use parameterized SQL.
5. No secrets are committed.
6. Scarlet defines the stable core contract before Cipher/Vixen integration.
7. Notification delivery must never be part of the issue-write transaction; the event pipeline is integrated separately.
