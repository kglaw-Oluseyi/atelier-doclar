# MD-PR-S075 ADDENDUM — CANONICAL CURRENT LAYOUT AUTHORITY

## Status

**PROPOSED NARROW ADDENDUM — NOT IMPLEMENTATION AUTHORITY UNTIL RATIFIED BY THE MAISON DOCLAR AI CTO**

Parent authority:

`docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`

Parent SHA-256, which must remain unchanged:

`faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`

This addendum exists because Section 12 live proof established that an event can retain more than one layout publication with `status === "CURRENT"`, while Seating selects the first matching array row. A fresh event containing exactly one layout allowed the prescribed solver and capacity proofs to pass, but that test arrangement is not a product correction. Storage order must never decide operational layout authority.

This addendum is deliberately narrow. It does not reopen the table-token algorithm, compiler correction, predicate-specific authoring, solver-claim honesty, replay tuple, capacity-source policy, evaluation v4, or completed Section 12 solver proofs.

---

## 0. Ratification

### 0.1 Required wording

> I RATIFY MD-PR-S075 ADDENDUM CANONICAL CURRENT LAYOUT AUTHORITY AS THE NARROW AUTHORITY TO REMOVE AMBIGUOUS OR STORAGE-ORDER-DEPENDENT LAYOUT SELECTION FROM EOS-S06. CURSOR SHALL FIRST TRACE THE ACCEPTED LAYOUT PUBLICATION AND DOWNSTREAM-PROJECTION CONTRACT, THEN MAKE SEATING CONSUME EXACTLY ONE GOVERNING EVENT LAYOUT OR FAIL CLOSED, ENFORCE SUCCESSOR CURRENTNESS TRANSACTIONALLY WITHOUT REWRITING HISTORY, ADD THE PRESCRIBED REGRESSION AND LIVE PROOFS, GIVE SEAT_CAPACITY_MISMATCH ITS SPECIFIC OPERATOR RESULT, AND ONLY AFTER EVERY EXIT GATE PASSES RESUME MD-PR-S075 SECTION 13. CURSOR SHALL NOT INVENT LATEST-BY-TIMESTAMP AUTHORITY, DELETE HISTORIC PUBLICATIONS, USE DATABASE ORDER AS AUTHORITY, USE DIRECT SQL AS A PRODUCT WORKFLOW, WEAKEN ANY SOLVER OR VALIDATOR RULE, ACCEPT EOS-S06, RUN CLAUDE, DEPLOY CONTROL TOWER, OR START EOS-S07.

### 0.2 Execution posture

Execute Packets A–G in order. Continue automatically after an exit gate passes. Stop only at a stated hard stop.

Do not ask the CEO to choose among implementation alternatives if the accepted upstream contract resolves the choice. If the accepted contract is genuinely contradictory or absent, stop after Packet A with exact citations and no code change.

---

# Packet A — Baseline and accepted-contract truth map

## A.1 Baseline

Before editing:

1. Resolve local HEAD, `origin/main`, and GitHub `main`.
2. Require the current candidate application history to include `27e917e9a069cebfaebbfca85c10ca66b36eaac3` and the completed local S075 work reported after it.
3. Confirm the worktree contains only known S075 work and the two untracked live helpers already reported:
   - `apps/event-os/e2e/s075-live.spec.ts`
   - `apps/event-os/e2e/s075-provision.ts`
4. Do not delete, commit, or rely upon those helpers yet.
5. Confirm live Event OS remains on `27e917e9a069cebfaebbfca85c10ca66b36eaac3`, unless a later authorised application SHA is already documented.
6. Confirm `productionAuthorised:false`, providers INACTIVE, and Control Tower unmoved.
7. Recompute and record the parent S075 SHA-256. It must equal the value above.

Stop on unexplained baseline divergence. Do not reset, force-push, or infer which side is correct.

## A.2 Read-only contract trace

Before changing code, locate and cite exact files/functions for:

1. creation and publication of layout editions;
2. the transition that makes a layout publication `CURRENT`;
3. supersession/demotion of an earlier publication;
4. the accepted downstream layout projection used by consumers, including `buildLayoutDownstreamProjection` if that remains canonical;
5. Event OS layout page projection and the meaning of `CURRENT publication N`;
6. Seating workspace/package selection of the layout publication;
7. database and memory-store constraints governing current publications;
8. migration and hydrate behavior for historic multiple-current rows;
9. layout identity fields: organisation, event, layout, edition, publication, content hash and version;
10. every other consumer of the downstream layout projection.

Search for all of the following patterns and record results:

```text
layoutPublications.find
status === "CURRENT"
status: "CURRENT"
buildLayoutDownstreamProjection
supersedesPublicationId
currentLayout
currentPublication
layoutId
eventId
```

Do not assume array order, insertion order, timestamp order, UUID order, or database return order is authority.

## A.3 Required truth map

Create:

`docs/control/eos-s06/MD_PR_S075_CANONICAL_LAYOUT_AUTHORITY_FINDING.md`

It must state:

- the currently accepted authority rule;
- whether currentness is event-wide or layout-lineage-specific;
- why multiple layout-lineage `CURRENT` publications can currently coexist for one event;
- the exact Seating selector that chooses the first row;
- whether the canonical downstream projection already resolves one event layout;
- every affected consumer;
- normalized persistence constraints and missing constraints;
- treatment required for historic ambiguous rows;
- rejected alternatives, including “pick first” and “pick latest timestamp”.

### A.4 Decision rule

Use exactly one of these paths:

**Path 1 — accepted contract already defines one event-governing publication.** Implement that contract consistently in publication, persistence, projection and Seating.

**Path 2 — accepted contract permits multiple current layout lineages but defines one canonical event layout in its downstream projection.** Preserve lineage currentness, but bind Seating only to the explicit canonical event-layout selection returned by that projection.

Do not create Path 3. If neither rule exists, stop for AI CTO review. Do not invent “newest wins”.

### A exit gate

Truth map completed with exact code references; one authorised path established; no product code changed before that determination.

---

# Packet B — Tests first: reproduce storage-order authority failure

Add failing tests before implementation. They must use production domain/repository/projection functions, not hand-authored final projections.

## B.1 Required fixtures

Create a synthetic event with:

- Layout A, published current, known hash A and capacity A;
- Layout B, subsequently published/current according to the accepted workflow, known hash B and capacity B;
- publication arrays/repository results exercised in A→B order and B→A order;
- a successor edition/publication for the governing lineage;
- a historic ambiguous state containing two rows marked current, constructed only in tests or through a migration fixture;
- another event and another organisation for isolation checks.

## B.2 Required red tests

Before the correction, prove at least:

1. Seating’s chosen layout changes when publication array order reverses, or it selects the wrong authority despite the canonical projection.
2. A package can bind the older/unintended publication hash.
3. An ambiguous historic state is not explicitly rejected.
4. Publishing a successor does not enforce the required event/canonical currentness.
5. The empty-state phrase `No current publication` can satisfy an unsafe loose locator intended to prove a current publication.

The last item is a test-helper failure, not a product rule. Correct it with a positive, exact publication locator carrying identity attributes—not a permissive regex.

## B.3 Test restrictions

- Do not use `.first()`, `.last()`, `nth()`, unordered `.find()`, or timestamps as the expected authority.
- Do not mutate the accepted Alpha One layout.
- Do not use SQL to prepare ordinary product states.
- A migration/backfill test may seed normalized legacy ambiguity through repository fixtures only.
- Do not make the test pass by creating only one layout.

### B exit gate

The production defect is reproduced deterministically, including order reversal, and the tests fail for the intended reason.

---

# Packet C — Canonical resolver and fail-closed projection

## C.1 One shared decision function

Implement or reuse one pure, typed domain decision shared by memory and PostgreSQL paths. Use repository terminology after Packet A; do not create a parallel layout authority model.

Illustrative contract only—adapt names to established types:

```ts
type CanonicalLayoutAuthority =
  | {
      state: "CURRENT";
      organisationId: string;
      eventId: string;
      layoutId: string;
      editionId: string;
      publicationId: string;
      contentHash: string;
      version: number;
    }
  | {
      state: "ABSENT";
      reason: "NO_CURRENT_LAYOUT_PUBLICATION";
    }
  | {
      state: "AMBIGUOUS";
      reason: "MULTIPLE_CURRENT_LAYOUT_PUBLICATIONS";
      candidateCount: number;
    };
```

The resolver must:

1. filter by exact organisation and event before authority evaluation;
2. use explicit accepted authority relationships, never array order;
3. validate the publication-to-edition-to-layout lineage;
4. require the publication hash to match the bound edition/content hash;
5. reject withdrawn, superseded, foreign-event and foreign-organisation rows;
6. return exactly one current authority or a typed absent/ambiguous state;
7. never return candidate protected identifiers to an unauthorised projection.

If the accepted projection already performs this work, repair and reuse it rather than adding a second resolver.

## C.2 Seating consumption

Replace every Seating selection shaped like:

```ts
layoutPublications.find(
  publication =>
    publication.organisationId === organisationId &&
    publication.eventId === eventId &&
    publication.status === "CURRENT"
)
```

with consumption of the canonical downstream authority.

Seating freeze/package compilation must bind:

- canonical layout ID;
- canonical edition/revision ID;
- canonical publication ID;
- exact publication/content hash;
- position-source identity;
- event and organisation.

The package hash and provenance must change when canonical authority changes.

## C.3 Fail-closed states

Before package creation:

- `ABSENT` → `NO_CURRENT_LAYOUT_PUBLICATION`;
- `AMBIGUOUS` → `MULTIPLE_CURRENT_LAYOUT_PUBLICATIONS`;
- hash/lineage mismatch → an existing specific integrity error or `LAYOUT_PUBLICATION_INTEGRITY_FAILED`.

These are `NOT_APPLIED`, `didDataChange:false`. No package, run, success audit, or idempotency success receipt may be created.

Human-safe copy:

- absent: `Publish a current event layout before freezing seating inputs.`
- ambiguous: `More than one layout is marked current for this event. Resolve layout authority before freezing seating inputs.`
- integrity: `The current layout publication could not be verified. Resolve the layout record before freezing seating inputs.`

Do not expose IDs, hashes, SQL details, stack traces or candidate counts to permission-safe client/auditor surfaces unless already authorised.

### C exit gate

Order reversal cannot alter the selected authority. Zero or multiple authorities fail before package creation with typed, truthful outcomes.

---

# Packet D — Transactional publication currentness and legacy ambiguity

## D.1 Transaction boundary

When publishing the layout authority selected by Packet A, perform in one durable transaction:

1. reload and lock the event/lineage authority needed by the accepted contract;
2. validate actor, organisation, event, expected version and exact hash;
3. detect idempotent replay before creating another publication;
4. demote only publications that the accepted contract says are superseded;
5. insert or activate the new current publication;
6. append audit and idempotency receipts;
7. commit;
8. reload the bounded canonical projection;
9. report success only if it identifies the intended publication/hash.

Use optimistic concurrency. Two simultaneous publishers must not leave an ungoverned multiple-current result.

## D.2 Database constraint

Add a new additive migration only if the accepted contract requires a constraint not already present.

- Never edit the bytes/checksum of an applied migration.
- Prefer a partial unique index aligned to the true authority scope.
- Do not add an event-wide unique index if Packet A proves multiple current lineages are valid and a separate canonical selector exists.
- Migration must be replay-safe and boot-safe.

## D.3 Historic ambiguous rows

Do not silently choose or delete historic rows.

Use the least expansive accepted treatment:

1. preserve every edition/publication as immutable history;
2. classify ambiguity explicitly;
3. provide a governed authorised resolution command if the accepted layout workflow lacks one;
4. require exact IDs, hashes and expected versions;
5. maker/checker and permissions remain server enforced;
6. write audit and idempotency atomically;
7. replay returns the same resolution with `didDataChange:false`;
8. until resolved, Seating remains blocked.

Do not auto-demote historic rows merely because one has the newest timestamp. Do not repair live data with direct SQL.

## D.4 Isolation and concurrency tests

Prove:

- two writers cannot both establish conflicting authority;
- stale expected version is `VERSION_CONFLICT` / not applied;
- replay creates no second publication or success audit;
- cross-event and cross-organisation attempts are denied without leakage;
- transaction rollback leaves prior authority intact;
- publication-order reversal still resolves identically after hydrate/reload.

### D exit gate

New publication currentness is transactionally correct; historic ambiguity is preserved and fail-closed until governed resolution; all persistence/concurrency tests pass.

---

# Packet E — Operator UX and action-result truth

## E.1 Layout UI

The layout surface must distinguish exactly:

- `CURRENT publication N` with stable identity metadata suitable for tests;
- `No current publication` as an empty state;
- `Multiple current publications require resolution` as a blocking state;
- historic/superseded publications as history.

Add stable attributes such as `data-testid`, publication ID/hash prefix and authority state where appropriate. Do not make ordinary operators interpret UUID dumps.

## E.2 Seating UI

Before freeze, show:

- selected current layout label;
- publication number or governed edition label;
- table count;
- physical/declared capacity state;
- authority status.

When ambiguous, disable Freeze and provide the governed next action. Forced submission remains server-denied.

## E.3 Capacity mismatch result

Add a dedicated operational-state mapping:

- code: `SEAT_CAPACITY_MISMATCH`;
- title: `The published layout capacity needs correction`;
- outcome: `NOT_APPLIED`;
- `didDataChange:false`;
- public guidance: `Physical seat count and declared capacity disagree. Correct and republish the layout before freezing seating inputs.`

Retain the precise safe detail already proven. Do not fall through to `The request could not be completed`.

## E.4 Accessibility and stale-result safety

- Error summary and relevant heading receive focus only for a fresh correlation.
- F5 does not refocus consumed history.
- Do not let `No current publication` satisfy a current-publication assertion.
- 360/768/1440, keyboard, 200% zoom, reduced motion and no horizontal document overflow.
- State is conveyed in text, not colour alone.

### E exit gate

Operator can identify the selected authority without reading IDs; ambiguity and capacity mismatch are specific, accessible and truthful; forced commands remain denied.

---

# Packet F — Full local gates and candidate SHA

## F.1 Focused tests

Run and require zero failures:

1. accepted layout projection/currentness tests;
2. new order-reversal and ambiguity tests;
3. memory and PostgreSQL publication transaction tests;
4. concurrency, replay, rollback and isolation tests;
5. Seating package provenance tests;
6. S075 table namespace, solver/oracle, replay, capacity and evaluation-v4 tests;
7. action-result mappings and focus tests;
8. relevant S05 layout downstream regression tests.

## F.2 Full gates

- `pnpm typecheck`
- complete shared-platform suite
- complete Event OS unit suite
- `pnpm programme:validate`
- Event OS production build
- `git diff --check`
- prescribed local Playwright, in truthful memory-safe isolated runs where required

Do not describe separately executed specs as one combined-suite pass. Record every first-run failure.

## F.3 Live-helper disposition

Review the two untracked S075 helpers.

Commit them only if all are true:

- no access token, cookie, secret or private connection detail;
- no hard-coded transient live UUID required for success;
- uniquely labelled synthetic records;
- explicit live-mode gate and explicit base URL;
- cannot connect to Railway under local defaults;
- scoped forms and fresh-correlation proof;
- no `.first()`, `.last()`, `nth()` or loose `CURRENT publication` regex;
- safe repeat/replay behavior;
- no accumulated-live-state dependency.

Otherwise preserve their results in evidence and delete the helpers before the clean-worktree gate.

## F.4 Candidate

Commit by coherent phase. Fetch. Require fast-forward ancestry. Push fast-forward only. Confirm local HEAD = `origin/main` = GitHub `main`. Record one application candidate SHA. Stop on divergence.

### F exit gate

Zero failures in authorised execution, clean worktree, reviewed commits, exact repository parity and one candidate application SHA.

---

# Packet G — Event OS-only deployment and live closure

## G.1 Deploy

Set `EVENT_OS_GIT_SHA` to the exact candidate without printing secrets. Deploy only Railway `atelier-doclar / production / event-os`. Control Tower remains unmoved/SKIPPED.

Verify alive/ready, exact SHA, POSTGRES/APPLIED, production false, providers inactive, and S05A/S05B unchanged.

If the evaluation corpus or bound configuration did not change, do not restamp or rerun v4 merely to obtain green status. If the accepted evaluation contract makes the new layout-authority semantics part of corpus identity, advance honestly under separate authority; do not silently alter v4.

## G.2 Live clean-state proof

Through governed product workflows only, create a uniquely labelled synthetic event with two layout lineages/publications. Prove:

1. the accepted canonical authority rule selects exactly one;
2. reversing display/query order cannot alter it;
3. Seating shows the same selected publication/hash;
4. Freeze binds a new package to that exact publication/hash;
5. publishing a governed successor changes authority deterministically;
6. the old publication remains history;
7. a new freeze becomes a new package tied to the successor;
8. replay does not manufacture another publication/package.

## G.3 Live legacy-ambiguity proof

Use an existing synthetic ambiguous event only if it can be resolved through the governed UI. Do not manufacture ambiguity with SQL.

Before resolution:

- Seating reports the typed ambiguity;
- Freeze is disabled;
- forced submission is NOT_APPLIED;
- package/run counts do not change.

After authorised governed resolution:

- exactly one authority is projected;
- history remains visible;
- Seating binds that exact publication;
- reload cannot resurrect ambiguity.

If no governed live ambiguity exists and the product prevents creating one, record the PostgreSQL migration/concurrency proof plus live clean-state proof. Do not fabricate a live corrupt state.

## G.4 Reconfirm Section 12 outcomes

On final SHA, rerun narrowly:

- four-guest feasible witness: four seated, zero required unseated, independent FEASIBLE;
- one named infeasible class with no Adopt;
- capacity mismatch: specific title, forced freeze denied, counts unchanged;
- canonical publication hash equals package provenance hash.

Every mutation requires one POST → response/redirect → new correlation → matching banner → durable reload. No action over 30 seconds. Old banners cannot satisfy new actions.

## G.5 Resume authority

Only after G.1–G.4 pass may Cursor resume parent S075 Section 13. Do not call the addendum independent verification and do not claim EOS-S06 acceptance.

### G hard stops

Stop for AI CTO review if:

- canonical authority remains dependent on row order;
- accepted upstream contracts conflict;
- migration would require destructive history rewrite;
- more than one authority can be committed concurrently;
- Seating and layout surfaces disagree after reload;
- ambiguity produces a package or run;
- capacity mismatch still receives generic or false-success treatment;
- any required local/live gate fails without a correction unambiguously inside this addendum.

---

# Required report

Report in this order:

1. baseline, candidate, deployed and final docs SHAs;
2. parent/addendum paths and SHA-256 values;
3. Packet A accepted-contract truth map;
4. precise multi-current and first-row root cause;
5. rejected timestamp/order alternatives;
6. files and commits by packet;
7. canonical authority contract;
8. publication transaction and database constraint;
9. historic ambiguity treatment;
10. Seating package provenance binding;
11. operator UI and `SEAT_CAPACITY_MISMATCH` presentation;
12. local tests and complete gates;
13. every first-run failure;
14. live clean-state and ambiguity evidence;
15. final-SHA S075 witness/capacity reconfirmation;
16. helper disposition;
17. Railway and Control Tower status;
18. evaluation/readiness treatment;
19. remaining debt;
20. rollback and forward recovery;
21. explicit Claude/acceptance/EOS-S07 stop;
22. whether parent S075 Section 13 is now authorised to resume.

Required verdict before Section 13:

`CANONICAL CURRENT LAYOUT AUTHORITY PASSED — MD-PR-S075 SECTION 13 MAY RESUME`

Otherwise:

`CANONICAL CURRENT LAYOUT AUTHORITY NOT CLOSED — STOP BEFORE SECTION 13`

End exactly:

`EOS-S06 MD-PR-S075 CANONICAL CURRENT LAYOUT AUTHORITY ADDENDUM COMPLETE — RESUME SECTION 13 ONLY IF EVERY ADDENDUM GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

---

# Global prohibitions

Cursor must not:

- choose the first, last, newest-created, newest-updated or lexicographically greatest publication unless that exact rule is already the accepted authority contract;
- sort an ambiguous set and call the ambiguity resolved;
- silently demote or delete historic live rows;
- use a fresh one-layout event as proof that multi-layout authority is fixed;
- use direct SQL to repair or prove ordinary product behavior;
- create a second layout authority ledger;
- fork memory and PostgreSQL policy;
- weaken table-token, solver, validator, oracle, replay or capacity truth;
- overwrite historic packages, runs or evaluation records;
- restamp `s06-eval-v4` without a real corpus/configuration identity change and authority;
- raise timeouts to conceal command settlement;
- let a stale banner satisfy a new command;
- commit secrets or transient production identifiers;
- deploy Control Tower;
- run Claude;
- accept EOS-S06;
- start EOS-S07.
