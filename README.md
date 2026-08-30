# NEXUS

## Evidence-Driven, Security-First Bug Intelligence Platform

NEXUS is an engineering intelligence and bug-tracking platform that combines robust issue tracking, AI-assisted bug intelligence, dependency graph analysis, release-risk assessment, and comprehensive security controls into a unified system.

> **Note on Architecture & Domain**: NEXUS reconstructs and hardens workflows historically managed by systems like [Bugzilla](https://github.com/bugzilla/bugzilla). It is **not** a direct copy or database import of Bugzilla; rather, its domain models, test suites, and security scenarios are designed around historical bug tracker vulnerability patterns and modernized engineering workflows.

---

## Deployed Demo Services

The NEXUS platform is live and deployed in a multi-service production architecture:

* **Frontend Web Application (Vixen)**: [https://nexus-ix91.onrender.com/](https://nexus-ix91.onrender.com/)
* **Backend REST API (Scarlet/Raven)**: [https://crimson-code-nexus-1.onrender.com/](https://crimson-code-nexus-1.onrender.com/)
* **Database**: Managed PostgreSQL 17 on Render

*(These deployed instances are provided for demonstration and portfolio review.)*

---

## Key Features

1. **Structured Issue & Bug Tracking**:
   - Full 9-stage canonical lifecycle workflow: `REPORTED` $\rightarrow$ `TRIAGED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `CODE_REVIEW` $\rightarrow$ `TESTING` $\rightarrow$ `RESOLVED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`.
   - Priority levels (`P0` to `P4`), severity classes (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and issue types (`BUG`, `TASK`, `IMPROVEMENT`, `SECURITY`).
2. **Project & Release Management**:
   - Multi-project isolation (`projects`, `project_members`).
   - Target milestone releases (`releases`) with target delivery dates and status tracking.
3. **Issue Dependencies & Causal Bug Graph**:
   - Directed relationship edges: `BLOCKS`, `DEPENDS_ON`, `RELATES_TO`, `DUPLICATES`.
   - Graph visualization and dependency traversal for identifying root-cause bottlenecks.
4. **Activity History, Comments & Immutable Audit Trail**:
   - Threaded issue discussions (`issue_comments`).
   - Complete status change history (`issue_events`).
   - Immutable security and administrative audit spine (`audit_events`).
5. **AI Bug Intelligence Suite (Cipher)**:
   - **Bug DNA**: Structured semantic fingerprints for reported defects.
   - **AI Triage**: Automated classification, component tagging, and severity suggestions.
   - **Duplicate & Related Issue Detection**: Heuristic and semantic similarity analysis.
   - **Reproduction Capsule**: Structured reproduction step tracking and environment isolation.
   - **Release Risk Radar**: Aggregated risk assessment across active milestone releases.
   - **Resolution Confidence**: Evidence-backed verification scoring before closure.
6. **Security & Governance (Raven)**:
   - **Secret Sentinel**: Real-time heuristic detection of leaked API keys, tokens, AWS credentials, and private keys.
   - **Role-Based Access Control (RBAC)**: Strict permission boundaries for 5 discrete roles.
   - **Broken Object-Level Authorization (BOLA/IDOR) Defense**: Project-level access isolation.
   - **Cryptographic Session Management & Double-Submit CSRF Protection**.
   - **Token-Bucket Rate Limiting** on sensitive authentication endpoints.

---

## System Architecture

```text
                               ┌─────────────────────────────────────────┐
                               │           NEXUS Frontend (Vixen)        │
                               │        React 18 / Vite 6 / TypeScript   │
                               │        https://nexus-ix91.onrender.com  │
                               └────────────────────┬────────────────────┘
                                                    │
                                  HTTPS / REST API  │  Credentials: include
                                  X-CSRF-Token      │  nexus_session Cookie
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │          NEXUS Backend (Scarlet)        │
                               │          Node.js / Express / ESM        │
                               │    https://crimson-code-nexus-1...      │
                               └──────┬─────────────┬─────────────┬──────┘
                                      │             │             │
                               ┌──────┴──────┐┌─────┴──────┐┌─────┴──────┐
                               │   SCARLET   ││   CIPHER   ││   RAVEN    │
                               │ Core Domain ││ AI Engine  ││  Security  │
                               │  Workflow   ││Intelligence││ RBAC/Audit │
                               └──────┬──────┘└─────┬──────┘└─────┬──────┘
                                      │             │             │
                                      └─────────────┼─────────────┘
                                                    │  pg pool (Parameterized SQL)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           PostgreSQL 17 Database        │
                               │       Managed Render / Local Docker     │
                               └─────────────────────────────────────────┘
```

### Local vs. Production Architecture

* **Local Development**:
  - Frontend runs on Vite dev server (`http://localhost:3000`), using the Vite proxy to route `/api/*` to `http://localhost:4000`.
  - Backend runs on Express (`http://localhost:4000`) binding to `0.0.0.0`.
  - Cookies use `SameSite=Lax` without the `Secure` flag on local HTTP.
  - PostgreSQL runs locally via Docker or local service (`postgres://nexus:nexus@localhost:5432/nexus`).
* **Production Deployment**:
  - Frontend is hosted on Render as a static web application (`https://nexus-ix91.onrender.com/`).
  - Backend is deployed on Render as a web service (`https://crimson-code-nexus-1.onrender.com/`).
  - Cross-origin communication uses `SameSite=None; Secure;` cookies and dynamic `CORS_ORIGIN` headers.
  - Backend communicates directly with a managed Render PostgreSQL database instance via `DATABASE_URL`.

---

## Authentication & RBAC

NEXUS implements a 5-tier Role-Based Access Control matrix:

| Role | Permissions & Capabilities |
|---|---|
| **`ADMIN`** | Full platform control, project creation, user management, global configuration |
| **`PROJECT_MANAGER`** | Project workspace administration, release planning, member invitations |
| **`DEVELOPER`** | Issue creation, status transitions, code review, comment discussions, assignment |
| **`SECURITY_REVIEWER`** | Security issue triage, audit log inspection, Secret Sentinel review |
| **`VIEWER`** | Read-only inspection of public issues, projects, and release dashboards |

### Demo Accounts

The demo database is pre-seeded with the following privileged accounts (all use password `Password123!`):

| Display Name | Email / Username | Role |
|---|---|---|
| Aarav Sharma | `aarav@nexus.local` | `ADMIN` |
| Mira Patel | `mira@nexus.local` | `PROJECT_MANAGER` |
| Dev Kumar | `dev@nexus.local` | `DEVELOPER` |
| Riya Sen | `riya@nexus.local` | `SECURITY_REVIEWER` |

### Demo Auto-Provisioning Behavior

- **Role Preservation:** The four pre-seeded accounts (`aarav@nexus.local`, `mira@nexus.local`, `dev@nexus.local`, `riya@nexus.local`) strictly retain their predefined roles.
- **Auto-Creation of Unknown Accounts:** For demo convenience, logging in with any previously unknown email or username automatically provisions a new account with the `VIEWER` role and enrolls it into the primary workspace (`proj_01`).
- **Example Guest Account:** A user such as `guest@example.com` can log in using the demo password `Password123!` and will be automatically created as a `VIEWER`.
- **Privilege Escalation Protection:** Client requests cannot specify or elevate roles. Unknown accounts are strictly created as `VIEWER`. Existing privileged accounts cannot be downgraded through this flow.

> **Note:** Auto-provisioning is designed specifically for demo/evaluation environments and is not intended as a production self-registration mechanism.

---

## Database Architecture

The backend utilizes PostgreSQL 17 with 9 ordered SQL schema migrations:

1. `001_foundation.sql`: Defines `users`, `projects`, and `project_members`.
2. `002_issues_workflow.sql`: Defines `issues` with lifecycle status constraints and indexes.
3. `003_collaboration_dependencies.sql`: Defines `issue_comments`, `issue_dependencies`, `attachments`, and `issue_events`.
4. `004_releases.sql`: Defines `releases` and links `release_id` to issues.
5. `005_updated_at.sql`: Adds automatic timestamp update triggers.
6. `006_intelligence.sql`: Defines AI analysis tables and metadata schemas.
7. `007_auth.sql`: Adds `password_hash` column to `users` and creates `sessions` table.
8. `008_audit_spine.sql`: Creates `audit_events` immutable security ledger.
9. `009_notifications.sql`: Creates `notifications_queue` table.

### Startup Initialization & Idempotent Seeding

When the backend starts (`npm start`), [`src/db/init.ts`](file:///C:/Users/Admin/crimson-code-nexus/nexus-scarlet/backend/src/db/init.ts) runs automatically before opening HTTP listeners:
1. Verifies and applies any unapplied `.sql` migrations tracked in `schema_migrations`.
2. Idempotently seeds baseline users, projects, releases, and the 25 demo issues using `ON CONFLICT (id) DO NOTHING` clauses.
3. If database initialization fails, the process terminates immediately (`process.exit(1)`) to ensure Render marks uninitialized deployments as unhealthy.

---

## Demo Dataset (25 Representative Issues)

The demo environment contains 25 representative issues (`BUG-091` through `BUG-221`) covering diverse security, infrastructure, and engineering workflows:

| ID | Title | Status | Severity | Priority | Type | Component | Release |
|---|---|---|---|---|---|---|---|
| `BUG-091` | Unicode identity mismatch | `RESOLVED` | `HIGH` | `P1` | `BUG` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-117` | Dependency graph exposes private summary | `TRIAGED` | `CRITICAL` | `P0` | `SECURITY` | `dependency-graph` | 2.4.0 (`rel_01`) |
| `BUG-142` | Unicode authentication failure | `TRIAGED` | `HIGH` | `P1` | `BUG` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-155` | CSV export content type is unsafe | `ASSIGNED` | `HIGH` | `P1` | `SECURITY` | `exports` | 2.4.0 (`rel_01`) |
| `BUG-201` | Attachment upload accepts unexpected content | `REPORTED` | `MEDIUM` | `P2` | `BUG` | `attachments` | 2.5.0 (`rel_02`) |
| `BUG-202` | Rate limiting evasion via forwarded header spoofing | `IN_PROGRESS` | `CRITICAL` | `P0` | `SECURITY` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-203` | Audit spine failsafe fallback during DB partition | `CODE_REVIEW` | `HIGH` | `P1` | `IMPROVEMENT` | `audit-spine` | 2.4.0 (`rel_01`) |
| `BUG-204` | Secret sentinel false positives on example RSA keys | `TESTING` | `LOW` | `P3` | `BUG` | `secrets-scanner` | 2.5.0 (`rel_02`) |
| `BUG-205` | Strict Content-Security-Policy headers for Web UI | `VERIFIED` | `MEDIUM` | `P2` | `SECURITY` | `ui-core` | 2.4.0 (`rel_01`) |
| `BUG-206` | Session cookie invalidation on password change | `CLOSED` | `HIGH` | `P1` | `TASK` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-207` | Asynchronous notification webhook retry pipeline | `IN_PROGRESS` | `MEDIUM` | `P2` | `IMPROVEMENT` | `notifications` | 2.5.0 (`rel_02`) |
| `BUG-208` | RBAC matrix check for project member invitations | `TRIAGED` | `HIGH` | `P1` | `SECURITY` | `rbac-engine` | 2.4.0 (`rel_01`) |
| `BUG-209` | Database connection pool exhaustion under spike loads | `ASSIGNED` | `CRITICAL` | `P0` | `BUG` | `database` | 2.5.0 (`rel_02`) |
| `BUG-210` | Intelligence provider schema parsing on empty payload | `REPORTED` | `LOW` | `P4` | `BUG` | `intelligence` | 2.5.0 (`rel_02`) |
| `BUG-211` | Sanitize SVG image uploads to prevent stored XSS | `IN_PROGRESS` | `CRITICAL` | `P0` | `SECURITY` | `attachments` | 2.4.0 (`rel_01`) |
| `BUG-212` | Dark mode contrast ratios in issue graph | `RESOLVED` | `LOW` | `P3` | `IMPROVEMENT` | `ui-core` | 2.4.0 (`rel_01`) |
| `BUG-213` | Batch issue status transitions in control room | `CODE_REVIEW` | `MEDIUM` | `P2` | `TASK` | `ui-core` | 2.5.0 (`rel_02`) |
| `BUG-214` | CSRF double-submit token mismatch on multi-tab | `VERIFIED` | `HIGH` | `P1` | `BUG` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-215` | Exported JSON schema validation for compliance | `TESTING` | `LOW` | `P3` | `IMPROVEMENT` | `exports` | 2.5.0 (`rel_02`) |
| `BUG-216` | Circular dependency detection in issue relationship graph | `CLOSED` | `MEDIUM` | `P2` | `BUG` | `dependency-graph` | 2.4.0 (`rel_01`) |
| `BUG-217` | Audit event log retention and archiving policy | `REPORTED` | `MEDIUM` | `P3` | `TASK` | `audit-spine` | 2.5.0 (`rel_02`) |
| `BUG-218` | Sanitize error stack traces in production responses | `VERIFIED` | `HIGH` | `P1` | `SECURITY` | `authentication` | 2.4.0 (`rel_01`) |
| `BUG-219` | Optimize issue list index for multi-facet filtering | `RESOLVED` | `MEDIUM` | `P2` | `IMPROVEMENT` | `database` | 2.4.0 (`rel_01`) |
| `BUG-220` | Object-level auth check on attachment downloads | `ASSIGNED` | `HIGH` | `P1` | `SECURITY` | `attachments` | 2.5.0 (`rel_02`) |
| `BUG-221` | Automated vulnerability classification suggestions | `REPORTED` | `LOW` | `P3` | `TASK` | `intelligence` | 2.5.0 (`rel_02`) |

---

## Security Implementation Details

* **Session Security**: 256-bit cryptographically random session tokens stored in `sessions` table, transmitted via HttpOnly cookies with 24-hour expiration.
* **Double-Submit CSRF**: Server issues a separate `nexus_csrf` cookie and validates the `X-CSRF-Token` header on all non-idempotent HTTP methods (`POST`, `PATCH`, `PUT`, `DELETE`).
* **Rate Limiting**: Sliding token-bucket rate limiter (`loginRateLimiter`) on authentication routes restricting brute-force attacks to 5 requests/minute per client IP.
* **Secret Sentinel**: Client-side and server-side heuristic scanners detecting AWS Access Keys (`AKIA...`), generic API tokens, Bearer tokens, private keys (`-----BEGIN RSA PRIVATE KEY-----`), and password assignment strings.
* **SQL Injection Protections**: Positional parameterized queries (`$1`, `$2`, ...) utilized across all database access; dynamic string interpolation is disallowed.
* **XSS Defense & Sanitization**: HTML entity escaping on output rendering, input validation via Zod schemas, and Content Security Policy headers.
* **Safe Error Handling**: Server errors log full diagnostic stack traces server-side while returning clean, sanitized `500 INTERNAL_ERROR` responses to clients with unique `requestId` tracking.

---

## Testing & Verification Status

The entire platform is backed by comprehensive automated test suites:

* **Frontend Unit & Security Tests**: **6 test files, 20 passed** (`npm test` in root)
* **Backend Unit & Integration Tests**: **15 test files, 100 passed** (`npm test` in `nexus-scarlet/backend`)
* **Backend E2E Security Pipeline**: **1 test file, 1 passed** (`npm run test:e2e` executing the 11-step Raven security smoke pipeline)
* **TypeScript Strict Typechecks**: **0 errors** across frontend and backend (`npm run typecheck`)
* **Production Builds**: **0 errors** (`npm run build`)

---

## Local Development Setup

### Prerequisites

* Node.js $\ge$ 20.x
* Docker Desktop (for PostgreSQL container)

### 1. Start Local PostgreSQL

```bash
cd nexus-scarlet/backend
docker compose up -d postgres
```

*(Default local connection string: `postgres://nexus:nexus@localhost:5432/nexus`)*

### 2. Configure Environment Variables

**Backend (`nexus-scarlet/backend/.env`):**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://nexus:nexus@localhost:5432/nexus
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

**Frontend (`.env` in root):**
```env
VITE_API_BASE_URL=/api
```

### 3. Run Migrations & Seed Data

```bash
cd nexus-scarlet/backend
npm run db:migrate
npm run db:seed
```

### 4. Start the Application

**Start Backend (Port 4000):**
```bash
cd nexus-scarlet/backend
npm run dev
```

**Start Frontend (Port 3000):**
```bash
# In project root
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables Reference

| Variable | Scope | Default / Local | Production Example | Description |
|---|---|---|---|---|
| `DATABASE_URL` | Backend | `postgres://nexus:nexus@localhost:5432/nexus` | `postgres://user:pass@host/db` | PostgreSQL connection string |
| `PORT` | Backend | `4000` | Render assigned `$PORT` | Server listening port |
| `NODE_ENV` | Backend | `development` | `production` | Environment mode (controls cookie security flags) |
| `CORS_ORIGIN` | Backend | `http://localhost:3000,http://localhost:5173` | `https://nexus-ix91.onrender.com` | Allowed CORS origins (comma-separated) |
| `VITE_API_BASE_URL` | Frontend | `/api` | `https://crimson-code-nexus-1.onrender.com/api` | Backend API base URL |

---

## Project Structure

```text
crimson-code-nexus/
├── src/                               # Frontend Web Application (Vixen)
│   ├── app/                           # Layout, Routing (App.tsx, routes.tsx)
│   ├── components/                    # Dashboard widgets, Security timeline
│   ├── features/                      # Intelligence, Bug DNA, Secret Sentinel
│   ├── lib/api/                       # API clients (client.ts, issues.ts, auth)
│   ├── pages/                         # Control Room, Issues, Workspace, Security
│   └── styles/                        # Cyber-dark theme & CSS design tokens
├── tests/                             # Frontend Vitest test suites
├── vite.config.ts                     # Vite build, proxy & preview configuration
├── nexus-scarlet/
│   ├── docs/                          # Threat models & CVE control matrices
│   └── backend/                       # Backend Application (Scarlet / Raven)
│       ├── migrations/                # 9 PostgreSQL schema migration files
│       ├── src/
│       │   ├── attachments/           # Attachment metadata routes
│       │   ├── audit/                 # Audit spine logging service
│       │   ├── comments/              # Issue discussion routes
│       │   ├── config/                # Environment & configuration loader
│       │   ├── core/                  # Workflow state machine logic
│       │   ├── db/                    # Pool, Migrator, Seeder, Initializer
│       │   ├── dependencies/          # Issue graph & relationship routes
│       │   ├── intelligence/          # Cipher AI analysis & risk services
│       │   ├── issues/                # Issue CRUD & status transition handlers
│       │   ├── notifications/         # Notification queue & dispatch workers
│       │   ├── projects/              # Project workspace routes
│       │   ├── releases/              # Release milestone routes
│       │   ├── security/              # Auth, CSRF, Rate limiter, RBAC, Hasher
│       │   ├── server.ts              # Express HTTP server entrypoint
│       │   └── shared/                # HTTP error handlers & middleware
│       └── tests/                     # 15 backend unit, security & E2E suites
```

---

## Demo Walkthrough Guide

1. **Access the Web App**: Open [https://nexus-ix91.onrender.com/](https://nexus-ix91.onrender.com/).
2. **Authenticate as Developer**:
   - Username: `dev@nexus.local` / Password: `Password123!`
   - Inspect the **Control Room** showing issue metrics, active milestones, and status distribution.
3. **Explore Issue Workspace**:
   - Click on `BUG-117` (Dependency graph exposes private summary).
   - View the **Causal Bug Graph**, relationship links (`BLOCKS BUG-142`), activity timeline, and comments.
4. **Test Role-Based Access Control**:
   - Log out and log in with a VIEWER account (e.g. `guest@example.com` / `Password123!`).
   - Notice state mutation buttons and administrative actions are restricted.
5. **Test Auto-Provisioning**:
   - Log in with any new name (e.g. `evaluator@nexus.local` / `Password123!`).
   - Observe automatic enrollment as a `VIEWER` with read permissions across the core project.
6. **Inspect Security Telemetry**:
   - Log in as `riya@nexus.local` (`SECURITY_REVIEWER`) and navigate to the **Security** tab.
   - Review live audit logs, active rate limiter status, and Secret Sentinel heuristic findings.

---

## Disclaimer

The seeded accounts and passwords provided in this repository are for **demonstration and testing purposes only**. In a production deployment outside of this evaluation sandbox, user registration should require verified email workflows, multi-factor authentication, enterprise Single Sign-On (SSO), and individualized strong credential requirements.