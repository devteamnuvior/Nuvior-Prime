# Authentication

**Phase:** 6  
**Library:** Auth.js (NextAuth v5) with credentials provider for local development.

## Architecture

```
Browser → middleware (JWT) → App Router
                ↓
         Auth.js session (JWT)
                ↓
         requireSessionUser() → AuthUser
                ↓
         requirePermission / requireProvinceAccess / requireAccountAccess
```

Enterprise OIDC is not wired yet (U10–U12). The same `User` model stores `externalSubjectId` for a future provider.

## Local development login

1. `npm run db:setup`
2. `npm run dev`
3. Open http://localhost:3000/login

| Email | Role | Provinces | Password |
|---|---|---|---|
| `on.rep@nuvior.local` | REP | ON | `DevPass123!` |
| `ab.rep@nuvior.local` | REP | AB | `DevPass123!` |
| `on.manager@nuvior.local` | MANAGER | ON | `DevPass123!` |
| `admin@nuvior.local` | ADMIN | `*` | `DevPass123!` |

Passwords are bcrypt-hashed in DB. Never log passwords/tokens.

## Environment

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | JWT signing secret (required) |
| `AUTH_URL` | App origin for Auth.js |
| `AUTH_PROVIDER` | `local` today; reserved for `oidc` |

## Session failure

Expired/missing session → middleware redirects to `/login`. Server actions throw `UNAUTHENTICATED` — no anonymous privileged writes.
