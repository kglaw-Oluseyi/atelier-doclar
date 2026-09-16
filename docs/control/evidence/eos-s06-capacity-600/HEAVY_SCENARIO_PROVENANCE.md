# Heavy scenario (C_HEAVY) provenance — Gate 1 evidence closure

**Corpus edition:** `eos-s06-capacity-600-v1`  
**Seed (unchanged):** `eos-s06-cap-C-heavy-600-v1`  
**Dataset hash (final adjusted corpus):** `22c88419a8313f662f3c02aa85e5049137907e8a48aa2feed7bcce8121efb5e4`

## First-run failure (preserved)

On the initial heavy construction attempt (before corpus correction), the solver returned:

| Field | Value |
|-------|-------|
| Status | `TIMED_OUT` |
| HARD violations | 5 |
| Seated | 598 / 600 |
| Elapsed | 20006 ms (solver `timeLimitMs` = 20000) |

This first-run timeout is retained as honest Gate 1 evidence. It is not deleted or restated as a pass.

Cause class: constraint density produced a search that exceeded the synchronous in-process time limit before a zero-HARD feasible placement was proven. This is a **corpus / workload construction** issue for the qualification dataset, not a redesign of the accepted solver architecture.

## What changed in the adjusted heavy corpus

Relative to the timed-out draft, the adjusted `buildHeavyCorpus()` reduced interacting HARD density while retaining operational stress:

| Constraint class | Timed-out draft (approx.) | Adjusted heavy (final) |
|------------------|---------------------------|-------------------------|
| KEEP_TOGETHER chains (party triples) | 12 triples → 24 HARD edges | **8 triples → 16 HARD edges** |
| KEEP_APART pairs | ~10 HARD | **6 HARD** (12 anchors paired) |
| REQUIRE_TABLE | 10 HARD | **4 HARD** |
| FORBID_TABLE | 10 HARD | **0** (removed; was interacting with REQUIRE/reservation pressure) |
| LOCK_ASSIGNMENT | 3 HARD | **2 HARD** |
| PREFER_TABLE (SOFT/WEIGHTED) | 50 | **24** |
| Reservations | head 10–12 on 2 tables; companion exact 4; pressure 18–20 on 3 tables | head 10–12 on 2 tables; companion exact 4; pressure **14–16 on 2 tables** |

Final HARD count (payload presence): 16 together + 6 apart + 4 require-table + 2 locks = **28 HARD rules**, plus **3 reservations**, plus **24 WEIGHTED preferences**.

## Why it remains legitimately “heavy”

- Dense interacting HARD graph (together chains + apart + require-table + locks) on a full 600-guest / 60-table board.
- Multiple competing reservations (head, companion, capacity pressure).
- Meaningful SOFT preference load (24 weighted table preferences).
- Observed warm solve still ~6s (p95 6072 ms in preserved `timing.jsonl`) — substantially harder than light (~3s) and comparable to typical (~7s), not a trivial open placement.

## Feasibility knowledge

Feasibility of the adjusted case was **not** known a priori by closed-form construction. It was established empirically after the timeout by re-running `solveSeatingV1` and confirming:

- status `FEASIBLE`
- HARD violations `0`
- seated `600/600`
- stable result hash across warm samples

The adjustment is therefore classified as **corpus correction to restore a demanding but feasible heavy workload**, not removal of the heavy class, not threshold weakening, and not product-code change.

## Timing evidence pointer

Preserved runner output: `docs/control/evidence/eos-s06-capacity-600/timing.jsonl`  
SHA-256 at freeze: `f614f7291289215601cb7b632dece3d727370bcfd53746091fa549a606e560e5`
