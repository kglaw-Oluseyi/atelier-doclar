# ADR — EOS-S06 solver boundary

**Status:** Selected after executable spike  
**Slice:** `EOS-S06`  
**Prompt Control ID:** `MD-PR-S070` V2  
**Date:** `2026-09-12`

## Context

Overlay D4 requires a deterministic in-process TypeScript engine behind `SeatingSolverV1`. A native runtime, Python process, new Railway service, external API, paid provider or secret is a hard stop unless a pre-code spike proves the TypeScript engine cannot meet the 600-guest gate.

## Decision

Use the pure TypeScript constraint engine in `packages/shared-platform/src/seating-solver-v1.ts`.

- Algorithm: deterministic domain construction, reservation-aware constructive seeding, constraint propagation, and bounded branch-and-bound on hard-constraint components of size 2–8 when the seed is not yet zero-violation.
- Decomposition: union-find over hard KEEP_* / REQUIRE_* / reservation edges only. Reservation and global capacity prevent unsafe independent solves; a final full validation always runs.
- Objectives: fixed lexicographic vector from Annex E / overlay D5. No blended scalar.
- Isolation: no `node:fs`, `node:net`, Postgres, `fetch`, or repository handle.
- Identity: result hash includes status, canonical assignments, findings, score, config hash and seed. Metrics are excluded.

No optimisation library, native addon, Python process, extra Railway service or paid solver is introduced.

## Spike measurements

Harness: `packages/shared-platform/scripts/seating-solver-spike.ts`  
Ten warm iterations plus one cold execution. Identical canonical hashes. Memory is `process.memoryUsage().heapUsed`.

| Corpus | Status | Hard violations | Cold ms | Warm p95 ms | Heap bytes | Hash stable |
|---|---|---|---|---|---|---|
| 50 guests / 5 tables | FEASIBLE | 0 | 61 | 44 | 19,047,232 | yes |
| 200 guests / 20 tables | FEASIBLE | 0 | 468 | 435 | 47,055,208 | yes |
| 600 guests / 60 tables | FEASIBLE | 0 | 3,984 | 4,091 | 123,429,512 | yes |
| Capacity shortfall | FEASIBLE + explicit UNSEATED | 0 | 1 | 1 | recorded | yes |
| Contradictory locks | INFEASIBLE | not relaxed | 0 | 1 | recorded | yes |
| Impossible capability | FEASIBLE + UNSEATED | 0 | 0 | 0 | recorded | yes |

Gate: 600-guest warm p95 ≤10s and cold ≤20s. Observed 4,091ms / 3,984ms.

## First-run failures

1. `solves the 200-guest reservation and lock corpus` — first run `TIMED_OUT` after 10,003ms. Cause: full-component branch-and-bound exploded and constructive seeding ignored reservation seats. Diagnosis: reservation guests were not seated into reserved tables first; unmet exact/min blocks were scored only at completion. Correction: reservation-priority constructive seeding, scarce-capability preservation, and branch-and-bound only when the seed still has hard violations. Retry passed in 454ms.
2. `meets the 600-guest warm performance gate` — first run `TIMED_OUT` after 20,010ms for the same cause. Retry after the same correction: 10 warm hashes identical, p95 4,091ms, zero hard violations.

Passing retries do not erase those initial failures.

## Consequences

Persistence, workers and UI consume `solveSeatingV1` as a pure function. The worker must pass a complete solver package and persist only after schema validation and an independent hard-rule check outside the solver.
