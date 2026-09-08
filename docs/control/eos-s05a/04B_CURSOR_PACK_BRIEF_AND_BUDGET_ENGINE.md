# EOS-S05A — Detailed Cursor Prompt Pack
## Volume B — Canonical Brief, Conversion and Budget Intelligence Engine
Status: CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY
Prompts: EEC-11–EEC-25
Inheritance: every global law and code convention in Volume A applies.

# EEC-11 — Canonical Event Brief working aggregate
## Objective
Build a typed working brief from staff-reviewed assertions while preserving provenance, conflicts and explicit gaps.
## Required implementation
Create EventBriefDraft as an organisation/engagement-scoped aggregate before conversion and event-scoped after conversion. It references assertions; it does not copy unsupported prose into opaque fields. Organise sections by the ratified coverage domains and retain per-section readiness.
Required service methods:

```typescript
createBriefDraft(actor, input)
addAssertionToBrief(actor, input)
removeAssertionFromDraft(actor, input)
recordBriefUnknown(actor, input)
submitBriefEdition(actor, input)
decideBriefEdition(actor, input)
publishBriefEdition(actor, input)
```

Submission computes a canonical content hash. Decision binds the exact hash. Maker cannot decide their own consequential edition. Publication is transactional, immutable and supersedes the previous current edition without mutation.
## Gate logic
Define INDICATIVE, WORKING and APPROVED completeness gates. Missing facts may be permitted with explicit risk at an earlier gate but block later publication. Do not make “100%” a universal requirement.
## Tests
Hash stability, conflicting assertion block, unknown allowed by gate, stale evidence warning, maker/checker, idempotent publish, supersession, cross-event denial and exact change summary.

# EEC-12 — Client confirmation and correction contract
## Objective
Allow clients to confirm meaning without giving them staff mutation authority.
## Projection and commands
Project only client-visible assertions grouped as UNDERSTOOD, NEEDS_CONFIRMATION, OPEN_QUESTION. Provide commands to confirm, correct, dispute, defer or prefer not to answer. A correction creates a new client-origin candidate assertion linked to the prior assertion; it never edits the old source or directly changes the governing edition.
Use one-time/expiry-controlled client engagement access bound to engagement, participant and permitted actions. Reuse accepted separate-session patterns; never rely on staff session cookies.
## UX
Use plain language “Your event as we understand it.” Show original client words on demand, not internal confidence or staff-only notes. Confirmation controls need clear saved receipts and recovery from stale views.
## Tests
Client isolation, revoked/expired access, correction lineage, refresh persistence, stale correction, sensitive staff-note omission, no staff route access and no automatic publication.

# EEC-13 — Engagement-to-Client/Event conversion
## Objective
Convert a qualified opportunity without duplicate canonical records or loss of discovery provenance.
## Command

```typescript
type ConvertEngagementInput = ScopedCommand & Readonly<{
  engagementId: EngagementId;
  clientDisposition:
    | { kind: "LINK_EXISTING"; clientId: ClientId }
    | { kind: "CREATE_NEW"; client: CreateClientInput };
  eventDisposition:
    | { kind: "LINK_EXISTING"; eventId: EventId }
    | { kind: "CREATE_NEW"; event: CreateEventInput };
  sourceBriefHash: string;
}>;
```

Require engagement.convert plus existing client/event permissions. Confirm organisation lineage. Surface duplicate candidates but never fuzzy-merge. Run conversion in one durable transaction with an idempotency receipt. Link source records to canonical IDs; do not rewrite them.
## Tests
Create/create, link/link and mixed routes; duplicate retry; partial failure rollback; wrong organisation; already-converted conflict; insufficient client/event authority; unchanged discovery evidence.

# EEC-14 — Brief Review Workbench frontend
## Objective
Give staff a precise, calm route from evidence to a publishable brief.
## Page structure
Implement engagement-scoped routes with:
- header: engagement, session status, overall gates and next safe action;
- left/topic rail: coverage states and filters;
- primary review: source evidence beside proposed meaning;
- decision panel: accept/amend/reject/clarify with provenance;
- conflicts queue;
- brief preview/change summary;
- submit/decision/publication history.
At mobile widths use ordered stacked regions with labelled jump navigation; never compress three columns. Keep tabs/sticky navigation from covering focused elements. Restricted evidence must be absent from DOM for unauthorised roles.
## Component contracts
Create reusable components such as CoverageState, EvidenceExcerpt, AssertionProposal, ConflictResolution, BriefGateSummary, EditionDecisionPanel. Props receive permission-safe DTOs; no component determines authority from role names.
## Tests
Keyboard-only full review, focus after mutation, loading/empty/error/permission/stale states, 360/tablet/desktop/200% zoom, screen reader names, long Yorùbá text and no horizontal scroll.

# EEC-15 — Budget taxonomy, units and monetary primitives
## Objective
Create the durable vocabulary for a maturing Budget Intelligence Engine.
## Types
Implement Money using integer minor-unit strings at persistence/API boundaries and bigint internally. Implement Quantity as decimal string plus governed unit. Never serialise bigint directly to JSON.

```typescript
type MoneyDto = Readonly<{ currency: string; minor: string }>;
type QuantityDto = Readonly<{ value: string; unit: string }>;

type CostRequirement =
  | "REQUIRED" | "CONDITIONAL" | "RECOMMENDED" | "OPTIONAL"
  | "EXCLUDED_BY_CLIENT" | "NOT_APPLICABLE" | "UNRESOLVED";
```

Create immutable BudgetTaxonomyEdition and CostItemDefinition records with codes, category path, unit kind, driver schema, predicates, relationships, min/max/increments, sensitivities, tax/fee basis, contingency class, client description and internal notes.
## Initial taxonomy
Provide a governed synthetic starting catalogue spanning venue, catering, beverage, production/AV, power, design/decor, entertainment, photography/media, security, staffing, transport, accommodation, invitations/communications, gifts, permits/compliance, accessibility/medical provision, insurance, logistics, professional fees, taxes and contingency. Do not hard-code generic percentage doctrine.
## Tests
Currency precision, unit mismatch, negative/overflow rejection, taxonomy cycles, immutable edition, duplicate code, retired item and client/internal projection separation.

# EEC-16 — Safe Price Rule DSL and deterministic evaluator
## Objective
Implement a closed, explainable rules engine with no executable database code.
## AST
Implement the discriminated union from the Budget Engine addendum and extend only where necessary with typed decimal, money, boolean and lookup results. Parse with strict recursive Zod schemas. Enforce maximum depth, node count, lookup size and evaluation steps.
Prohibit eval, Function, dynamic imports, templated SQL and user-defined JavaScript. Use an audited decimal/rational implementation; document rounding at line and aggregate levels.
## Evaluator result

```typescript
type EvaluationResult<T> = Readonly<{
  value: T;
  trace: readonly EvaluationTraceStep[];
  warnings: readonly BudgetWarning[];
  inputHash: string;
  ruleEditionHash: string;
}>;
```

Trace each constant, driver, lookup, condition, factor and rounding operation. Reject missing drivers and cross-currency arithmetic unless an explicit FX node/record is supplied.
## Tests
Golden formulas, boundary bands, rounding, malicious expressions, excessive recursion, deterministic replay, division/invalid decimal if supported, missing lookup, wrong types and same inputs producing byte-identical trace/hash.

# EEC-17 — Price evidence, vendor price cards and publication
## Objective
Turn quotes/rate cards/benchmarks into governed time-bounded knowledge.
## Records
Implement PriceEvidence, VendorPriceCardDraft/Edition, conditions, validity interval, currency, taxes/fees, minimums, volume bands, lead times, cancellation/repricing notes, source artefact and confidence.
Link existing supplier/vendor concepts if present; do not create a parallel vendor master. Where no canonical vendor exists, keep a non-operational price-source label and record the future integration debt.
Draft extraction—manual or AI—is a proposal. A different authorised checker publishes a price-card edition. Published editions are immutable. Expiry makes them stale, not deleted.
## Storage
Use private object storage for quote artefacts with permission-safe retrieval, content-safety state, checksums and no public durable URL.
## Tests
Maker/checker, expiry, overlapping price cards, conditional bands, wrong supplier/org, privileged artefact denial, extraction mismatch and historical replay.

# EEC-18 — Market index, FX and locality knowledge
## Objective
Model Nigerian volatility honestly without turning external data into truth automatically.
## Records
Create MarketIndexDefinition, MarketIndexObservation, LocationCostZoneEdition and SeasonWindowEdition. Observations carry source, observed/effective/retrieved timestamps, unit, approval state and freshness rule.
Support NGN plus explicit foreign currencies, locked vs indicative FX, imported-cost exposure, fuel/power/logistics sensitivity and peak windows. Location factors describe costs/access conditions, never client demographics.
External provider interface remains disabled until separately configured. Manual approved observations must support complete operation. Last approved stale observation may be shown but not silently treated as current.
## Tests
Stale index, missing FX, inverted pair, locked rate replay, provider timeout, overlapping season windows, event date boundary and no auto-approval.

# EEC-19 — Event Budget Template and conditional bill of materials
## Objective
Build reusable event cost architecture without rigid packages.
## Template edition
Each immutable template edition defines event archetype, applicable scope, candidate cost items, inclusion predicates, quantity-driver mappings, default price basis priority, protected-item flags and omission risks.
Initial synthetic templates should cover representative wedding/traditional wedding, private dinner, corporate gala/conference, chieftaincy/cultural ceremony and compressed premium event. They are planning seeds, not market claims.
Template instantiation produces a draft BOM tied to exact Event Brief and assumption hashes. Staff can include/exclude/replace lines with a reason and authority. Excluding protected safety/legal/power/accessibility lines creates an explicit risk/approval requirement.
## Tests
Applicability, no duplicate line, mutually exclusive alternatives, unresolved driver, protected exclusion, event-type overlays, template supersession and old-budget reproducibility.

# EEC-20 — Budget assumption service and Brief adapters
## Objective
Translate confirmed Event Brief intelligence into explicit calculation inputs.
## Adapters
Create read-only adapters for guest assumptions, event dates/duration, location/venue status, programme scope, service level, cultural requirements, travel/accommodation, accessibility and client value priorities. Do not read arbitrary brief prose inside the calculator.
Every BudgetAssumption records value, unit, source assertion/record, confidence, effective time and whether it is confirmed or scenario-specific. A brief change marks dependent assumptions stale; it does not overwrite them.
Provide a missing-driver queue and materiality estimate. Staff may add a manual assumption with reason and expiry, clearly differentiated from confirmed truth.
## Tests
Guest target vs maximum, multi-ceremony scoping, unknown venue, manual assumption expiry, changed brief hash, phase counts not summed, cross-event source rejection and no mutation of source domain.

# EEC-21 — Budget calculation and materialisation engine
## Objective
Calculate low/expected/high line and aggregate results with complete provenance.
## Pipeline
- bind exact template, taxonomy, rule, price-card/index, brief and assumption editions;
- determine line inclusion state;
- compute quantity;
- select price basis using explicit priority;
- evaluate rule/range;
- apply approved FX/index and taxes/fees;
- apply line/category uncertainty;
- calculate contingency without double counting;
- aggregate only compatible currencies or explicit conversions;
- persist immutable result and trace hashes.
Calculation status: COMPLETE, PARTIAL, BLOCKED, STALE. A total with unresolved material lines must not be represented as complete.
Use a pure engine function separated from persistence. Persist only after successful full validation inside a durable transaction.
## Tests
400→450 guest sensitivity, fixed vs per-head costs, per-hour minimum, volume band, taxes, explicit FX, stale price, missing line, contingency, deterministic replay, overflow and storage failure/no false success.

# EEC-22 — Scenario and ambition-investment alignment engine
## Objective
Produce advisory trade-offs, not sales packages.
## Scenario purposes
PROTECT_INVESTMENT, PROTECT_PRIORITIES, PROTECT_FULL_BRIEF, MAISON_RECOMMENDED, CLIENT_ALTERNATIVE.
Each scenario is an immutable set of included/excluded/substituted lines and assumptions over a calculation hash. Preserve non-negotiables and expose every compromise. Calculate marginal cost, affected client priority and evidence confidence.
Alignment results: INSUFFICIENT_INFORMATION, ALIGNED, PRESSURED, MISALIGNED, SURPLUS_CAPACITY, STALE. The engine may identify surplus capacity and recommend HOLD; it must never fill the envelope automatically.
AI may draft narrative explanations from deterministic results but cannot change line selection or amounts.
## Tests
Hard ceiling, working target, starting hypothesis, no budget disclosed, lower-spend recommendation, protected priorities, full-brief overage, optional enhancement and stale scenario after price/rule/brief change.

# EEC-23 — Budget recommendation, approval and financial-state separation
## Objective
Create formal Maison Doclar advice while keeping financial meanings separate.
## Records and authority
Implement immutable BudgetRecommendationEdition binding scenario hashes, assumptions, advice, “do not spend” positions, risks and client decision request. Require submit/decide/publish with exact-hash maker/checker.
Implement append-only FinancialStateDeclaration for ENVELOPE, COMMITTED, PAID, FORECAST, CASH_REQUIREMENT. Each requires basis/evidence/confidence and must be visually and structurally distinct. A quote is not committed; an invoice is not paid; a forecast is not an envelope.
No payment APIs, bank details, receipts or financial instruments.
## Tests
Misclassification rejection, self-approval, stale scenario decision, supersession, idempotent publication, client projection, auditor projection and no accounting/payment side effect.

# EEC-24 — Planner Budget Studio frontend
## Objective
Create a powerful internal tool without exposing engine complexity indiscriminately.
## Information architecture
- context bar: brief/budget edition, calculation freshness and role;
- assumptions rail: value, source, confidence and unresolved/stale filters;
- category tree: totals/ranges and material warnings;
- line table on desktop, labelled cards on mobile;
- line detail drawer: inclusion reason, quantity, price basis and calculation trace;
- scenario workspace: side-by-side deltas, not colour alone;
- alignment panel: envelope meaning, forecast, capacity/misalignment and recommendations;
- governance panel: submit/decision/publication history.
Do not render thousands of calculation trace nodes by default. Use progressive disclosure with exact evidence downloadable/viewable by authorised staff.
## Interaction rules
Recalculation must show saving/calculating state and never display rejected changes as saved. Debounce preview only; durable save is explicit or visibly acknowledged. Stale results lock publication and provide a direct recovery action.
## Tests
Keyboard line/scenario editing, screen-reader range labels, NGN formatting, long names, filters, stale conflict, permission variants, 360/tablet/desktop/200%, reduced motion, no horizontal document scroll and truthful disabled prerequisites.

# EEC-25 — CEO Investment Command and client budget view
## Objective
Project the same governed budget truth at appropriate levels.
## CEO view
Show envelope and meaning, recommended forecast range, unallocated capacity/misalignment, committed/paid/forecast distinctions, next cash window, material variance drivers, stale evidence, decisions and explicit restraint advice. Every headline links to evidence; no false green status.
## Client view
Show calm range, protected/optimised areas, major category ranges, assumptions, exclusions, optional enhancements and pending decisions. Hide internal margins, vendor reliability notes, staff discussion, raw rule AST and unauthorised comparisons.
Use narrative and restrained charts only where they materially improve comprehension. Accessible tables/text equivalents are mandatory.
## Tests
CEO vs Planner vs Auditor vs Client projections, direct-object access, exact totals matching same scenario, confidential line masking, mobile/zoom/keyboard and HOLD recommendation clarity.
## Milestone B exit gate
Run focused Budget Engine unit/property tests, shared-platform full tests, Event OS unit/build, migration replay, programme validation, git diff --check and local Playwright for brief conversion plus complete budget journey. Report benchmark performance for large synthetic BOMs and calculation-trace size. Stop for AI CTO review before roadmap/change/AI work if money determinism, authority or client projection cannot be proven.
