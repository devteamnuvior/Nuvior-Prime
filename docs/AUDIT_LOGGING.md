# Audit logging

Append-only `AuditEvent` rows. Normal UI cannot edit/delete events.

## Fields

actorUserId · actorRoleSnapshot · action · resourceType · resourceId · accountId · beforeState · afterState · metadata · sessionId · timestamp

## Audited actions (Phase 6)

- `auth.login` / `auth.login_failed`
- `prospect.run`
- `mapping.confirm` / `mapping.reject`
- `visit.create`
- `ai.structure_visit_notes`
- `account.assign`
- `user.create` / `user.update`

## Rules

- No passwords, tokens, or API keys in metadata
- Prefer compact before/after snapshots
- Admin audit viewer is read-only (`/admin/audit`)

## Immutability

Application code only **creates** audit rows. Retention cleanup is a future explicit admin process (not Phase 6).
