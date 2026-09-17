# Checkpoint 1 — CP-SAT architecture proven (evidence stamp)

**Disposition:** `CHECKPOINT 1 — CP-SAT ARCHITECTURE PROVEN`
**Date:** 2026-09-17
**Governance commit:** `11feb11d0dfd2dbef5748e4df23f504e0b586235`
**Pack path:** `docs/control/eos-s06-cpsat/ratification-pack/`
**Pack SHA-256:** `9d41447846109a55ee95c641686d3aa239188801bfcc5c19d0656e3470870c74`

## Measured spike (local)

| Metric | Value |
|--------|-------|
| Python | 3.12.13 |
| OR-Tools | 9.15.6755 |
| Cold child start + solve | 727 ms |
| Warm child p50 | 282 ms |
| Peak child RSS | 86,672 KB |
| Cancellation | SIGTERM in 406 ms (`stoppedUnder2s=true`) |
| Crash containment | child exit 99; supervisor alive |
| Framed contract | stdin request / fd 3 response round-trip OK |

## Railway

| Item | Truth |
|------|-------|
| Watch-pattern push guard | Event OS set to `/__CONTROLLED_DEPLOY_ONLY__/**` before governance push; Control Tower unchanged |
| Push of governance commit | **No** Event OS application deploy from `11feb11` |
| Control Tower on push | `SKIPPED` for `11feb11` (guard retained) |
| Watch restore | Restored to `[]`/`None`; config-maintenance rebuild `b787f7c6…` SUCCESS from source `11feb11` (not claimed as push-triggered product deploy during guard) |
| Worker service | **Not created** (proposal only) |
| Local Docker image build | **Not executed** — Docker daemon unavailable (`colima` socket missing). Dockerfile + local child spike stand as architecture proof; Railway image build deferred. |

## Safety

- Synthetic data only
- `productionAuthorised:false`
- No provider activation
- Control Tower untouched for product mutation
- Heuristic not removed yet (authority transfer is Checkpoint 3)
- B_TYPICAL corpus hash unchanged: `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668`

Awaiting AI CTO review at this material boundary.
