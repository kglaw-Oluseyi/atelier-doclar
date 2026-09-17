# Legacy heuristic defect provenance — B_TYPICAL (immutable)

**Purpose:** Preserve the CAP1000 `B_TYPICAL` failure that motivated CP-SAT replacement as a mandatory regression fixture.

| Field | Value |
|-------|-------|
| Corpus | `B_TYPICAL` |
| Edition | `eos-s06-capacity-1000-v2` |
| Seed | `eos-s06-cap-B-typical-1000-v2` |
| Dataset hash (locked) | `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` |
| Unseated guest | `g0147` |
| Together rule | `cap1k-b-together-24` (`g0146`, `g0147`) |
| Heuristic status | `TIMED_OUT` (false classification) |
| Global witness | Exists — full HARD-valid 1000-seat assignment |

## Rules

- Do **not** “fix” this corpus to manufacture heuristic success.
- Original evidence under `docs/control/evidence/eos-s06-capacity-1000/` remains in place; this directory holds immutable copies and the corpus lock.
- CP-SAT qualification must treat this corpus as a planted-feasible regression case.

## Contained artefacts

- `CORPUS_LOCK.json` — binding identity and false-`TIMED_OUT` explanation
- `B_TYPICAL_DIAGNOSIS.json` / `_TRACE.json` / `_GLOBAL_WITNESS.json`
- `SOLVER_TIMING.jsonl` / `RULE_PROFILE.json`
- `PROVENANCE_SHA256.txt`

See `CORPUS_LOCK.json` for the proof that a globally valid assignment exists and that `TIMED_OUT` was misapplied.
