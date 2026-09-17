# M6C live production proof

## Deployment

- Commit: `b4f38ed6a9c70fa6724556d78f3810ce593124ec`
- Product commit: `feb8cd1eccbabd9231d368db94afd20ca3e5404c`
- Event OS deployment id: `74a3c393-8d02-4a39-a9c2-650b2aca1330`
- Status: `SUCCESS`
- Health: `alive=true`, `ready=true`, `migrationStatus=APPLIED`, `productionAuthorised=false`
- Autodeploy: disabled

## Migration 017

Applied: `017_cpsat_canonical_seating_cutover`  
`cpsat_cutover_repair_receipts` present.

## Event `92909476-d3f9-43f1-a5f7-7e1a83c92fbd`

| Check | Result |
| ----- | ------ |
| Authority pointer | `3b771ad9-c4c9-401b-87df-0371f9eee840` |
| Adoption status | `CURRENT` |
| Run | `9ba506b1-dadc-478b-a857-051180307526` `ADOPTED` |
| Solver result | `OPTIMAL` |
| Evidence | `OPTIMAL_PROOF` |
| Assignments | 4/4 seated |
| CURRENT adoptions | 1 (no duplicate) |
| Legacy `seating_v2_publications` CURRENT | 0 |
| Ready workers | 1 |

## Worker

- Service left on accepted image `sha256:ca31c3d88…` (no CP-SAT worker runtime change in M6C product commit).
- One READY worker observed after Event OS cutover deploy.

## Not executed in this milestone (Claude / operator)

- Authenticated browser evaluation click-through (message/audit UX deployed; live click pending).
- Additional synthetic candidate launch through UI before adoption.
- Temporary Planner / Director / Auditor sessions (no impersonation bypass created).
