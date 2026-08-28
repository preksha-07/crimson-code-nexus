# NEXUS — Scarlet Core Backend & Infrastructure

This repository contains the Scarlet-owned core foundation for the NEXUS platform. Scarlet establishes the system skeleton, database schema/migrations, canonical issue lifecycle, core domain REST APIs, dependency tracking, release metadata, and integration boundaries.

---

## 1. What Scarlet Owns

- **Core Architecture & Schema**: PostgreSQL database migrations defining `users`, `projects`, `project_members`, `issues`, `issue_comments`, `issue_dependencies`, `attachments`, `issue_events`, and `releases`.
- **Issue Lifecycle Workflow**: Canonical state transitions (`REPORTED` → `TRIAGED` → `ASSIGNED` → `IN_PROGRESS` → `CODE_REVIEW` → `TESTING` → `RESOLVED` → `VERIFIED` → `CLOSED`) enforced by transactional checks.
- **Domain REST APIs**: Endpoint handlers for Projects, Issues, Comments, Issue Dependencies, Attachment Metadata, and Release Management.
- **Attachment Boundary**: Storage of attachment evidence metadata (`objectKey`, `contentType`, `sizeBytes`) while leaving secure file stream validation and serving to Raven.
- **Integration Contracts**: Stable response shapes and structured error responses with `requestId`.
- **Seed & Testing Infrastructure**: Independent seed script for demo environment and unit/integration test suites.

---

## 2. How to Run PostgreSQL Locally

Ensure Docker Desktop is running, then launch the PostgreSQL 17 container:

```bash
docker compose up -d postgres
```

This starts PostgreSQL on port `5432` with database `nexus`, user `nexus`, and password `nexus`.

---

## 3. How to Configure Environment Variables

Navigate to the `backend/` directory and copy the example file:

```bash
cd backend
cp ../.env.example .env
```

Default variables in `.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://nexus:nexus@localhost:5432/nexus
CORS_ORIGIN=http://localhost:5173
```

---

## 4. How to Run Migrations

Execute the ordered SQL migrations in `backend/migrations/` using `tsx`:

```bash
npm run db:migrate
```

*Note: Migrations track execution in a `schema_migrations` table and apply cleanly in order.*

---

## 5. How to Seed Demo Data

Populate the database with sample users, projects, releases, issues, dependencies, and comments:

```bash
npm run db:seed
```

To reset the database cleanly and re-apply migrations and seed data:

```bash
npm run db:reset
npm run db:migrate
npm run db:seed
```

---

## 6. How to Run the Backend

Start the development server with live reload:

```bash
npm run dev
```

Or build and run the production output:

```bash
npm run build
npm start
```

Health check endpoint: `GET http://localhost:4000/health`

---

## 7. How to Run Tests

Run TypeScript check and Vitest test suite:

```bash
# Typecheck
npm run typecheck

# Unit & Integration Tests
npm test

# Smoke Test (requires backend running)
npm run smoke
```

---

## 8. API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server & DB connection health check |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a new project workspace |
| `GET` | `/api/projects/:id` | Get project by ID |
| `GET` | `/api/issues` | List issues (supports `projectId`, `status`, `assigneeId`, `limit`, `offset`) |
| `POST` | `/api/issues` | Create a new issue |
| `GET` | `/api/issues/:id` | Get issue by ID |
| `PATCH` | `/api/issues/:id` | Update issue attributes |
| `DELETE` | `/api/issues/:id` | Delete an issue |
| `PATCH` | `/api/issues/:id/status` | Perform workflow transition (`toStatus`, `actorId`, `reason`) |
| `GET` | `/api/issues/:issueId/comments` | List issue comments |
| `POST` | `/api/issues/:issueId/comments` | Add comment to issue |
| `GET` | `/api/issues/:issueId/dependencies` | List issue dependencies |
| `POST` | `/api/issues/:issueId/dependencies` | Create relationship between issues (`BLOCKS`, `DEPENDS_ON`, `RELATES_TO`, `DUPLICATES`) |
| `DELETE` | `/api/issues/:issueId/dependencies/:targetId/:relation` | Remove an issue dependency |
| `GET` | `/api/issues/:issueId/attachments` | List issue attachment metadata |
| `POST` | `/api/issues/:issueId/attachments` | Register attachment metadata |
| `GET` | `/api/releases` | List releases (optional `projectId` filter) |
| `POST` | `/api/releases` | Create a release |
| `GET` | `/api/releases/:id` | Get release by ID |

---

## 9. Integration Boundaries (Vixen, Cipher, Raven)

- **Vixen (Frontend / UX)**: Vixen owns the UI application. Vixen consumes Scarlet's stable REST API contracts and must not duplicate workflow state transition rules or status business logic.
- **Cipher (AI & Intelligence)**: Cipher consumes the canonical Issue and IssueEvent objects to perform automated analysis, root cause classification, and risk scoring.
- **Raven (Security & Access Control)**: Raven wraps Scarlet's core endpoints with authentication middleware, RBAC/ABAC authorization checks, audit logging, rate limiting, and secure attachment stream processing.
