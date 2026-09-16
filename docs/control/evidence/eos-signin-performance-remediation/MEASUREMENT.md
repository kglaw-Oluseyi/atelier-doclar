# Event OS sign-in performance remediation — measurement

## Baseline (pre-correction)

- Application SHA deployed: `0a0be803f123e8326fb893db1e3562c724b70dd0`
- Repo HEAD at diagnosis: `e6622677d5b38986bf64412466d5add02065143c`
- Production `platform_documents`: 10,386 rows (~12 MB relation)
- Production `platform_audit`: 7,913 rows (~4.9 MB bodies)
- Heaviest collections include `layoutRevisions` (~7.3 MB), `operationalGuests` (933), `staffSessions` (1,855)

## Root cause (measured)

Authentication used `PlatformStore.snapshot()` + `replace()`, which:

1. `structuredClone`s the full in-memory platform snapshot (guests, layouts, RSVP, audit, …)
2. On Postgres, runs `persistTransactional` comparing **every** collection with `JSON.stringify` same-body checks
3. `withDurable` awaits that flush on the sign-in request path

Auth does **not** need guests, layouts, seating, or evidence. Query amplification scales with CAP600/CAP1000 volume.

## Live browser timings before correction

Host: `https://event-os-production-bc8d.up.railway.app`

| sample | get /sign-in | submit→nav | landed |
|--------|--------------|------------|--------|
| 1 | 1000 ms | **36056 ms** | /app |
| 2 | 1133 ms | **34044 ms** | /app |
| 3 | 667 ms | **32127 ms** | /app |

Warm submit p50 ≈ 34 s (hard ceiling 3 s — failed).

## Correction

Bounded `StaffAuthCapableStore.applyStaffAuthMutation` on Memory + Postgres:

- reads: matching person / session only
- writes: person update, staff session insert/update, one audit row
- Postgres: single transaction, O(1) document queries (no full-collection scan)

## Security invariants preserved

Server-side token verification, HMAC session binding, HttpOnly cookie path, audit on issue/deny/revoke, generic failure copy, no credential logging, no role grants, fixtures adapter unchanged for non-Postgres file store compatibility.
