# CP-SAT Milestone 2 — Worker claim, execution, verified settlement

- **Disposition:** MILESTONE 2 COMPLETE (local synthetic proof)
- **Date:** 2026-09-17
- **Starting HEAD:** `66a62ef6946209fa92fe70383bb81daaa8e73cc8`
- **Implementation ancestor (M1 product):** `7848f5db07040f01121ca3e9c01a49011c6eab82`
- **origin/main (unchanged):** `df6d6a616ccf769e86020a94c0f5281002137292`
- **Product commit:** `bdda1606134e8374139850d1099f33f229c56595`
- **Evidence commit:** this document (`docs(cpsat): record worker settlement milestone`)

## Migrations

- `011_cpsat_solver_queue` (existing)
- `012_cpsat_solver_queue_launch` (existing)
- `013_cpsat_solver_queue_worker` (additive: progress_phase, started_at, sealed_at, cancel_observed_at, child_invocation_count, authored_authority_json, max_attempts; candidate seal columns; lease reaper index)

## Worker configuration used (no secrets)

| Setting | Value |
|---------|-------|
| Database | ephemeral local `cpsat_m2_*` via `postgresql://…@127.0.0.1:5432/` |
| Worker identity | synthetic `worker:*` lease owners in tests |
| Poll interval | 1000 ms (supervisor default) |
| Heartbeat interval | 5000 ms |
| Lease duration | 30 s (tests also use 1–60 s) |
| Cancellation grace | 1500 ms (tests use 50–1000 ms) |
| Hard wall | 120000 ms supervisor default; Journey A wall 60000 ms |
| Max response bytes | 8 MiB |
| Python | `apps/event-os-solver-worker/.venv/bin/python` |
| Child entry | `apps/event-os-solver-worker/python/solver_child.py` |
| Concurrency | 1 |
| Ingress | none (no listen port) |

## Synthetic journeys

### Journey A — successful tiny solve (1 real CP-SAT child)

- Enqueue → fair claim → heartbeat-capable lease → one Python child → verify → explain → seal → `READY_FOR_REVIEW`
- Projection alignment asserted
- `getCpsatSeatingRun` restoration after settle
- Child invocation count = 1
- Sealed candidate `sealed=true` with assignment hash
- Real CP-SAT executions in this milestone proof: **1** (limit 2)

### Journey B — queued cancellation

- Enqueue → `requestCpsatRunCancellation` → `acknowledgeQueuedCancellations`
- Child invocation count = 0
- Terminal lifecycle `CANCELLED`
- Claim SQL does not pick cancel-requested queued rows for solve

### Journey C — containment (fake malformed child)

- Claim → `fake_malformed_child.py` / truncated response path
- Typed `SOLVER_FAULT`
- No candidate rows
- Subsequent claim poll remains possible (supervisor containment)

## Claim / lease / heartbeat evidence (from focused tests)

- Single claim succeeds; second worker cannot claim the same run
- `lease_epoch` increments on claim
- Heartbeat requires matching owner + epoch
- Stale owner cannot heartbeat or settle
- Expired lease reaper requeues within `max_attempts` or faults
- Authority ↔ seating_v2 projection transactional alignment asserted

## Verification / explanation / seal

- Independent TypeScript `verifyCpsatAssignments` against frozen authored authority
- Objective tier recomputation (`A1_movement` / `A2_preferences`)
- Symmetric-guest canonicalisation + second verification
- Explanation builder + predicate verifier + redaction leak check
- SERIALIZABLE fenced seal: assignments recounted, hash recomputed, `sealed=true`, lifecycle `READY_FOR_REVIEW`
- Failed seal leaves zero partial candidate rows
- Duplicate settle rejected
- Unsealed candidate is not reviewable

## Focused test commands and results

```text
cd packages/shared-platform
npx tsx --test \
  test/cpsat-worker-settlement.test.ts \
  test/cpsat-durable-launch.test.ts \
  test/cpsat-operator-lifecycle-ui.test.ts \
  test/cpsat-queue.test.ts
```

**Result:** 32/32 pass (local run 2026-09-17).

## Safety

- Synthetic data only
- Local/ephemeral PostgreSQL only (`cpsat_m2_*` created and dropped by tests)
- No production database access
- No Railway access
- No push / no deploy
- `productionAuthorised` unchanged (false)
- No Control Tower / EOS-S07 / CAP1000 qualification work
- Unrelated CAP1000 / qualification dirty paths untouched

## Remaining (explicitly out of scope)

- Review detail workflow
- Maker-checker adoption
- Full infeasibility diagnostics (CORE/MCS/counterfactuals)
- Stop-and-keep-best
- Heuristic retirement
- Railway worker creation/deployment
- Formal qualification
- Claude human verification
