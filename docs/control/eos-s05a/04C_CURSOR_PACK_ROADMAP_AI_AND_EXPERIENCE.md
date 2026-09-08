# EOS-S05A — Detailed Cursor Prompt Pack
## Volume C — Roadmap, Change, Conversational AI and Experience
Status: CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY
Prompts: EEC-26–EEC-40
Inheritance: every global law and code convention in Volume A applies.

# EEC-26 — Roadmap domain, milestones and immutable editions
## Objective
Define the roadmap as readiness outcomes, not a task list.
## Types

```typescript
type MilestoneLayer = "CLIENT_OUTCOME" | "OPERATIONAL_READINESS" | "DECISION";
type RoadmapConfidence = "CONFIRMED" | "FORECAST" | "PROVISIONAL" | "AT_RISK" | "BLOCKED";
type DependencyKind =
  | "FINISH_TO_START" | "START_TO_START" | "DECISION_GATES"
  | "EVIDENCE_GATES" | "FINANCIAL_GATES" | "SCOPE_DEPENDS_ON";
```

Implement template and event-roadmap draft/edition records. A milestone contains achieved-state wording, layer, canonical programme phase/workstream, owner, forecast/target/latest-safe dates, confidence, evidence requirement, investment window, client visibility, delay consequence and optional buffer.
Published editions are immutable and exact-hash superseded. Do not modify canonical Event phase from roadmap state.
## Tests
Invalid activity-style milestone warning, date ordering, unknown owner, immutable publication, phase association without count summation, client visibility and cross-event isolation.

# EEC-27 — Governed roadmap templates and instantiation
## Objective
Create reusable patterns that adapt without becoming static wedding checklists.
## Requirements
Create versioned synthetic templates for long/standard/compressed lead modes and representative event types. Template rules define applicability, relative date windows, required evidence and dependency edges. Instantiation binds Event Brief, venue and investment hashes and records every default/override.
Use explicit calendar/time-zone arithmetic. Do not assume all days are working days; add governed calendar constraints with safe defaults and visible unresolved state.
Template updates do not mutate existing roadmaps. Provide comparison/adopt-as-new-edition workflow.
## Tests
Eighteen-month event with intentional deferrals, eight-week compression, multi-day/ceremony event, Lagos timezone/DST-safe general handling, event date change and template supersession.

# EEC-28 — Dependency graph validation and deterministic critical path
## Objective
Implement explainable graph reasoning.
## Engine
Represent nodes and typed edges in an acyclic directed graph. Validate missing nodes, self-loops, cycles, incompatible scope and impossible date constraints. Calculate earliest/latest dates, float/buffer and critical-path candidates using deterministic duration/calendar inputs.
Do not label a path critical when required duration/evidence is unknown. Return INSUFFICIENT_INFORMATION with missing inputs. Preserve multiple equal critical paths.

```typescript
type CriticalPathResult = Readonly<{
  status: "CALCULATED" | "INSUFFICIENT_INFORMATION" | "INFEASIBLE";
  milestoneIds: readonly MilestoneId[];
  totalDurationDays?: string;
  assumptions: readonly RoadmapAssumption[];
  explanation: readonly PathTraceStep[];
  inputHash: string;
}>;
```

## Tests
Golden DAGs, two critical paths, buffer changes, cycle rejection, unknown duration, decision-gate delay, venue dependency cascade, deterministic replay and large-graph performance.

# EEC-29 — Decision deadlines, financial windows and readiness
## Objective
Connect decisions, money and readiness without collapsing their meanings.
Create DecisionRequirement with decision owner, recommended/latest-safe dates, authority source, consequence, alternatives and affected milestones. Connect indicative financial commitment windows to Budget scenario lines/declarations by reference; do not copy or convert them into paid/committed truth.
Implement ReadinessAssessment as immutable observation with status, critical milestones, overdue/latest-safe decisions, dependency health, investment alignment, owned risks and explanation. Task completion percentage may be supporting data only.
## Tests
95% tasks but venue blocked → not on track; harmless non-critical delay; cash window without commitment; expired client decision; unknown owner; stale budget link and honest recalculation.

# EEC-30 — Short-lead compression and infeasibility engine
## Objective
Turn short lead time into explicit parallel planning and risk rather than false reassurance.
Define minimum dependency thresholds permitting controlled overlap. Generate proposed workstreams IMMEDIATE_PARALLEL, AFTER_MINIMUM_DEPENDENCY, LATER. Identify accelerated procurement, reduced choice, approval compression, resource collision and impossible latest-safe dates.
The engine proposes a compressed roadmap and shows deviations from the standard template. It cannot waive safety, legal, authority or maker/checker gates. If constraints cannot be satisfied, status is INFEASIBLE or REQUIRES_SCOPE_DECISION, never green.
## Tests
Eight-week event, unavailable venue, imported material lead time, late invitation, overlapping supplier work, protected gate, client unavailability and reduced-scope recovery.

# EEC-31 — Planner Roadmap Studio frontend
## Objective
Make dependencies and decisions operable without reproducing a project-management grid.
## Page structure
- executive strip: days, phase, readiness, next outcome/decision;
- timeline by meaningful workstream/phase;
- critical-path focus;
- milestone detail with evidence/dependencies/financial window;
- client-decision queue;
- risk and infeasibility panel;
- comparison/rebaseline history.
Provide list/table alternative to any graphical timeline. Dragging may adjust a draft only and must have keyboard equivalents, explicit save and CAS. Use text/pattern/icon plus colour. Do not place hundreds of tasks on the roadmap.
## Tests
Keyboard date/dependency editing, graph/list parity, focus after save, mobile stacked journey, 200% zoom, long milestone names, stale edit, prohibited rebaseline and no document overflow.

# EEC-32 — Client Roadmap frontend
## Objective
Give confidence without transferring operational complexity.
Show “You are here,” next outcome/date, what Maison Doclar needs from the client, recommended/latest-safe decision date, consequence stated calmly, subsequent major outcomes, investment-range status and overall readiness explanation.
Hide internal tasks, supplier negotiations, staff notes, restricted risk, raw graph and unauthorised investment details. Provide client confirmation/decision submission as proposals with receipts; no direct roadmap mutation.
## Tests
Separate session, expired access, decision submission, mobile/keyboard/screen reader, at-risk wording, no hidden-data DOM leakage and staff/client same milestone identity.

# EEC-33 — Change detection and proposal service
## Objective
Capture living discovery without silently rewriting the event.
Create change proposals from authorised new sources or manual staff initiation. Bind the source segment, candidate assertion, current governing brief hash and proposed semantic change. Classify scope, materiality and confidence. AI detections remain DETECTED proposals.
Lifecycle: DETECTED → TRIAGED → IMPACT_ASSESSED → CLARIFICATION_REQUIRED | READY_FOR_DECISION → APPROVED | REJECTED → PROPAGATED → VERIFIED.
Duplicate detections over the same source/semantic hash must be idempotent. A rejected proposal cannot be revived by the model.
## Tests
Guest-count message, changed venue/date, extra ceremony, non-material wording, duplicate source, rejected reappearance, unauthorised participant and cross-event injection.

# EEC-34 — Exact-hash impact assessment
## Objective
Calculate consequences before humans decide.
Impact assessment is a pure orchestration over read-only adapters. It lists affected Brief assertions/editions, Budget assumptions/scenarios/recommendations, Roadmap milestones/critical paths/decisions, risks and accepted downstream products that may become stale.
Every assessment binds source hash, current target hashes, adapter versions and calculation time. It must distinguish DIRECT, POTENTIAL, NONE, UNKNOWN impact and state why. Never claim no impact merely because an adapter is absent.
## Tests
320→360 guests affects catering/venue/roadmap but not automatically RSVP; venue change affects layout provenance; date change affects season/price/roadmap; harmless spelling correction; stale assessment after concurrent publication.

# EEC-35 — Change decision, rebaseline and propagation adapters
## Objective
Make approved change deliberate and domain-owned.
Require maker/checker for material changes. Decision binds proposal and impact hashes. Approved propagation calls explicit destination adapters which create proposals/new editions under destination authority; the change service never writes destination tables directly.
Support partial propagation only when clearly recorded, with remaining impacts open. Verify resulting hashes and preserve rollback through forward supersession, never destructive history rewrites.
## Tests
Self-approval denial, stale impact denial, one adapter failure with honest partial result, retry idempotency, change rejected, cross-event adapter, no direct RSVP/forecast mutation and audit correlation across child actions.

# EEC-36 — AI provider boundary, schemas and job lifecycle
## Objective
Introduce optional AI without making it the system backbone.
## Interface

```typescript
interface DiscoveryAiProvider {
  proposeAssertions(input: PermissionSafeDiscoveryInput): Promise<AiProposalEnvelope>;
  proposeNextQuestion(input: CoveragePromptInput): Promise<AiQuestionEnvelope>;
  draftSummary(input: SummaryPromptInput): Promise<AiSummaryEnvelope>;
  draftChangeDetection(input: ChangePromptInput): Promise<AiChangeEnvelope>;
}
```

Strictly validate response schemas, model/policy version, citations and maximum sizes. Jobs have PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED, with durable idempotency and retry classification. Provider interface has timeouts, circuit breaker, cost/token budget and redacted telemetry.
Ship a deterministic fixture provider for tests and an explicitly inactive production adapter. No provider secret is required or requested in this prompt.
## Tests
Malformed response, missing citation, unsupported assertion, timeout, duplicate retry, provider unavailable, oversized output, prompt injection, secret-like content redaction and no database mutation.

# EEC-37 — Coverage-led conversational orchestrator
## Objective
Conduct a natural interview by knowledge gaps, not question order.
The orchestrator combines session state, permission-safe confirmed knowledge, coverage assessment, recent turns, fatigue/pacing and sensitive-topic policy. Deterministic policy selects eligible gaps; AI may phrase one selected question but cannot alter its purpose or sensitivity.
Support acknowledgement, follow-up, summary, correction, pause/resume, skip, prefer-not-to-answer and human handoff. Suppress already answered questions unless conflict/staleness/material confirmation justifies revisiting them; explain the revisit.
Persist user input before model processing so provider failure does not lose the answer. Never claim an answer saved if persistence failed.
## Tests
Natural branching, repeat suppression, relevant probe, premature deferral, sensitive explanation, fatigue stop, provider failure after answer save, resume across restart, multi-participant conflict and correct session termination.

# EEC-38 — Interview and review frontends
## Objective
Create premium human-led and client-led discovery experiences.
## Client surface
Primary conversation column, concise progress statement, pause/handoff, source/consent status and accessible composer. No giant questionnaire, crude percentage or internal codes. Show periodic summaries with confirm/correct/defer actions.
## Staff surface
Conversation/notes primary; private copilot suggestions visually distinct and never visible to client. Coverage drawer, source status and suggested follow-up are secondary. Staff can ignore/edit a suggested question without changing catalogue truth.
Streaming text must not trap focus or overwhelm screen readers. Provide non-streaming reduced-motion mode. Use inert rendering for all transcript/model text.
## Tests
Keyboard complete session, focus/announcement discipline, pause/resume, human handoff, reconnect, 360/tablet/desktop/200%, reduced motion, long Yorùbá content, client/staff projection separation and provider-unavailable recovery.

# EEC-39 — AI evaluation, red team and model-release gate
## Objective
Make AI quality measurable and prevent unreviewed model drift.
Implement a versioned synthetic evaluation corpus covering every scenario in the ratified AI specification. Record supported-assertion precision/recall, citation accuracy, speaker attribution, contradiction recall, repeat-question rate, schema validity, false-governing-truth rate, protected-trait/wealth inference, handoff/stop quality and permission leakage.
Set release thresholds in a governed configuration; zero tolerance for governing-truth elevation, protected-trait/wealth inference and permission leakage. Store evaluation run, model, prompt/policy, corpus edition and results. Model/prompt upgrades require a new evaluation; no silent “latest model.”
Red-team prompt injection, impersonation, cross-event access, invented approval, toxic/malformed output, revoked consent, restricted surprise, currency/date ambiguity and concurrency.
## Evidence
Provide machine-readable results and concise failure examples without real data or secrets. A failure cannot be averaged away if it violates a zero-tolerance invariant.

# EEC-40 — Executive Event Command and integrated navigation
## Objective
Deliver the executive synthesis without building a second Programme Control Tower.
## Event view
Show what is being delivered, days/phase, brief alignment, overall readiness with explanation, next milestone, next client decision, critical path, investment envelope/committed/paid/forecast distinctions, next cash need, top risks/contradictions and executive intervention.
## Portfolio view
CEO-only, organisation-scoped exception list. Rank by materiality/latest-safe date, not by opaque AI score. No cross-client data leakage. Each item links to authoritative Event OS evidence and actionable destination.
## UX
Use strong hierarchy and restrained density; avoid decorative KPI grids. Boundary sentences explain what each number/state does and does not mean. Provide loading/empty/partial/stale/error states. Human-readable labels lead; immutable identifiers remain secondary.
## Tests
CEO view, Event Director event-only projection, Planner relevant actions, Auditor read-only, System Administrator denial, event isolation, false-green prevention, keyboard/mobile/zoom/accessibility and navigation back to Event overview.
## Milestone C exit gate
Run full shared-platform/Event OS tests, typecheck, programme validation, Event OS build, git diff --check, migration replay, Postgres restart persistence, role/IDOR, concurrency, AI evaluation, accessibility and representative local Playwright. Stop for AI CTO review before deployment if any zero-tolerance AI, authority, privacy, money-integrity, critical-path or false-success invariant fails.
