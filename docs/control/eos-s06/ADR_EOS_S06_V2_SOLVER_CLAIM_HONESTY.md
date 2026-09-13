# ADR: EOS-S06 V2 solver-claim honesty

**Status:** Accepted for MD-PR-S075 addendum solver-claim honesty; does not accept EOS-S06
**Authority:** `docs/control/eos-s06/MD_PR_S075_ADDENDUM_SOLVER_CLAIM_HONESTY.md`
**Addendum SHA-256:** `160d23dea037b8b271c50e7edc7458ab67a8763f8be402d63b9cf8c248357fbb`

## Decision

Current solver runtime identity is `s06-solver-v3`. The compiled-request contract shape remains `eos-s06-solver-v2`. Compiler identity remains `s06-compiler-v2`. Validator identity remains `s06-validator-v3`.

Historic packages and runs keep `s06-solver-v2`. They remain immutable and cannot be reused or adopted as success under `s06-solver-v3`. The previous config hash (compiler v2 + solver v2) still proves the current compiler; it does not prove the current solver.

`s06-eval-v3` is not restamped. Its corpus hash still binds the solver identity that was current when v3 was created (`s06-solver-v2`). Section 10 may create `s06-eval-v4` after Section 9 passes.

## Scoring and proof

On a finished candidate, every eligible required guest left unseated is a hard violation. The solver never invents `GOVERNED_UNSEATED`. Partial probes do not treat not-yet-assigned guests as global proof.

`FEASIBLE` requires a finished witness with zero hard violations. `INFEASIBLE` requires guest/position pigeonhole, capability pigeonhole, empty required domain, a contradiction/over-reservation certificate (including same-table `REQUIRE_TABLE` plus `KEEP_APART` on the same subjects), or exhaustive none within 5 eligible guests and 16 positions. Incomplete search is `TIMED_OUT`. The Section 9 test oracle remains bounded at 12 positions; the production exhaustive path may certify the accepted two-table fixture (16 positions) without importing the oracle.
