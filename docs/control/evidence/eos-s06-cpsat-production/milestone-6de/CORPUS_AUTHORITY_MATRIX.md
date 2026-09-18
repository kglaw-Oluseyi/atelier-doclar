# M6D–M6E Corpus authority matrix

| Scale | Authority source | Corpus / definition | Hash / lock | Perf gate (ratified doc 08) | Classification | Executed |
|---|---|---|---|---|---|---|
| CAP600 | Gate 1 + capacity-live guards + doc 08 (500-class proxy) | `eos-s06-capacity-600-v1` B_TYPICAL seed `eos-s06-cap-B-typical-600-v1` | `08309644e65bd3f4f927461ac92b09692a5f766a344da5402011452b9692f160` | ≤500 typical≤10s / hard≤30s; CAP600 measured under 45s runner budget | Production-scale qualification | **PASS** (worker OPTIMAL, 600/600, ~1.2s solve) |
| CAP1000 | `CORPUS_LOCK.json` + doc 08 | `eos-s06-capacity-1000-v2` B_TYPICAL | `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` | typical≤30s; p95≤45; hard≤90s | Production-scale qualification | **FAIL — CORRECTNESS** `TIER_MISMATCH:A2_preferences` |
| CAP2000 | Doc 08 only (no separate CAP2000 corpus lock) | Stress: deterministic `scale-2000` synthetic (qualification runner shard) | Result shard hash historical only; not a corpus lock | typical feasibility≤60; p95≤90; hard≤180; **optimality not promised** | Stress / containment | See `CAP2000_REPORT.json` |

## Notes

- Dirty/untracked CAP1000 evidence under `docs/control/evidence/eos-s06-capacity-1000/` was **not** used as input.
- Product layout install for exact CAP1000 (`add41e21-…`) OOM'd in the local installer (2GB→8GB still fragile); CAP1000 solve used durable enqueue of the **locked** B_TYPICAL compiled request against the Railway worker.
- CAP1000 failure is verifier/child preference-tier disagreement; **no automatic solver tuning** performed.
- Proposed minimal fix (for external decision): align Python child `A2_preferences` reporting with TypeScript `verifyRequiredObjectiveTiers` recompute — requires worker rebuild + image re-acceptance if child changes.
