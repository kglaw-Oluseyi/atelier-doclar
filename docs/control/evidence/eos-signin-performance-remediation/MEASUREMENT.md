# Event OS sign-in performance remediation — measurement

## Baseline (pre-correction)

- Application SHA stamp: `0a0be803f123e8326fb893db1e3562c724b70dd0`
- Repo HEAD at diagnosis: `e6622677d5b38986bf64412466d5add02065143c`
- Production `platform_documents`: 10,386 rows (~12 MB relation)
- Production `platform_audit`: 7,913 rows (~4.9 MB bodies)
- Heaviest collections include `layoutRevisions` (~7.3 MB), `operationalGuests` (933), `staffSessions` (1,855), ~71 events

## Root cause (measured)

Two amplifying paths:

1. **Sign-in write path** used `PlatformStore.snapshot()` + `replace()`, cloning and scanning the full platform (guests, layouts, RSVP, audit, …) on every authentication.
2. **Protected `/app` landing** called `listGuests` once per assigned event (N+1), and each call cloned the full snapshot again (~71 clones).

## Live browser timings before correction

Host: `https://event-os-production-bc8d.up.railway.app`

| sample | get /sign-in | submit→nav (incl. /app) | landed |
|--------|--------------|-------------------------|--------|
| 1 | 1000 ms | **36056 ms** | /app |
| 2 | 1133 ms | **34044 ms** | /app |
| 3 | 667 ms | **32127 ms** | /app |

## After bounded auth write (04438ca), separated timing

| sample | auth HTTP (POST /sign-in) | nav commit (incl. /app RSC) |
|--------|---------------------------|-----------------------------|
| warm | **295–354 ms** | ~33–37 s (home N+1 clones) |
| cold/outlier | ~35 s | ~35 s |

## Correction

1. Bounded `StaffAuthCapableStore.applyStaffAuthMutation` (Memory + Postgres): person, session, audit only.
2. Read-only `viewSnapshot()` for identity resolution; `/app` guest counts use one view instead of N `listGuests` clones.
3. Sign-in form pending UX (`PendingSubmit`, `aria-live`, disabled inputs).

## Security invariants preserved

Server-side token verification, HMAC session binding, HttpOnly cookie path, audit on issue/deny/revoke, generic failure copy, no credential logging, no role grants, fixtures adapter compatible.
