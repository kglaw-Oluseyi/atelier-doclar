# M6C — Final CP-SAT cutover evidence

## Product commit

Message: `refactor(seating): complete canonical cpsat cutover`

## Controlling decision

CP-SAT is the sole operational seating authority. Legacy `seating_v2_*` publication/run mirrors are historical only.

## Removed writes

- `launchRun` no longer inserts into `seating_v2_runs`
- `projectSeatingV2Lifecycle` is a no-op (no `UPDATE seating_v2_runs`)
- Event OS `adoptSeatingRunAction` / `publishSeatingPlanAction` throw `CAPABILITY_NOT_ENABLED`
- UI no longer offers legacy adopt/publish when V2 replacement is enabled

## Removed reads

- Event OS seating page no longer falls back to `projectCurrentPublication`
- `projectWorkspace` strips legacy CURRENT publication and overlays CP-SAT authority pointer + assignments
- Operational badges use CP-SAT adoption id, solver result, evidence, freshness, worker availability

## Canonical model

`loadCanonicalCpsatAuthority` / `applyCanonicalCpsatAuthorityToWorkspace` derive:

- current adoption from `cpsat_solver_authority_pointers` + `cpsat_solver_adoptions`
- runs from `cpsat_solver_runs`
- occupancy from `cpsat_solver_assignments`
- worker readiness from `cpsat_solver_workers`

## Migration 017

`017_cpsat_canonical_seating_cutover`:

- `cpsat_cutover_repair_receipts`
- indexes on authority pointer / adoptions
- COMMENT classification on historical `seating_v2_runs` / `seating_v2_publications`
- no table drops

## Evaluation

`seating.evaluate` success copy is now `Seating evaluation completed · {status} · …` (no `Protection command applied`).

## Tests

- `packages/shared-platform/test/cpsat-canonical-cutover.test.ts` (8 cases)
- focused CP-SAT queue / review-adoption / diagnostics / settlement / client-boundary suites green
- Event OS production build green (against product sources)

## Historical retention

`seating_v2_*` tables retained read-only for audit/compliance. No browser archive surface required in M6C.

## Role access

Independent Planner / Director / Auditor browser sessions remain dependent on the established authentication system; no role switcher or impersonation bypass was added. Temporary expiring access for Claude retest must be provisioned by operators outside this commit.
