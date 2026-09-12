# MD-PR-S070 V2 — EOS-S06 Seating Allocation

## Executable Continuous Cursor Authority

**Status:** DRAFT — DO NOT EXECUTE BEFORE CEO RATIFICATION  
**Required baseline:** `75a894dedb6713ba2f3f4dce29e8372fa4160384`  
**Sole authority after ratification:** this file + ratified V2 overlay + normative annex  
**Deployment scope:** Event OS only if application code changes  
**Forbidden outcomes:** acceptance, Claude execution, EOS-S07 start, real data/operations

## 1. Start instruction to Cursor

Find these five draft files wherever George placed them:

```text
EOS_S06_RATIFICATION_OVERLAY_AND_DECISIONS.md
MD_PR_S070_EOS_S06_SEATING_ALLOCATION_PRESCRIPTIVE_EXECUTION_PACK.md
EOS_S06_RATIFICATION_OVERLAY_AND_DECISIONS_V2.md
EOS_S06_V2_TECHNICAL_CONTRACT_AND_ACCEPTANCE_ANNEX.md
MD_PR_S070_V2_EOS_S06_SEATING_ALLOCATION_EXECUTABLE_IMPLEMENTATION_PACK.md
```

Verify baseline and ratification before any mutation. Move the three V2 files byte-for-byte to `docs/control/eos-s06/`. Delete only the two named V1 files from the working tree. Record their hashes and the supersession. Git history is the archive; do not maintain two active packs.

Then execute Phases 0–15 continuously. Make coherent commits and continue automatically after a phase passes. A phase report is evidence, not acceptance. Do not ask George to approve routine commits or enter tokens into chat.

## 2. Read order

1. Ratified V2 overlay.
2. Normative V2 technical annex—every table, command, page, case and journey is mandatory.
3. This execution pack.
4. Historical S06 specification for non-conflicting detail.
5. EOS-S05/S05A/S05B acceptance and implementation ledgers.
6. Current architecture, migration, deployment, debt and compatibility records.
7. Actual code contracts.

If actual accepted code uses a different identifier/type name, adapt the name while preserving meaning and document the mapping. Do not build an adapter around a guessed contract.

## 3. Global implementation rules

- Implement full fidelity; no MVP, placeholders, demo-only path or mandatory TODO.
- Use `apply_patch`-quality scoped edits; preserve unrelated work.
- Frontend and backend land together for each vertical phase.
- No broad refactor without direct need.
- No test-only production export.
- No action-result success before durable reload.
- No redirect inside a wrapper that catches Next redirect exceptions.
- No global name-only Playwright selectors where repeated controls exist.
- No old result banner may satisfy a fresh action.
- Do not raise timeouts to pass.
- Do not fix production data through SQL.
- No external effects.

## 4. Phase 0 — Baseline and authority placement

1. Resolve repository root and read repository instructions.
2. Prove local HEAD=`origin/main`=GitHub main=`75a894...`; worktree clean except the three user-provided V2 files and, if present, two V1 drafts.
3. Prove current programme says S05B accepted, catalogue count 5, S06 not authorised.
4. Move/delete documentation exactly as §1; commit `docs(control): ratify EOS-S06 V2 implementation authority` only after ratification wording exists.
5. Run baseline typecheck, both unit suites, programme validation, Event OS build and diff check. Record every failure before product work.
6. Inspect upstream code and create `docs/control/eos-s06/EOS_S06_ACCEPTED_CONTRACT_MAP.md` with concrete file/type/function anchors.

Hard stop on parity mismatch, overlapping user work, absent ratification or material upstream ambiguity.

## 5. Phase 1 — Solver ADR and executable spike

Implement `SeatingSolverV1` contract and a disposable benchmark harness. Build the deterministic TypeScript engine exactly as Annex E. Do not begin persistence/UI first.

Generate fixed synthetic corpora with stable seeds:

- 50 guests/5 tables: basic capacity, together/apart and preferences;
- 200 guests/20 tables: reservations, locks, capabilities;
- 600 guests/60 tables: mixed realistic constraints;
- impossible cases: capacity shortfall, contradictory locks, impossible capability.

Run 10 warm iterations and one cold execution. Assert identical canonical hashes, zero hard violations, truthful impossible results and prohibited-field rejection. Record time/memory. If it passes, ratify the in-process TypeScript choice in `ADR_EOS_S06_SOLVER_BOUNDARY.md`. If it fails after bounded optimisation, stop with measurements; do not silently choose infrastructure.

Commit solver contract/spike/ADR.

## 6. Phase 2 — Schema, migration and repositories

Implement every Annex A table and constraint. Use the next migration number after inspecting current migrations. Migration is additive/replay-safe with receipt. Build:

```ts
interface SeatingRepository {
  transaction<T>(fn: (tx: SeatingTransaction) => Promise<T>): Promise<T>;
  projectEventSeating(actor: ActorContext, eventId: UUID): Promise<SeatingWorkspaceProjection>;
  getRun(actor: ActorContext, eventId: UUID, runId: UUID): Promise<SeatingRunProjection>;
  getPublication(actor: ActorContext, eventId: UUID, publicationId: UUID): Promise<SeatingPublicationProjection>;
}
```

Provide Postgres and memory-test implementations with the same decisions. Add explicit fixture purge; never deletion by absence. Tests must cover migration replay, partial load preservation, rollback between domain and audit, two-writer CAS, idempotent replay and scope isolation.

Commit migration/repository/tests only after full shared suite passes.

## 7. Phase 3 — Permissions and command service skeleton

Add all Annex permissions using collision-free catalogue IDs. Update fixtures without changing accepted role meaning. Implement the exact command catalogue with authentication, canonical scope and transaction lifecycle. Initially commands whose domain phase is not ready may be internal-unreachable—not exposed UI stubs and not exported as production functionality.

Test every role, direct service calls, forged actor kind, stale assignment, cross-org/event and System Administrator denial.

## 8. Phase 4 — Input adapters and privacy freeze

Read actual upstream contracts, then implement explicit adapters:

```ts
interface GuestCohortAdapter { loadEligibleEventGuests(eventId: UUID): Promise<GovernedGuestCohort>; }
interface LayoutPublicationAdapter { loadCurrentLayout(eventId: UUID): Promise<PublishedSpatialLayout>; }
interface EventBriefAdapter { loadCurrentBrief(eventId: UUID): Promise<EligibleBriefFacts>; }
interface ProtectionAdapter { loadCurrentProtection(eventId: UUID): Promise<ApplicableProtectionConstraints>; }
```

Freeze immutable input editions and event-scoped tokens. Build logical positions only when explicit S05 anchors are absent. Validate capacity. Add change detection/staleness. Prove no accepted record changes during freeze.

Build Overview and Inputs tabs now, including all Annex G states and validation. Test real forms and reload persistence.

## 9. Phase 5 — Constraint and reservation vertical

Implement typed constraints, authority/review, evidence links and reservation capacity ledger exactly as Annex B/G. Add Rules and Reservations tabs with governed selectors—no UUID/free JSON entry.

For each form: safe in-page validation, retained non-sensitive values, `aria-invalid`, `aria-describedby`, summary/first-invalid focus, stale-version result and permission denial. Add Unicode and hostile-markup tests.

## 10. Phase 6 — Durable solver lifecycle

Implement launch, queue, lease, execute, terminal result, cancel, retry and recovery. The worker accepts a complete solver package and returns a complete typed result. It has no repository handle. Persist results and assignments transactionally after schema validation and final hard-rule validation outside the solver.

Build Runs tab launcher, progress, terminal cards, infeasibility and comparison. Progress must come from durable states; no fake percentage. Cancellation copy must not promise instant worker termination unless confirmed.

## 11. Phase 7 — Allocation quality and evaluation explanations

Implement lexicographic score vectors, component decomposition, alternatives and typed reason templates. Add property tests over randomized fixtures: every FEASIBLE result has zero hard violations, unique guests/positions and capacity compliance. Test deliberately malicious/invalid solver output and reject it before persistence/publication.

## 12. Phase 8 — Studio and manual decisions

Build Studio desktop/mobile layouts and list equivalent. Implement preview/apply for seat, move, swap, unseat, lock/unlock and bounded bulk action. The server recomputes preview validity at apply time.

Every applied change creates a successor working edition and immutable decision. Never update submitted/approved content in place. An edit invalidates prior reviews/approval for the old hash only; it does not delete them.

Two-tab tests must prove only the stale subject locks, unrelated commands remain enabled, F5 reconciles canonical state and no partial move occurs.

## 13. Phase 9 — Review, approval, publication and export

Implement specialist review requirements from implicated coded constraints. Build exact-hash submission, independent Director approval and independent CEO/default publisher. Enforce three distinct persons where all three stages apply.

Implement CURRENT publication independently of working edition. Complete Annex publication tests before UI. Build Review and Publication tabs. Export PDF/PNG/JSON using projection-specific jobs; label DRAFT/APPROVED/PUBLISHED/SUPERSEDED/WITHDRAWN truthfully with full hash, publication number and generated time. Restricted jobs cannot be retrieved by less-privileged actors.

Prove two consecutive local publication/replay/last-known-good journeys before continuing.

## 14. Phase 10 — Verify-as utility

Implement the triple-gated synthetic fixture switcher. Put it in a clearly labelled verification area, not Access Administration. Use an allowlisted server mapping from symbolic fixture roles to assignment IDs. Rotate session and audit each switch. Unit-test that production authorisation, non-fixture adapter or flag-off removes route/action/control and denies direct POST.

Do not expose a client role or accept arbitrary role/person/assignment values.

## 15. Phase 11 — Evaluation corpus

Implement every Annex I case as independently registered cases. Use real production domain/service functions on isolated stores. Persist typed observations, then evaluate assertions. Case code cannot write `passed`.

Add test-only mutation adapters for every Annex mutation case; keep them out of production barrels. Prove each clean case first, then mutation failure. Implement readiness comparison over corpus/contract/solver/config/projection hashes and persisted case count.

Expose CEO evaluation in Seating Overview and System Health with fixture-only language. Only CEO fixture can run; Planner, Director, Auditor, Admin, unauthenticated and cross-org calls deny.

## 16. Phase 12 — UX refinement, accessibility and intuition

Conduct a task-based UX review before live deployment:

- Can a first-time Planner find input freeze, blockers, launch and Studio without engineering help?
- Can a Director tell why approval is blocked and which reviewer is missing?
- Can a CEO see all blind spots and distinguish draft from current publication?
- Can an Auditor understand history without seeing restricted reasons?
- Are tabs named by operator concepts rather than implementation nouns?

Correct spacing, hierarchy, repeated-card overload, raw identifiers, action placement and mobile order. Run axe or repository-standard accessibility tooling plus manual keyboard tests. Use visible focus and correlation-aware result focus; ordinary reload must not steal focus.

## 17. Phase 13 — Full local gates

Run all commands in Annex/pack. Run each focused Playwright spec independently if combined execution creates memory pressure, then run the repository’s appropriate aggregate gate. Zero failures required. `git diff --check` clean. Scan changed code/fixtures/snapshots for secrets and prohibited solver fields. Audit dependency/license changes.

Do not label a failure pre-existing unless baseline evidence proves it; zero full-gate failures are required at handoff.

## 18. Phase 14 — Deploy and live gates

Push with local/origin/GitHub parity. If application code changed, deploy only Railway project `atelier-doclar`, environment `production`, service `event-os`. Do not touch any other service/project. Update only the non-secret SHA stamp if required. Never print/request the production access token; George enters it or the configured test environment consumes it.

Before journeys confirm exact deployed SHA, alive/ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`, providers inactive and S05/S05A/S05B unchanged.

Run all Annex J live-suitable journeys with unique `CURSOR-S06-S070-*` fixtures. Run the current CEO evaluation. Two consecutive publication/replay sequences must pass on final SHA. No stale banner, broad selector or increased timeout.

If the Verify-as utility is available, use it; otherwise pause only for human secret entry at role transitions.

## 19. Phase 15 — Freeze, documents and stop

Freeze exact application/deployed SHA, solver/config/projection/corpus hashes and migration set. Do not access or invent the sealed holdout. Update control documents without acceptance. Preserve first-run failures. Record rollback/forward recovery; never recommend destructive down-migration.

Push final docs stamp but do not redeploy a docs-only commit. Report READY FOR CLAUDE only if every non-sealed exit gate passed. Otherwise report NOT READY and the exact unfinished gate.

Stop. Do not run Claude. Do not create `EOS_S06_ACCEPTANCE.md`. Do not start EOS-S07.

## 20. Required completion report

Report:

1. baseline, application, final and deployed SHAs;
2. V1 deletion/V2 placement hashes;
3. commits/files by phase;
4. upstream contract map;
5. solver algorithm/ADR/benchmarks;
6. migration/tables/repository/transaction proof;
7. schemas/commands/state machines;
8. privacy/token/prohibited-field proof;
9. constraints/reservations/infeasibility;
10. Studio/manual edit/concurrency;
11. role matrix/maker-checker;
12. publication/replay/last-known-good/export;
13. UX/accessibility/intuitiveness by materially distinct role;
14. Verify-as gates/audit;
15. evaluation edition/hash/cases/mutations/readiness;
16. all local gates;
17. all first-run failures;
18. Railway/live journeys/timings;
19. provider/external-effect/production-authorisation confirmation;
20. sealed-holdout readiness;
21. retained debt and rollback/forward recovery;
22. explicit non-acceptance and successor stop.

End exactly:

`EOS-S06 MD-PR-S070 V2 IMPLEMENTATION COMPLETE — READY FOR AI CTO REVIEW AND INDEPENDENT HOLDOUT/CLAUDE ONLY IF ALL NON-SEALED GATES PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

