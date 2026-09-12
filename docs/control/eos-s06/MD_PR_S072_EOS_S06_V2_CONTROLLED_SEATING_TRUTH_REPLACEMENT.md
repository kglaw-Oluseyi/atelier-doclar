# MD-PR-S072 — EOS-S06 V2 Controlled Seating Truth Replacement

## Prescriptive Continuous Cursor Execution Authority

**Status:** DRAFT FOR CEO RATIFICATION — DO NOT EXECUTE UNTIL RATIFIED  
**Required repository baseline:** `844f107fc70e1eaa8995e0c7c49c0c42d52b9dd1`  
**Current deployed Event OS application:** `70d9976730ccdbe0f5812f2bf6f68bd1cd055d8e`  
**Scope:** Replace the defective EOS-S06 seating decision spine; preserve accepted upstream systems and last-known-good publication  
**Deployment:** Event OS only, and only after all local gates pass  
**Acceptance:** explicitly excluded  
**Claude:** explicitly excluded during implementation  
**Successor:** EOS-S07 must not start

---

# 1. CEO authority and execution instruction

When ratified, execute this file as the sole MD-PR-S072 authority. Work continuously through Phases 0–14. Commit coherent phase groups and continue without routine human pauses. Stop only on an enumerated hard stop or after the complete final report.

This is a controlled replacement, not a patch campaign and not a rewrite of Event OS generally. Replace the S06 rule→package→solve→validate→plan→review→approve→publish spine. Preserve:

- organisation, client, event, person, assignment and event-guest identity;
- governed RSVP truth;
- EOS-S05 CURRENT layout publication and spatial ownership;
- EOS-S05A Event Brief, budget and roadmap truth;
- EOS-S05B Protection authority;
- shared Postgres, audit, action-result and idempotency infrastructure;
- the Alpha One event-scoped Reviewer assignment;
- permission-safe Auditor projection patterns;
- the Command Atelier design system;
- the current last-known-good seating publication until a valid V2 successor is published.

Do not incrementally modify the legacy S06 implementation until it appears to pass. Introduce the V2 contracts and repositories, test them in isolation and end-to-end, migrate/cut over deliberately, then retire the legacy write path. Legacy history remains readable as incompatible history.

## 1.1 Ratification wording

The CEO authorises execution by stating:

> I RATIFY MD-PR-S072 AS THE SOLE AUTHORITY TO REPLACE THE DEFECTIVE EOS-S06 SEATING DECISION SPINE WITH THE PRESCRIBED V2 ARCHITECTURE FROM BASELINE `844f107fc70e1eaa8995e0c7c49c0c42d52b9dd1`. CURSOR MAY EXECUTE ALL PHASES CONTINUOUSLY SUBJECT TO THE HARD STOPS. THIS DOES NOT ACCEPT EOS-S06, AUTHORISE REAL DATA OR PRODUCTION OPERATIONS, RUN CLAUDE, OR START EOS-S07.

---

# 2. Problem to solve

The live product cannot prove that the seating plan shown to staff was computed from the exact rules shown to staff.

Independent verification established:

- an approved HARD KEEP_APART rule was violated while the run reported `FEASIBLE` and zero hard blockers;
- materially different rules/reservations repeatedly produced `seated 2 · unseated 22`;
- a new specialist-domain rule could affect review after the plan was submitted without a demonstrably new plan identity;
- rules do not expose subjects, authority, package membership or validator outcome;
- no governed rule withdrawal/supersession or submitted-plan recovery exists;
- assigning an unseated guest fails while lock/unseat succeed;
- `s06-eval-v1` reports PASSED without inspectable proof of the production integration path;
- Event Director can reach Access Administration and apparently organisation-wide Audit surfaces;
- export jobs cannot be permission-safely retrieved and inspected;
- shared seating forms have insufficient visual field separation.

The structural absence is one immutable, content-addressed package that is simultaneously:

1. what the operator reviews;
2. what the solver receives;
3. what the independent validator validates;
4. what the run references;
5. what the plan hash binds;
6. what reviewers and approvers certify;
7. what publication records.

V2 creates that spine.

---

# 3. Non-negotiable invariants

| ID | Invariant |
|---|---|
| S6V2-I01 | One immutable `SeatingInputPackageV2` is the sole semantic input to solve, validate, adopt, submit, review, approve and publish. |
| S6V2-I02 | Changing any meaning-bearing input changes the semantic/package hash. |
| S6V2-I03 | Replay occurs only for identical package hash + solver version + configuration hash + deterministic seed. |
| S6V2-I04 | Solver feasibility is advisory; only the independent validator can establish authoritative feasibility. |
| S6V2-I05 | No result with a hard or structural violation may be adopted, submitted, approved or published. |
| S6V2-I06 | Once a rule, reservation, package, run, report, plan edition, decision, review, approval or publication is created, its meaning-bearing content never changes. |
| S6V2-I07 | Correction creates a successor or prospective withdrawal; history is not deleted or rewritten. |
| S6V2-I08 | Working editions and CURRENT publication are independent. A draft/failure cannot hide the last-known-good publication. |
| S6V2-I09 | Authority separation is evaluated against person + exact record lineage, not role alone. |
| S6V2-I10 | Solver input contains event-specific opaque tokens and typed codes only—no names, contact data, narrative, protected-trait inference or executable content. |
| S6V2-I11 | Projection rights are reapplied at retrieval time. Cached privileged content is never reused for a less-privileged actor. |
| S6V2-I12 | Expected validation, replay, stale state and denial never appear as unexpected server failure or false success. |
| S6V2-I13 | Every material command has command-specific concurrency semantics, atomic audit and atomic idempotency. |
| S6V2-I14 | S05 layout, guest/RSVP, S05A and S05B truth are consumed, never copied into competing ledgers or mutated. |
| S6V2-I15 | Legacy S06 rows cannot govern V2 packages, runs, plans or publication. |

Each invariant must map to positive tests and at least one mutation/negative test where meaningful.

---

# 4. Fixed founder decisions

These are settled; Cursor must not reopen them.

1. A Planner may create and activate a SOFT weighted preference. Author and activation remain visible. Final plan approval is independent.
2. A HARD rule requires activation by a different authorised person from its creator.
3. Publisher must be distinct from every material author and from the final operational approver.
4. Governing-input change blocks approval/publication. There is no override; recovery is a successor package and plan edition.
5. Solver-token linkage is retained in restricted relational rows for the governed event retention period. It is never exported to ordinary audiences.
6. Bulk manual apply is limited to 50 commands and is atomic.
7. Specialist domains are `SECURITY`, `PROTOCOL`, `ACCESSIBILITY`, `NONE`. Do not create `MEDICAL`; diagnoses do not belong in seating.
8. Rule annotations cannot mutate an immutable edition. Corrections use separate append-only annotations or a successor edition.
9. An identical run launch returns the existing run/result identity. It does not manufacture a new replay run.
10. Plan editions remain `WORKING`, `SUBMITTED`, `APPROVED`, `RECALLED`, `SUPERSEDED` or `WITHDRAWN`. Publication is a separate entity; the edition does not become `PUBLISHED`.
11. Input freshness is derived from current authority hashes. Do not mutate an immutable plan with a `governingInputsChanged` Boolean.
12. V2 remains inside Event OS/shared-platform. A new service, Python process, external solver, paid dependency, network call or new secret requires new authority.

---

# 5. Hard stops

Stop and report without workaround if:

- local/origin/GitHub baseline parity is wrong or overlapping user changes exist;
- read-only forensics would require exposing PII/secrets or direct database manipulation outside an existing governed repository/admin diagnostic;
- accepted upstream identity/RSVP/layout/publication contracts are materially ambiguous;
- a destructive migration, applied-migration edit or historical deletion appears necessary;
- a new service/runtime/secret/provider is required;
- V2 cannot retain the current publication during cutover;
- solver/validator cannot meet determinism, correctness or the 600-guest performance gate;
- any action could touch real data, communications, credentials, payments, bookings, check-in or biometrics;
- another Railway project/service would need modification;
- production authorisation would need to change;
- any full gate remains red at handoff.

First-run test failures are not hard stops. Record, diagnose, correct within scope, rerun affected and full gates, and preserve the evidence.

---

# 6. Phase 0 — Placement, baseline, hotfix and forensics

## 6.1 Authority placement

If this file is in the repository root:

1. verify exact baseline `844f107...` and a clean worktree apart from this file;
2. hash this file;
3. move it byte-for-byte to `docs/control/eos-s06/`;
4. record it as MD-PR-S072 authority without acceptance;
5. commit placement before application changes.

## 6.2 Baseline evidence

Run and record before edits:

```bash
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

Capture current live SHA/readiness without mutation. Expected deployed application is `70d997...`, POSTGRES/APPLIED, `productionAuthorised:false`, providers inactive, S05A/S05B PASSED.

## 6.3 Access/Audit security hotfix

Before seating replacement work:

- `/app/admin/access`, its loaders/actions/services/repositories require `platform.access.administer`;
- Event Director must receive no access-admin projection or mutation form;
- split audit projection into `platform.audit.read_all` and event-scoped operational audit;
- Event Director receives only assigned-event operational rows with unnecessary assignment identifiers omitted;
- Risk Governance Reviewer remains denied unless separately authorised;
- System Administrator retains technical remit without seating business authority;
- prove direct GET/POST/server-action/service/repository denial.

Do not test live grant persistence during remediation. Unit/integration tests prove denial.

## 6.4 Read-only forensic diagnosis

Using existing bounded repository queries and permission-safe diagnostics—not manual SQL mutation—inspect the exact failed live run/package lineage:

- submitted plan hash `25992bdc603ae6e11508bdd0f8e4e592dd387f85ea6b91f427af8c8ec8ca019a`;
- run showing `FEASIBLE · seated 2 · unseated 22`;
- active rules/reservations at freeze;
- package rule/reservation membership;
- compiled solver request tokens/predicates;
- replay key/hash inputs;
- raw solver assignment;
- adopted assignment;
- any validation report.

Determine the last correct stage:

```text
governed rule → package membership → token compilation → run identity/replay
→ solver output → post-solver validation → adoption → submitted plan hash
```

Record a redacted DI finding with counts/hashes and exact code path. Never print guest names, token mappings or secrets. Write the mutation test for the identified failure first in Phase 2.

---

# 7. Phase 1 — V2 normalized data model

Create additive migration `008_seating_truth_v2` (or next unused repository number after inspection). Never edit migration 007.

## 7.1 Tables

All event-scoped rows carry `organisation_id`, `event_id`, UUID, schema version and timestamps. Immutable rows do not have generic update methods.

### Rule authority

```text
seating_v2_rules
  id, organisation_id, event_id, created_at

seating_v2_rule_editions
  id, rule_id, organisation_id, event_id, edition_no, content_hash
  kind, hardness, weight, scope, specialist_domain
  source_type, source_record_id, source_edition_id, source_content_hash
  lifecycle DRAFT|ACTIVE|WITHDRAWN|SUPERSEDED
  supersedes_edition_id, created_by_person_id, created_at
  activated_by_person_id, activated_at
  withdrawn_by_person_id, withdrawn_at, withdrawal_reason

seating_v2_rule_subjects
  rule_edition_id, subject_type EVENT_GUEST|GOVERNED_GROUP, subject_id

seating_v2_rule_targets
  rule_edition_id, target_type TABLE|ZONE|POSITION_CAPABILITY, target_id_or_code

seating_v2_rule_annotations
  id, rule_edition_id, label, note, actor_person_id, created_at
```

Rule-edition meaning is immutable. An annotation never changes the rule content hash and must be displayed as annotation—not governing rule substance.

### Reservations

Create root, immutable edition, eligible-member, target and annotation tables mirroring rules. Lifecycle: `DRAFT|ACTIVE|RELEASED|WITHDRAWN|SUPERSEDED`. Include min/max/exact capacity and release decision.

### Input package

```text
seating_v2_input_packages
  id, organisation_id, event_id
  semantic_hash, compiled_request_hash, content_hash
  cohort_hash, rsvp_snapshot_hash
  layout_publication_id, layout_content_hash
  event_brief_edition_id/hash nullable
  protection_snapshot_hash nullable
  lock_set_hash, solver_version, solver_config_hash, deterministic_seed
  frozen_by_person_id, frozen_at

seating_v2_package_guests
  package_id, event_guest_id, solver_token
  eligibility_code, rsvp_code

seating_v2_package_positions
  package_id, layout_table_id, ordinal
  layout_seat_anchor_id nullable, position_token
  zone_codes, capability_codes

seating_v2_package_rules
  package_id, rule_edition_id, rule_content_hash, compiled_predicate_hash

seating_v2_package_reservations
  package_id, reservation_edition_id, reservation_content_hash

seating_v2_compiled_requests
  package_id, contract_version, compiled_request_json, compiled_request_hash
```

Token map rows are restricted. `compiled_request_json` contains tokens and typed codes only.

### Runs and validation

```text
seating_v2_runs
  id, package_id/hash, solver_version/config_hash/seed
  status QUEUED|RUNNING|FEASIBLE|INFEASIBLE|TIMED_OUT|CANCELLED|ERROR
  solver_claim, raw_output_hash, assignments_hash
  lease fields, started_at, completed_at, generated_at

seating_v2_run_assignments
  run_id, guest_token, state SEATED|UNSEATED
  position_token nullable, typed_reason_codes

seating_v2_validation_reports
  id, package_id/hash, assignments_hash, validator_version
  verdict FEASIBLE|INFEASIBLE, report_hash, produced_at

seating_v2_validation_rule_outcomes
  report_id, rule_edition_id/hash, SATISFIED|VIOLATED|NOT_EVALUATED
  typed_reason_codes, affected_guest_tokens

seating_v2_validation_structural_outcomes
  report_id, check_code, PASSED|FAILED, typed_detail
```

### Plans and decisions

```text
seating_v2_plan_editions
  id, organisation_id, event_id, edition_no
  package_id/hash, source_run_id, validation_report_id/hash
  assignments_hash, manual_decision_log_hash, content_hash
  status WORKING|SUBMITTED|APPROVED|RECALLED|SUPERSEDED|WITHDRAWN
  successor_of_edition_id nullable, version
  created_by_person_id, submitted_by_person_id/at nullable

seating_v2_plan_assignments
  plan_edition_id, event_guest_id, state SEATED|UNSEATED
  layout_table_id nullable, logical_position_id nullable
  lock_state, typed_reason_codes

seating_v2_plan_authors
  plan_edition_id, person_id, contribution_type CREATE|ADOPT|MANUAL_EDIT

seating_v2_manual_previews
  id, plan_edition_id/version, command_hash, proposed_assignments_hash
  validation_report_id/hash, expires_at

seating_v2_manual_decisions
  id, plan_edition_id, resulting_edition_id, preview_id
  command_type, before_hash, after_hash, reason_code, reason_text
  actor_person_id, applied_at

seating_v2_specialist_reviews
  id, plan_edition_id/content_hash, domain
  reviewed_rule_edition_hashes, decision, reason
  reviewer_person_id, recorded_at, idempotency_hash

seating_v2_operational_approvals
  id, plan_edition_id/content_hash, decision, reason
  approver_person_id, recorded_at
```

### Current pointers, publications and exports

```text
seating_v2_event_current
  organisation_id, event_id
  working_edition_id nullable, submitted_edition_id nullable
  current_publication_id nullable, version

seating_v2_publications
  id, organisation_id, event_id, publication_no
  plan_edition_id/content_hash, package_id/content_hash
  layout_publication_id/content_hash
  solver_version/config_hash, approval_id
  publisher_person_id, status CURRENT|SUPERSEDED|WITHDRAWN
  supersedes_publication_id nullable, published_at

seating_v2_export_jobs
  id, organisation_id, event_id
  source_type EDITION|PUBLICATION, source_id/hash, publication_no nullable
  projection_class FULL|OPERATIONAL|PERMISSION_SAFE|DOWNSTREAM
  format PDF|PNG|JSON, status, generated_at, storage_key

seating_v2_idempotency_receipts
seating_v2_evaluation_runs
seating_v2_evaluation_case_results
seating_v2_migration_receipts
```

Unique partial index: one CURRENT publication per organisation/event. Current working/submitted pointer changes use optimistic version.

## 7.2 Repository rules

- Postgres is authoritative; memory repository implements identical interfaces for isolated tests.
- No V2 arrays in `PlatformSnapshot`.
- No DELETE-by-absence.
- No update method for immutable meaning-bearing rows.
- Commands use bounded `SELECT ... FOR UPDATE` only where currentness/capacity/positions require it.
- Domain write, audit and both platform/seating idempotency receipts commit in one transaction.
- Explicit synthetic purge is a separate confirmed command, never general persistence behaviour.

Prove migration replay, partial-load preservation, rollback-before-audit, concurrent CAS, replay, cross-event/org isolation and no legacy-row authority.

---

# 8. Phase 2 — Canonical hashing and compilation

## 8.1 Rule hash

```ts
ruleContentHash = sha256(canonicalJson({
  kind,
  hardness,
  weight: hardness === "SOFT" ? weight : null,
  scope,
  specialistDomain,
  subjects: sortByTypeAndId(subjects),
  targets: sortByTypeAndId(targets),
  source: { type, recordId, editionId, contentHash }
}));
```

Labels/notes are not hidden meaning; they are separately versioned annotations.

## 8.2 Package hashes

```ts
semanticHash = sha256(canonicalJson({
  cohortHash,
  rsvpSnapshotHash,
  layoutPublicationId,
  layoutContentHash,
  eventBriefContentHash,
  protectionSnapshotHash,
  ruleEditions: sortedRuleIdsAndHashes,
  reservationEditions: sortedReservationIdsAndHashes,
  lockSetHash,
  solverVersion,
  solverConfigHash,
  deterministicSeed
}));

solverToken = hmacSha256(existingServerPepper,
  `seating-v2:${organisationId}:${eventId}:${semanticHash}:${eventGuestId}`);

contentHash = sha256(canonicalJson({ semanticHash, compiledRequestHash }));
```

Use the already configured server-held pepper; do not add or reveal a secret. Package-specific context prevents cross-package/event correlation.

## 8.3 Strict compiled request

Define `eos-s06-solver-v2` with `.strict()`/unknown-key rejection. Allowed fields:

- contract/version/config/seed hashes;
- guest token, eligible flag, group tokens and coded capabilities;
- position/table/zone tokens and coded capabilities;
- typed rules and reservations.

Forbidden: names, emails, phones, addresses, raw UUID identities, notes, evidence narrative, HTML, regex, SQL, JavaScript, formulas, templates, protected-trait labels, policy numbers, credentials or storage keys.

Allowed predicates only:

```text
KEEP_TOGETHER
KEEP_APART
REQUIRE_TABLE
FORBID_TABLE
REQUIRE_ZONE
FORBID_ZONE
REQUIRE_POSITION_CAPABILITY
RESERVE_CAPACITY
LOCK_ASSIGNMENT
PREFER_TOGETHER
PREFER_APART
PREFER_TABLE
PREFER_ZONE
MINIMIZE_CHANGE
```

Persist exactly what is sent to the solver. Package detail shows a permission-safe human projection plus hashes/counts; never token-map values.

Write mutation tests now for:

- dropped active hard rule;
- omitted subject token;
- rule-hash omission;
- reservation-hash omission;
- unchanged package after material input change;
- forbidden field accepted.

---

# 9. Phase 3 — Rule and reservation authority

## 9.1 Rule lifecycle

```text
DRAFT → ACTIVE → WITHDRAWN
   │       └────→ SUPERSEDED (new DRAFT successor)
   └────────────→ WITHDRAWN
```

- Creation never means approval.
- Planner may activate own SOFT rule.
- HARD activation requires `seating.rule.activate` and a different person.
- Specialist domain on a rule determines plan-review requirements; it is not rule activation.
- Withdraw/supersede is prospective and never edits frozen packages.
- Identical commands replay truthfully.

## 9.2 Reservation lifecycle

`DRAFT→ACTIVE→RELEASED|WITHDRAWN|SUPERSEDED`. Capacity changes require successor editions. Validate global capacity transactionally.

## 9.3 Governing input change

Compute freshness by comparing current active rule/reservation/upstream hash set to the plan package semantic hash. Do not update the plan row.

If a SUBMITTED/APPROVED plan becomes stale:

- keep it immutable/readable;
- block approval/publication with named causes;
- offer `Create successor from current governing inputs`;
- copy assignments/locks as a starting proposal only;
- freeze a new package and revalidate;
- retain old reviews/approval as history; do not inherit them.

Implement `Recall submitted plan` for submitter and Event Director: record RECALL decision, mark old edition RECALLED, create successor WORKING.

## 9.4 Rule UI

Default view: Governing rules. Toggle: Draft and Historical.

Each primary row reads like:

`Keep apart at table: Guest A and Guest B · HARD · ACTIVE`

Show operational guest names only to authorised operational roles. Auditor sees permission-safe labels. Secondary fields: scope, source, activation, specialist domain, included/not included in selected package/run, SATISFIED/VIOLATED/NOT_EVALUATED. Provenance expansion contains IDs/hashes/timeline.

Per-row actions by capability/state: Activate, Withdraw, Create corrected successor, View history. No deletion.

---

# 10. Phase 4 — Independent validator

Create a separate internal module/package that imports only V2 schemas, never solver implementation code. Pure, deterministic, no I/O:

```ts
validateSeatingV2(package, assignments, unseated): ValidationReportV2
```

It must evaluate every package hard rule and produce one outcome per rule hash:

- KEEP_TOGETHER for TABLE/ZONE/ADJACENT scope;
- KEEP_APART for TABLE/ZONE/ADJACENT scope;
- REQUIRE/FORBID TABLE;
- REQUIRE/FORBID ZONE;
- REQUIRE_POSITION_CAPABILITY;
- LOCK_ASSIGNMENT;
- reservation eligibility/capacity;
- each guest no more than one position;
- each position no more than one guest;
- occupancy ≤ table capacity;
- every assigned guest belongs to cohort and is eligible;
- every eligible guest is SEATED or explicitly UNSEATED with typed reason;
- no unknown table/position/token.

SOFT rules receive score/outcome but cannot change verdict. INFORMATIONAL rules are NOT_EVALUATED with reason.

Any hard/structural failure makes the report INFEASIBLE. Run validator:

1. after solver output, before authoritative FEASIBLE status;
2. again during adopt against assignments being written;
3. on every manual preview/apply;
4. on submit;
5. on operational approval;
6. on publication.

Never trust a stored verdict alone at consequential boundaries; recompute and compare report/package/assignment hashes. A mismatch is typed conflict/failure, not 5xx.

Golden and property tests must inject violating assignments for every rule/check. A validator accepting one is a hard stop.

---

# 11. Phase 5 — Run, replay and adoption replacement

## 11.1 Freeze

Read canonical guest/RSVP, CURRENT S05 layout, current eligible S05A/S05B facts, ACTIVE V2 rules/reservations and locks in one consistent transaction/snapshot boundary. Create/reuse a package only by V2 content hash.

Legacy rules and packages never participate.

## 11.2 Solver

Retain the in-process deterministic TypeScript solver only after correcting its V2 compiler and validating its output. Implement explicit hard separation severity/scope, contradiction validation before solve, hard checks during placement and final independent validation afterward.

Fixed lexicographic objectives:

1. zero hard violations;
2. maximize eligible seated guests;
3. satisfy reservation minimum/exact commitments;
4. protocol, accessibility and security priorities where governed;
5. minimize weighted preference cost;
6. minimize change from CURRENT publication;
7. stable token tie-break.

No blended score may trade away a higher tier.

## 11.3 Replay

Equivalent tuple `(package content hash, solver version, config hash, seed)` returns the same run/result identity, hash and generated time with `REPLAYED`, `didDataChange:false`, and a replay audit—not another success audit.

Changed rule/reservation/upstream/lock/config/seed must not replay.

## 11.4 Adoption

Adopt only a validator-FEASIBLE run. Reload package, assignments and report transactionally. Recompute assignments hash and validation. Mismatch returns `ADOPTION_MISMATCH`/`NOT_APPLIED`. Create a new WORKING edition; never mutate run or previous plan.

Correct first-class assignment of an unseated guest. Do not implement it as `move` from a nonexistent current position.

---

# 12. Phase 6 — Manual seating and concurrency

Every manual operation is `preview → expiring previewId → apply`:

| Command | Binding |
|---|---|
| assign unseated | plan version + target position lock |
| move | plan version + source/target locks |
| swap | plan version + both guest/position locks |
| unseat/reseat | plan version + affected position |
| lock/unlock | plan version + assignment |
| bulk ≤50 | plan version + all affected positions; atomic |

Apply recomputes from canonical plan, validates preview hash/version/expiry, applies to a new successor WORKING edition, runs validator and atomically persists decision/audit/idempotency. A hard violation returns `SEATING_VALIDATION_REJECTED` with human outcomes and no write.

Concurrency is command-specific:

- additive create rule may commute after uniqueness/invariant checks;
- activate/withdraw/supersede binds rule edition ID/hash;
- reservation state/capacity changes bind version/hash and current capacity;
- freeze binds upstream semantic hashes;
- adopt binds current pointer version and assignments hash;
- submit/review/approve/publish bind edition ID/hash/version;
- manual commands lock affected positions.

Do not add meaningless `expectedVersion` to independent additive commands merely to force conflicts.

---

# 13. Phase 7 — Plan, review, approval and publication

## 13.1 Plan hash

```ts
planContentHash = sha256(canonicalJson({
  packageContentHash,
  assignmentsHash,
  validatorVersion,
  validationReportHash,
  manualDecisionLogHash
}));
```

Material change always creates a successor hash/edition.

## 13.2 Author lineage

Derive plan authors from immutable CREATE/ADOPT/MANUAL_EDIT contribution rows. Do not maintain a mutable author array as authority.

## 13.3 Reviews

Required specialist domains are derived from exact ACTIVE rule editions included in the package. Review binds edition ID/hash/domain and exact implicated rule hashes.

Reviewer must be authorised for event/domain and absent from material authors. Identical decision replays cleanly. Changed plan/rules require new review. `DRAFT` rule cannot trigger a governing plan review because it cannot be in the package.

## 13.4 Approval

Event Director must be distinct from material authors and reviewers. Require:

- exact submitted hash/version;
- current package freshness;
- fresh validator FEASIBLE result;
- all required reviews accepted;
- visible material diff and rule outcomes.

## 13.5 Publication

CEO/default publisher must be distinct from material authors and operational approver. Publication revalidates exact hashes and freshness. Separate immutable publication becomes CURRENT transactionally; previous CURRENT becomes SUPERSEDED but readable.

Identical publication replays same ID/number/hash/time. New draft, recall, failed publication or stale input cannot hide last-known-good.

---

# 14. Phase 8 — Export and downstream contract

Implement retrieval route/action using repository conventions. At retrieval, recompute caller projection. Never reuse FULL artifact for Auditor.

Display source, full hash, publication number, projection, format, generatedAt, lifecycle and retrieval eligibility. Storage key remains server-only.

`eos-s06-seating-publication-v2` allow-list:

- organisation/event publication identity as authorised;
- event guest stable ID or downstream opaque ID per accepted consumer contract;
- table ID;
- optional logical position ID;
- SEATED/UNSEATED and typed operational reason;
- layout/package/plan/publication hashes;
- approval/publication provenance necessary for verification.

Exclude names, contacts, private rationale, protected evidence, policies, storage identifiers, credentials and check-in/access decisions.

PDF/PNG/JSON must be inspectable/downloadable by authorised actors. Mark DRAFT/APPROVED/PUBLISHED/SUPERSEDED/WITHDRAWN truthfully.

---

# 15. Phase 9 — Command Atelier V2 UX

Keep route `/app/events/[eventId]/seating`; cut tabs to V2 projections atomically behind a default-off replacement flag until ready.

## Overview

Show input freshness, eligible/seated/unseated, hard blockers, current working edition, CURRENT publication and next authorised action. Counts link to filtered records.

## Inputs

Show exact guest/RSVP/layout/brief/protection/rule/reservation/config provenance and package membership. Preview refresh impact before freeze.

## Rules

Governing/Draft/Historical groups; human rule statement and affected labels; source/authority/lifecycle; selected-package membership; selected-run outcome. Governed Activate/Withdraw/Supersede actions.

## Reservations

Capacity ledger; active/released/history; `Reserved does not mean seated`; overbooking blockers and governed lifecycle.

## Runs

Package/config/seed, durable status, authoritative validator verdict, seated/unseated, rule outcome drill-down, replay identity, comparison. Never show FEASIBLE solely from solver claim.

## Studio

Desktop table/list + unseated queue + inspector; mobile card/list equivalent. Every drag has keyboard/form equivalent. Preview clearly states effect and blockers.

## Review

Lineage strip:

`Package → Run → Validation → Plan edition`

Every governing rule with affected guests, outcome and source. Violations first. Material diff, manual decision log and required reviews. Approve disabled with exact blockers rather than hidden.

## Publication

CURRENT publication always first, then working/submitted edition, approval, history, exports. Publish copy states no messages, credentials or check-in.

## Forms/accessibility

- labels above controls;
- 16px minimum vertical field rhythm;
- responsive grouping;
- fieldset/legend for groups;
- inline error + summary;
- retained safe values;
- `aria-invalid`/`aria-describedby`;
- fresh correlation result-heading focus only;
- visible focus, reduced motion, no colour-only meaning;
- no document overflow at 360/768/1440 or 200% zoom;
- human label primary, ID/hash secondary collapsed provenance.

---

# 16. Phase 10 — Evaluation V2

Mark `s06-eval-v1` STALE/INCOMPATIBLE with reason `legacy isolated or incomplete production-path assurance`. Never restamp its PASSED run.

Create `s06-eval-v2` / `s06-eval-contract-v2`. Cases use real V2 commands and durable repositories. Observations are derived from persisted state; cases cannot write their own pass flag. Negative adapters are test-only and absent from production barrels.

## 16.1 Mandatory full-path cases

At minimum:

1. HARD KEEP_APART: create→independent activate→freeze→compile→solve→validate→adopt→submit; verify subjects separate and every hash linkage.
2. Deliberately hard-violating solver output rejected before FEASIBLE/adopt.
3. Changed active rule creates new package/run; old run not replayed.
4. Rule activated after submission marks old edition stale by projection and creates successor recovery path.
5. Assign unseated guest successfully; violating assignment denied.
6. Specialist-domain plan exact-hash review/replay/stale denial.
7. Planner→Reviewer if implicated→Director→CEO publication/replay/last-known-good.
8. Permission-safe export retrieval and privileged-cache denial.
9. Event Director admin/audit denial/scoped audit.
10. CEO material author cannot review/approve/publish the same edition contrary to separation.

## 16.2 Mandatory mutation controls

Each clean case passes first; then mutation must fail:

| ID | Mutation |
|---|---|
| M01 | drop ACTIVE hard rule during package compilation |
| M02 | omit one affected guest token |
| M03 | reuse run after material rule change |
| M04 | exclude rule hashes from package hash |
| M05 | exclude reservation hashes from package hash |
| M06 | solver returns hard-violating assignment |
| M07 | bypass post-solver validator |
| M08 | bypass adopt-time validator |
| M09 | corrupt assignment between run and adopt |
| M10 | preserve old plan hash after package change |
| M11 | allow DRAFT/WITHDRAWN rule to govern |
| M12 | author self-activates HARD rule |
| M13 | author/reviewer self-approves via CEO role |
| M14 | approver publishes same edition |
| M15 | new draft hides CURRENT publication |
| M16 | FULL cached export served to Auditor |
| M17 | specialist replay returns 5xx or claims change |
| M18 | success receipt without durable write/audit |
| M19 | cross-event token/package reuse |
| M20 | unexpected identity/free-text field accepted by solver schema |

Evaluation UI/System Health shows corpus/contract/solver/config/validator/projection versions and hashes, cases/passed/failed/persisted, zero-tolerance, run ID/times, fixture provider, blocked/release-ready and scope `full V2 production command path`. It provides case/family diagnostic drill-down without sensitive data.

Readiness fail-closed for UNRUN/RUNNING/STALE/INCOMPATIBLE/FAILED/ERROR or missing case rows.

---

# 17. Phase 11 — Legacy cutover

Do not reinterpret legacy rows as V2 truth.

1. Deploy V2 schema/code behind default-off flag.
2. Keep legacy last-known-good publication readable through a compatibility projection labelled `LEGACY S06 PUBLICATION — not V2 validated`.
3. Legacy rules/runs/plans become history-only and cannot enter V2 packages.
4. Create a fresh V2 input package from current canonical upstream truth and newly governed V2 rules.
5. Do not copy legacy `APPROVED` status into V2 rules. Re-establish authority through V2 decisions for synthetic fixtures.
6. Enable V2 authoring only after local gates.
7. Publish a valid V2 successor through the full three-person chain before making it CURRENT.
8. Only then retire legacy write routes/actions; direct POSTs deny.
9. Preserve rollback to reading legacy publication if V2 flag disables; do not delete V2 or legacy rows.

No manual SQL correction. Use governed synthetic commands.

---

# 18. Phase 12 — Tests and gates

Run:

```bash
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

Required focused suites:

- V2 hashes/package compiler;
- validator golden/property/mutation;
- rule/reservation lifecycle;
- run/replay/adopt;
- manual command/concurrency;
- review/approval/publication;
- export retrieval/disclosure;
- Access/Audit permissions;
- evaluation V2/readiness/mutation;
- migration/cutover/rollback.

Required Playwright:

1. human-safe rules/subjects/lifecycle;
2. changed rule→changed package/run;
3. hard separation and deliberately impossible case;
4. unseated assignment/manual preview/stale two-tab;
5. rule withdrawal + submitted-plan recovery;
6. specialist exact-hash review/replay;
7. three-person publication/replay/successor draft;
8. export retrieval/Auditor denial;
9. Director admin denial/event-scoped audit;
10. role matrix/direct routes;
11. 360/768/1440, 200%, reduced motion, keyboard and axe;
12. evaluation V2 diagnostics.

No full-gate failures at handoff. Do not dismiss failures as pre-existing without baseline evidence. Do not raise action timeouts. Target focused GET <3s, common mutation <10s, no action >30s. Solver 600 guests: cold ≤20s, warm p95 ≤10s across ten runs, zero hard violations.

---

# 19. Phase 13 — Deploy and live proof

Push with local/origin/GitHub parity. Deploy only Railway `atelier-doclar` / `production` / `event-os`. Control Tower stays undeployed unless its executable code changed under amended authority. Never print/request token; use privately supplied environment/session.

Before mutation confirm exact deployed SHA, alive/ready, POSTGRES/APPLIED, `productionAuthorised:false`, providers inactive, S05A/S05B unchanged.

Use unique `CURSOR-S06V2-S072-*` fixtures. Required live gates:

1. Director denied Access Administration; event-scoped audit only.
2. Planner creates SOFT and HARD rules; SOFT self-activation allowed, HARD denied; different authorised person activates HARD.
3. Freeze package; inspect human package projection and exact hashes.
4. HARD KEEP_APART run seats subjects separately; validator outcome SATISFIED.
5. Changed rule creates distinct package/run; no stale replay.
6. Impossible hard rules return INFEASIBLE/unseated and cannot adopt.
7. Assign previously unseated guest works; violating placement is 422/no write.
8. Withdraw/supersede rule; recall submitted plan; clean successor works and history remains.
9. Implicated specialist review exact hash, replay and stale denial.
10. Planner submit→Director approve→Director publish denied→CEO publish/replay.
11. Successor draft/failed publish retains last-known-good.
12. Auditor permission-safe view/export and privileged retrieval denial; Admin no seating authority.
13. Run `s06-eval-v2` once as CEO; all current cases persist, mutations clear, release-ready.
14. Reload/reopen/deploy persistence.
15. Two consecutive full publication/replay sequences on final application SHA.

Each action proves one submission, fresh correlation, truthful `didDataChange`, durable reload and no stale banner.

---

# 20. Phase 14 — Documentation, freeze and stop

Update current state, implementation/build ledgers, roadmap, evidence index, authority/compatibility registers, requirements traceability, debt register and product catalogue without acceptance.

Freeze application/deployed SHA, migration checksum, V2 contract versions/hashes, solver/config/validator/projection/corpus hashes. Preserve every first-run failure with classification/root cause/correction/rerun. Report rollback and forward recovery; no destructive down-migration.

Do not create/inspect sealed holdout. Do not run Claude. Do not create `EOS_S06_ACCEPTANCE.md`. Do not start EOS-S07. A docs-only stamp is not redeployed.

---

# 21. Required final report

Report in order:

1. baseline/application/final/deployed SHAs and parity;
2. authority placement/hash;
3. commits/files by phase;
4. forensic finding and last correct stage;
5. Access/Audit correction;
6. V2 migration/tables/repositories/transaction proof;
7. exact hash and token contracts;
8. rules/reservations authority and recovery;
9. solver compilation/replay and independent validator;
10. manual seating/concurrency;
11. plan/review/approval/publication lineage;
12. legacy cutover and last-known-good preservation;
13. exports/downstream/disclosure;
14. UX/accessibility/intuitiveness;
15. evaluation V2 edition/hash/cases/mutations/readiness;
16. full local gates;
17. every first-run failure;
18. Railway deployment/live timings/two sequences;
19. privacy/providers/external effects/production authorisation;
20. retained debt and rollback/forward recovery;
21. explicit Claude/acceptance/EOS-S07 stop.

If every non-sealed gate passes, report `READY FOR INDEPENDENT HOLDOUT AND CLAUDE`. Otherwise report `NOT READY FOR CLAUDE` with the precise unfinished gate.

End exactly:

`EOS-S06 MD-PR-S072 V2 CONTROLLED SEATING TRUTH REPLACEMENT COMPLETE — READY FOR INDEPENDENT HOLDOUT AND CLAUDE ONLY IF EVERY NON-SEALED GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

---

# 22. Prohibited shortcuts

No patching legacy hashes until tests turn green. No hard-coded green evaluator. No test-authored pass booleans. No snapshot-authoritative V2 persistence. No destructive legacy cleanup. No status copying from legacy to V2. No names/free text in solver. No silent hard relaxation. No solver self-certification. No DRAFT rule governing. No auto-approved HARD rule. No mutable submitted plan. No draft hiding publication. No privileged cached export to Auditor. No CEO maker/checker bypass. No unexpected 5xx for replay/validation/conflict. No stale banner as fresh evidence. No timeout inflation. No manual SQL recovery. No Control Tower deployment. No acceptance record.
