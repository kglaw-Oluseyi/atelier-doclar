# EOS-S06A Atelier Command
## Architecture, Data, Tooling and Runtime Contract

## 1. Logical architecture

Atelier Command consists of:

1. **Command Surface** — conversation, scope, plans, approvals, run stream and receipts.
2. **Orchestrator** — state machine controlling interpretation, planning and execution.
3. **Context Broker** — retrieves server-approved, role-masked evidence projections.
4. **Policy Decision Point** — calculates effective authority and risk.
5. **Tool Registry** — versioned typed native, integration and browser tools.
6. **Native Command Gateway** — invokes existing Event OS domain commands.
7. **Approval Gateway** — maker-checker, step-up and immediate confirmation.
8. **Browser Executor** — isolated, allowlisted browser sessions.
9. **Evidence Ledger** — immutable plan, action, result, approval and cost records.
10. **Recovery/Reconciler** — resolves unknown outcomes and resumes safely.
11. **Evaluation Harness** — scenario corpus, policy attacks and outcome scoring.

The language model does not connect directly to Postgres or providers.

## 2. Orchestrator state machine

### Command session

`OPEN | CLOSED | ARCHIVED`

### Instruction

`RECEIVED | INTERPRETING | NEEDS_CLARIFICATION | INTERPRETED | REJECTED | SUPERSEDED`

### Plan

`DRAFT | VALIDATING | READY | STALE | AWAITING_CONFIRMATION | AWAITING_APPROVAL | APPROVED | REJECTED | SUPERSEDED`

### Run

`QUEUED | EXECUTING | PAUSING | PAUSED | BLOCKED | RECOVERING | COMPLETED | COMPLETED_WITH_RESIDUALS | FAILED | CANCELLED`

### Step

`PENDING | VALIDATING | AWAITING_CONFIRMATION | AWAITING_APPROVAL | READY | EXECUTING | OUTCOME_UNKNOWN | RECONCILING | SUCCEEDED | REPLAYED | REFUSED | BLOCKED | FAILED | CANCELLED | SKIPPED`

Transitions occur only through server commands with expected-version checks.

## 3. Core records

### `atelier_command_sessions`

- `id`, `organisationId`, required `eventId`
- `createdByAssignmentId`, `title`, `status`
- `scopeSnapshot`, `createdAt`, `updatedAt`, `version`

### `atelier_instructions`

- `id`, `sessionId`, `sequence`
- `authorAssignmentId`, `rawText`, `attachmentRefs`
- `status`, `supersedesInstructionId`
- `createdAt`, `version`

### `atelier_interpretations`

- `id`, `instructionId`, `modelInvocationId`
- `intentType`, `structuredIntent`, `entities`
- `facts`, `assumptions`, `ambiguities`, `constraints`
- `requestedOutcome`, `successCriteria`
- `confidence`, `evidenceRefs`, `createdAt`

### `atelier_plans`

- `id`, `instructionId`, `planVersion`
- `scopeSnapshot`, `policyVersion`, `riskSummary`
- `estimatedCost`, `estimatedDuration`
- `status`, `approvedPlanHash`, `createdAt`

### `atelier_plan_steps`

- `id`, `planId`, `ordinal`, `dependsOnStepIds`
- `toolName`, `toolVersion`, `executionRoute`
- `inputTemplate`, `targetRefs`, `riskTier`
- `confirmationMode`, `approvalRequirement`
- `preconditions`, `expectedEvidence`
- `compensationPolicy`, `status`

### `atelier_runs`

- `id`, `planId`, `initiatedByAssignmentId`
- `agentIdentityId`, `modelPolicySnapshot`
- `status`, `startedAt`, `endedAt`
- `costBudget`, `actualCost`, `lastHeartbeatAt`
- `pauseReason`, `completionSummary`, `version`

### `atelier_step_executions`

- `id`, `runId`, `stepId`, `attempt`
- `commandId`, `idempotencyKey`, `correlationId`
- `effectiveCapability`, `scopeSnapshot`
- `inputHash`, `beforeStateHash`, `afterStateHash`
- `status`, `resultRef`, `errorClass`
- `startedAt`, `endedAt`

### `atelier_confirmations`

- `id`, `runId`, `stepId`, `requestedFromAssignmentId`
- `confirmationTextHash`, `effectSummary`
- `status`, `expiresAt`, `respondedAt`
- `responseActorId`, `stepUpEvidenceRef`

### `atelier_browser_runs`

- `id`, `runId`, `stepId`
- `executorPolicyVersion`, `allowedDomains`
- `credentialBindingRef`, `containerRef`
- `status`, `startedAt`, `endedAt`
- `takeoverActorId`, `terminationReason`

### `atelier_browser_actions`

- `id`, `browserRunId`, `ordinal`, `batchId`
- `actionType`, `targetDescriptor`, `url`, `result`
- `screenshotRef`, `confirmationId`
- `promptInjectionSignal`, `createdAt`

### `atelier_model_invocations`

- `id`, `purpose`, `provider`, `model`, `policyClass`
- `inputTokenCount`, `outputTokenCount`, `cost`
- `latencyMs`, `cacheUsage`, `status`
- masked request/response evidence references

### `atelier_task_definitions`

- `id`, `version`, `name`, `domain`, `outcome`
- `allowedRoles`, `requiredCapabilities`, `riskTier`
- `inputSchema`, `defaultInstruction`, `planTemplate`
- `approvalRequirements`, `preconditions`, `successCriteria`
- `evidencePolicy`, `recoveryPolicy`, optional `browserPolicy`
- `sourceType`, `status`, `authoredBy`, `approvedBy`, `createdAt`

### `atelier_task_invocations`

- `id`, `taskDefinitionId`, `taskVersion`, `eventId`
- `invokedByAssignmentId`, `operatorEdits`, `compiledPlanId`
- `riskSnapshot`, `status`, `createdAt`

Task definitions reference registered tools only. Event invocations freeze the exact task version and edits used for replay.

## 4. Structured interpretation schema

The validated interpretation contains:

```ts
type AtelierInterpretation = {
  requestedOutcome: string;
  scope: {
    organisationId: string;
    eventId: string;
    crossEvent: false;
  };
  entities: Array<{
    kind: string;
    suppliedText: string;
    resolvedId?: string;
    resolution: "EXACT" | "CANDIDATE" | "AMBIGUOUS" | "NOT_FOUND";
  }>;
  knowledge: Array<{
    kind: "FACT" | "REQUIREMENT" | "PREFERENCE" | "PRIORITY" |
      "CONSTRAINT" | "ASSUMPTION" | "DECISION" | "DEPENDENCY" |
      "INVESTMENT" | "MILESTONE" | "RISK";
    statement: string;
    evidenceRefs: string[];
    confidence: number;
  }>;
  ambiguities: Array<{
    id: string;
    question: string;
    blocksStepIds: string[];
    material: boolean;
  }>;
  successCriteria: string[];
};
```

The model output is schema-validated and policy-checked before storage or use.

## 5. Tool registry contract

```ts
type AtelierToolDefinition<I, O> = {
  name: string;
  version: string;
  description: string;
  inputSchema: JsonSchema<I>;
  outputSchema: JsonSchema<O>;
  route: "NATIVE" | "INTEGRATION" | "BROWSER";
  requiredCapabilities: string[];
  riskTier: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  externalEffect: boolean;
  scopePolicy: string;
  approvalPolicy: string;
  idempotencyPolicy: string;
  recoveryPolicy: string;
  evidencePolicy: string;
  execute(context: ToolContext, input: I): Promise<O>;
  lookupResult?(context: ToolContext, idempotencyKey: string): Promise<O | null>;
};
```

Tool definitions are server-owned. The model can choose only tools returned after permission and scope filtering.

## 6. Native command catalogue structure

Each domain publishes a manifest. Representative families:

- `eventBrief.read`, `eventBrief.proposeFact`, `eventBrief.submitPublication`
- `investment.explain`, `investment.compareScenarios`, `investment.createDraftScenario`, `investment.submitDecision`
- `roadmap.explainCriticalPath`, `roadmap.createDraftMilestones`, `roadmap.assignDraftOwner`, `roadmap.submitRevision`
- `guest.find`, `guest.createDraft`, `guest.proposeRelationship`, `guest.flagMissingInformation`
- `seating.explainAuthority`, `seating.createDraftRule`, `seating.proposeBinding`, `seating.submitPlan`, `seating.requestExport`
- `change.analyseImpact`, `change.createDraftResponse`, `risk.raise`, `risk.proposeMitigation`
- `communication.draft`, `communication.submitForApproval`, `communication.sendApproved`
- `publication.preview`, `publication.submit`, `publication.activate`
- `evidence.readReceipt`, `evidence.exportAuthorised`

This is a contract family, not permission to expose every operation to every role.

## 7. Policy decision contract

Input:

- human assignment and session;
- organisation/event scope;
- tool and version;
- proposed inputs/targets;
- plan approval;
- runtime posture;
- Academy authorisation where required;
- external provider state;
- current record versions and conflicts.

Output:

- `ALLOW`
- `ALLOW_WITH_PLAN_CONFIRMATION`
- `REQUIRE_IMMEDIATE_CONFIRMATION`
- `REQUIRE_MAKER_CHECKER`
- `REFUSE`
- `BLOCK_RUNTIME_POSTURE`
- `STALE_REPLAN_REQUIRED`

The output includes reason codes without protected payload leakage.

## 8. Model gateway

The gateway owns:

- provider-neutral request interface;
- task classification;
- model selection policy;
- structured outputs;
- prompt templates and versioning;
- context assembly and masking;
- token estimation and budgets;
- retries only for safe model-call failures;
- caching policy;
- refusal handling;
- invocation evidence.

Models do not determine permission, risk tier, approval satisfaction, arithmetic truth or mutation success.

## 9. Browser executor contract

The executor implements an agent loop for browser actions but independently validates every action.

Required enforcement:

- allowed action member;
- current tab and domain;
- redirect destination;
- coordinate/reference validity;
- upload/download policy;
- action and time budget;
- confirmation status;
- credential binding;
- prompt-injection state;
- kill switch.

Sequential batches halt at first failed action. Later actions in that batch are marked not executed. Consequential confirmation is checked before each action, not once per batch.

## 10. Authentication and credentials

- Event OS native tools use delegated server-side assignment context.
- External credentials are referenced through opaque bindings.
- Secrets are injected into the browser/session without entering model-visible text where the platform supports it.
- Personal CEO sessions are never reused.
- Browser identities have minimum privilege and revocable sessions.
- Step-up authentication expires and is bound to the specific effect.

## 11. Idempotency and recovery

For a write:

1. persist step intent and idempotency key;
2. validate current authority and preconditions;
3. execute in a transaction where supported;
4. persist command outcome;
5. return receipt;
6. if transport fails, mark `OUTCOME_UNKNOWN`;
7. call `lookupResult` before retry;
8. resolve to `SUCCEEDED`, `REPLAYED`, `FAILED_NO_CHANGE` or human review.

No blind retry of non-idempotent browser actions or external effects.

## 12. Event-driven integration

Atelier Command consumes registered domain events to:

- mark plans stale;
- update run projections;
- initiate authorised monitoring evaluations;
- surface approval outcomes;
- reconcile external results;
- feed Control Tower intelligence.

Event consumption does not itself authorise new consequential actions.

## 13. Observability

Dashboards and alerts cover:

- run state and stuck runs;
- tool latency/error/refusal;
- outcome-unknown age;
- duplicate prevention;
- model cost and token consumption;
- confirmation and approval wait time;
- browser session duration/action count;
- redirect and prompt-injection blocks;
- per-role unauthorised attempts;
- evidence completeness;
- external-effect counts.

Alerts contain identifiers and safe metadata, not client secrets.

## 14. Retention

Separate policies apply to:

- authoritative command/audit evidence;
- conversation text;
- model inputs/outputs;
- screenshots;
- downloaded files;
- transient browser profiles;
- derived summaries.

Browser profiles are destroyed after runs. Evidence required for governance is retained; incidental page content is minimised.

## 15. Feature flags and runtime controls

- `atelierCommand.enabled`
- `atelierCommand.nativeExecutionEnabled`
- `atelierCommand.browserExecutionEnabled`
- `atelierCommand.externalEffectsEnabled`
- domain-specific tool-family flags
- organisation/event allowlists
- provider/model allowlists
- emergency global pause

`externalEffectsEnabled` cannot override `productionAuthorised:false` or inactive providers.

## 16. Compatibility and migration

Existing Executive Event Command, AI Discovery, Investment, Roadmap, Change and Control Tower capabilities remain authoritative in their domains. Atelier Command calls event-scoped public contracts; it does not duplicate their data models. Organisation-wide and cross-event requests are handed off to the separately governed Executive Event Command/Control Tower surface and are never executed from an Atelier Command event session. Existing audit records remain immutable. Tool versions allow gradual domain adoption without breaking saved plans or replay.
