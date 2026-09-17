# Precise recorded results (Checkpoint 2 continuation)

## A. Seed-overflow defect (preserved)

See `SEED_OVERFLOW_DEFECT.md`.

| Field | Value |
|---|---|
| Failing unsigned seed | `3959095606` |
| Authoritative string | `scale-2000` |
| Fault | `SOLVER_FAULT(CHILD_RESPONSE)` / Python `TypeError` at `random_seed` |
| Corrected wire seed | `1811611959` |
| Permanent tests | `test/cpsat-seed.test.ts` (13/13) |

## B. B_TYPICAL

### Corpus
- Locked hash: `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` (**unchanged**, match verified)

### Prior approved shard (`qualification/b-typical.json`, budget 90s)
- Product: **FEASIBLE** (not relabelled OPTIMAL)
- Seated: 1000/1000
- Verifier / explanations: OK
- Elapsed: **91657 ms**

### Exact remeasure (`qualification/B_TYPICAL_EXACT.json`, budget 120s)
| Field | Value |
|---|---|
| Product | **OPTIMAL** (all tiers proven under 120s budget) |
| Seated | **1000 / 1000** |
| Independent verifier | **PASS** (`hardViolations: 0`) |
| HARD rules | 52 evaluated; zero violations |
| `g0146`/`g0147` same table | **true** (`g0146_table` recorded in JSON) |
| Proof | `allTiersProven: true` — A1/A2/B_move/B_pref all proven |
| Objective gaps | none at this measurement (movement=0, preference=0) |
| Assignment hash | `2d5dbbaf15d8501c3fe1bac621ff30d1a3fca4d04584ff9ce8e05fab81942f13` |
| Response hash | `340b5d5370f1a6a339c59196f2e7d9fd8552758f79897e63513a9a7096c1e733` |
| Explanations | 1000/1000 complete |
| Compile | 8.634 ms |
| Serialize | 0.508 ms |
| Child wall | 92600.413 ms |
| Deterministic | 90.696474 s |
| Explanation | 1.481 ms |
| Verification | 4.699 ms |
| Persistence | 3.742 ms |
| Total wall | **92622.144 ms** |
| Peak RSS | **365440 KiB** |
| Wire seed | 248649806 (hash of `eos-s06-cap-B-typical-1000-v2`) |
| Slack | ZERO_SLACK |

Note: FEASIBLE at 90s and OPTIMAL at 120s are both recorded. The 90s FEASIBLE result is not rewritten.

## C. Scale 2000 (`qualification/SCALE_2000_EXACT.json`)

| Field | Value |
|---|---|
| Corpus seed | `scale-2000` |
| Corpus hash | `2cc7617db7c62fd6d042500e2040cef07ec48b5dea87a12388180f20d0d5ad11` |
| Guests / seats / tables | 2000 / 2000 / 200 |
| Units | 1999 |
| Rule density | 1 HARD together pair; 0 apart; 0 soft |
| Slack | ZERO_SLACK |
| Product | **OPTIMAL** |
| Verifier | PASS (`hardViolations: 0`) |
| Explanations | 2000/2000 |
| Model payload | 1686915 bytes |
| Compile | 20.681 ms |
| Serialize | 0.219 ms |
| Model build (progress) | accepted@65.66 ms → model_build@423.96 ms |
| First search (A1) | progress @ 2560.655 ms |
| A2 start | @ 21266.087 ms |
| Stage B start | @ 30994.157 ms |
| Child wall | **31780.433 ms** |
| Deterministic | **26.313079 s** |
| Explanation | 1.295 ms |
| Verification | 7.522 ms |
| Persistence | 5.523 ms |
| Total wall | **31823.506 ms** |
| Peak RSS | **703584 KiB** |
| Assignment hash | `1d19cfae0243935c633d0391f9cd596d789dd7853088e1f6d300e22e93effa00` |
| Response hash | `74e6f1ad8dd33d40693824b81a0b582ccce5d654f395863b7de2221836ed9229` |
| Wire seed | **1811611959** (folded from defect unsigned `3959095606`) |

## D. Container cold-start observation

Source: `container-build/COLD_START_BREAKDOWN.json`

| Step | ms |
|---|---|
| docker echo only | 411.671 |
| docker python pass | 510.221 |
| docker ortools import | 1275.483 |
| docker model.solve import (bind-mount) | 6706.998 |
| host python pass | 46.695 |
| host ortools import | 48.337 |
| Prior full spike cold child | 5256 |

Interpretation: most of the ~5s spike cold path is **container launch + Python/OR-Tools import**, not model solving. Host OR-Tools import is ~48 ms. Bind-mount model import is cold-filesystem inflated. Warm-spare (single pre-imported idle child, one job then exit) remains the only permitted optimisation path — no multi-job long-lived Python process.
