# EOS-S06 V2 — Technical Contract and Acceptance Annex

**Status:** NORMATIVE ONLY WHEN RATIFIED WITH THE V2 OVERLAY  
**Purpose:** Remove discretionary design work from Cursor.

## A. Database contract

Create one new additive replay-safe migration. Use repository naming conventions and UUID/FK types already present. Applied migrations must never be edited.

### A1. Core tables

| Table | Required columns beyond standard `id`, scope and timestamps | Required constraints/indexes |
|---|---|---|
| `seating_input_editions` | `event_id`, `version`, `status`, upstream hashes, `content_hash`, `created_by`, `current` | unique current per event; hash index |
| `seating_guest_tokens` | `input_edition_id`, `event_guest_id`, `solver_token`, eligibility/status codes | unique guest per edition; unique token per edition |
| `seating_positions` | `input_edition_id`, `layout_object_id`, `ordinal`, optional `layout_seat_anchor_id`, `position_token`, capability codes | unique table+ordinal; unique token |
| `seating_constraints` | `event_id`, `edition_id`, `kind`, `predicate_type`, typed payload, weight, authority, evidence refs, disclosure class, status, version, hash | kind/status checks; event index |
| `seating_reservation_blocks` | `event_id`, eligible-set code, table/zone refs, min/max/exact, priority, release state, version, hash | numeric checks; event index |
| `seating_solver_configs` | algorithm/version/objective order/time/memory limits, hash, status | immutable accepted config hash |
| `seating_runs` | input/config hashes, solver version, seed, status, lease, metrics, result hash, failure code | idempotency uniqueness; status checks |
| `seating_run_assignments` | run id, guest token, optional position token, SEATED/UNSEATED, reason codes | unique guest per run; unique occupied position |
| `seating_findings` | run/plan id, severity, rule/evidence refs, affected opaque tokens, state | run/plan indexes |
| `seating_plan_editions` | event id, source run id, version, status, content hash, current working flag, material author | one current working per event |
| `seating_plan_assignments` | edition id, event guest id, table id, optional position id, state, lock state, provenance | unique guest; unique occupied position |
| `seating_manual_decisions` | edition, command, before/after hashes, reason code/text, actor, validation result, created at | immutable |
| `seating_reviews` | edition/hash, domain, decision, reviewer, reason, created at | unique current review per domain/hash; reviewer≠material author |
| `seating_approvals` | edition/hash, approver, decision, created at | approver≠material author |
| `seating_publications` | event, number, edition/hash, input/layout/config hashes, publisher, status, published at, supersedes id | one CURRENT per event; publisher separation |
| `seating_export_jobs` | publication/edition, format, projection class, status, generated at, object key | idempotent format+projection identity |
| `seating_evaluation_runs` | corpus/contract/solver/config/projection versions+hashes, status, lease, counts | readiness indexes |
| `seating_evaluation_case_results` | run id, case id, observations, assertions, status | unique case per run |
| `seating_idempotency_receipts` | org/event, action, key, request hash, result identity, application | unique scope+action+key |
| `seating_migration_receipts` | migration id, checksum, applied at, counts | unique migration id |

Standard scope means `organisation_id NOT NULL`, and event-scoped tables also carry `event_id NOT NULL`. Add FKs where repository practice permits without breaking accepted migrations. Row versions start at 0 and increment exactly once per successful versioned mutation.

### A2. Prohibited persistence

- No `seating*` authoritative arrays inside `PlatformSnapshot`.
- No DELETE-by-absence.
- No policy encoded only in UI conditionals.
- No names/contact/private narrative in run-assignment tables.
- No object-store key in ordinary projections.
- No applied migration checksum changes.

## B. TypeScript schemas

### B1. Input package

```ts
type SeatingUpstreamIdentity = {
  guestCohortHash: string;
  rsvpTruthHash: string;
  layoutPublicationId: UUID;
  layoutContentHash: string;
  eventBriefEditionId?: UUID;
  eventBriefContentHash?: string;
  protectionSnapshotHash?: string;
};

type SolverGuestToken = {
  token: string;
  eligible: boolean;
  partyToken?: string;
  capabilityCodes: string[];
  protocolCodes: string[];
};

type SolverPositionToken = {
  token: string;
  tableToken: string;
  zoneCodes: string[];
  capabilityCodes: string[];
};
```

Use strict schemas. Unknown keys reject. Token generation is HMAC-based with an existing server-held pepper and event-specific context. Raw HMAC inputs/pepper are never logged.

### B2. Constraint predicates

Allowed predicate types only:

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

Each payload is a discriminated union of UUID references and coded tokens. Reject SQL, JavaScript, regex, templates, formulas and arbitrary expression strings.

### B3. Command envelope

```ts
type SeatingCommandEnvelope = {
  organisationId: UUID; // resolved server-side; never trusted from form
  eventId: UUID;
  actorAssignmentId: UUID; // resolved from session
  expectedVersion?: number;
  expectedContentHash?: string;
  idempotencyKey: string; // min 12 chars
};

type Application = "APPLIED" | "REPLAYED" | "NOT_APPLIED";
type SeatingCommandResult<T> = {
  application: Application;
  didDataChange: boolean;
  value: T;
  correlationId: UUID;
};
```

`REPLAYED` and `NOT_APPLIED` always have `didDataChange:false`.

## C. Command catalogue

Implement these named service commands; UI server actions are thin parsers/adapters.

| Command | Permission | Durable effect | Replay identity |
|---|---|---|---|
| `freezeSeatingInputs` | `seating.input.prepare` | immutable input edition + tokens/positions | upstream hash tuple |
| `createSeatingConstraint` | `seating.constraint.manage` | constraint edition | idempotency key/request hash |
| `decideSeatingConstraint` | domain review capability | approval/rejection decision | constraint hash+reviewer |
| `createReservationBlock` | `seating.reservation.manage` | versioned block | request hash |
| `releaseReservationBlock` | same | release transition | block/version |
| `launchSeatingRun` | `seating.run.execute` | run/queue row | input+config+seed |
| `cancelSeatingRun` | same | valid transition | run/version |
| `adoptSeatingRun` | `seating.plan.edit` | new DRAFT edition | run result hash |
| `previewSeatingChange` | `seating.plan.edit` | no durable plan mutation | n/a |
| `applySeatingChange` | `seating.plan.edit` | successor working edition + manual decision | edition/version+change hash |
| `submitSeatingPlan` | `seating.plan.submit` | DRAFT→SUBMITTED | edition/hash/version |
| `decideSeatingReview` | domain-specific | immutable review | edition/hash/domain/reviewer |
| `decideSeatingApproval` | `seating.plan.approve` | SUBMITTED→APPROVED | edition/hash/approver |
| `publishSeatingPlan` | `seating.plan.publish` | CURRENT publication | edition/hash/input/layout/config |
| `requestSeatingExport` | `seating.export` | export job | source+format+projection |
| `runS06Evaluation` | `seating.evaluate` | evaluation run/results | corpus tuple |

Every mutation validates canonical actor/person separation after reloading assignments inside the transaction.

## D. State machines

### D1. Plan

| From | Allowed | Forbidden examples |
|---|---|---|
| DRAFT | SUBMITTED, WITHDRAWN, successor DRAFT | APPROVED, published directly |
| SUBMITTED | APPROVED, REJECTED/returned as successor DRAFT, WITHDRAWN | edit in place, publish |
| APPROVED | publication, SUPERSEDED, WITHDRAWN | edit in place |
| SUPERSEDED/WITHDRAWN | none | revive |

### D2. Run

`QUEUED→RUNNING→FEASIBLE|INFEASIBLE|TIMED_OUT|ERROR`; `QUEUED|RUNNING→CANCELLED`. Terminal rows are immutable. Worker recovery creates a new attempt record; it does not rewrite a terminal outcome.

### D3. Publication

`CURRENT→SUPERSEDED|WITHDRAWN`. Creating a new CURRENT supersedes the previous CURRENT atomically. Publications never become drafts.

## E. Solver algorithm

### E1. Preparation

1. Sort guests by: number of hard constraints descending, locked first, reservation priority descending, opaque token ascending.
2. Sort positions by table token then ordinal token.
3. Build candidate position sets by intersecting eligibility, capability, zone/table and lock constraints.
4. Fail early with typed findings for empty candidate sets, impossible exact blocks or capacity deficits.

### E2. Allocation

Use deterministic branch-and-bound over the most constrained guest. Apply constraint propagation after each tentative assignment. Maintain lexicographic score vectors, not a blended scalar. Prune branches that cannot beat the best vector. Enforce configured time/memory bounds. A timeout returns `TIMED_OUT`, never a partial plan described as feasible.

For 600 guests, decompose only along proven-independent connected components of the hard-constraint graph; reservation/global capacity edges prevent unsafe decomposition. Merge components deterministically and run a final full validation.

### E3. Alternatives

After the best solution, generate at most two additional solutions by adding deterministic diversity constraints against prior assignments. An alternative must differ on the configured materiality threshold and still have zero hard violations. Do not create cosmetic alternatives.

### E4. Explanation

Reason codes are typed: `LOCKED`, `HARD_GROUP`, `HARD_SEPARATION`, `REQUIRED_CAPABILITY`, `RESERVATION`, `PROTOCOL_PRIORITY`, `ACCESSIBILITY_PRIORITY`, `WEIGHTED_PREFERENCE`, `STABILITY`, `CAPACITY`, `NO_FEASIBLE_POSITION`. Staff narrative is generated from templates outside the solver; no AI-authored explanation.

## F. Projection and disclosure

| Audience | Names | Constraint reasons | Sensitive capability | Hash/IDs | Mutation |
|---|---|---|---|---|---|
| Planner/Seating Lead | operational names | allowed operational | purpose-safe label | secondary | authoring |
| Specialist | implicated subset | own domain | own domain | secondary | review only |
| Event Director | operational | summary + governed detail | purpose-safe | secondary | approve |
| CEO/Publisher | full authorised operational | summary + governed detail | purpose-safe | secondary | publish |
| Auditor | permission-safe labels | redacted evidence | masked | provenance | none |
| System Administrator | none via seating | none | none | health only | none |
| Downstream S07 | none | none | coded operational outputs only | required stable IDs | none |

## G. Exact page specification

### G1. Global frame

Header: event breadcrumb, `Seating Command`, current publication badge, input freshness badge. Tab order follows Overview→Inputs→Rules→Reservations→Runs→Studio→Review→Publication. On mobile tabs wrap or horizontally scroll within their own container—never the document.

### G2. Overview

Top cards: `Input readiness`, `Eligible guests`, `Seated`, `Unseated`, `Hard blockers`, `Current publication`. Below: `What needs attention` sorted blocker→stale→review→warning, then `Next authorised action`. Every number links to the filtered underlying records.

### G3. Inputs

Cards for Guest cohort, RSVP truth, Layout publication, Event Brief, Protection snapshot. Each shows human label, state, last changed, complete hash in expandable provenance, and impact of refresh. `Freeze new input edition` previews which prior runs/plans become stale.

### G4. Rules

Separate sections `Hard rules`, `Weighted preferences`, `Information only`. Create/edit form fields: name, kind, predicate type, targets via governed selectors, weight only for weighted, source/evidence, disclosure, reason, review domain. Preview uses plain language. Never expose a JSON predicate editor.

### G5. Reservations

Capacity ledger at top: total, generally available, reserved minima/maxima, unresolved overbooking. Block form uses governed guest-set and table/zone selectors. Each block says `reserved does not mean seated`.

### G6. Runs

Launcher selects frozen input and accepted solver config; deterministic seed is generated/displayed and may be copied, not casually edited. Cards show queue/running/terminal state, timing, seated/unseated, hard violations, preference score and stale marker. Compare form accepts base and comparison run and produces textual/material diff.

### G7. Studio

Desktop: table canvas/list, unseated queue, inspector. Mobile: table cards then guest queue; no tiny free-form canvas dependency. Selecting a guest shows current assignment, relevant constraints and allowed actions. Drag opens the same preview dialog as keyboard `Move`. Swap requires selecting two guests. Apply button includes effect wording. Hard failure leaves safe values and focus on error summary/field.

### G8. Review

Material diff, manual-decision log, outstanding specialist reviews, exact plan hash and submission control. Review cards identify reviewer by human label, decision, reason and time. No raw UUID headings.

### G9. Publication

Sections: Working edition, Operational approval, Current publication, History, Exports. The CURRENT publication remains visible above any draft. Buttons are capability-bound and server-authoritative. Publish confirmation states that it does not send messages, issue credentials or check guests in.

## H. Human-safe copy

Use these exact concepts:

- Infeasible: `No safe seating plan satisfies every hard rule.`
- Unseated: `This guest remains unseated; the system did not invent a placement.`
- Replay: `Existing result reused` / `No data changed.`
- Stale: `Upstream event information changed. Review and run again.`
- Conflict: `The record changed elsewhere. Reload this item before retrying.`
- Permission: `This assignment cannot perform this seating action.`
- Publication: `Published without sending messages, issuing credentials or changing check-in.`
- Solver: `The solver recommends. Authorised people decide.`

## I. Evaluation case register

Implement all 59 independent cases below; split cases further when necessary rather than combining unrelated claims. The reported corpus count must equal the registered case count—never preserve a vanity or stale count.

| ID | Proof |
|---|---|
| S06-ISO-01 | cross-organisation read denied |
| S06-ISO-02 | cross-event read denied |
| S06-ISO-03 | forged event ID mutation denied |
| S06-ID-01 | event guest ID used; party not substituted |
| S06-ID-02 | tokens differ across events |
| S06-IN-01 | no current layout blocks freeze |
| S06-IN-02 | changed layout hash stales run/plan |
| S06-IN-03 | forecast does not overwrite RSVP |
| S06-IN-04 | unknown RSVP remains non-eligible/indeterminate per policy |
| S06-IN-05 | disputed source blocks affected rule |
| S06-PRI-01 | prohibited name rejected from solver request |
| S06-PRI-02 | email/phone/address rejected |
| S06-PRI-03 | free-text/prompt injection rejected/inert |
| S06-PRI-04 | Auditor projection masks sensitive capability |
| S06-LAY-01 | logical positions deterministic from table capacity |
| S06-LAY-02 | seating command cannot mutate layout |
| S06-CAP-01 | table capacity never exceeded |
| S06-CAP-02 | total shortfall yields explicit unseated/infeasible |
| S06-HARD-01 | keep-together satisfied |
| S06-HARD-02 | keep-apart satisfied |
| S06-HARD-03 | required capability satisfied |
| S06-HARD-04 | impossible hard set never relaxed |
| S06-WGT-01 | weighted preference may remain unsatisfied and is disclosed |
| S06-WGT-02 | higher objective never traded for lower |
| S06-RES-01 | exact reservation participates in global capacity |
| S06-RES-02 | over-reservation becomes blocker |
| S06-RES-03 | release restores capacity without seating guests |
| S06-SOL-01 | same tuple gives byte-stable result hash |
| S06-SOL-02 | changed config/seed creates distinct identity |
| S06-SOL-03 | stateless cross-run isolation |
| S06-SOL-04 | 600-guest performance gate |
| S06-RUN-01 | equivalent launch replays |
| S06-RUN-02 | cancel transition valid and terminal immutable |
| S06-RUN-03 | worker loss/lease recovery no duplicate result |
| S06-EDIT-01 | move preview then atomic apply |
| S06-EDIT-02 | swap preserves uniqueness |
| S06-EDIT-03 | manual hard violation denied |
| S06-EDIT-04 | stale version returns conflict/no write |
| S06-EDIT-05 | undo/redo append decisions, do not delete history |
| S06-AUTH-01 | Planner self-approval denied |
| S06-AUTH-02 | Director approval exact hash |
| S06-AUTH-03 | Director publish denied |
| S06-AUTH-04 | CEO/publisher distinct and succeeds |
| S06-AUTH-05 | Auditor mutation denied |
| S06-AUTH-06 | System Administrator has no seating authority |
| S06-PUB-01 | identical publish replay same identity/time |
| S06-PUB-02 | successor draft retains last-known-good |
| S06-PUB-03 | failed publish retains last-known-good |
| S06-PUB-04 | downstream projection omits identity/sensitive reasons |
| S06-UI-01 | Unicode NFC labels survive |
| S06-UI-02 | hostile markup renders inert text |
| S06-EVAL-01 | stale corpus blocks release |
| S06-EVAL-02 | every case has persisted observations |
| S06-MUT-01 | silent hard relaxation detected |
| S06-MUT-02 | identity leak detected |
| S06-MUT-03 | fabricated assignment detected |
| S06-MUT-04 | auto-approval detected |
| S06-MUT-05 | publication overwrite detected |
| S06-MUT-06 | false-success receipt detected |

## J. Playwright journeys

Each spec creates uniquely labelled synthetic data, records first-run failure, uses fresh result correlations and verifies reload persistence.

1. `s06-input-readiness.spec.ts`: missing/stale/current upstream states and freeze.
2. `s06-rules-reservations.spec.ts`: governed selectors, hard/weighted distinction, capacity ledger.
3. `s06-solver-feasible.spec.ts`: launch, progress, deterministic replay, alternatives, comparison.
4. `s06-solver-infeasible.spec.ts`: impossible constraints and explicit unseated outcome.
5. `s06-studio-editing.spec.ts`: keyboard move/swap/unseat/lock, preview, stale-tab conflict.
6. `s06-publication.spec.ts`: Planner→specialist if needed→Director→CEO, replay, successor draft.
7. `s06-permissions.spec.ts`: Auditor/Admin/cross-event/cross-org/direct-route denial.
8. `s06-responsive-accessibility.spec.ts`: 360/768/1440, 200%, reduced motion, focus, no overflow.
9. `s06-verify-as.spec.ts`: triple gate, allowlist, fresh session, audit, absence under production-authorised test config.
10. `s06-live-whole-slice.spec.ts`: one combined live journey without old-banner or broad-selector shortcuts.

## K. Acceptance evidence thresholds

- 600 guests: p95 ≤10s across ten warm runs; cold ≤20s; zero hard violations; memory recorded.
- Focused page GET <3s target; ordinary mutation <10s; no action >30s.
- Two consecutive live publication/replay journeys on final SHA.
- Full unit suites zero failures—not “pre-existing” failures silently accepted.
- Every current evaluation case persisted; zero-tolerance clear.
- No document-level horizontal overflow at required viewports/zoom.
- Independent reviewer performs the sealed holdout and Claude whole-slice UX/function review.
