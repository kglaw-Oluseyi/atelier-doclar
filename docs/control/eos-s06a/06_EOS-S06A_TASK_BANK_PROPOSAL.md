# EOS-S06A Atelier Command
## Task Bank — Product Specification and CEO Ratification Record

**Status:** RATIFIED  
**Recommendation:** Include as a required Atelier Command capability  
**Scope:** Every task invocation is confined to one explicitly selected event

## 1. CTO recommendation

Maison Doclar should build a **Task Bank** inside Atelier Command: a governed, editable collection of pre-programmed requests covering the recurring capabilities of Event OS.

It is needed because a blank instruction box makes operators remember what the system can do, phrase recurring work repeatedly and depend too heavily on model interpretation. The Task Bank supplies proven starting points while preserving conversational flexibility.

It is not a collection of brittle macros. Selecting a task produces an editable instruction and structured plan that still passes through event scope, permissions, risk classification, validation, confirmation, maker-checker and audit.

## 2. Operator experience

An operator can:

1. open Task Bank inside the selected event;
2. browse or search by outcome, domain, role or event phase;
3. select a task such as **Prepare the first client brief**;
4. review prefilled event data and required inputs;
5. edit the request, parameters, constraints and outcome;
6. preview the interpreted plan and predicted changes;
7. choose dry run where supported;
8. execute, confirm or submit for approval according to risk;
9. receive a durable receipt;
10. save an authorised variation as a personal or organisation template.

The free-form composer remains available. Atelier Command may recommend a relevant task, but cannot force its use.

## 3. Full task coverage

### Discovery and client brief

- Start or resume first client interview
- Identify unanswered discovery questions
- Summarise client vision
- Draft Canonical Event Brief
- Compare new answers with the published brief
- Submit brief revision for review

### Investment Intelligence

- Build initial investment scenario
- Identify unpriced requirements
- Explain variance from approved investment
- Compare premium, balanced and protected-core scenarios
- Prepare lower-spend alternatives
- Place affected commitments on HOLD
- Draft investment decision packet

### Event Roadmap

- Generate roadmap from approved brief
- Produce short-lead critical path
- Identify latest-safe decisions
- Find blocked or ownerless milestones
- Model the impact of a delayed decision
- Prepare recovery roadmap
- Create draft tasks and owners

### Guests, parties and RSVP

- Create or update a draft guest
- Create household and party relationships
- Identify missing contact or attendance information
- Prepare VIP and protocol review
- Analyse RSVP gaps
- Prepare follow-up cohort
- Reconcile duplicate guest candidates

### Venue and seating

- Explain current seating authority
- Check seating input readiness
- Propose layout binding
- Draft seating rule or reservation
- Identify contradictory HARD constraints
- Launch an eligible seating run
- Compare current and successor plans
- Submit seating plan for review
- Request authorised seating export

### Programme, arrival and movement

- Draft event programme
- Identify timing collisions
- Prepare arrival and transport plan
- Flag unassigned movements
- Model late-arrival impact
- Prepare operational run sheet

### Suppliers and delivery

- Create supplier brief
- Compare approved supplier responses
- Identify missing deliverables
- Prepare decision or approval packet
- Review commitment against roadmap
- Flag late or at-risk supplier work

### Merchandise and Private Atelier

- Prepare entitlement cohort
- Identify missing size or preference data
- Draft allocation
- Reconcile fulfilment exceptions
- Prepare collection or delivery plan

### Communications

- Draft event update
- Prepare segmented recipient projection
- Check language and edition readiness
- Submit communication for approval
- Explain why sending is blocked
- Send an approved communication only when runtime and provider policy permit

### Change, risk and protection

- Analyse impact of a new fact
- Identify stale plans and publications
- Raise a risk
- Prepare mitigation options
- Record an incident draft
- Prepare decision escalation

### Evidence and governance

- Explain an authoritative decision
- Show actor and target history
- Prepare approval evidence
- Reconcile an unknown command outcome
- Produce an authorised evidence export
- Summarise outstanding approvals

### Browser-assisted external work

- Retrieve a document from an approved venue portal
- Check approved supplier portal status
- Download and quarantine an authorised file
- Prepare an external form for human-confirmed submission
- Verify a submitted external request

Browser tasks appear only where destination, identity and action class are approved.

## 4. Task definition

```ts
type AtelierTaskDefinition = {
  id: string;
  version: number;
  name: string;
  description: string;
  outcome: string;
  domain: string;
  eventPhases: string[];
  allowedRoles: string[];
  requiredCapabilities: string[];
  riskTier: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  executionMode: string;
  inputSchema: JsonSchema;
  defaultInstruction: string;
  planTemplate: TaskPlanTemplate;
  requiredApprovals: ApprovalRequirement[];
  preconditions: TaskPrecondition[];
  successCriteria: string[];
  evidenceRequirements: string[];
  recoveryPolicy: string;
  browserPolicy?: BrowserTaskPolicy;
  status: "DRAFT" | "IN_REVIEW" | "ACTIVE" | "DEPRECATED";
};
```

A task references registered Atelier Command tools. It cannot contain raw SQL, arbitrary code, unregistered endpoints or credentials.

## 5. Editable and non-editable elements

Before action, an operator may edit:

- desired outcome;
- task-specific parameters;
- selected records within the current event;
- constraints and priorities;
- optional plan steps;
- output format;
- target date;
- draft wording;
- dry-run choice.

An operator cannot edit away:

- selected-event isolation;
- required capability;
- server-calculated risk tier;
- maker-checker separation;
- required confirmation;
- provider/runtime blocks;
- idempotency and audit requirements;
- browser allowlists;
- masking;
- irreversible-action warnings.

Material edits recompile the plan, recalculate risk and invalidate previous confirmation or approval.

## 6. Task sources

### Canonical tasks

Maison Doclar-controlled, tested and versioned. Ordinary users cannot edit them in place.

### Organisation tasks

Approved Maison Doclar variations built from registered tools. Author and reviewer governance is required before activation.

### Personal presets

Private parameter and wording preferences. They cannot introduce tools or authority beyond an active canonical or organisation task.

### Event task instances

The actual event-scoped invocation, frozen with the exact task version and operator edits.

## 7. Governance lifecycle

`DRAFT → IN_REVIEW → ACTIVE → DEPRECATED`

- Author and approver are separated for organisation tasks.
- A new version never rewrites historical runs.
- Material tool, scope, risk or approval changes require a new version and regression evaluation.
- Deprecated tasks remain replayable but cannot start new runs.
- Every invocation stores exact task and plan versions.

## 8. Intelligent recommendation

Suggestions may consider:

- selected event phase;
- current blockers and missing information;
- role and capability;
- upcoming roadmap decisions;
- investment variance;
- stale publications;
- recent event activity.

Every suggestion explains why it appears, for example: “Suggested because the venue decision is due in three days and blocks layout publication.”

## 9. Why it materially improves the product

Task Bank reduces:

- repeated long prompts;
- ambiguous interpretation;
- unnecessary model calls;
- rediscovery of tool sequences;
- inconsistent evidence;
- training burden;
- omission of standard checks.

For canonical tasks, much of the plan is deterministic. The model concentrates on event-specific interpretation and exceptions rather than recreating the workflow.

## 10. Integration with AC-P00–P12

- **AC-P00:** capability-to-task coverage matrix.
- **AC-P01:** task definition, version and invocation records.
- **AC-P02:** role, risk and approval policy.
- **AC-P04:** browse, search, select, edit and recompile experience.
- **AC-P05:** tool-bound plan templates.
- **AC-P06:** intelligence task families.
- **AC-P08:** approved browser-task definitions.
- **AC-P09:** Task Bank UX and accessibility.
- **AC-P10:** evaluation, usage, cost and outcome measures.
- **AC-P11:** critical Task Bank journeys.
- **AC-P12:** independent acceptance.

## 11. Acceptance requirements

- Every ratified Event OS domain has a task-coverage inventory.
- Every ACTIVE task references registered tools only.
- Every invocation stays inside one event.
- Editing triggers revalidation and, where material, reapproval.
- No task lowers risk or bypasses maker-checker.
- Permission-negative tests cover every task family.
- Retry cannot duplicate execution.
- Task version and operator edits are replayable.
- Search, keyboard, mobile and accessibility pass.
- Cost savings are measured against equivalent free-form requests.
- No real external effect while production is unauthorised.

## 12. Ratification record

### Option A — Ratify as a required Atelier Command capability (recommended)

Integrate Task Bank across AC-P00–P12 as described.

### Option B — Retain as a post-acceptance extension

Atelier Command ships without it and adds Task Bank later. This increases rediscovery, training and inconsistency costs.

### Option C — Withhold

Atelier Command remains free-form only.

**CEO decision:** Option A — ratified as a required Atelier Command capability  
**Date:** 15 September 2026
