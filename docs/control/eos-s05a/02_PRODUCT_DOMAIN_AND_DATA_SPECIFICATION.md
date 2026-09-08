# EOS-S05A — Product, Domain and Data Specification

## 1. Primary journeys

### Journey A — staff-led first appointment

An authorised staff member opens a Discovery Engagement, obtains consent, records participants and conducts a natural conversation. The copilot suggests unasked high-value questions privately, captures candidate assertions and maintains a silent coverage map. Nothing becomes governing merely because it was transcribed.

### Journey B — AI-led client interview

An invited client enters a separate, least-privilege session. The AI discloses its role, adapts to answers, permits pause/resume and offers human handoff. The client reviews the generated “Event as we understand it” summary and may confirm, correct, defer or dispute each material area.

### Journey C — human review and brief publication

An authorised planner reviews provenance, merges only truly equivalent assertions, resolves contradictions or seeks clarification, and submits a proposed brief edition. A different authorised checker approves consequential governance/investment content. Publication creates an immutable current edition.

### Journey D — investment recommendation

Staff records the envelope origin/meaning/scope, value priorities, governance and uncertainty. The system produces scenarios and alignment analysis. A recommendation edition states assumptions, incremental value and what Maison Doclar advises against spending.

### Journey E — adaptive roadmap

The system selects a governed template, instantiates event-specific milestones, calculates dependency effects and identifies candidate critical paths. Humans confirm ownership and dates. Client and CEO receive different projections.

### Journey F — living change

A later note suggests a guest-count or scope change. The system proposes a change, cites its source and calculates affected brief assertions, milestones, investment assumptions, risk and downstream products. No propagation occurs until authorised.

## 2. Core records

| Record | Purpose | Mutability |
|---|---|---|
| EngagementOpportunity | Pre-operational enquiry and ownership | Versioned |
| DiscoveryEngagement | Container for one discovery programme | Versioned |
| DiscoveryParticipant | Speaker/role/authority claim | Versioned; not identity truth until linked |
| ConsentRecord | Recording, transcription, AI and retention consent | Append-only/superseding |
| InterviewSession | Mode, timing, language and status | Versioned |
| SourceArtefact | Transcript/note/upload metadata and safety status | Immutable bytes; superseding metadata |
| SourceSegment | Time/author-addressable evidence fragment | Immutable |
| CandidateAssertion | AI or human interpretation of evidence | Versioned proposal |
| AssertionConflict | Incompatible candidate/governing claims | Append-only lifecycle |
| CoverageRequirement | Governed question/knowledge objective | Versioned catalogue |
| CoverageAssessment | Per-engagement status and evidence | Recomputed, traceable |
| EventBriefEdition | Immutable published brief | Immutable/superseding |
| BriefAssertion | Governing fact/preference/constraint/etc. | Immutable within edition |
| InvestmentBriefEdition | Governed investment instruction | Immutable/superseding |
| InvestmentScenario | Range and trade-off proposal | Immutable edition |
| InvestmentStateDeclaration | Envelope/committed/paid/forecast/cash window | Append-only declaration |
| RoadmapTemplateEdition | Event-type pattern and dependency rules | Immutable/superseding |
| EventRoadmapEdition | Event-specific milestone graph | Immutable/superseding |
| Milestone | Outcome/readiness state | Versioned through edition |
| MilestoneDependency | Directed typed edge | Immutable within edition |
| DecisionRequirement | Owner, recommended/latest-safe date, impact | Versioned through edition |
| ReadinessAssessment | Explainable status at an instant | Immutable observation |
| ChangeProposal | Proposed supersession and propagation | Append-only lifecycle |
| ImpactAssessment | Deterministic affected-record analysis | Immutable for input hash |
| RebaselineDecision | Maker/checker decision over exact hashes | Immutable |

Every event-scoped record carries `organisationId`, `clientId` where applicable, `eventId` after conversion, schema version, durable ID, created/updated provenance and optimistic version where mutable.

## 3. Assertion model

### Kinds

`FACT`, `PREFERENCE`, `ASPIRATION`, `PRIORITY`, `CONSTRAINT`, `NON_NEGOTIABLE`, `ASSUMPTION`, `DECISION`, `UNKNOWN`, `NOT_APPLICABLE`, `RISK_SIGNAL`, `DEPENDENCY_SIGNAL`, `INVESTMENT_INSTRUCTION`, `COMMUNICATION_PREFERENCE`.

### Required fields

- subject and canonical topic;
- structured value plus permission-safe narrative;
- source segment IDs;
- asserted-by participant;
- captured-by actor/model;
- direct statement vs interpretation;
- confidence and confidence rationale;
- confirmation state;
- sensitivity class;
- temporal validity (`effectiveFrom`, optional `effectiveUntil`);
- applicable ceremony/event scope;
- contradiction group if any;
- supersedes/superseded-by lineage;
- downstream impact categories.

### Confirmation states

`CAPTURED`, `EXTRACTED`, `PROPOSED`, `STAFF_REVIEWED`, `CLIENT_CONFIRMED`, `GOVERNING`, `DISPUTED`, `SUPERSEDED`, `REJECTED`.

AI cannot set `CLIENT_CONFIRMED` or `GOVERNING`.

## 4. Coverage ontology

The supplied question bank becomes a versioned coverage catalogue, not a fixed script. Each requirement defines:

- purpose and risk if omitted;
- applicability predicate;
- acceptable evidence types;
- minimum confidence;
- whether explicit confirmation is required;
- earliest useful and latest safe discovery phase;
- sensitivity;
- role permitted to ask/view/confirm;
- event-type overlays;
- dependencies on earlier answers;
- whether it is blocking for an indicative brief, working brief or approved brief.

Coverage states:

`UNASSESSED`, `NOT_YET_RELEVANT`, `UNKNOWN`, `PARTIAL`, `ANSWERED_UNCONFIRMED`, `CONFIRMED`, `NOT_APPLICABLE`, `CONFLICTED`, `STALE`.

Completeness is multidimensional. The UI must show what is known, unknown, conflicted, stale and intentionally deferred. It must never use one deceptive percentage as the sole signal.

## 5. Canonical Event Brief

The brief covers, at minimum:

- event purpose, success definition and emotional intent;
- event/ceremony scope and dates;
- principals, stakeholders and decision authority;
- guest assumptions and allocation governance;
- hospitality and guest-journey priorities;
- venue/location status;
- creative/aesthetic direction;
- cultural, religious and protocol requirements;
- food, beverage, programme and entertainment;
- photography, media and privacy;
- invitations and communication preferences;
- access, security and confidentiality;
- travel, transport and accommodation;
- accessibility, inclusion, children and medical planning signals;
- wardrobe, gifts and personalisation;
- technology and production ambition;
- weather, safety, compliance, insurance and sustainability;
- appointed/required/prohibited suppliers;
- investment instruction;
- roadmap and client-availability constraints;
- risks, contradictions, unknowns and next confirmations.

Brief publication requires an exact content hash, maker/checker where consequential, immutable edition, supersession lineage and a human-readable change summary.

## 6. Investment Intelligence

### Distinct concepts

- **Envelope** — authorised, targeted or hypothesised amount/range.
- **Committed** — contractually agreed amount, supported by an authorised declaration/evidence.
- **Paid** — amount declared paid; not a bank transaction unless a later payment product supplies evidence.
- **Forecast** — expected final expenditure with confidence/range.
- **Cash-flow schedule** — expected future requirement by window.

### Investment Brief fields

- origin: client-led, Maison Doclar-led or jointly developed;
- meaning: hard ceiling, working target or starting assumption;
- currency and exchange-rate basis;
- gross/net, VAT/tax and professional-fee treatment;
- inclusions and exclusions;
- contingency placement and rule;
- priority/protected/optimisation areas;
- non-negotiables and prohibited expenditure;
- flexibility and escalation rule;
- approval authorities and thresholds;
- emergency authority;
- cash-flow constraints;
- confidence and evidence state;
- current recommendation and status;
- alignment result and risks.

### Alignment engine

Produces explainable results: `INSUFFICIENT_INFORMATION`, `ALIGNED`, `PRESSURED`, `MISALIGNED`, `SURPLUS_CAPACITY`, `STALE`.

For misalignment it proposes, but never selects:

- protect investment/redesign scope;
- protect priorities/reduce lower-value areas;
- protect full brief/increase envelope;
- defer decision pending evidence.

Scenario comparisons show incremental cost, client-valued benefit, assumptions, excluded scope, confidence and downside. No “Gold/Platinum/Diamond” packaging.

## 7. Roadmap Intelligence

### Milestone layers

- `CLIENT_OUTCOME`
- `OPERATIONAL_READINESS`
- `DECISION`

Milestones describe achieved states, not activities.

### Milestone fields

- outcome statement;
- layer/workstream/phase;
- responsible owner and decision authority;
- forecast, target and latest-safe dates;
- confidence: confirmed, forecast, provisional, at risk, blocked;
- predecessor/successor edges;
- minimum dependency conditions;
- buffer and lead-time rule;
- investment commitment window/range;
- acceptance evidence;
- consequence of delay;
- client visibility;
- critical-path status and explanation;
- source template and overrides.

### Dependency graph

Edges are typed: `FINISH_TO_START`, `START_TO_START`, `DECISION_GATES`, `EVIDENCE_GATES`, `FINANCIAL_GATES`, `SCOPE_DEPENDS_ON`.

Cycles are rejected. Critical-path calculation must be deterministic, testable and explainable. AI may propose edges and durations but cannot hide the governing template/rule or invent false precision.

### Lead-time modes

- Long lead: active now, soon, intentionally later, awaiting evidence.
- Standard: governed template adjusted to event facts.
- Compressed: parallel workstreams, minimum viable dependencies, decision acceleration, procurement risk and explicit infeasibility.

“On track” requires critical milestones achievable, controlled dependencies, timely decisions, aligned investment approvals, owned risks and viable operational readiness. Task completion percentage alone is insufficient.

## 8. Change Intelligence

Change sources include interview follow-up, staff note, client decision, approved message intake or authorised downstream signal. Detection creates a proposal only.

Change lifecycle:

`DETECTED → TRIAGED → IMPACT_ASSESSED → CLARIFICATION_REQUIRED | READY_FOR_DECISION → APPROVED | REJECTED → PROPAGATED → VERIFIED`.

Impact assessment binds to exact source and target hashes and lists:

- affected assertions/brief editions;
- milestones and critical path;
- decision deadlines;
- investment scenarios/forecast assumptions;
- risks and readiness;
- accepted downstream products that may be stale;
- proposed owner and authority;
- reversible vs irreversible consequences.

Propagation uses adapters owned by the destination domain. It never edits RSVP, forecast, programme, language, venue or other records directly from a generic change object.

## 9. Permissions

Introduce granular keys, including:

- `engagement.view/create/manage/convert`;
- `discovery.session.manage`;
- `discovery.source.view/manage`;
- `discovery.assertion.review`;
- `brief.view/manage/submit/approve/publish`;
- `investment.view/manage/recommend/approve`;
- `roadmap.view/manage/rebaseline/approve`;
- `change.view/triage/approve/propagate`;
- `executiveCommand.view`.

CEO has governed broad authority. Event Director has operational review/approval as explicitly granted. Planner authors and proposes but cannot self-approve consequential editions. Read-Only Auditor receives permission-safe evidence only. System Administrator gains no business authority. Client/host sessions receive explicit engagement/event-scoped projections and confirmation actions only.

## 10. Projections

### CEO Executive Event Command

- alignment with governing brief;
- investment position and variance;
- readiness and explanation;
- next milestone and decision;
- critical path and buffer;
- next cash requirement;
- top risks and contradictions;
- executive intervention requests;
- portfolio exceptions without cross-client leakage.

### Planner Intelligence Workspace

Detailed coverage, sources, proposed assertions, conflicts, milestones, dependencies and change proposals.

### Client Roadmap

“You are here,” next outcome, what is needed from the client, latest safe date, upcoming milestones, investment-range status and calm risk explanation. No internal task dump, hidden stakeholder note, model confidence internals or staff-only reasoning.

### Auditor

Immutable editions, decisions, provenance and outcomes with sensitive values masked according to permission. No mutation controls.

## 11. Domain events

Events include `engagement.created`, `consent.recorded`, `interview.started/completed`, `assertion.proposed/reviewed/disputed`, `brief.submitted/approved/published/superseded`, `investment.recommended/approved`, `roadmap.published/rebaselined`, `change.detected/approved/propagated`, `readiness.assessed`.

Every event is correlated, actor-attributed, organisation/event scoped and idempotent at the durable boundary.
