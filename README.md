# NEXUS

## Evidence-Driven, Security-First Bug Intelligence Platform

NEXUS is an engineering intelligence and bug-tracking platform that combines robust issue tracking, AI-assisted bug intelligence, dependency graph analysis, release-risk assessment, and comprehensive security controls into a unified system.

> **Architecture & Domain Note**: NEXUS reconstructs and hardens workflows historically managed by systems like [Bugzilla](https://github.com/bugzilla/bugzilla). It is not a direct copy or database dump; its domain models, test suites, and security scenarios are designed around historical bug tracker vulnerability patterns and modernized workflows.

---

## Live Deployments

* **Frontend Web Application (Vixen)**: [https://nexus-ix91.onrender.com/](https://nexus-ix91.onrender.com/)
* **Backend REST API (Scarlet/Raven)**: [https://crimson-code-nexus-1.onrender.com/](https://crimson-code-nexus-1.onrender.com/)
* **Database**: Managed PostgreSQL 17 on Render

---

## Key Features

* **9-Stage Issue Lifecycle**: `REPORTED` $\rightarrow$ `TRIAGED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `CODE_REVIEW` $\rightarrow$ `TESTING` $\rightarrow$ `RESOLVED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`.
* **Dependencies & Causal Graph**: Directed relationships (`BLOCKS`, `DEPENDS_ON`, `RELATES_TO`, `DUPLICATES`) with graph visualization.
* **AI Bug Intelligence (Cipher)**: Bug DNA semantic fingerprinting, AI triage classification, duplicate detection, and release risk radar.
* **Security-First Governance (Raven)**: Secret Sentinel heuristic scanner, 5-tier RBAC, project-level BOLA/IDOR isolation, and immutable audit logs.
* **Project & Release Management**: Multi-project scoping, target milestone releases, and delivery tracking.

---

## Authentication & RBAC

| Role | Access Summary |
|---|---|
| **`ADMIN`** | Full platform control, project creation, user management |
| **`PROJECT_MANAGER`** | Workspace administration, release planning, member invitations |
| **`DEVELOPER`** | Issue creation, status transitions, comments, assignments |
| **`SECURITY_REVIEWER`** | Security issue triage, audit log inspection, Secret Sentinel review |
| **`VIEWER`** | Read-only inspection of public issues, projects, and dashboards |

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

## Architecture & Database

* **Frontend**: React 18, Vite 6, TypeScript, Cyber-dark UI design tokens.
* **Backend**: Node.js (NodeNext ESM), Express 5, TypeScript.
* **Database**: PostgreSQL 17 with 9 ordered SQL schema migrations (`schema_migrations` tracking).
* **Startup Initialization**: On backend boot (`npm start`), migrations and idempotent seeding (`ON CONFLICT DO NOTHING`) run automatically before HTTP traffic is served.

---

## Security Highlights

* **Session & CSRF**: 256-bit cryptographically signed HttpOnly session cookies + double-submit `nexus_csrf` token validation.
* **Rate Limiting**: Sliding token-bucket limiter (5 requests/min per IP on login).
* **Secret Sentinel**: Real-time heuristic detection of leaked API keys, tokens, AWS keys, and private keys.
* **Injection & XSS Defenses**: Positional parameterized SQL queries (`$1`, `$2`), strict Zod schema validation, HTML entity escaping, and CSP headers.
* **Safe Error Handling**: Diagnostic logging on server; sanitized responses to clients.

---

## Testing Status

* **Frontend Tests**: 6 test files, 20 passed (`npm test` in root)
* **Backend Tests**: 15 test files, 100 passed (`npm test` in `nexus-scarlet/backend`)
* **E2E Security Pipeline**: 11-step Raven E2E security smoke test passed (`npm run test:e2e`)
* **TypeScript & Builds**: Clean compilation with 0 errors (`npm run typecheck`, `npm run build`)

---

## Local Quickstart

```bash
# 1. Start Local PostgreSQL
cd nexus-scarlet/backend
docker compose up -d postgres

# 2. Run Migrations & Seed Data
npm run db:migrate
npm run db:seed

# 3. Start Backend (Port 4000)
npm run dev

# 4. Start Frontend (Port 3000, in separate terminal from root)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Scope | Local Default | Production Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | `postgres://nexus:nexus@localhost:5432/nexus` | Render connection string |
| `PORT` | Backend | `4000` | Render `$PORT` |
| `NODE_ENV` | Backend | `development` | `production` |
| `CORS_ORIGIN` | Backend | `http://localhost:3000,http://localhost:5173` | `https://nexus-ix91.onrender.com` |
| `VITE_API_BASE_URL` | Frontend | `/api` | `https://crimson-code-nexus-1.onrender.com/api` |

---

## Disclaimer

Seeded accounts and passwords are for **demonstration and testing purposes only**. Production deployments require verified registration, multi-factor authentication, and secure credential management.