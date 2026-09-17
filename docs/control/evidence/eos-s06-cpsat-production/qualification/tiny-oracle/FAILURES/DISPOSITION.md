# Tiny-oracle failure dispositions (Checkpoint 2)

## Preserved cases

| Seed | Classification | Root cause | Disposition |
|---|---|---|---|
| 2000003 | Apparent FALSE_INFEASIBLE | Exact oracle omitted guest↔seat capability matching; product Hall-family correctly infeasible (A11Y + apart + forbid) | Harness fix: `exact-oracle.ts` enforces capability ⊆ seat attrs. After fix: oracle=INFEASIBLE, product=INFEASIBLE. Agree. |
| 2000001 | SOLVER_FAULT(DECOMPOSITION_GAP) | Stage A counted locked attribute seats as free supply for other units → table-feasible / seat-infeasible | Product fix: Stage A free attr supply excludes locked seats; locked attrs only offset holder unit demand. After fix: Stage A INFEASIBLE, product=INFEASIBLE. Agree. |

Evidence paths:

- `FAILURES/false-infeasible-seed-samples.json` (original disagree rows)
- `FAILURES/case-2000001.json`, `FAILURES/case-2000003.json`
- `FAILURES/child-2000001.json`

Regression: Python aggregation tests + re-diagnose of both seeds.

| shard-000 reservations | Apparent FALSE_INFEASIBLE ×9 | Exact oracle omitted reservation domain projection | Harness fix: enforce force-all reservation table restriction in exact-oracle.ts |
