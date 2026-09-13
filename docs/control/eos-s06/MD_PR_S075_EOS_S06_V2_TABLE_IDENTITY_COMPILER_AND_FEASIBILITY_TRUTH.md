# MD-PR-S075 — EOS-S06 V2 Table Identity, Compiler and Feasibility Truth

**Status:** DRAFT FOR CEO RATIFICATION — NOT IMPLEMENTATION AUTHORITY UNTIL RATIFIED  
**Programme:** Maison Doclar Event Operating System  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway scope:** project `atelier-doclar` / environment `production` / service `event-os` only  
**Required repository baseline:** `d6b1364afd5616134617c98ecb49a39e4931680e`  
**Required deployed application baseline:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`  
**Parent authorities:** ratified MD-PR-S072 and MD-PR-S073  
**Independent evidence:** MD-PR-S074 NOT READY  
**Disposition:** EOS-S06 NOT ACCEPTED · CLAUDE MUST NOT BE RUN DURING THIS REMEDIATION · EOS-S07 NOT STARTED

---

## 0. Authority and exact objective

This is the sole implementation authority for diagnosing and correcting the EOS-S06 V2 table-target namespace defect and its directly related feasibility, reservation, solver-claim, replay-identity, authoring and seating-capacity truth gaps.

It does not authorise another S06 rewrite. Preserve the V2 architecture already delivered under S072/S073: normalized durable persistence, immutable input packages/runs/plans/publications, independent validation, repaired recall identity, governed reservation lifecycle, action settlement, last-known-good publication and role authority.

Cursor shall execute Sections 1–14 in order. It may continue automatically only after each section's exit gate passes. It must stop rather than speculate when a hard stop applies.

### 0.1 Ratification wording

The CEO may ratify exactly:

> I RATIFY MD-PR-S075 AS THE SOLE AUTHORITY TO PROVE AND CORRECT THE EOS-S06 V2 TABLE-IDENTITY, PACKAGE-COMPILER AND FEASIBILITY-TRUTH DEFECTS. CURSOR SHALL VERIFY THE EXACT DURABLE S074 PACKAGE BEFORE CHANGING CODE, EXECUTE SECTIONS 1–14 IN ORDER, CONTINUE AUTOMATICALLY ONLY AFTER EACH EXIT GATE PASSES, AND STOP AT EVERY HARD STOP. THIS DOES NOT ACCEPT EOS-S06, AUTHORISE REAL DATA OR PRODUCTION OPERATIONS, RUN CLAUDE, DEPLOY CONTROL TOWER, OR START EOS-S07.

### 0.2 Known independent evidence

On deployed SHA `1ce6e0f…`, S074 used event `6f88bc98-18c8-4379-bff4-ac8041d0043b` and a reservation-free package with hash prefix `bad17b83dc9f`.

Four required synthetic guests and two displayed tables were present. The three ACTIVE HARD rules were:

1. `REQUIRE_TABLE`: G1 and G4 target T1.
2. TABLE-scope `KEEP_APART`: G1 and G2.
3. TABLE-scope `KEEP_APART`, SECURITY: G3 and G2.

No reservation governed the decisive package. The solver returned two seated/two unseated and the independent validator correctly returned INFEASIBLE. No Adopt control appeared.

A plausible witness exists under the product's visible semantics:

```text
T1: G1, G4, G3
T2: G2
```

Fable's read-only repository review found that:

- positions use `exactHash({ table: objectId }).slice(0, 32)` as `tableToken`;
- rule/reservation TABLE targets are compiled from raw `target.idOrCode`;
- the UI submits the layout table `objectId` UUID;
- raw UUID targets cannot equal compiled position table tokens;
- tokenising the same target made the witness and production solver FEASIBLE with four seated;
- current evaluation lacks a feasible end-to-end table-targeted case.

That is a highly credible diagnosis, but Section 2 must confirm it against the exact durable package before implementation.

### 0.3 Non-negotiable invariants

1. Layout `objectId` remains the governed authoring identity for a table.
2. Solver-facing table identity is a deterministic opaque token derived in exactly one canonical function.
3. Raw layout UUIDs, guest IDs, names and free text do not cross the solver boundary.
4. Every TABLE target must resolve to a table in the bound published layout and to at least one usable compiled position.
5. HARD rules are never relaxed, omitted or satisfied by unseating required subjects.
6. The independent validator remains authoritative and imports no solver implementation.
7. A failed candidate does not prove global infeasibility.
8. INFEASIBLE requires exhaustive proof within the supported finite search or an independently verified sound certificate.
9. Historic packages/runs/rules/reservations remain immutable.
10. Compiler/solver/config/validator identity participates in safe run reuse as specified below.
11. Drafts and withdrawn authority never govern.
12. Last-known-good publication remains current during remediation and successor work.
13. No manual SQL, destructive migration, real data or external effect.
14. Event OS only may be deployed. Control Tower is untouched.
15. Claude, acceptance and EOS-S07 remain stopped.

---

# 1. Baseline, placement and unchanged-history gate

## 1.1 Placement

1. Find this file in repository root.
2. Compute SHA-256.
3. Move byte-for-byte to:

   `docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`

4. Recompute SHA-256 and require an exact match.
5. Commit only the authority placement after all baseline checks pass.

## 1.2 Required checks

Before edits require:

- local HEAD = `origin/main` = GitHub `main` = `d6b1364afd5616134617c98ecb49a39e4931680e`;
- worktree clean except this untracked authority file;
- live `/api/health/live` deployed SHA = `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`;
- ready true, POSTGRES, migrations APPLIED;
- `productionAuthorised:false`;
- S05A/S05B unchanged and PASSED;
- current S06 `s06-eval-v3`, 35 persisted cases, PASSED on the baseline;
- providers inactive;
- no active deployment or unrelated branch.

If any differs, stop. Do not reset, merge, pull/rebase, push, deploy or infer a new baseline.

## 1.3 Preserve evidence

Do not edit/delete:

- package beginning `bad17b83dc9f`;
- its compiled request;
- its INFEASIBLE run and validation report;
- S074 rules/reservations/history;
- S073 publications;
- S074 report or first-run failures.

## 1.4 Exit gate

Baseline and authority hash pass; placement committed; no product code changed. Continue to Section 2.

---

# 2. Mandatory exact durable-package confirmation — read-only

## 2.1 Objective

Prove or disprove the namespace mismatch in the exact live-derived package before changing application code.

Use existing repository/service read paths or a temporary local read-only diagnostic script against an authorised copy/connection. The script must perform SELECT/read only. It must not mutate PostgreSQL, change status, create audit rows, re-freeze or launch.

## 2.2 Resolve the exact package

Find exactly one immutable input package whose full `contentHash` begins `bad17b83dc9f` and belongs to event `6f88bc98-18c8-4379-bff4-ac8041d0043b` in the Maison fixture organisation.

Stop if zero or multiple matches exist.

Record permission-safe:

- package ID;
- full content hash;
- semantic hash;
- compiled request ID/hash;
- layout publication/revision identity and hash;
- compiler/solver/config/validator versions;
- seed;
- rule/reservation counts;
- run ID/status/claim/verdict.

Do not print guest names, contact data, form evidence, tokens, secrets or entire compiled JSON.

## 2.3 Required diagnostic projection

Produce a bounded diagnostic object equivalent to:

```ts
interface S075TableNamespaceDiagnostic {
  packageId: string;
  packageHash: string;
  compiledRequestHash: string;
  positionTableTokens: Array<{
    tableToken: string;
    positionCount: number;
  }>;
  tableTargetRules: Array<{
    ruleEditionId: string;
    predicate: "REQUIRE_TABLE" | "FORBID_TABLE";
    rawTarget: string;
    rawTargetLength: number;
    rawTargetLooksUuid: boolean;
    canonicalToken: string;
    canonicalTokenPresentInPositions: boolean;
    rawTargetPresentInPositions: boolean;
  }>;
  tableTargetReservations: Array<{
    reservationEditionId: string;
    rawTarget: string;
    canonicalToken: string;
    canonicalTokenPresentInPositions: boolean;
    rawTargetPresentInPositions: boolean;
  }>;
}
```

The `canonicalToken` must be computed by invoking the exact function currently used for positions, not by independently retyping its algorithm.

## 2.4 Expected proof

For the decisive `REQUIRE_TABLE` rule require evidence that:

```text
raw target is the published T1 layout object UUID (36 characters)
position table tokens are derived 32-character tokens
raw target ∩ position table tokens = empty
canonicalToken(raw target) ∈ position table tokens
```

Also inspect any historic table-target reservation and `FORBID_TABLE` compiled representation to establish the affected surface, without treating historic non-governing rows as current.

## 2.5 Existing code-path map

Record exact files/symbols for:

- position token creation;
- `compileRule`;
- `compileReservation`;
- rule-target persistence;
- rule form/action/schema;
- reservation form/action/schema;
- solver `REQUIRE_TABLE` and `FORBID_TABLE` domain filtering;
- validator table comparison;
- compiled-request forbidden-identity guard;
- run reuse query/predicate;
- evaluation cases that cover table targets.

## 2.6 Hard stop

Create `docs/control/eos-s06/MD_PR_S075_FORENSIC_TABLE_NAMESPACE_FINDING.md`.

If the expected mismatch is not present, the canonical token is also absent, the package includes unexpected authority, or another layer explains the result first: stop for AI CTO review. Do not implement Sections 3 onward.

If the exact mismatch is proven, commit the finding/code-path map and continue automatically.

---

# 3. Tests-first failing contract

Before production code changes, add tests that use the real package builder and compiler—not hand-authored matching tokens.

## 3.1 Exact witness regression pair

Construct a permission-safe fixture equivalent to S074 with UUID table object IDs, two tables/capacity, four opaque subject IDs and R1–R3.

Path must be:

```text
published layout projection
→ finish/build immutable V2 package
→ compile request
→ independent validator explicit witness
→ production solver
→ independent validator solver result
```

Pre-fix assertions:

- compiled REQUIRE_TABLE target does not match position tokens;
- explicit witness is rejected only for `REQUIRE_TABLE_VIOLATED` while structural uniqueness/capacity otherwise pass;
- solver seats two/unseats two;
- final validator refuses FEASIBLE.

Post-fix expectations must already be written but fail before implementation:

- compiled targets resolve;
- explicit witness FEASIBLE;
- solver seats all four;
- independent verdict FEASIBLE;
- all R1–R3 outcomes SATISFIED.

Do not delete the pre-fix diagnostic assertion; move it into a mutation/legacy reproduction test that proves the old compiler shape is rejected.

## 3.2 Targeted rule tests

Add through the real builder:

1. `REQUIRE_TABLE` feasible.
2. `REQUIRE_TABLE` missing published table → governed validation failure before run.
3. `FORBID_TABLE` actually excludes the table.
4. Table-targeted reservation feasible and enforced.
5. Reservation target missing → governed validation failure.
6. TABLE target raw UUID absent from final compiled solver request.
7. Array/nested raw UUID injection rejected.
8. Two different table object IDs produce different stable tokens.
9. Same table object ID produces the same token everywhere.

## 3.3 Solver-claim tests

Add:

- candidate leaving required subject unseated is not reported FEASIBLE;
- solver continues searching if another feasible candidate exists;
- solver reports INFEASIBLE only after exhaustive/certified proof;
- budget exhaustion is UNKNOWN/TIMED_OUT, never INFEASIBLE;
- every FEASIBLE solver candidate independently validates.

## 3.4 Replay/version tests

Add:

- exact package/compiler/solver/config/validator/seed identity reuses completed run;
- validator version change prevents reuse;
- compiler version or compiled request change prevents reuse;
- reservation withdrawal changes package identity;
- exact reversion may reuse the prior immutable result only when every identity matches;
- replay writes no second successful computation audit.

## 3.5 Exit gate

Tests reproduce the pre-fix defect and the intended corrected assertions fail for the expected reason. Commit tests separately. Continue to Section 4.

---

# 4. Canonical table-token contract

## 4.1 Single function

Locate the existing position-token expression and extract it without changing its algorithm:

```ts
export const seatingV2TableToken = (
  tableObjectId: LayoutObjectId,
): SeatingV2TableToken =>
  SeatingV2TableTokenSchema.parse(
    exactHash({ table: tableObjectId }).slice(0, 32),
  );
```

Use actual branded types/schemas already present. If none exists, introduce exactly one `SeatingV2TableTokenSchema` for a lowercase 32-hex token. Do not create multiple hashing helpers or change the hash input/domain in this remediation; preservation of the existing position-token algorithm avoids unnecessary token churn.

## 4.2 Use everywhere at the solver boundary

Replace duplicated/raw conversion for every solver-facing table reference:

- compiled positions;
- `REQUIRE_TABLE` targets;
- `FORBID_TABLE` targets;
- TABLE reservations;
- table locks/exclusions;
- manual-change validation inputs where table token is required;
- certificate table references;
- diagnostic projections.

The durable authoring target remains the raw layout `objectId`. Conversion occurs exactly once while compiling against the bound published layout.

## 4.3 Resolution helper

Implement one bounded resolver conceptually:

```ts
interface CompiledTableIndex {
  byObjectId: ReadonlyMap<LayoutObjectId, {
    objectId: LayoutObjectId;
    tableToken: SeatingV2TableToken;
    positionTokens: readonly SeatingV2PositionToken[];
    positionSource: "PHYSICAL" | "DECLARED_SYNTHETIC";
    declaredCapacity: number;
    physicalPositionCount: number;
    effectiveCapacity: number;
  }>;
  tableTokens: ReadonlySet<SeatingV2TableToken>;
}

function resolveTableTarget(
  rawObjectId: LayoutObjectId,
  index: CompiledTableIndex,
): SeatingV2TableToken {
  const table = index.byObjectId.get(rawObjectId);
  if (!table || table.positionTokens.length === 0) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "A governing seating rule targets a table that is not usable in the current published layout.",
    );
  }
  return table.tableToken;
}
```

Use the repository's actual error constructor and safe field mapping. Do not leak the raw UUID in public error text.

## 4.4 Compiler invariants

Before hashing/persisting a new compiled request, assert:

- all compiled TABLE targets are members of `positionTableTokens`;
- each table target has at least one usable position;
- every position references one known table token;
- no duplicate position token;
- capacity equals the effective position count;
- every ACTIVE reservation target resolves;
- every target originates from the same bound layout publication/event/org;
- no raw operational UUID remains anywhere in the solver request.

Failure is `VALIDATION_FAILED`/NOT_APPLIED before run creation. It cannot become an INFEASIBLE solver result because malformed compilation is not a legitimate optimisation problem.

## 4.5 Recursive/structural forbidden-identity guard

Replace the key-suffix-only check with a schema-aware recursive boundary validation.

Requirements:

- traverse objects and arrays;
- reject UUID-shaped operational IDs in solver-facing subject/table/position/rule/reservation reference values;
- reject names, email, phone, address and free-text fields by schema/path;
- allow only explicitly modelled hashes, opaque tokens, enums, counts, booleans and numeric geometry/capacity values;
- do not reject a legitimate token merely because arbitrary data coincidentally resembles a UUID—prefer branded schema/path enforcement over a global regex alone;
- mutation tests place raw IDs inside arrays and nested objects.

## 4.6 Version identity

Introduce/advance a compiler contract identity, for example `s06-compiler-v2` or the next repository-consistent edition. Advance the solver/config identity only where the existing contract defines compiled input shape as part of that identity. Record exact decisions in an ADR/control note.

New package content/compiled hashes must differ from the legacy raw-target package. Historic packages remain readable and immutable.

## 4.7 Exit gate

Canonical helper is the only solver table-token constructor; all target paths use the resolver; malformed targets fail before run; raw IDs cannot cross; focused tests pass. Commit compiler changes coherently. Continue.

---

# 5. Predicate semantics and authoring contract

## 5.1 Canonical subject cardinality

Encode cardinality by predicate in shared schemas and server commands:

| Predicate | Subjects | Table target |
|---|---:|---|
| `KEEP_TOGETHER` | exactly 2 | absent; relation applies according to explicit scope |
| `KEEP_APART` | exactly 2 | absent; relation applies according to explicit scope |
| `REQUIRE_TABLE` | 1 or more within existing bounded UI/domain limit | exactly 1 required |
| `FORBID_TABLE` | 1 or more within existing bounded UI/domain limit | exactly 1 required |
| information-only | predicate-specific, never silently HARD | only if its documented meaning requires it |

Do not retain an inert Table selector for pairwise predicates. Do not silently reinterpret historic data.

## 5.2 UI

The rule form must react to predicate selection:

- show “First guest” and “Second guest” only for pairwise relations;
- show at least one “Guest” for table requirements/prohibitions;
- allow an optional additional guest only if the command/schema genuinely supports multiple independent subjects;
- show and require Table only for `REQUIRE_TABLE`/`FORBID_TABLE`;
- show plain-language effect before save:
  - “Bola must be seated at Table 1”;
  - “Each selected guest must be seated at Table 1” for multiple subjects;
  - “Bola and Damilola must be seated at different tables”;
- preserve values across expected validation errors;
- use governed selectors, never raw ID text fields;
- errors use summary, `aria-invalid`, `aria-describedby` and focus first invalid field.

Use permission-safe labels for Auditor.

## 5.3 Server enforcement

Never trust hidden fields or conditional rendering. Server validates cardinality, target presence/absence, same event/org, current published layout membership and duplicates.

New pairwise commands carrying an inert table target are rejected with human-safe validation. Historic approved pairwise editions with an inert stored target remain immutable and compile according to their documented pairwise semantics; do not rewrite them.

Historic two-subject `REQUIRE_TABLE` remains valid and means each subject independently requires the table. No migration/rewrite.

## 5.4 Rule readability

Every list/detail/package/validation outcome must display:

- rule label;
- predicate and scope;
- human-readable subjects;
- target table where relevant;
- HARD/SOFT/INFORMATIONAL;
- lifecycle and governing/history status;
- author/checker and decision time where permitted;
- edition/hash provenance;
- exact semantic sentence.

## 5.5 Exit gate

Predicate-specific component/server tests pass at 360/768/1440 and keyboard operation. Existing historical editions remain valid. Commit UI/schema/command changes. Continue.

---

# 6. Solver-claim honesty and independent validation

## 6.1 Do not relabel a failed candidate as global infeasibility

The solver may claim `FEASIBLE` only when its candidate internally satisfies:

- every required subject seated or governed exception;
- uniqueness;
- position/table capacity;
- eligibility;
- every HARD compiled rule/reservation/lock.

The independent validator must still re-evaluate it.

If a constructed candidate is invalid, the solver must continue its governed search. It may claim INFEASIBLE only when:

- its complete finite search proves no solution; or
- it emits a finite sound certificate later independently verified.

If time/node budget ends first, outcome is UNKNOWN/TIMED_OUT according to existing run contract, never INFEASIBLE.

## 6.2 Candidate contract

Adapt existing types rather than create a parallel run model. Conceptually distinguish:

```ts
type SolverClaim =
  | { kind: "CANDIDATE"; assignments: readonly SolverAssignment[] }
  | { kind: "INFEASIBLE"; certificate?: InfeasibilityCertificate }
  | { kind: "UNKNOWN"; reason: "TIME_BUDGET" | "NODE_BUDGET" | "SEARCH_INCOMPLETE" };
```

If existing persistence uses `FEASIBLE | INFEASIBLE | UNKNOWN`, map `CANDIDATE` internally to the existing FEASIBLE claim only after the solver's internal hard check. Do not change database enum solely for naming if unnecessary.

## 6.3 Independent validator

Unchanged authority rules:

- imports no solver implementation;
- reloads/binds exact package/hash;
- checks every structural/HARD/reservation outcome;
- records its own version/hash;
- disagreements are visible/audited;
- only independent `FEASIBLE` enables Adopt;
- invalid certificate cannot establish INFEASIBLE.

## 6.4 Explicit witness

After compiler correction, run the exact witness through the independent validator and solver. Require four seated, zero required unseated, all rules SATISFIED.

Preserve the historic raw-target package/run as INFEASIBLE history; never recalculate or relabel it.

## 6.5 Exit gate

Solver-claim tests and explicit-witness end-to-end tests pass. No validator weakening. Commit. Continue.

---

# 7. Replay and immutable identity correction

## 7.1 Safe run-reuse tuple

Completed run reuse must require equality of:

```ts
interface SeatingV2RunReuseIdentity {
  packageContentHash: string;
  semanticHash: string;
  compiledRequestHash: string;
  compilerVersion: string;
  solverVersion: string;
  solverConfigurationHash: string;
  validatorVersion: string;
  seed: string;
}
```

Use actual existing fields. If a field is embedded in another signed/hash-bound identity, document and test that equivalence rather than duplicating storage blindly.

## 7.2 Behaviour

- exact tuple + completed current-compatible result → REPLAYED, same run identity, no computation/audit duplication;
- changed compiler/validator/config/package → new run;
- QUEUED/RUNNING exact tuple → truthful in-progress, no duplicate;
- TIMED_OUT/CANCELLED/ERROR → new command may create linked retry, never reuse as success;
- historic raw-target result cannot govern/adopt under the corrected compiler version;
- packages/runs remain immutable.

## 7.3 Persistence

Prefer no migration if all identities are already persisted. If `validatorVersion` or `compilerVersion` is missing from normalized run/package records and cannot be proven through an existing bound hash, add the next unused additive replay-safe migration. Never edit an applied checksum. Backfill historic values as explicit legacy/unknown identities; do not assign the current version to old rows.

## 7.4 Exit gate

Replay matrix passes in memory and PostgreSQL integration tests; old run remains history; new compiler cannot reuse it. Commit migration/repository changes separately if needed. Continue.

---

# 8. Layout capacity and physical-position truth

This was not causal for `bad17…`, but S074 exposed an operator-truth gap that must be closed before acceptance.

## 8.1 Authoritative policy

For each table compile and project:

```ts
type SeatingPositionSource = "PHYSICAL" | "DECLARED_SYNTHETIC";

interface SeatingTableCapacityTruth {
  tableObjectId: LayoutObjectId;          // staff-side only
  tableToken: SeatingV2TableToken;
  positionSource: SeatingPositionSource;
  declaredCapacity: number;
  physicalPositionCount: number;
  effectiveCapacity: number;
  mismatch: boolean;
}
```

Rules:

1. If physical seat objects exist, they are authoritative positions.
2. If none exist and the accepted layout contract permits declared capacity, generate deterministic synthetic position tokens and label source `DECLARED_SYNTHETIC`.
3. If physical count and declared capacity differ, do not silently choose one. Seating readiness/freeze must present a governed blocking `SEAT_CAPACITY_MISMATCH` until the layout is corrected or an existing authorised policy explicitly reconciles it.
4. Auditor/client projections omit raw object IDs and geometry but retain truthful effective capacity/source wording where permitted.
5. Manual assignments/exports use the same position set as solver and validator.

Do not invent invisible extra seats after a physical inventory exists.

## 8.2 Studio correction

- Initialise physical-seat-count control from persisted table seat objects/current state, never constant `"6"`.
- After generation, reload shows the persisted value.
- Navigator lists generated seats using human-readable labels.
- Destructive regeneration requires clear confirmation and creates governed layout successor/history according to the existing layout contract.
- Seating package becomes stale when current published layout position truth changes.

## 8.3 Tests

- new table with zero physical seats and declared capacity: deterministic declared mode where allowed;
- generate physical seats, publish, reload: physical mode/count persists;
- declared/physical mismatch blocks freeze;
- add/remove/disable table in successor invalidates package;
- downstream/UI/solver/validator/export counts agree;
- responsive/keyboard confirmation.

## 8.4 Exit gate

Capacity truth is consistent and visible; no silent mismatch. Existing accepted layout semantics are preserved. Commit. Continue.

---

# 9. Differential solver/validator assurance

## 9.1 Exhaustive oracle

Implement deterministic small-instance enumeration in tests only:

- 1–2 tables;
- 1–6 positions per table;
- 1–5 required subjects;
- optional governed-unseated cases only where the contract permits;
- HARD `KEEP_TOGETHER`, `KEEP_APART`, `REQUIRE_TABLE`, `FORBID_TABLE`;
- ACTIVE table reservations;
- eligibility and capacity boundaries;
- UUID layout object IDs compiled through the real builder;
- opaque Unicode-safe subject tokens.

Enumerate all bounded assignments including unseated, validate each with the independent validator, and compare existence with production solver.

## 9.2 Properties

Require:

- solver candidate → independent FEASIBLE;
- oracle witness exists → solver returns a candidate within bounded small-instance search;
- solver INFEASIBLE → oracle finds no witness;
- solver UNKNOWN/TIMED_OUT never presented as INFEASIBLE;
- each table-target token belongs to the compiled table set;
- changing raw table object ID changes token/hash;
- no raw identity crosses request boundary;
- repeated same seed/request is deterministic.

If `fast-check` or another generator already exists, use it. Do not add a large dependency unnecessarily; a deterministic seeded generator is acceptable. Preserve failing seeds as named regression fixtures.

## 9.3 Mutation assurance

Test-only mutations:

- leave rule target raw;
- tokenize positions differently;
- omit FORBID_TABLE;
- invert KEEP_APART;
- allow unseated required subject;
- trust solver claim;
- reuse across validator version;
- count declared capacity despite fewer physical seats;
- accept missing table target.

Every mutation must fail assurance.

## 9.4 Exit gate

Exhaustive/differential suite passes across a documented deterministic sample count and catches every mutation. Commit tests. Continue.

---

# 10. Evaluation v4 and readiness

## 10.1 Honest advance

Create the next current edition `s06-eval-v4` and corresponding contract version after confirming v3 is current. Compute a new corpus hash from canonical cases/contracts. The v3 pass becomes STALE when the new application/corpus is deployed. Never edit/restamp it.

## 10.2 Required new real-path cases

Add at least:

1. feasible one-subject `REQUIRE_TABLE` through layout→builder→compiler→solver→validator;
2. feasible historic-style two-subject `REQUIRE_TABLE`;
3. `FORBID_TABLE` actually excludes;
4. table-target reservation feasible/enforced;
5. missing table target rejected before run;
6. raw UUID array/nested injection rejected;
7. S074 four-guest witness FEASIBLE;
8. invalid solver candidate not claimed FEASIBLE;
9. incomplete search not claimed INFEASIBLE;
10. validator-version change prevents reuse;
11. compiler-version change prevents reuse;
12. physical/declared mismatch blocks freeze;
13. declared-synthetic mode honest where permitted;
14. mutation sensitivity for raw-target mismatch.

Cases invoke production functions and durable repositories. Observations derive from resulting state. Cases cannot write `passed` or call hand-built compiler-bypassing fixtures.

## 10.3 Readiness truth

- before current v4 run: STALE/blocked/releaseReady false;
- queued/running/error/incomplete/persisted-count mismatch: blocked;
- only current compatible v4 with all persisted cases and zero-tolerance clear: PASSED/unblocked/releaseReady true;
- prior v3 remains immutable history.

## 10.4 Exit gate

Focused evaluation/readiness/mutation tests pass and false evaluator mutations fail. Record edition, contract, count and hash. Do not run live corpus yet. Continue.

---

# 11. Full local gates

Run in memory-safe isolated groups where necessary; record every first-run failure:

1. S075 forensic regression and explicit witness.
2. Compiler/table token/reservation/FORBID tests.
3. Rule form/schema/action tests.
4. Solver claim and validator tests.
5. Replay/version PostgreSQL integration tests.
6. Layout capacity/Studio tests.
7. Differential/property and mutation tests.
8. S072/S073 changed-risk tests.
9. S06 evaluation v4/readiness.
10. `pnpm typecheck`.
11. full shared-platform suite, zero failures.
12. full Event OS unit suite, zero failures.
13. `pnpm programme:validate`.
14. Event OS production build.
15. `git diff --check`.
16. local Playwright for rules, reservations, input readiness, feasible/infeasible, Studio, reviewer, publication/export, roles and responsive/accessibility.

Do not carry baseline failures without AI CTO authority. Do not increase timeouts. Test helpers must require fresh correlations and cannot connect to Railway unless explicitly live.

## 11.1 Performance

Preserve S073 targets. Compiler correction must not introduce unbounded history reads or N+1 layout lookup. Report package compile, solve, validate, transaction and total action settlement.

## 11.2 Exit gate

Zero failing gates in authorised memory-safe execution; production build passes; clean worktree except intended changes. Commit by coherent phase, push fast-forward, verify GitHub parity. Continue.

---

# 12. Event OS-only deployment and live remediation proof

## 12.1 Deploy

Set `EVENT_OS_GIT_SHA` to exact application commit without printing secrets. Deploy Railway `atelier-doclar` / `production` / `event-os` only. Control Tower must remain SKIPPED/unmoved.

Verify:

- deployment SUCCESS;
- live/ready true;
- deployed SHA exact;
- POSTGRES/APPLIED;
- production false;
- providers inactive;
- S05A/S05B unchanged;
- S06 v3 honestly STALE before v4 run;
- historic `bad17…` package/run unchanged.

## 12.2 Exact live forensic closure

On the S074 event or a governed clone with the same authority:

- freeze under corrected compiler;
- require new package/compiled request identity;
- show target-resolution diagnostic without raw protected data;
- launch;
- require four seated/zero required unseated;
- independent FEASIBLE;
- R1–R3 SATISFIED;
- prior raw-target run remains INFEASIBLE history;
- Adopt available only on corrected current result.

Do not overwrite the old package/run or relabel its verdict.

## 12.3 Table-target behaviours

Live prove independently:

- one-subject REQUIRE_TABLE;
- historic two-subject REQUIRE_TABLE meaning;
- FORBID_TABLE prevents placement;
- ACTIVE reservation constrains its target;
- DRAFT/WITHDRAWN reservation omitted;
- target absent from current published layout returns human-safe NOT_APPLIED before run;
- no raw IDs in permission-safe request/evidence surface.

## 12.4 Capacity truth

Add or use a synthetic post-provisioning table:

- declared-only mode visible if permitted;
- physical seats generated/persisted/reloaded;
- mismatch blocks freeze;
- correction produces consistent UI/downstream/package counts;
- Auditor projection remains masked.

## 12.5 Live evaluation

As CEO run v4 once. Require exact edition/contract/hash/count; every case persisted; zero failed; mutations/zero-tolerance clear; blocked false; releaseReady true after reload. Planner/Reviewer/Director/Auditor/Admin cannot run. Fixture assurance does not authorise production.

## 12.6 Exit gate

All live correction gates pass on exact application SHA, each action one POST→response→fresh result→matching banner→durable reload. No action over 30 seconds. If any fails, stop before S074 continuation unless correction is already unambiguously within this authority; otherwise AI CTO review.

---

# 13. Resume blocked S074 journeys — focused independent product proof

This is implementation-team pre-verification, not Claude. Use uniquely labelled synthetic records and the visible UI. Do not claim independent acceptance.

Resume every S074 area blocked or NOT VERIFIED by the compiler defect:

1. adopt corrected FEASIBLE run;
2. post-Adopt responsiveness without reload workaround;
3. valid Studio preview/apply, preferably ASSIGN_UNSEATED where state permits;
4. HARD-violating manual change rejected with no hash/version/assignment mutation;
5. two-tab stale conflict and scoped lock;
6. submit clean plan exact hash;
7. SECURITY Reviewer exact event/edition/hash/domain/rule binding;
8. author/non-implicated/stale/cross-event review denials;
9. Director exact-hash approve and publish denial;
10. CEO publish and identical replay;
11. successor DRAFT preserves last-known-good;
12. JSON/PDF/PNG generation/retrieval and omission policy;
13. Auditor masked view, authorised export and privileged direct-route denial;
14. System Administrator business denial;
15. 360/768/1440, 200% zoom, reduced motion, keyboard/focus/ARIA/overflow;
16. transient blank-page mutation regression repeated at least five times;
17. Runs tab selection/content consistency;
18. Hard-blocker counter formula/copy verified against enumerated governing set.

Do not approve/publish a plan with a known violation. Do not use APIs to bypass visible failures. Preserve every first-run failure.

Because Claude did not complete these journeys, every item must later be included in a new focused independent Claude re-verification; Cursor's pass is readiness evidence only.

## 13.1 Exit gate

All resumed journeys pass locally and live on final application SHA. Two consecutive publication/replay sequences pass if any publication/runtime contract changed; otherwise at minimum one complete corrected chain plus replay and last-known-good proof, while preserving the earlier S073 sequences as evidence. Continue.

---

# 14. Documentation, report and stop

## 14.1 Control records

Update appropriate EOS-S06 implementation/build/current-state/evidence/authority/compatibility/traceability/debt records. Do not create acceptance.

Record:

- authority file hash;
- baseline/application/deployed/docs SHAs;
- exact durable namespace proof;
- root cause and affected predicates;
- compiler/token/version contract;
- solver-claim correction;
- replay tuple;
- capacity-source contract;
- evaluation v4 edition/hash/count;
- local/live gates;
- every first-run failure;
- S074 resumed evidence;
- remaining NOT VERIFIED items;
- rollback and forward recovery;
- production/providers state.

## 14.2 Rollback/forward recovery

- Migration additive only; no destructive down-migration.
- Historic raw-target packages/runs remain immutable.
- Rollback application is previous Event OS SHA `1ce6e0f…`; document that it restores known table-target defects.
- Forward recovery is corrected compiler/version and new packages/runs, never rewriting old rows.

## 14.3 Required final report

Report in order:

1. starting/application/deployed/docs SHAs and parity;
2. authority placement/hash;
3. exact `bad17…` forensic evidence;
4. confirmed root cause and rejected hypotheses;
5. files/commits by section;
6. canonical table-token contract;
7. rule/reservation/FORBID corrections;
8. authoring semantics and historical treatment;
9. solver claim and independent validator;
10. replay identity/versioning;
11. capacity/position-source truth;
12. differential/mutation assurance;
13. evaluation v4 edition/hash/count/readiness;
14. full local gates;
15. every first-run failure;
16. Railway deployment/readiness;
17. exact live corrected witness;
18. table-target and capacity live proofs;
19. resumed S074 journeys;
20. exports/disclosure/accessibility/UX;
21. retained debt;
22. rollback/forward recovery;
23. explicit Claude/acceptance/EOS-S07 stop.

Headline only if every non-independent gate passes:

`READY FOR FOCUSED INDEPENDENT CLAUDE RE-VERIFICATION`

Otherwise:

`NOT READY FOR CLAUDE`

End exactly:

`EOS-S06 MD-PR-S075 TABLE IDENTITY, COMPILER AND FEASIBILITY TRUTH REMEDIATION COMPLETE — READY FOR FOCUSED INDEPENDENT CLAUDE RE-VERIFICATION ONLY IF EVERY NON-INDEPENDENT GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

---

# 15. Global prohibited shortcuts and hard stops

Prohibited:

- code changes before exact durable-package confirmation;
- changing the table-token hash algorithm without new AI CTO authority;
- storing derived token as replacement authoring truth;
- rewriting historic packages/runs/rules/reservations;
- special-casing the four S074 guests or table IDs;
- omitting failed subjects/rules;
- weakening HARD to SOFT/INFORMATIONAL;
- calling an invalid candidate INFEASIBLE without proof;
- making validator agree with solver by sharing implementation/state;
- hand-building all tests with already-matching table strings;
- accepting raw UUID arrays at solver boundary;
- allowing missing table target to become solver INFEASIBLE;
- unsafe replay across compiler/validator versions;
- treating declared and physical capacity inconsistently;
- hiding capacity mismatch as a warning if it changes solver positions;
- deleting immutable history or test fixtures;
- manual SQL repair;
- increasing timeouts;
- old banner/appeared-after-reload as fresh evidence;
- restamping v3 evaluation;
- deploying Control Tower;
- running Claude during remediation;
- accepting EOS-S06;
- starting EOS-S07;
- enabling production/external providers/real data.

Hard stop and report if:

- baseline/parity/live SHA differs;
- exact package does not prove the expected mismatch;
- canonical token computed by current code is absent from positions;
- correction requires destructive migration or accepted upstream rewrite;
- differential oracle and validator disagree without diagnosed cause;
- a raw-target historic row must be rewritten to pass;
- full/local/live gate remains failing;
- production becomes authorised or real data appears.

