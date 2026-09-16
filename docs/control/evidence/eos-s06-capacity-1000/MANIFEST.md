# CAP1000 Stretch Qualification

**Edition:** `eos-s06-capacity-1000-v1`  
**Status:** Stretch qualification claim — not a Gate 1 substitute  
**Date:** 2026-09-16  
**Stretch evidence commit:** `f05841e446d8838d016269d617f3c453ec94f7db`

## Profile (qualification-only; not a production default)

| Kind | Count | Seats/table | Seats |
|------|-------|-------------|-------|
| INTIMATE | 5 | 4 | 20 |
| COMPACT | 10 | 6 | 60 |
| FAMILY | 25 | 8 | 200 |
| GENERAL | 60 | 10 | 600 |
| HEAD | 10 | 12 | 120 |
| **Total** | **110** | — | **1000** |

## Corpus scenarios

See `corpus-manifest.json` for seeds and dataset hashes.

| ID | Expected |
|----|----------|
| A_LIGHT | FEASIBLE |
| B_TYPICAL | FEASIBLE |
| C_HEAVY | FEASIBLE |
| D_INFEASIBLE | INFEASIBLE |
| E_RECOVERY | FEASIBLE (replay/idempotency corpus) |

## Performance notes

- Solver `timeLimitMs` contract remains 20_000 (schema max).
- A_LIGHT / B_TYPICAL / C_HEAVY completed FEASIBLE under 30s wall in focused runs; B/C may approach the 20s solver budget at 1,000 guests.
- Ordinary non-solver install of 1,000 guests via product intake is multi-minute and expected.

## Concurrency

See `concurrency-timing.json` (CAP600 A_LIGHT ∥ CAP1000 A_LIGHT).

## Installer

```bash
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP1000 --confirm-synthetic-qualification
```

## Live fixture identity

Filled after post-deploy install:

| Field | Value |
|-------|-------|
| Immutable event ID | _(post-deploy)_ |
