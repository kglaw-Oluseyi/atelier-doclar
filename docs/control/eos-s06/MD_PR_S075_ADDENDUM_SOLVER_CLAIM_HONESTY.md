# MD-PR-S075 Addendum — Solver-Claim Honesty

**Status:** DRAFT FOR CEO RATIFICATION — NOT IMPLEMENTATION AUTHORITY UNTIL RATIFIED  
**Programme:** Maison Doclar Event Operating System  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway scope:** project `atelier-doclar` / environment `production` / service `event-os` only  
**Parent authority:** ratified `docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`  
**Parent SHA-256:** `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`  
**Deployed application baseline:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` — not redeployed  
**Section 9 catalogue:** `packages/shared-platform/test/seating-v2-s075-oracle-counterexamples.json`  
**Disposition:** EOS-S06 NOT ACCEPTED · CLAUDE MUST NOT BE RUN · CONTROL TOWER UNTOUCHED · EOS-S07 NOT STARTED · SECTION 10 NOT STARTED

---

## 0. Authority and exact objective

This addendum extends ratified MD-PR-S075. It does not replace it. It does not reopen Sections 1–8. It does not close Section 9. It does not authorise Section 10, `s06-eval-v4`, corpus restamp, push, deploy, Claude, acceptance, Control Tower, or EOS-S07.

Its sole objective is to prescribe the missing solver-claim honesty correction exposed by Section 9: the compiler and independent validator now agree; the production solver incorrectly treats “could not seat a required guest” as an acceptable `FEASIBLE` outcome.

Until this addendum is ratified, Cursor must remain stopped at the Section 9 hard stop. After ratification, Cursor shall execute this addendum in order, rerun Section 9, and only then continue to S075 Section 10.

### 0.1 Ratification wording

The CEO may ratify exactly:

> I RATIFY MD-PR-S075 ADDENDUM SOLVER-CLAIM HONESTY AS THE NARROW AUTHORITY TO CORRECT PRODUCTION SOLVER CLAIMS WITHOUT WEAKENING THE VALIDATOR OR ORACLE. CURSOR SHALL KEEP THE SECTION 9 COUNTEREXAMPLE CATALOGUE AND RED AGREEMENT TEST UNCHANGED UNTIL THEY PASS HONESTLY, APPLY THE SCORING AND PROOF-CLASSIFICATION CORRECTION, USE BOUNDED EXHAUSTIVE SEARCH ONLY WHERE IT CAN CERTIFY A RESULT, REGRESS THE FOUR NAMED SEEDS IN THE PRESCRIBED ORDER, RERUN SECTION 9, AND ONLY THEN CONTINUE TO SECTION 10. THIS DOES NOT ACCEPT EOS-S06, AUTHORISE REAL DATA OR PRODUCTION OPERATIONS, RUN CLAUDE, DEPLOY CONTROL TOWER, START SECTION 10 BEFORE SECTION 9 PASSES, OR START EOS-S07.

### 0.2 Finding — two-part defect

Section 9 compared the real chain (governed layout → package builder → compiler → solver → independent validator) against an independent exhaustive oracle on twelve deterministic instances, seed family `s075-oracle-v1`.

Eight feasible instances agree. Four expected-infeasible instances disagree. In every disagreement:

```text
solverClaim        = FEASIBLE
validatorVerdict   = INFEASIBLE
oracleKind         = NONE
```

The solver seated what it could, left at least one eligible required guest `UNSEATED`, and still claimed `FEASIBLE`. The validator rejected those assignments as `UNSEATED_REQUIRED_GUEST`. The oracle found no independently valid witness.

The defect has two parts:

1. **Scoring gap.** Every eligible required guest left unseated without an explicit `GOVERNED_UNSEATED` decision must count as a hard violation on a finished candidate — regardless of whether the blocking condition is capacity, `KEEP_APART`, `KEEP_TOGETHER`, `FORBID_TABLE`, or another hard rule. Current `scoreOf` counts unseated required subjects only for finished-candidate `LOCK_ASSIGNMENT`, `REQUIRE_TABLE`, `REQUIRE_ZONE`, and `REQUIRE_POSITION_CAPABILITY`. `KEEP_APART`, `KEEP_TOGETHER`, `FORBID_TABLE`, and leftover capacity treat unseating as zero hard violations. Terminal status then does `hardViolations === 0 && !contradiction → FEASIBLE`.

2. **Proof-classification gap.** A hard-invalid constructed candidate does not prove global infeasibility. The solver must not relabel a failed construction as `INFEASIBLE`. It may return:

   - `FEASIBLE` only with an independently valid witness;
   - `INFEASIBLE` only with exhaustive or otherwise certified proof;
   - `TIMED_OUT` or `UNKNOWN` when it cannot complete that proof.

Parent S075 §6 already required this classification. Section 6 closed the `REQUIRE_TABLE` / `LOCK` finished-candidate hole. Section 9 proved the remaining hole. This addendum closes that hole without weakening §6’s prohibition on guessed infeasibility.

### 0.3 Non-negotiable invariants

Parent S075 §0.3 remains in force. In addition:

1. Keep the Section 9 counterexample catalogue and the red agreement test unchanged until they pass because the solver is honest.
2. Do not weaken the independent validator.
3. Do not weaken the independent exhaustive oracle.
4. Do not add `GOVERNED_UNSEATED` automatically. That reason exists only when an explicit governed unseat decision already exists on the assignment.
5. Do not translate every failed construction into `INFEASIBLE`.
6. Do not change compiler table-token semantics or accepted layout capacity truth to satisfy a fixture.
7. Do not special-case the four named seeds inside production solver code.
8. Do not share validator or oracle implementation with the solver to manufacture agreement.
9. Historic packages, runs, rules, reservations and `s06-eval-v3` remain immutable. Do not restamp v3.
10. Event OS only may later be deployed under parent Section 12. This addendum does not authorise deploy, push, or Section 10.

---

# A. Placement and stop

## A.1 Placement

1. This file lives at `docs/control/eos-s06/MD_PR_S075_ADDENDUM_SOLVER_CLAIM_HONESTY.md`.
2. Compute SHA-256 after the byte-for-byte placement.
3. Record the hash in the implementation ledger and current state. Do not embed the hash inside this file.
4. Do not edit the ratified parent S075 file. Its SHA-256 must remain `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`.

## A.2 Required stop until ratification

Before ratification:

- do not change solver scoring or claim classification;
- do not change the validator or oracle;
- do not green the Section 9 agreement test by skipping, filtering, or rewriting instances;
- do not start Section 10;
- do not push or deploy.

After ratification, execute Sections B–F in order. Continue automatically only after each exit gate. Stop rather than speculate.

## A.3 Exit gate

Authority file is placed, hashed, and recorded. Parent S075 file is untouched. Section 9 catalogue and red agreement test remain in place. Stop until ratification.

---

# B. Scoring correction

## B.1 Finished-candidate hard violations

On a **finished** candidate only, the solver’s internal hard check must count a hard violation when:

- a guest is eligible and required to be seated; and
- that guest is not assigned a position; and
- the assignment does not already carry an explicit `GOVERNED_UNSEATED` reason from a governed unseat decision.

The blocking condition is irrelevant. Capacity shortfall, `KEEP_APART`, `KEEP_TOGETHER`, `FORBID_TABLE`, `REQUIRE_TABLE`, locks, reservations, capabilities, and any other hard rule are all the same: leaving the required guest unseated is a hard violation.

Reason codes such as `NO_FEASIBLE_POSITION`, `CAPACITY`, `HARD_SEPARATION`, or `HARD_GROUP` explain why construction failed. They are not a governed exception and must not clear the violation.

## B.2 Partial probes

Do not count not-yet-assigned required guests as hard violations during incomplete constructive probes. That mistake already caused the Section 6 first-run timeout on large corpora. Partial `scoreOf(..., complete = false)` remains a search heuristic. It must not become a `FEASIBLE` claim and must not become an `INFEASIBLE` proof.

## B.3 No automatic exception

The solver must not invent, copy, or infer `GOVERNED_UNSEATED` to make a leftover guest look legal. If no governed unseat decision exists, the guest remains a hard violation on a finished candidate.

## B.4 Version identity

Advance the solver contract/version from the current `s06-solver-v2` / `eos-s06-solver-v2` to the next repository-consistent edition (for example `s06-solver-v3`). Parent Section 7 reuse identity includes `solverVersion`. Historic `s06-solver-v2` runs remain immutable and cannot be reused or adopted as success under the corrected version. Do not backfill historic rows with the new version.

Record the exact version strings in a short control note. Do not change compiler version solely for this scoring fix. Do not change validator version.

## B.5 Exit gate

Finished-candidate scoring treats every unseated required guest without `GOVERNED_UNSEATED` as a hard violation. Partial probes do not guess infeasibility. Solver version is advanced. Historic runs are untouched. Focused scoring tests pass. Continue.

---

# C. Proof classification

## C.1 Allowed claims

The production solver may return only:

| Claim | Required proof |
|---|---|
| `FEASIBLE` | A finished assignment that the solver’s internal hard check accepts **and** that the independent validator would accept. No required guest may remain unseated without explicit `GOVERNED_UNSEATED`. |
| `INFEASIBLE` | Exhaustive search within the supported finite bound proves no valid assignment exists, or an independently verified sound certificate proves the same. |
| `TIMED_OUT` | The time or node budget ended before a witness or exhaustive proof was obtained. Existing run contract. |
| `UNKNOWN` | Search is otherwise incomplete. Map onto the existing persistence enum only if `UNKNOWN` is already a durable run status; otherwise use `TIMED_OUT` for incomplete proof and never invent a new enum solely for naming. |

A failed seed, a leftover unseated guest, or a hard-invalid construction is **not** `INFEASIBLE` by itself. Continue the governed search. If the budget ends first, return `TIMED_OUT` / `UNKNOWN`.

## C.2 Launch persistence

Durable run status must not present `solverClaim === FEASIBLE` as a successful seating when the independent validator returns `INFEASIBLE`. The validator remains authoritative for Adopt. Do not make the validator agree with a dishonest solver claim.

Do not change this by trusting the solver and skipping validation.

## C.3 Exit gate

Claim tests prove: valid witness → `FEASIBLE`; exhaustive none → `INFEASIBLE`; incomplete search → `TIMED_OUT` / `UNKNOWN`; never guessed `INFEASIBLE`; never `FEASIBLE` with an unseated required guest. Continue.

---

# D. Bounded exhaustive search

## D.1 When the solver must exhaust

For instances no larger than the Section 9 oracle bounds — at most 5 eligible guests and 12 positions — the production solver must complete a deterministic exhaustive search of the same injection space the oracle uses: eligible required guests onto unique positions, rejecting any finished candidate that fails the finished-candidate hard check.

Within those bounds:

- if a validating witness exists, return `FEASIBLE` with that witness;
- if every assignment is examined and none validates, return `INFEASIBLE`;
- do not return `TIMED_OUT` on these tiny instances unless an explicit external deadline is already exhausted, which must not happen in the Section 9 suite.

Larger instances keep the existing constructive/component search. Incomplete larger search is `TIMED_OUT` / `UNKNOWN`, never guessed `INFEASIBLE`.

## D.2 Independence

The production exhaustive path must not import the test-only oracle module. Agreement is proven by comparison, not by calling the test helper from production.

The oracle remains test-only and authoritative for Section 9 comparison. Do not move it into production to “fix” the solver.

## D.3 Determinism

Same compiled request and seed must produce the same claim, assignment hash, and result hash. Preserve existing seed handling.

## D.4 Exit gate

Bounded exhaustive path exists in production solver code, does not import the test oracle, and is deterministic. Continue.

---

# E. Regression seeds

Do not rewrite, skip, or filter these instances. They remain the mandatory first regressions after the scoring and classification correction. Rebuild them through the real chain. Compare solver, validator, and oracle.

Execute in this order:

| Order | Seed | Required honest result |
|---|---|---|
| 1 | `s075-oracle-v1:capacity-infeasible` | Smallest case. Solver `INFEASIBLE`. Validator `INFEASIBLE`. Oracle `NONE`. |
| 2 | `s075-oracle-v1:forbid-infeasible` | Solver `INFEASIBLE`. Validator `INFEASIBLE`. Oracle `NONE`. |
| 3 | `s075-oracle-v1:apart-infeasible` | Solver `INFEASIBLE`. Validator `INFEASIBLE`. Oracle `NONE`. |
| 4 | `s075-oracle-v1:together-infeasible` | Solver `INFEASIBLE`. Validator `INFEASIBLE`. Oracle `NONE`. |

Then rerun the remaining eight agreed instances. They must remain `FEASIBLE` with oracle `WITNESS` and independent validator `FEASIBLE`. Deterministic repetition must preserve assignment and result hashes.

If any named seed still disagrees, stop. Preserve the minimal failing case. Do not patch around it. Do not start Section 10.

Catalogue path remains `packages/shared-platform/test/seating-v2-s075-oracle-counterexamples.json`. Named dumps beside it remain evidence. Package hashes in those dumps may change across fixture rebuilds because layout object IDs are generated; the seed and structural disagreement are the durable identity.

## E.1 Exit gate

All four named seeds now agree as `INFEASIBLE` / `INFEASIBLE` / `NONE`. The eight previously agreed feasible instances still agree. Continue.

---

# F. Rerun Section 9, then and only then Section 10

## F.1 Section 9 rerun

Rerun the existing differential suite without weakening it:

- documented sample count remains 12;
- mutation controls still detect every prescribed mutation from observations, not from a test-authored failure flag;
- real chain only; hand-authored matching tokens remain insufficient;
- catalogue and agreement test stay in the same files.

Section 9’s original exit gate then applies: the exhaustive/differential suite passes across the documented sample and catches every mutation. Commit the honesty correction and the now-green Section 9 proof together. Update the catalogue status from `STOPPED` to the honest passing record. Continue to parent Section 10 only after that commit.

## F.2 Still prohibited here

- start Section 10 before Section 9 passes;
- create `s06-eval-v4` or advance the corpus;
- restamp `s06-eval-v3`;
- push or deploy;
- run Claude;
- accept EOS-S06;
- deploy Control Tower;
- start EOS-S07.

## F.3 Exit gate

Section 9 passes honestly. Catalogue records the correction. Parent Section 10 becomes the next authorised step. Verdict remains **NOT READY FOR CLAUDE** until parent Sections 10–14 complete.

---

# G. Global prohibited shortcuts

Prohibited under this addendum:

- greening Section 9 by deleting, skipping, or rewriting counterexamples;
- weakening validator `UNSEATED_REQUIRED_GUEST`;
- teaching the oracle to accept unseated required guests as witnesses;
- auto-stamping `GOVERNED_UNSEATED` on leftover guests;
- mapping every failed seed to `INFEASIBLE`;
- counting unseated guests during partial probes as global proof;
- changing compiler tokens or capacity truth to hide the defect;
- reusing historic `s06-solver-v2` `FEASIBLE` runs under the corrected solver version;
- importing the test oracle into production;
- starting Section 10, pushing, or deploying to satisfy a fixture.

Hard stop and report if:

- a named regression seed still shows solver `FEASIBLE` against oracle `NONE`;
- the solver begins returning `INFEASIBLE` on an instance for which the oracle finds a witness;
- validator or oracle behaviour is changed to manufacture agreement;
- `s06-eval-v3` is restamped;
- production becomes authorised or real data appears.

---

End exactly after ratification-and-execution, and only if Section 9 has passed honestly:

`EOS-S06 MD-PR-S075 ADDENDUM SOLVER-CLAIM HONESTY EXECUTED — SECTION 9 RERUN PASSED — SECTION 10 NOW AUTHORISED UNDER PARENT MD-PR-S075 — NOT ACCEPTED — NOT READY FOR CLAUDE — EOS-S07 NOT STARTED.`

Until then the verdict remains **NOT READY FOR CLAUDE**.
