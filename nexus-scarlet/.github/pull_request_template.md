## Scarlet — Core Issue Workflow

### Purpose
Implements the core backend contract owned by Scarlet: schema, issue lifecycle, project/workflow APIs, seed data and integration documentation.

### Files changed
- backend/src/**
- backend/migrations/**
- backend/tests/**
- docs/api.md
- docs/architecture.md

### API/schema changes
See `docs/api.md`.

### Tests
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run smoke`

### Environment variables
- `DATABASE_URL`
- `PORT`
- `CORS_ORIGIN`

### Security impact
Raven must add authentication/RBAC/CSRF/authorization around the endpoints. No provider-specific or secret values are committed.

### Integration impact
Cipher consumes Issue object v1. Vixen consumes documented response shapes.
