# CAP1000 Stretch Qualification

**Edition:** `eos-s06-capacity-1000-v1`  
**Status:** **`INCOMPLETE — INSTALLATION PAUSED — NOT FOR VERIFICATION`**  
**Date:** 2026-09-16  
**Stretch evidence commit (product surfaces):** `f05841e446d8838d016269d617f3c453ec94f7db`

## Live fixture — PAUSED (do not verify)

| Field | Value |
|-------|-------|
| Immutable event ID | `3d212906-529e-4bd8-b13f-b0c2a24e5fba` |
| Code | `CAP1000` |
| Name | `[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000` |
| Guests on live (paused) | **≈125 / 1000** — incomplete |
| Tables / seats expected when complete | 110 / 1000 |
| Stage 1 treatment | **Not for verification.** Do not confuse with CAP600 `053fa686-124e-49b3-b8a8-d0497c0a1668`. |
| Delete/rebuild in Stage 1 | **Forbidden** |

Gate 1 independent verification must use **CAP600 only**. CAP1000 may be resumed only under a later authorised stage.

## Profile (qualification-only; not a production default) — target when complete

| Kind | Count | Seats/table | Seats |
|------|-------|-------------|-------|
| INTIMATE | 5 | 4 | 20 |
| COMPACT | 10 | 6 | 60 |
| FAMILY | 25 | 8 | 200 |
| GENERAL | 60 | 10 | 600 |
| HEAD | 10 | 12 | 120 |
| **Total** | **110** | — | **1000** |

## Corpus scenarios

See `corpus-manifest.json` for seeds and dataset hashes (local stretch corpus work). Live install of this event is **paused incomplete** and is not a completed stretch qualification.

| ID | Expected |
|----|----------|
| A_LIGHT | FEASIBLE |
| B_TYPICAL | FEASIBLE |
| C_HEAVY | FEASIBLE |
| D_INFEASIBLE | INFEASIBLE |
| E_RECOVERY | FEASIBLE (replay/idempotency corpus) |

## Performance notes

- Solver `timeLimitMs` contract remains 20_000 (schema max).
- Ordinary non-solver install of 1,000 guests via product intake is multi-minute and expected.
- Live guest intake was interrupted under stop-loss; do not treat partial guest counts as qualification success.

## Concurrency

See `concurrency-timing.json` (CAP600 A_LIGHT ∥ CAP1000 A_LIGHT) for earlier ephemeral timing notes only.

## Installer (do not run in Stage 1)

```bash
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP1000 --confirm-synthetic-qualification
```
