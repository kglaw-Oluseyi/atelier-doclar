# CAP1000 — A2_preferences tier-verification defect root cause

**Status:** **`ROOT CAUSE IDENTIFIED — FIX NOT YET APPLIED`**
**Date:** 2026-09-17
**Reviewed at commit:** `737d9327955a114a90609a450cc0b5fbbc24eb65` (`main`)
**Method:** Independent static code review (read-only repository access). No production
database access, no live replay, no worker-image reproduction performed or required.
**Disposition change:** `CAP1000 — FAIL — CORRECTNESS` is **retracted as a solver or
corpus defect**. The Python solver's seated result was correct. The defect is in the
TypeScript verification gate that rejected it. CAP1000 remains **FAIL — pending fix**
until the correction below is applied and re-verified; this note does not itself
authorise adoption, re-run, or CAP2000.

## Trace

CAP1000 worker-qualify run → child settles → `sealAndSettleCandidate` →
`processVerifiedCandidate` (`packages/shared-platform/src/cpsat/worker-settlement.ts:168`)
→ `verifyRequiredObjectiveTiers(input.request, input.childAssignments, input.childTiers)`
→ fault `SOLVER_FAULT(VERIFICATION_FAILED):TIER_MISMATCH:A2_preferences`, `stopReason:
TIER_MISMATCH`. This is the **first** tier check in the settlement path, called on the
raw, pre-canonicalisation child assignments — it fires and returns before
`canonicalizeSymmetricAssignments` ever runs (line 201). Canonicalisation is not reached
and is not implicated in the observed fault.

## Why the fault fired

Two independent implementations of `A2_preferences` compute inverse quantities.

**Python (child, authoritative for the reported value):**
`apps/event-os-solver-worker/python/model/stage_a.py:316-350` builds a boolean `unmet`
per preference — 1 iff the guest is seated but not at the preferred table (gated on
`seated[u]`; an unseated guest never counts as violated). `preference_var` = Σ(weight ×
`unmet`) — the **cost of violated preferences**.
`apps/event-os-solver-worker/python/model/solve.py:487` minimises it
(`model.Minimize(ctx["preference_expr"])`) — same polarity as `A1_movement`, also a
violation count, also minimised. Line 526 reports `a2_val = int(solver.ObjectiveValue())`
as `A2_preferences` in the child's final payload.

**TypeScript (verifier, independent recomputation):**
`packages/shared-platform/src/cpsat/tiers.ts:58-63`, `recomputeObjectiveTiers()`:

```ts
let preference = 0;
for (const pref of request.preferences) {
  const a = byGuest.get(pref.guest);
  if (a && a.table === pref.table) preference += pref.weight;
}
```

This sums the weight of **satisfied** preferences — a reward. It is the exact inverse
of what the Python child computes and reports as `A2_preferences`. The two values only
coincidentally agree when a corpus has zero preferences configured.

## Why CAP600 passed and CAP1000 is the first run to hit this

CAP600's corpus had no configured preferences (`requiredObjectiveTiers().preferences ===
false`), so this comparison was never engaged. CAP1000's frozen request had 24
preferences (`required.preferences === true`) — the first qualification corpus in this
programme to exercise the `A2_preferences` comparison at all. The fault is fully
deterministic and 100% reproducible; it is not a version-skew, canonicalisation-order,
or nondeterminism issue.

## Ruled out on inspection

- **Canonicalisation-order defect:** `canonicalize.ts`'s `symmetryKey()` includes each
  guest's own `prefs` list, so `canonicalizeSymmetricAssignments` only reshuffles seats
  among guests who are already preference-identical. It cannot change aggregate
  preference satisfaction, and in any case is not reached before the fault fires (see
  Trace).
- **Worker-image / local-tree version skew:** `tiers.ts` is Node/TypeScript that runs in
  the Event OS app runtime, not inside the deployed Python worker image. The divergence
  is a monorepo-internal, cross-language logic mismatch present in the checked-out tree
  regardless of which worker image is deployed.
- **Guest/table id-vs-index ambiguity:** preferences and assignments both key off the
  same canonical integer index `i` end to end (`compiler.ts`); no indexing mismatch
  found.
- **Multiple-optimum ambiguity:** not applicable — the mismatch occurs on the raw,
  single reported assignment, before any canonical re-derivation.

## Why the existing unit test did not catch it

`packages/shared-platform/test/cpsat-required-tiers.test.ts`, case "accepts both
required and correct" (lines 80-103), feeds `recomputeObjectiveTiers`'s own output back
in as the "reported" child value. This is tautological — the function under test is
compared against itself, so it can never surface a polarity error in that function.

## User-facing impact — none

The Review/Publication UI's displayed `preference_tier` is always the child's own
reported (correct) value, persisted straight through (`review-adoption.ts`). No guest
has ever been seated incorrectly because of this defect. The defect is confined to the
verification gate rejecting a truthful result, not to the seating result itself.

## Required fix (not yet applied)

1. `packages/shared-platform/src/cpsat/tiers.ts` — `recomputeObjectiveTiers()`: compute
   the weight of **violated** preferences, gated on the guest being seated at all
   (matching Python's `unmet <= seated[u]`), not the weight of satisfied preferences.
2. `packages/shared-platform/test/cpsat-required-tiers.test.ts` — replace the
   tautological "accepts both required and correct" case with an independently-reasoned
   fixture (mixed satisfied and violated preferences) that would have failed against the
   pre-fix code.
3. No change required to the Python solver, `canonicalize.ts`, corpus/fixtures, or
   `worker-settlement.ts` control flow.
4. `review-adoption.ts` re-uses `requiredObjectiveTiers`/`verifyRequiredObjectiveTiers`
   directly and needs no separate formula change, but must be re-checked once the fix
   lands.

## Blast radius (confirmed by repo-wide search)

Only three files reference `recomputeObjectiveTiers`, `verifyRequiredObjectiveTiers`, or
`tiersMatchChildReport`: `worker-settlement.ts`, `review-adoption.ts`, and
`cpsat-required-tiers.test.ts`.

## Separate, unresolved issue — not addressed by this note

The CAP1000 product layout-install path's out-of-memory failure (bypassed via direct
durable enqueue in the prior session) is unrelated to this defect and is not fixed by
the correction above. It requires a locally memory-profiled run, not a code read; see
the CAP1000 pause report for its own evidence.

## Status of CAP2000

Unaffected by this finding. The prior CAP2000 execution remains **`UNAUTHORISED AFTER
CAP1000 STOP — INADMISSIBLE FOR QUALIFICATION`**. This note does not authorise running,
re-running, or admitting CAP2000 as qualification evidence.
