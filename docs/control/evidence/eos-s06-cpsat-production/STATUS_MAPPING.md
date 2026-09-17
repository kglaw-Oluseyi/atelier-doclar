# Status mapping

Result, lifecycle, freshness, evidence grade and stop reason are **separate**.

| Condition | Product result |
|-----------|----------------|
| All tiers proven + verifier passes | `OPTIMAL` |
| Verified complete plan; tier not proven | `FEASIBLE` |
| Full model proven impossible | `INFEASIBLE` (+ proof-grade evidence) |
| Deterministic allowance ends, no incumbent | `SEARCH_INCOMPLETE` |
| Wall-clock safety limit, no incumbent | `TIMED_OUT` |
| Schema/reference failure | `INVALID_INPUT` |
| Model/contract/decomposition/verification/explanation disagreement | `SOLVER_FAULT` |
| Cancelled | `CANCELLED` |

Rules: restricted/neighbourhood failure ≠ infeasibility; native UNKNOWN under deterministic limits → `SEARCH_INCOMPLETE`; verifier disagreement → `SOLVER_FAULT`; staleness never changes mathematical result.
