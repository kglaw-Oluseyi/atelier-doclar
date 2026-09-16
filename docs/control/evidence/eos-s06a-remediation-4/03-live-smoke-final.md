# Remediation 4 — live smoke (final)

**Date:** 2026-09-16  
**Application / docs / source SHA:** `0ce5d23db2af3c01650f97e510e145433360ed35`  
**Railway deployment:** `c503ddfa-8205-46ed-b34b-b0eba69ae051` (SUCCESS)  
**Control Tower:** SKIPPED (`ad896a38-646c-4098-ad1b-b2cc62f9bb84`)  
**Runtime:** POSTGRES · migrations APPLIED · productionAuthorised:false · providers INACTIVE

## Fresh multi-plan journey (PASS)

| Step | Result |
| --- | --- |
| Planner compile plan A `tb.supplier.decision` | `bc4a7c45-d1d5-468a-8121-5d7bdeb01ec3` · R3 · AWAITING_APPROVAL |
| Compile plan B on same event | A remains reachable via `?planId=` |
| Director approve A | approval correlation `28027426-edc2-49bf-a123-6a65efc787fe` |
| Execute A | COMPLETED · settlement `10e502c8-ff44-4f7e-9972-dbcbdcc98f40` · Execute unavailable |
| Replay | settled; no second execute control |
| CEO audit search by approval corr | found |
| Auditor audit search | found |
| Planner org-wide ledger | refused |

## Historical Whitfield plan

`af38a175-62ac-4df7-8301-0c7ff82760f2` remains durable and queue/deep-link reachable after rem4. Prior approval `e71f9e4d-…` remains searchable. Execute of that Round-3 artefact returns `VERSION_CONFLICT` (stale plan hash / ledger CAS class) — governance refuses unsafe execution rather than silently mutating siblings. Fresh R3 plans on the same event execute normally after rem4 CAS + action-flash fixes.

## Fixes applied in rem4 follow-through

1. Seating domain evidence before claim; CAS retry on persisted ledger conflicts.
2. Action-result `scopePath` query-free; `planId` via `resultHref` extras.
3. Idempotent already-approved settle-once.

## Axe counts (unchanged from matrix)

See `02-live-cas-and-a11y.md`. Task Bank @1440: 1× `color-contrast:79` (retained).
