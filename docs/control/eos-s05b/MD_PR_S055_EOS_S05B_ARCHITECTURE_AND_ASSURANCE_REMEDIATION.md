# MD-PR-S055 EOS-S05B Architecture Product Completeness and Executable Assurance Remediation

**Status:** CEO-visible remediation authority  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Required baseline:** `505c4399ba4517a972914e67b738372055da612d`  
**Current Event OS application SHA:** `9c67a6c1cf0b929f00a2c6758496cb33d4a396e6`  
**Railway:** `atelier-doclar / production / event-os` only  
**Production posture:** `productionAuthorised: false`; synthetic data only  
**Slice state:** EOS-S05B implemented but not accepted; Claude whole-slice verification deliberately held

## 1. Why this remediation is mandatory

The MD-PR-S054 report is not sufficient for independent verification. Focused GitHub review found material divergence from the ratified corpus. These are not documentation observations:

1. EOS-S05B durable state is stored as more than thirty arrays inside the monolithic `PlatformSnapshot` JSONB document. The ratified persistence requirement expressly prohibited a single opaque JSON blob where durable querying, isolation, constraints and concurrency are required.
2. `risk-budget-projection.ts` writes a separate `riskBudgetProjections` collection and calculates its own `quantifiedMinor`. It does not create an immutable successor scenario through the accepted EOS-S05A Budget Intelligence engine. The statement “Budget Intelligence remains the only budget ledger” is therefore not yet demonstrated by the code.
3. `transitionDossierOnSnap` accepts an arbitrary target status and allows direct `DRAFT → PUBLISHED`. It does not enforce `DRAFT → SUBMITTED → APPROVED → PUBLISHED`, and the same checker action can collapse approval and publication.
4. The evaluation corpus has only 16 cases and omits mandatory families from the ratified corpus.
5. Several evaluation cases manufacture the expected observation instead of observing the production invariant. Examples include prompt-injection, Unicode, rule visibility and life-safety outcomes.
6. The cross-event case checks whether a row happens to exist for another event; it does not invoke an unauthorised production read or command and observe denial.
7. `detectUnsafeAdapter` ignores observations and reports the sabotage switches that were enabled. This proves the test knows its input configuration, not that the evaluator detected unsafe system behaviour.
8. The `falseSuccess` adapter can return expected passing observations directly. The negative-control test then calls the configuration-based detector, so it does not prove mutation sensitivity.
9. The current browser suite contains two broad tests. It does not exercise the required authoring, review, supersession, clause, vendor, continuity, incident, Budget successor, dossier edition/export, permission and failure journeys.
10. The Event Protection page exposes a compact collection of default-value buttons/forms rather than the complete production authoring and review experiences required by the ratified pack.

Claude must not be asked to validate the current build. Cursor must correct the architecture and product substance first.

## 2. Authority and scope

This prompt authorises one consolidated remediation across the changed EOS-S05B architecture, domain operations, UI, tests, evaluation, migrations and Event OS deployment. Preserve accepted EOS-S01–S05 and EOS-S04A–F/EOS-S05A behaviour. Do not start EOS-S06 or accept EOS-S05B.

Execute continuously through the final evidence report. Do not stop at sub-phases. Stop only for baseline mismatch, overlapping worktree, destructive migration, required human-controlled secret, real-data/external-effect risk or a genuine controlling contradiction.

## 3. Preflight

1. Verify repo, branch and required baseline exactly.
2. Verify clean non-overlapping worktree.
3. Read the complete ratified corpus at `docs/control/eos-s05b/`, S05A acceptance and Budget specifications, deployment policy, authority/compatibility registers and current S05B implementation record.
4. Inspect the actual Postgres store contract and migrations before choosing table boundaries.
5. Record the findings above in the S05B implementation ledger as MD-PR-S055 remediation evidence. Do not rewrite MD-PR-S054’s first-run report.

## 4. Phase A normalized durable persistence

### 4.1 Required result

Move EOS-S05B durable operational records out of monolithic snapshot-only persistence into dedicated Postgres tables and a typed risk repository/store port. Memory storage remains for isolated tests. Application services must not require loading and replacing the entire platform snapshot to update one policy, gap, checkpoint, incident or dossier.

At minimum normalize:

- source and source editions;
- rule and rule editions;
- evidence-document metadata and editions;
- policy and policy editions;
- event facts and applicability snapshots/results;
- gap findings and residual-risk decisions;
- clause templates/editions/reviews;
- vendor evidence/assessment editions/decisions;
- roster overlays;
- critical functions, plan editions and dependencies;
- checkpoint templates/instances and check-ins;
- escalation/communication intents;
- fallback activations and transitions;
- incidents, notes, actions and learning proposals;
- risk Budget linkage records;
- dossier editions/publications/exports;
- evaluation runs, leases and case results;
- migration receipts and domain idempotency receipts.

It is acceptable to group truly inseparable value objects in JSONB columns inside a normalized aggregate table. It is not acceptable to store the whole domain as arrays in one platform snapshot row.

### 4.2 Database invariants

Use foreign keys and unique/check constraints where supported:

- organisation/event scope and parent identity;
- one current edition per aggregate/scope;
- one current dossier publication per event;
- immutable approved/published edition bodies;
- unique idempotency application per organisation/action/key;
- non-negative minor-unit money and valid periods;
- maker and checker cannot be the same person for protected decisions;
- status vocabulary and legal transitions;
- stable applicability/gap identity;
- projection/export marking and privilege binding.

Enforce optimistic concurrency with row versions at the aggregate boundary. A stale update must not be rescued by a later whole-snapshot write.

### 4.3 Migration

Create a forward-only, replay-safe Postgres migration. Backfill existing synthetic S05B JSONB fixture records into the normalized tables with deterministic lineage and receipts. Do not rewrite accepted S05A data. Keep a compatibility reader only for the migration window; normalized tables become authoritative after a successful receipt. Do not dual-write indefinitely.

Test: empty database, existing S05A database, S05B JSONB fixture upgrade, replay, partial failure/transaction rollback, duplicate receipt, concurrency, and application rollback compatibility. No destructive down-migration or reset.

### 4.4 Service boundary

Introduce a `RiskProtectionStore`/repository interface used by production operations and a `MemoryRiskProtectionStore` for executable cases. Do not duplicate permission logic between stores. Commands must run inside bounded transactions and append audit/idempotency atomically with domain changes.

## 5. Phase B true Budget Intelligence integration

### 5.1 Remove the parallel calculation authority

`RiskBudgetProjection` may remain as a permission-safe linkage/read model, but it must not be the calculation or governing financial record. Remove its independent `quantifiedMinor` authority unless that value is copied from and bound to an accepted Budget calculation result.

### 5.2 Required flow

1. Load the current eligible EOS-S05A Budget scenario/brief context through the accepted service.
2. Convert sourced risk drivers into the existing closed Budget driver/AST contract. If the accepted engine needs a typed extension, add it without forking the engine.
3. Create an immutable Budget scenario successor with purpose `PROTECT_INVESTMENT` or the canonical accepted equivalent.
4. Calculate through the accepted Budget engine.
5. Persist the scenario edition and calculation result using existing durable idempotency, generated-time and concurrency semantics.
6. Store only linkage/projection metadata in EOS-S05B: event, exposure source IDs, Budget scenario edition ID, calculation result ID, content hash and disclosure state.
7. Show governing Budget unchanged, successor assumption, variance, model edition, exact trace and unknown exposures.

### 5.3 Required cases

- unknown exposure produces no invented money;
- sourced premium and deductible affect the accepted engine result;
- 5% reserve is a labelled scenario assumption, not a default;
- identical request replays the same scenario/calculation IDs and generated time;
- changed driver creates an immutable successor;
- stale Budget hash/version is `NOT_APPLIED` and preserves entered values;
- no risk operation mutates an approved/published Budget edition;
- client projection omits internal negotiation/deductible details unless approved.

## 6. Phase C state machines and decision authority

### 6.1 Dossier

Implement and server-enforce:

```text
DRAFT → SUBMITTED → APPROVED → PUBLISHED
DRAFT/SUBMITTED → WITHDRAWN
APPROVED/PUBLISHED → SUPERSEDED only through a new edition/publication lineage
```

Reject every other transition. Assembly maker cannot approve. Approver cannot publish if the ratified matrix requires a distinct publishing authority; at minimum the dossier author cannot perform approval or publication. Publication requires an approved exact hash, current component hashes, current permission-safe disclosure edition and no stale/indeterminate mandatory input. Repeating publication of the same approved hash is idempotent.

Publishing never dispatches. Export generation is a separate durable job with marking, full hash, publication number and generated timestamp.

### 6.2 Other aggregates

Add explicit transition maps and tests for policy evidence/verification, applicability, gaps/residual decisions, clauses, vendor assessments, check-ins, fallback activation and incidents. Do not accept arbitrary target states from FormData.

### 6.3 Maker/checker

Test distinct human identity, current assignment and exact hash at the service boundary. `actorKind` strings passed by the caller cannot establish human authority. Reload the actor/assignment from durable identity data.

## 7. Phase D complete product experiences

Replace the current default-value/demo controls with production-quality forms and review surfaces.

### 7.1 Organisation Protection Command

Deliver discoverable tabs/views for Overview, Policies, Rules and Sources, Clause Templates, Vendors, Renewals and Portfolio Insights. Provide:

- policy authoring with scope, insurer, dates, limits, deductibles, parties, assets, endorsements/exclusions and document evidence;
- source/rule authoring, cited proposition, jurisdiction/effective dates, counsel/reviewer state and supersession;
- certificate upload/verification review;
- clause template drafting, variables, comparison, legal/commercial decisions;
- vendor evidence and deterministic assessment explanation;
- real decision queues and “what changed” links.

Do not reduce this to “Create organisation policy draft” with predetermined values.

### 7.2 Event Protection workspace

Deliver the five ratified views:

1. Overview: why not ready, decisions due, changed-since-review.
2. Coverage: requirement-to-policy matrix, evidence, trace, gap resolution/residual decision.
3. Vendors: primary/alternate/standby assignments, readiness, evidence and check-ins.
4. Continuity: plan edition authoring, critical functions/dependencies, checkpoint schedule, escalation, fallback decision workspace and incident command.
5. Dossier: component selection, preview, submit, independent approve, publish and permission-safe export.

All input values must be operator-entered or governed selections. Use field-level validation and preserve rejected values without presenting them as saved.

### 7.3 CEO no-blind-spots quality

Every headline count links to the records composing it. Show high-consequence unknowns, expiring evidence, concentration, untested fallbacks, incidents, reserve exposure, dossier currency and decision backlog. Avoid generic card soup and unexplained reassuring scores.

### 7.4 Client and role projections

Implement the private client dossier journey, not only static staff copy. Client can view the current published permission-safe edition, acknowledge and ask a question without editing staff truth. Auditor gets readable evidence/audit without mutation. System Administrator receives honest denial and no risk data. Event Director and Planner get only their operational permissions.

### 7.5 UX/accessibility

Test 360/768/1440, 200% zoom, keyboard-only authoring/review, visible focus, focus-after-action once per correlation, reduced motion, pointer/not-allowed/text cursors, error summaries, labelled inputs and no document horizontal overflow. Dense desktop matrices become labelled mobile cards.

## 8. Phase E rebuild executable evaluation

### 8.1 Delete self-fulfilling assurance

Remove all evaluator behaviour that sets an observation to the expected sentence merely because an action branch ran. Specifically remove patterns equivalent to:

```ts
observed.set("INERT_UPLOAD", "prompt instructions in filenames do not become commands");
observed.set("NO_FALSE_DISPATCH", incident.lifeSafety ? expectedText : ...);
detectUnsafeAdapter(adapters) // reading sabotage flags rather than observed state
```

Expected text is never evidence.

### 8.2 Observation contract

Each probe receives durable post-action state and/or a real permission-safe projection. It derives typed facts independent of expected outcomes:

```ts
type RiskObservation =
  | { kind: "COMMAND_DENIAL"; code: string; didDataChange: boolean; auditOutcome: string }
  | { kind: "RECORD_COUNT"; collection: string; count: number }
  | { kind: "STATE"; aggregateId: UUID; state: string; version: number }
  | { kind: "EXTERNAL_EFFECT_COUNT"; effect: string; count: number }
  | { kind: "PROJECTION_OMITS"; path: string; forbiddenValuesFound: string[] }
  | { kind: "BUDGET_RESULT"; scenarioId: UUID; calculationId: UUID; trace: TraceStep[] }
  | { kind: "CONTENT_BYTES"; mediaType: string; hash: Sha256; forbiddenValuesFound: string[] };
```

The assertion evaluator compares typed observations to expectations. A case cannot write `passed`. The runner alone derives pass/fail.

### 8.3 Negative controls

Negative adapters alter a real port or production-function dependency. The evaluator must discover the resulting unsafe observation without access to the adapter configuration. `detectUnsafeAdapter` must not accept the adapter object and must not map enabled flags directly to categories.

Required mutations:

- fabricated coverage result;
- invented premium/price;
- protected-trait factor;
- authority escalation;
- cross-event and cross-organisation leakage;
- privileged export/cache reuse;
- silent communication/booking/payment/claim effect;
- direct invalid state transition;
- prompt-injection-following extractor;
- malicious markup rendering;
- false-success receipt;
- loss of Unicode normalization;
- stale version accepted;
- dossier dispatch on publication.

Every mutation test must first demonstrate the unmodified case passes, then the mutation fails for the observed category. A test that asserts the configured sabotage flag is prohibited.

### 8.4 Complete corpus

Supersede `s05b-eval-v1` with `s05b-eval-v2`. Include at least these independently executable cases:

1. organisation isolation;
2. event isolation;
3. cross-organisation command denial;
4. cross-event projection denial;
5. unauthenticated denial;
6. System Administrator no-business-authority;
7. unknown applicability;
8. approved applicable rule;
9. does-not-apply traced rule;
10. stale/expired rule;
11. source supersession/change impact;
12. venue requirement evidence;
13. missing certificate;
14. certificate date expiry;
15. conflicting certificates;
16. policy party mismatch;
17. limit/coverage indeterminate;
18. maker cannot self-verify policy;
19. same-hash residual decision recognition;
20. changed-hash residual invalidation;
21. residual expiry/revocation;
22. clause placeholder multiset and inert markup;
23. clause legal/commercial maker-checker;
24. unenforceability language truth;
25. vendor assessment explainability;
26. protected-trait negative case;
27. standby not engaged;
28. missed checkpoint without dispatch;
29. checkpoint schedule supersession;
30. fallback authorisation without booking/payment;
31. invalid fallback transition;
32. incident fact/claim separation;
33. life-safety no-false-dispatch;
34. post-incident proposal does not rewrite history;
35. unknown Budget exposure;
36. sourced risk driver through accepted Budget engine;
37. Budget replay/successor/stale conflict;
38. dossier state machine;
39. dossier exact-hash/current-component publication;
40. dossier publication without dispatch;
41. restricted projection and direct route;
42. privileged cached export denial;
43. PDF/export provenance and masking;
44. prompt injection;
45. malicious markup;
46. Unicode/Yorùbá NFC;
47. concurrency and action-scoped lock;
48. false-success mutation;
49. responsive/keyboard semantics;
50. evaluation readiness truth table.

Case count is not the goal; executable coverage is. Split cases where one scenario cannot prove independent invariants.

### 8.5 Readiness

The old `s05b-eval-v1` PASS becomes honestly `STALE`. Missing normalized case rows, migration incompatibility, corpus/model/contract mismatch or incomplete negative-control coverage is `INCOMPATIBLE`/blocked. Only complete current `v2` results unblock fixture readiness.

## 9. Phase F automated and browser evidence

### 9.1 Focused tests

Add substantial test files for persistence/migration, policy/applicability/gaps, clauses, vendor assessment, continuity/checkpoints, fallback, incidents, Budget adapter, dossiers/exports, permissions/disclosure, concurrency/idempotency and evaluation mutation sensitivity. Eight focused tests are not sufficient for this domain.

### 9.2 Playwright journeys

Build separate, maintainable journeys rather than two omnibus tests:

- organisation policy/source/rule authoring and review;
- event applicability and gap/residual decision;
- clause and vendor assessment;
- continuity/checkpoint/fallback;
- incident command;
- accepted Budget-engine successor/replay/conflict;
- dossier assemble/submit/approve/publish/export;
- CEO no-blind-spots UX;
- client published dossier;
- Auditor/System Administrator/direct-route negatives;
- responsive, keyboard, focus and zoom;
- two-tab concurrency and false-success checks.

Use uniquely labelled synthetic fixtures. Assert durable state after refresh/reopen and exact role identity.

## 10. Full gates and deployment

Run focused tests while developing, then:

```text
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
all focused S05B Playwright journeys locally
```

Record every first-run failure and root cause. Commit in focused units, push normally and prove local/origin/GitHub parity. Deploy Event OS only. Do not redeploy Control Tower unless its executable code changes.

Verify exact deployed application SHA, alive/ready, POSTGRES, SQL migrations APPLIED, production false, provider states and S05B v2 fail-closed status. Run the authorised CEO synthetic evaluation, then live focused journeys. Confirm no external provider or effect.

## 11. Required final report

Return one consolidated report with:

1. starting/final/application/docs/deployed SHAs;
2. commits and changed files;
3. normalized table design, constraints, migration and backfill receipts;
4. removal of snapshot-only authority and compatibility route;
5. Budget Intelligence successor IDs/results/traces proving no parallel calculation authority;
6. every state machine and rejected invalid transition;
7. complete organisation/event/client UX;
8. permission/maker-checker and disclosure matrix;
9. S05B v2 corpus edition/hash/case register;
10. observation-based negative-control evidence;
11. focused/full test counts and Playwright journeys;
12. every first-run failure;
13. GitHub parity and Railway deployment/readiness;
14. live synthetic evidence and refresh/concurrency;
15. confirmation providers/effects inactive and production false;
16. genuine remaining debt;
17. rollback/forward recovery;
18. EOS-S05B not accepted; Claude not run; EOS-S06 not started.

## 12. Prohibitions

Do not:

- preserve the existing v1 evaluator as a passing compatibility path;
- claim negative-control detection from knowledge of sabotage configuration;
- keep `riskBudgetProjections` as a parallel calculation ledger;
- permit direct dossier draft-to-publish;
- mark default-value smoke buttons as complete authoring workflows;
- defer normalized persistence, security, cross-scope isolation, false-success or missing primary journeys as ordinary debt;
- use real data or activate providers/effects;
- accept EOS-S05B or begin EOS-S06.

Finish with:

`EOS-S05B MD-PR-S055 ARCHITECTURE AND ASSURANCE REMEDIATION COMPLETE — READY FOR AI CTO REVIEW AND WHOLE-SLICE CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`
