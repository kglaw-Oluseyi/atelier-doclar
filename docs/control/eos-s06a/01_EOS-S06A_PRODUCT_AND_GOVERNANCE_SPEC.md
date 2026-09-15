# EOS-S06A Atelier Command
## Full Product, Intelligence, Execution and Governance Specification

## 1. Product thesis

Atelier Command is the orchestration layer that turns Maison Doclar's accumulated data, knowledge and operational capabilities into governed action. It unifies the established intelligence chain:

> AI Discovery → Canonical Event Brief → Investment Intelligence → Roadmap Intelligence → Change/Risk Intelligence → Control Tower → Human Decision → Client/Team Action

It converts consequential prose into structured, versioned objects: facts, requirements, preferences, priorities, constraints, assumptions, decisions, dependencies, investments, milestones, risks, plans, commands, approvals and receipts.

The surface is conversational. The control plane is deterministic.

## 2. Product outcomes

Atelier Command shall enable an authorised operator to:

1. ask questions across the explicitly selected event's permitted knowledge;
2. receive evidence-linked answers with uncertainty disclosed;
3. convert an instruction into a typed, inspectable plan;
4. identify missing information and resolve ambiguity conversationally;
5. simulate consequences before mutation;
6. execute permitted native actions;
7. route controlled actions through maker-checker approval;
8. operate approved external web systems when no native route exists;
9. pause, resume, cancel and recover long-running work;
10. see exactly what changed and what did not;
11. reconstruct every human, agent, command and approval step;
12. measure quality, cost, speed and failure patterns.

## 3. Users and projections

### CEO

- event-scoped executive intelligence;
- an Atelier Command projection available from the selected event;
- scenario comparison and strategic decisions;
- authorised high-level native actions;
- approval where canonical policy grants it;
- cost, risk, agent and portfolio oversight.

### Event Director

- event-scoped intelligence and orchestration;
- review and approval of Planner-authored controlled work;
- operational exception handling;
- no implicit organisation-wide access.

### Planner

- event-scoped research, drafting and execution;
- preparation of briefs, plans, budgets, rules and tasks;
- submission for approval;
- no self-approval.

### Read-Only Auditor

- authorised read-only plans, evidence, receipts and replay;
- no execution, approval or browser-control authority;
- masking and scope applied server-side.

### System Administrator

- infrastructure and configuration administration only as explicitly granted;
- no automatic access to event/client content or executive decisions.

### Client and specialist roles

- narrow, purpose-bound conversational or approval projections;
- no general Atelier Command access unless explicitly designed and granted.

## 4. Core experience

### 4.1 Command surface

The surface contains:

- instruction composer;
- event/scope selector with explicit current context;
- referenced-record chips;
- attachments with scanning status;
- interpretation panel;
- proposed plan timeline;
- risk and approval indicators;
- live execution stream;
- pause/cancel controls;
- receipts and evidence;
- conversation and run history;
- “Why?” and “Show evidence” affordances;
- correction and rollback/supersession routes where permitted.

### 4.2 Conversation lifecycle

`DRAFT → INTERPRETING → NEEDS_CLARIFICATION | PLANNED → AWAITING_CONFIRMATION | AWAITING_APPROVAL | EXECUTING → PAUSED | BLOCKED | FAILED | COMPLETED | CANCELLED | SUPERSEDED`

Every transition is server-authorised and audited.

### 4.3 Instruction interpretation

The interpretation must identify:

- requested outcome;
- event and organisational scope;
- named and inferred entities;
- facts versus assumptions;
- ambiguities;
- proposed actions and order;
- predicted state changes;
- dependencies;
- risks and conflicts;
- approvals and confirmations;
- external systems involved;
- estimated cost and duration;
- success criteria.

Material ambiguity blocks execution. The system asks the smallest question necessary and preserves the rest of the plan.

### 4.4 Plan preview

Plans are immutable versions. A preview shows:

- steps in order;
- tool selected for each step;
- native/integration/browser execution route;
- read/write/external classification;
- affected records;
- current and proposed values;
- approval boundary;
- compensation or supersession route;
- expected evidence;
- estimated model/tool spend.

A changed instruction creates a new plan version rather than silently rewriting an approved plan.

### 4.5 Task Bank

Atelier Command includes a governed Task Bank of canonical, organisation and personal starting points covering recurring Event OS work. Selecting a task creates an editable instruction and plan inside the selected event. Operators may edit outcomes, parameters and optional steps, but cannot edit away event isolation, permissions, risk, maker-checker, confirmation, idempotency, evidence or browser restrictions. Material edits trigger recompilation and invalidate prior approval. Definitions and invocations are versioned and replayable.

## 5. Capability A — Intelligence

### 5.1 Intelligence modes

- **Answer:** evidence-linked response without mutation.
- **Brief:** structured synthesis for an event or decision.
- **Diagnose:** explain blockers, inconsistencies and risks.
- **Compare:** contrast scenarios, suppliers, plans or publications.
- **Forecast:** estimate impact while stating model and uncertainty.
- **Recommend:** propose a decision with reasons and alternatives.
- **Monitor:** evaluate registered changes when invoked by an authorised schedule/event.
- **Explain:** show lineage from source to conclusion.

### 5.2 Intelligence graph

The agent retrieves only server-approved projections from:

- Canonical Event Brief;
- guest and party intelligence;
- venue and seating state;
- Investment Intelligence;
- Event Roadmap;
- programme and arrival;
- suppliers and commitments;
- merchandise and private atelier;
- communications and RSVP;
- risks, changes, approvals and publications;
- Academy authorisation where operational competence matters;
- event-specific patterns and current-event history.

### 5.3 Evidence and epistemic rules

Every material assertion is classified as:

- `CONFIRMED_FACT`
- `CLIENT_STATED`
- `OPERATOR_STATED`
- `DERIVED`
- `ASSUMPTION`
- `FORECAST`
- `RECOMMENDATION`
- `UNKNOWN`

The output exposes source references, data freshness, scope, confidence and conflicting evidence. Recommendations never masquerade as client decisions.

### 5.4 Investment Intelligence integration

Atelier Command can:

- explain budget composition and commitment status;
- compare investment scenarios;
- identify unpriced scope and optimism gaps;
- calculate change impact;
- recommend HOLD, approve, substitute or re-scope paths;
- draft approval packets;
- never approve expenditure without the canonical authority.

### 5.5 Roadmap Intelligence integration

Atelier Command can:

- generate and explain the critical path;
- respond to long- and short-lead events;
- overlap work intelligently while exposing risk;
- identify owner, dependency, decision-by and latest-safe dates;
- simulate slippage or scope changes;
- produce recovery plans;
- create tasks only through governed native commands.

### 5.6 Change and risk intelligence

Every material new fact can be evaluated for:

- affected decisions;
- investment variance;
- roadmap impact;
- guest/service impact;
- supplier impact;
- compliance/privacy impact;
- publications made stale;
- approvals requiring reconsideration.

The system proposes—not silently applies—consequential downstream changes.

## 6. Capability B — Governed native execution

### 6.1 Tool principle

The model receives a registry of narrow typed tools. It never receives raw SQL, unrestricted shell, generic record mutation or a universal administrator endpoint.

Tool classes:

- retrieval;
- analysis/simulation;
- draft creation;
- proposal/submission;
- approval/activation;
- publication;
- export;
- communication preparation;
- external-effect execution;
- recovery/reconciliation.

### 6.2 Initial full-domain catalogue

The complete product contract supports registered tools across:

- event discovery and brief;
- clients, households, parties and relationships;
- guest records, invitations, RSVP and attendance;
- venue, layouts and seating;
- investment, commitments, invoices and scenarios;
- roadmap, milestones, tasks and dependencies;
- programme, arrivals and transport;
- suppliers, deliverables and approvals;
- merchandise and private atelier;
- language and editions;
- communications drafting, approval and sending;
- protection, incidents and exceptions;
- Academy competence and operational authorisation;
- exports, publications and evidence;
- Control Tower projections and executive decisions.

Individual tools ship only when their domain contract and tests satisfy the release gate; the product architecture is not reduced to an MVP.

### 6.3 Tool contract

Each tool declares:

- stable name and version;
- purpose and non-purpose;
- input/output schema;
- required capability;
- allowed scope;
- risk tier;
- idempotency behaviour;
- validation and conflict rules;
- maker/checker requirements;
- external-effect status;
- confirmation policy;
- audit events;
- recovery lookup;
- timeout and retry semantics;
- evidence requirements;
- data classification and masking;
- deprecation policy.

### 6.4 Execution modes

- `READ_ONLY`: no mutation.
- `DRAFT_ONLY`: creates non-authoritative work.
- `CONFIRM_EACH`: human confirms each consequential step.
- `APPROVED_PLAN`: executes approved low/medium-risk steps within the frozen plan.
- `MAKER_CHECKER`: pauses at submission/approval boundaries.
- `EXTERNAL_EFFECT`: confirmation immediately before the effect.
- `DRY_RUN`: validates and predicts without mutation.

### 6.5 Durable execution

Every write has:

- client instruction ID;
- plan ID/version;
- run ID;
- step ID;
- command ID;
- idempotency key;
- expected version/precondition;
- correlation ID;
- durable result lookup.

On connection loss, the orchestrator queries the durable result before retrying. `UNKNOWN` is a real state: the system must not claim failure or success until reconciled.

### 6.6 Conflict and stale-state handling

Before each write, the system revalidates:

- user assignment and capability;
- event scope;
- target existence;
- expected version;
- active conflicts;
- plan validity;
- approval validity;
- provider and production posture.

A stale plan pauses and presents a revised diff. It never silently applies against new state.

### 6.7 Compensation

There is no generic rollback fiction. Each command declares whether it supports:

- withdrawal;
- supersession;
- cancellation;
- compensating action;
- irreversible completion.

Audit history remains immutable.

## 7. Capability C — Browser-assisted execution

### 7.1 Selection rule

Browser execution is permitted only when:

1. the task is authorised;
2. no safe native Event OS command exists;
3. no approved direct integration exists;
4. the destination is allowlisted;
5. a suitable low-privilege browser identity exists;
6. the task does not require a prohibited effect;
7. the planned browser steps and stop conditions are visible.

### 7.2 Browser task classes

Permitted examples:

- retrieve information from an approved supplier/venue portal;
- download an authorised document;
- submit a pre-approved form;
- update an approved external record;
- verify external status;
- operate a legacy web system without an API.

Prohibited by default:

- open-web exploration during an execution run;
- financial transactions;
- agreeing to terms;
- account creation or permission change;
- sending communications;
- uploading confidential data;
- bypassing access controls;
- CAPTCHA circumvention;
- using personal CEO browser sessions.

Explicit policy may permit some consequential classes later, always with immediate human confirmation.

### 7.3 Isolation

Each browser run uses:

- disposable container/VM;
- fresh browser profile;
- network allowlist and redirect recheck;
- blocked private/loopback/link-local ranges unless explicitly needed;
- low-privilege service/delegated account;
- secret injection outside model context;
- clipboard and filesystem restrictions;
- quarantined download directory;
- malware scanning and file classification;
- disabled JavaScript execution and upload unless explicitly required;
- maximum duration/action/download limits;
- live revocation and kill switch.

### 7.4 Browser observation and action record

Record:

- permitted domain and final redirected domain;
- page title and URL;
- accessibility-tree references used;
- screenshots at decision-significant points;
- actions and results;
- downloads/uploads metadata;
- confirmation prompts and human responses;
- detected prompt-injection content;
- final verified state.

Do not retain unnecessary page content or secrets.

### 7.5 Prompt-injection policy

Webpage content is untrusted data, never higher-priority instruction. The browser agent cannot expand scope, reveal secrets, change destination or perform consequential action because a page asks it to. Suspected prompt injection pauses the run and displays the content and proposed safe response to the human.

## 8. Risk and approval model

| Tier | Meaning | Examples | Default handling |
|---|---|---|---|
| R0 | Read-only | Query, summarise, compare | Automatic within scope |
| R1 | Reversible draft | Draft brief, rule, task, message | Automatic or plan confirmation |
| R2 | Operational mutation | Assign owner, update non-authoritative state | Plan confirmation; version check |
| R3 | Authoritative/governed | Approve, activate, publish, override | Maker-checker and explicit confirmation |
| R4 | External consequence | Send, purchase, contract, account change | Immediate human confirmation and provider gate |
| R5 | Prohibited | Permission bypass, real effect while unauthorised | Hard block |

Risk is determined server-side. The model may raise but never lower the tier.

## 9. Permission rules

- Agent authority is the intersection of human capability, assignment scope, tool policy, plan approval and current runtime posture.
- Atelier Command cannot cross the selected event boundary. Organisation-wide and cross-event questions are routed to the separately governed Executive Event Command/Control Tower capability rather than answered or executed in place.
- The agent cannot approve its own authored controlled action.
- A human cannot use the agent to exceed their direct authority.
- Browser credentials do not create Event OS authority.
- Tool visibility is filtered, but every server boundary independently enforces permission.
- Read-Only Auditor receives no mutating tools even if a prompt asks for them.
- Denial returns no protected payload or existence metadata.

## 10. Confirmation design

A confirmation states:

- exactly what will happen;
- affected event/records;
- before/after values;
- external recipient/destination where relevant;
- monetary or contractual consequence;
- whether reversible;
- approving identity and authority;
- expiry;
- alternative choices.

Approval of a plan is not approval of an expanded or materially changed plan.

## 11. Audit, evidence and replay

Each run records:

- original instruction and attachments;
- interpreted intent and structured entities;
- retrieved evidence references;
- model/provider/version and policy version;
- plan versions and diffs;
- initiating human and delegated agent identity;
- tools offered and tools called;
- arguments with masking;
- approvals/denials/confirmations;
- before/after state hashes;
- command, correlation and browser-run identities;
- tokens, cost and duration;
- errors, retries and recovery;
- final receipt and residual work.

Replay distinguishes model reasoning summaries from authoritative Event OS facts. Hidden chain-of-thought is never required or stored.

## 12. Security and privacy

- Server-approved projections only.
- Data minimisation before model calls.
- Field-level masking by role and tool.
- Tenant/event isolation at query boundaries.
- Prompt and tool-output injection defences.
- Secrets excluded from prompts, logs and screenshots.
- Configurable retention for conversations, evidence and browser captures.
- Attachment scanning and type validation.
- Egress allowlists.
- Rate, token, run and monetary limits.
- Model output treated as untrusted until schema and policy validation.
- No real communications while `productionAuthorised:false`.

## 13. Human control

Operators can:

- inspect and edit the proposed plan;
- remove steps;
- choose dry run;
- confirm or deny;
- pause/cancel future steps;
- take over a browser session;
- view durable results;
- supersede outcomes through authorised commands;
- report an incorrect interpretation.

Cancellation cannot undo a step already committed; the interface states this plainly.

## 14. Cost and performance

- Use the smallest model meeting the task-quality policy.
- Retrieve narrow structured context, not whole event dumps.
- Cache stable knowledge and tool schemas safely.
- Batch independent reads; keep writes sequential where dependencies exist.
- Use deterministic code for arithmetic, permissions and validation.
- Apply per-run token, tool, browser-action and time budgets.
- Require approval when a run exceeds its estimate materially.
- Summarise long histories with evidence links, never discard authoritative state.

Targets:

- interpretation preview p95 under 10 seconds for ordinary instructions;
- native read step p95 under 3 seconds excluding model reasoning;
- mutation result acknowledgement or truthful recovery state within 30 seconds;
- immediate cancellation of unstarted steps;
- zero duplicated durable mutations under retry;
- 100% consequential actions with valid confirmation/approval evidence.

## 15. Exceptional states

The UI must explicitly handle:

- ambiguous event/entity;
- insufficient permission;
- missing capability;
- stale plan;
- conflicting active rule;
- approval expired/denied;
- dependency unavailable;
- response lost after commit;
- rate/cost limit;
- provider inactive;
- production unauthorised;
- browser redirect outside allowlist;
- suspected prompt injection;
- partial plan completion;
- irreversible completed step;
- human takeover;
- model refusal.

No exceptional state may produce a blank screen or indefinite “Working…” state.

## 16. Accessibility and visual language

Atelier Command uses the approved Command Atelier visual language: onyx rail, warm ivory workspace and champagne accents. It must maintain WCAG-aligned keyboard access, visible focus, reduced motion, 200% reflow, non-colour status, live-region announcements and pointer affordances. Dense agent activity is progressively disclosed; authoritative state remains more prominent than conversational prose.

## 17. Success measures

- instruction-to-correct-plan rate;
- clarification rate and avoidable-clarification rate;
- plan acceptance/edit/abandon rates;
- command success and recovery rates;
- duplicate mutation count;
- unauthorised attempt refusal rate;
- human-confirmation compliance;
- maker-checker compliance;
- evidence completeness;
- browser fallback frequency;
- cost and latency per completed outcome;
- operator time saved;
- post-execution correction rate;
- independent-verification defect rate.
