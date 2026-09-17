# CP-SAT Milestone 1 — Durable launch + operator lifecycle

**Disposition:** local synthetic proof  
**Date:** 2026-09-17  
**Product commit:** `7848f5db07040f01121ca3e9c01a49011c6eab82`  
**Starting HEAD:** `f291052153d2ad7fe3502f979cf6608322105020`  
**Frozen baseline:** `1c0eeafba54f93bc47645ddb26c96af286435575`  
**origin/main:** `df6d6a616ccf769e86020a94c0f5281002137292`

## Migrations

- `011_cpsat_solver_queue` (existing; unchanged SQL)
- `012_cpsat_solver_queue_launch` (additive columns + event-scoped idempotency unique index)

## Synthetic proof (ephemeral local PostgreSQL)

Database: ephemeral `cpsat_m1_*` created and dropped by `test/cpsat-durable-launch.test.ts`.

Assertions proven:

1. Authorised enqueue inserts one durable `cpsat_solver_runs` row with `status=QUEUED`.
2. Identical frozen authority returns the same run ID (`application=REPLAYED`).
3. Changed layout/content hash creates a distinct run.
4. Run reloads after process boundary via `getCpsatSeatingRun`.
5. `product_result` remains null; `lease_owner` remains null; `attempt_count=0`; `freshness=CURRENT`.
6. Queued cancellation sets `cancel_requested=true` without terminal lifecycle; repeated cancel is idempotent.
7. Terminal (`ADOPTED`) cancellation is rejected.
8. Cross-event get by run ID returns NOT_FOUND.
9. Python invocation count = 0; heuristic invocation count = 0.
10. No worker claim; no sealed candidate; no adoption.

Synthetic event IDs used in proof:

- `00000000-0000-4000-8000-00000000a001`
- organisation `00000000-0000-4000-8000-00000000org1`

## Feature seam

`SOLVER_QUEUE_ENABLED=1` → durable enqueue (no in-process Python/heuristic).  
Absent/`0` → preserves current CP-SAT in-process launch.  
Temporary migration seam — remove during later authority-removal milestone. Not operator-selectable.

## Focused tests

```text
npx tsx --test test/cpsat-durable-launch.test.ts test/cpsat-operator-lifecycle-ui.test.ts test/cpsat-queue.test.ts
```

Result: 18/18 pass (see commit-time re-run).

## Safety

- Synthetic data only
- Local/ephemeral PostgreSQL only
- No production database access
- No Railway access
- No push / no deploy
- `productionAuthorised` unchanged (false)
- Unrelated CAP1000 / qualification dirty paths untouched
