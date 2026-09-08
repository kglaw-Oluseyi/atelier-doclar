# EOS-S05A — Detailed Cursor Prompt Pack
## Volume A — Control, Architecture and Discovery Foundations
Status: CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY
Proposed authority: MD-PR-S037
Prompts: EEC-00–EEC-10
## How this pack operates
This pack replaces the rejected high-level build prompt. Each execution unit defines the required domain result, TypeScript direction, server boundary, frontend responsibility, tests and stop conditions. Cursor must implement the stated architecture rather than inventing an alternative product.
The prompts may be issued in milestone batches after CEO approval. Within an authorised batch Cursor may continue through its included prompts with focused commits. It must stop at the stated milestone gate and return one consolidated report. Cursor never accepts the slice.
LAST_ACCEPTED_COMMIT is replaced at release with the exact GitHub main SHA after the current UX uplift is complete. Cursor must never execute a prompt containing an unresolved placeholder.
## Global laws — apply to every prompt
- Repository only kglaw-Oluseyi/atelier-doclar, branch main.
- Railway only atelier-doclar / production / event-os.
- Preserve accepted EOS-S01–EOS-S05 and EOS-S04A–F contracts.
- EOS-S05A is a non-catalogue insert; accepted-slice count remains 5.
- EOS-S06 Seating Allocation remains not started and not authorised.
- Extend @maison-doclar/shared-platform; do not create parallel identity, Client, Event, RSVP, forecast, programme, venue or audit stores.
- Server-side permission, organisation/event/engagement scope, optimistic concurrency, idempotency and append-only correlated audit are mandatory.
- AI output is proposal data, never governing truth or mutation authority.
- Money uses integer minor units plus ISO currency and deterministic decimal/rational arithmetic; no binary floating-point.
- No eval, Function, arbitrary expression execution or executable rules from database content.
- UI visibility is not authority. Direct action/API attempts must be denied at the service boundary.
- Use synthetic data only. No communications, payments, bookings, provider activation, biometrics or real client data.
- Command Atelier applies to staff; client experience is softer editorial Atelier.
- Every changed primary journey covers loading, empty, permission, error, stale/conflict and success states.
- Enabled clicks use pointer, disabled actions not-allowed, inputs text cursor, visible focus, reduced motion, keyboard completion, 360px no document overflow, tablet/desktop and 200% zoom.
- Record first-run failures honestly. Do not hide product defects behind reruns.
## Common code conventions
Use strict Zod schemas at untrusted boundaries and readonly discriminated unions internally. Commands have explicit actor scope, expected version, reason and idempotency key. Projections are dedicated permission-safe DTOs; never return persistence rows directly.

```typescript
type ScopedCommand = Readonly<{
  organisationId: OrganisationId;
  engagementId?: EngagementId;
  clientId?: ClientId;
  eventId?: EventId;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}>;

type Provenance = Readonly<{
  createdAt: IsoDateTime;
  createdByPersonId: PersonId;
  correlationId: string;
  sourceIds: readonly string[];
  schemaVersion: string;
}>;
```

Routes/server actions remain thin: authenticate, parse, call application service, create truthful action result, redirect/project. Domain services own invariants.

# EEC-00 — Baseline, authority ingestion and compatibility ledger
## Objective
Establish exact execution authority and a file-level implementation map before changing application code.
## Required work
- Verify clean local HEAD equals origin/main and GitHub main at LAST_ACCEPTED_COMMIT.
- Read all ratified EOS-S05A documents, the Budget Engine addendum, current programme/control records and affected accepted-slice contracts.
- Inspect existing shared-platform store/service/schema/policy/audit patterns and Event OS route/component/action patterns.
- Create docs/control/EOS_S05A_RATIFICATION.md, EOS_S05A_IMPLEMENTATION.md, EOS_S05A_BUILD_LEDGER.md, ADR placeholder and traceability entries under MD-PR-S037.
- Record every historical contradiction and its controlling resolution, including EOS-S06 remaining Seating Allocation.
- Map each proposed record to an existing store extension and each UI to an existing navigation/session boundary.
- Do not add application behaviour in this prompt.
## Evidence
- clean baseline/parity;
- compatibility table for Organisation, Client, Event, Person, permissions, audit, RSVP, forecast, programme, communications, Atelier, language, venue/layout;
- proposed additive migration sequence;
- explicit provider and production exclusions.
## Stop
Stop if ratified docs are absent, baseline differs, a current authority supersedes EOS-S05A, or the design requires a parallel canonical ledger.

# EEC-01 — Bounded-context ADR and package architecture
## Objective
Freeze module ownership and dependency direction.
## Required modules
Within shared-platform, create bounded modules with explicit public exports:
engagement-intake
discovery-intelligence
event-brief
investment-intelligence
budget-intelligence
roadmap-intelligence
change-intelligence
executive-event-command
ai-assistance
Dependencies flow from shared identity/event primitives into these modules. executive-event-command consumes projections; it owns no truth. ai-assistance creates proposals through application interfaces and may not import persistence adapters directly. Destination domains own approved propagation adapters.
## ADR decisions
- pre-engagement records are organisation-scoped and not Events;
- operational conversion is explicit and idempotent;
- immutable edition/content-hash pattern for brief, investment, price/rule/template, roadmap and recommendation publications;
- append-only source/provenance/audit;
- mutable working records use CAS;
- calculations are pure functions over immutable snapshots;
- AI provider interface is optional and disabled by default;
- Executive Event Command is distinct from Programme Control Tower.
## Tests
Add dependency/exports tests or architectural assertions that prevent AI and UI modules importing persistence internals or bypassing services.

# EEC-02 — Permission catalogue and role-safe projection contract
## Objective
Add least-privilege capabilities before routes exist.
## Permission keys
Implement granular keys from the ratified spec, separated at minimum into view, author, submit, decide/publish and convert/propagate actions. Do not use one broad discovery.manage or budget.manage permission for all consequences.
Required groups:

```typescript
type EecPermission =
  | "engagement.view" | "engagement.create" | "engagement.update" | "engagement.convert"
  | "discovery.session.view" | "discovery.session.manage"
  | "discovery.source.view" | "discovery.source.manage"
  | "discovery.assertion.review"
  | "brief.view" | "brief.author" | "brief.submit" | "brief.decide" | "brief.publish"
  | "investment.view" | "investment.author" | "investment.recommend" | "investment.decide"
  | "budget.catalogue.view" | "budget.catalogue.manage" | "budget.calculate"
  | "budget.scenario.author" | "budget.recommend" | "budget.decide"
  | "roadmap.view" | "roadmap.author" | "roadmap.rebaseline" | "roadmap.decide"
  | "change.view" | "change.triage" | "change.decide" | "change.propagate"
  | "executiveCommand.view";
```

## Role intent
- CEO: governed broad business authority, subject to maker/checker.
- Event Director: event-scoped operational review/decision only where granted.
- Planner: author/propose/calculate; no self-approval of consequential hashes.
- Read-Only Auditor: permission-safe evidence, no mutations.
- System Administrator: health/configuration only; no implicit business authority.
- Client/host: separate session and explicit engagement/event confirmation projection.
## Required tests
Table-drive every permission by role; test inactive/expired assignments, wrong event/client/organisation, direct service and route denial, catalogue-role-without-active-assignment, CEO maker/checker self-decision denial and System Administrator non-substitution.

# EEC-03 — Canonical identifiers, primitives and assertion ontology
## Objective
Implement the shared strict types on which later schemas depend.
## Required types
Create branded IDs for opportunity, engagement, participant, consent, session, source artefact/segment, assertion, conflict, coverage item/assessment, brief edition, investment edition, budget entities, roadmap entities and change entities.
Implement:

```typescript
type AssertionKind =
  | "FACT" | "PREFERENCE" | "ASPIRATION" | "PRIORITY"
  | "CONSTRAINT" | "NON_NEGOTIABLE" | "ASSUMPTION" | "DECISION"
  | "UNKNOWN" | "NOT_APPLICABLE" | "RISK_SIGNAL"
  | "DEPENDENCY_SIGNAL" | "INVESTMENT_INSTRUCTION"
  | "COMMUNICATION_PREFERENCE";

type ConfirmationState =
  | "CAPTURED" | "EXTRACTED" | "PROPOSED" | "STAFF_REVIEWED"
  | "CLIENT_CONFIRMED" | "GOVERNING" | "DISPUTED"
  | "SUPERSEDED" | "REJECTED";

type SensitivityClass =
  | "STANDARD" | "CONTACT" | "FAMILY_PRIVATE" | "CULTURAL_RELIGIOUS"
  | "ACCESSIBILITY_HEALTH" | "SECURITY" | "FINANCIAL" | "CONFIDENTIAL_SURPRISE";
```

Add exhaustive transition guards. AI-origin commands are structurally incapable of selecting CLIENT_CONFIRMED or GOVERNING.
## Canonicalisation
Define Unicode NFC, stable key order, ISO timestamps, decimal strings, sorted set fields and exact hashing. Preserve Yorùbá diacritics. Content hashes exclude mutable operational metadata but include every governing semantic field.
## Tests
Round trips, invalid transitions, Unicode, duplicate set ordering, hash stability, unknown vs absent vs not applicable, and maximum field sizes.

# EEC-04 — Persistence schema, indexes and additive migration
## Objective
Extend the existing Postgres-backed platform store without generic JSON-blob truth.
## Required persistence
Add typed collections/tables for all core records in the ratified specification. JSON may hold strictly validated typed values or rule AST nodes, never unbounded domain state. Every event-bound row repeats and validates organisation/event lineage. Pre-event rows carry organisation and engagement lineage.
## Invariants
- one current published edition per aggregate, enforced transactionally;
- immutable published editions;
- unique idempotency tuple by actor/action/scope/key;
- source segments cannot outlive or cross their source artefact;
- assertion source IDs share engagement/organisation;
- conversion links one engagement to at most one operational Event;
- approval binds exact content hash and different maker/checker;
- dependency graph edges share roadmap edition;
- no cross-currency aggregate without an FX conversion record;
- append-only audit and decision rows;
- optimistic versions for working aggregates.
## Migration
Use additive, replay-safe migrations with no destructive reset. Seed only clearly synthetic catalogue/template data. Provide in-memory and Postgres parity tests plus restart hydration.

# EEC-05 — Engagement Opportunity and Discovery Engagement services
## Objective
Create the pre-operational front door.
## Commands
Implement explicit services for create/update/close opportunity, start/archive discovery engagement, add/link participant and assign engagement owner. Duplicate detection proposes candidates; it never merges or creates Person/Client automatically.

```typescript
type CreateEngagementInput = ScopedCommand & Readonly<{
  displayReference: string;
  eventConceptLabel?: string;
  enquiryChannel: "REFERRAL" | "DIRECT" | "PARTNER" | "OTHER";
  knownEventDate?: IsoDate;
  knownEventType?: string;
}>;
```

Do not label prospects by wealth or status. Opportunity stages describe relationship/process state only.
## Projection
Return permission-safe list/detail DTOs with human labels, ownership, next discovery action and completeness state. Auditor is read-only; client session sees only its invitation context.
## Tests
Organisation isolation, duplicate suggestions without merge, idempotent create, stale update, inactive assignment denial, audit attribution and no operational Event side effect.

# EEC-06 — Consent, participants and interview-session lifecycle
## Objective
Make AI/recording participation explicit and recoverable.
## Consent model
Store separate grants for participation, audio recording, transcription, AI analysis, source retention and de-identified benchmarking. Record policy version, wording edition, actor/participant, granted/declined time, optional withdrawal and legal/retention basis placeholder.
## Session states
DRAFT → READY → ACTIVE → PAUSED → COMPLETED, with ABANDONED and CANCELLED. Resume must be idempotent and preserve coverage/source state. Completion does not imply brief confirmation.
The service must refuse audio/transcription/AI processing without the specific active consent. Manual note-taking remains separately governed.
## Tests
Partial consent, withdrawal, resume, duplicate start, two participants with different consent, expired client invitation, wrong engagement, browser refresh persistence and truthful provider-unavailable state.

# EEC-07 — Source artefacts, transcript segments and provenance
## Objective
Create immutable, addressable evidence.
## Requirements
- Source artefact kinds: typed staff note, uploaded document, audio metadata, transcript, approved message intake.
- Store binaries privately using the accepted object-storage safety pattern; no public URLs or stored signed URLs.
- Segments carry sequence/time range, speaker claim, text, language, transcription confidence and content hash.
- Speaker identity may remain UNRESOLVED; do not guess.
- Sanitise markup and render text inertly.
- Enforce file allowlist, size limits, content-safety status and fail-closed retrieval.
- Model prompts reference permission-safe segments only.
## Tests
Unicode/Yorùbá integrity, malicious markup/prompt text inertness, missing consent, cross-engagement segment injection, private download denial, storage failure before completion and immutable checksum.

# EEC-08 — Coverage catalogue and applicability engine
## Objective
Convert the supplied question bank into a governed coverage ontology without turning the UI into a script.
## Catalogue
Create versioned topics, event-type overlays, requirements, probes and end-of-meeting checks. Each requirement specifies purpose, omission risk, applicability predicate, acceptable evidence, confirmation need, sensitivity, earliest useful/latest safe phase and completeness gate.
Applicability uses a safe closed predicate AST, not arbitrary code. The output states are UNASSESSED, NOT_YET_RELEVANT, UNKNOWN, PARTIAL, ANSWERED_UNCONFIRMED, CONFIRMED, NOT_APPLICABLE, CONFLICTED, STALE.
## Ranking
Implement deterministic ranking of next gaps using configured omission severity, urgency, dependency reach and answerability. Client fatigue/session pacing is an input; do not maximise count.
## Tests
Wedding, corporate, private dinner, funeral/memorial, chieftaincy, destination and generic fixtures; answered information suppresses repeat; premature questions defer; “prefer not to answer” persists; one percentage is never the sole completeness result.

# EEC-09 — Candidate assertion extraction and human review service
## Objective
Create the only path from prose evidence to structured proposals.
## Contract

```typescript
type CandidateAssertionProposal = Readonly<{
  kind: AssertionKind;
  topicKey: string;
  value: unknown;
  sourceSegmentIds: readonly SourceSegmentId[];
  directness: "DIRECT_STATEMENT" | "INTERPRETATION";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;
  sensitivity: SensitivityClass;
}>;
```

Validate value against the topic’s schema. Reject citations that do not support the proposal or lie outside the actor projection. Human review can accept as staff-reviewed, amend by creating a superseding proposal, reject or request clarification. Never mutate the original extraction.
## Tests
Unsupported assertion rejection, wrong speaker, malformed value, repeated source, low confidence, prompt injection, AI attempt to mark governing, stale review and audit lineage.

# EEC-10 — Contradiction, staleness and clarification engine
## Objective
Prevent silent overwrite and intelligent-but-wrong certainty.
## Rules
Detect exact topic/scope conflicts, temporal supersession candidates and incompatible authority claims. Do not treat all differing preferences as contradictions. Preserve both assertions and sources.
Create AssertionConflict with severity, affected topics, source/assertion IDs, explanation, decision owner and blocking gates. Resolution may select, supersede, scope-separate, record coexistence or request clarification. High-impact financial/date/scope/authority conflicts block relevant publication.
Generate humane clarification wording from deterministic templates, with optional AI refinement that cannot alter referenced facts.
## Tests
320 vs 360 guests; target vs maximum count; two ceremonies with different counts; principal vs unauthorised relative; changed date; preference evolution; coexisting spouse preferences; expiry/staleness; no automatic winner.
## Milestone A exit gate
After EEC-10 run focused and full shared-platform gates, migration replay and Postgres persistence tests. Commit/push may occur if authorised, but do not deploy a non-journey foundation unless the release prompt explicitly directs it. Return one consolidated M1/M2-foundation report for AI CTO review.
