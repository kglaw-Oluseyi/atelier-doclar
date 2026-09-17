# B_TYPICAL performance — before/after (Checkpoint 2)

## Before (blocker)

Source: `qualification/B_TYPICAL_EXACT.json` (pre-aggregation)

| Phase | Seconds |
|---|---|
| A1 movement | 5.666 |
| A2 preferences (optimality proof) | **85.031** |
| Stage B | 0.288 |
| Total wall | **92.622** (> 90.000 hard ceiling) |
| Product | OPTIMAL (120s budget) / FEASIBLE (90s shard) |
| Root cause | Dense unit×table booleans (~97k); A2 proof dominated wall |

## Optimisation applied (evidence-backed)

1. Sparse `x[u,t]` for core units (domain-only).
2. **Exact aggregation of interchangeable singleton guests** into class-count integer variables (ratified Stage A) — excludes locked, preferred, and apart-involved guests.
3. Domain-aware hints for A2.
4. No HARD weakening; corpus unchanged.

## After

Source: `qualification/B_TYPICAL_PHASE_PROFILE.json` + `B_TYPICAL_CLOSURE_GATE.json`

| Phase | Seconds |
|---|---|
| Model build | 0.044 |
| A1 movement | 0.843 |
| A2 preferences | 1.014 |
| Stage B | 0.273 |
| Child wall (profile) | **2.532** |
| Closure gate p95 wall | **2.849** |
| Closure gate max | **2.849** |
| Hard ceiling | 90.000 |
| Margin | 87.151 s |

Closure gate: 5 cold + 5 warm, all OPTIMAL, 1000/1000, verifier pass, explanations OK, zero redaction leaks, identical Replay assignment hash `5073ab01…`, all under 90s.

Disposition: **`B_TYPICAL_CLOSURE_GATE_GREEN`**
