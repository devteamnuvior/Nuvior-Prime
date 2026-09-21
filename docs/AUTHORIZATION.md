# Authorization

Centralized RBAC + territory. UI hiding is not authorization.

## Roles → permissions

See `src/domain/auth/permissions.ts`.

| Permission | REP | MANAGER | ADMIN |
|---|---|---|---|
| prospect.run / view | ✓ | ✓ | ✓ |
| brief.generate / view | ✓ | ✓ | ✓ |
| visit.create / view.own | ✓ | ✓ | ✓ |
| visit.view.team | | ✓ | ✓ |
| mapping.review / confirm | | ✓ | ✓ |
| verification.review | ✓ | ✓ | ✓ |
| account.assign | | ✓ | ✓ |
| user.manage | | | ✓ |
| audit.view | | | ✓ |
| admin.settings | | | ✓ |

## Territory

- `User.provinces` — e.g. `["ON"]` or `["*"]` for national admin
- `canAccessProvince(user, code)` — single gate used by actions and list filters
- Account access resolves province from Account / Place, then applies the same gate

## Server-side flow

1. `requireSessionUser()`
2. `requirePermission(user, …)`
3. `requireProvinceAccess` / `requireAccountAccess`
4. Perform mutation
5. `writeAuditEvent` for sensitive actions

## DNC

No permission grants force-include. Qualification / visit-list builders remain role-agnostic for DNC.
