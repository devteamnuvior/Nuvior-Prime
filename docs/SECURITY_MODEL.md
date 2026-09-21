# Security model

## Guarantees (Phase 6)

- Anonymous users redirected from app routes (middleware JWT check)
- Sensitive mutations require authenticated ACTIVE user + permission + territory
- Direct object references resolved server-side (account/place → province) before AI/visit/mapping
- DNC cannot be overridden by any role
- Audit trail for sensitive writes
- Passwords stored only as bcrypt hashes for local credentials

## Field visibility

Rep CRM overlay omits raw payloads / diagnostics. Manager/admin see more operational detail. See `filterCrmFieldsForVisibility`.

## Hardening basics

- Auth.js secure cookies in production when `AUTH_SECRET` set
- Server-only secrets via env
- No auth tokens rendered into client HTML beyond session cookie
- Mutations via server actions (POST), not anonymous GET

## Known limitations (deferred)

- No enterprise SSO / MFA
- No full CSRF custom layer beyond framework defaults
- No production WAF / network isolation
- No drive-time / CRM vendor / deploy hardening
- Local seed passwords are shared fixtures — rotate for any shared environment
- Audit retention / export not implemented

## Unresolved

U10 enterprise IdP · U11 email domain policy · U12 SSO group→role mapping
