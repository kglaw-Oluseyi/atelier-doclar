# Comparator report — heuristic vs CP-SAT (Checkpoint 2)

| Case | Heuristic | CP-SAT | Notes |
|---|---|---|---|
| Tiny together (3 guests) | N/A in this run | OPTIMAL/FEASIBLE, verifier+explanations | CP-SAT authoritative |
| B_TYPICAL 1000 | TIMED_OUT / incomplete seating (legacy defect) | FEASIBLE, 1000/1000, verifier PASS, explanations complete, g0146=g0147 same table | Corpus hash locked |
| scale-50 synthetic | — | OPTIMAL ~0.6s | |
| scale-600 synthetic | — | OPTIMAL ~3.5s | |
| scale-2000 synthetic | — | see qualification shard | |

Heuristic is **not** exposed as a selectable engine and must not create authoritative adoptions.
