/** Atelier Command application service — event-scoped orchestration. */
import { createHash, randomUUID } from "node:crypto";
import type { ActorSnapshot } from "../policy.js";
import { PlatformError } from "../errors.js";
import { assertMakerChecker } from "../risk-command.js";
import type { PlatformSnapshot } from "../store.js";
import { simulateBrowserRun, DEFAULT_ALLOWED_DOMAINS } from "./browser.js";
import { buildEventContextProjection } from "./context.js";
import { interpretInstruction, hashPlan } from "./interpreter.js";
import {
  assertAtelierPermission,
  assertEventScoped,
  decidePolicy,
  maxRisk,
  type RuntimePosture,
} from "./policy.js";
import { resolveAtelierRuntimePosture } from "./runtime.js";
import { getCanonicalTask, searchTaskBank, taskBankDomains, TASK_BANK_COUNT, TASK_BANK_VERSION } from "./task-bank.js";
import { getAtelierTool } from "./tools.js";
import {
  ATELIER_COMMAND_LEDGER_ID,
  emptyAtelierCommandLedgerDocument,
  type AtelierCommandLedger,
  type AtelierCommandLedgerDocument,
  type AtelierCommandReceipt,
  type AtelierCommandSession,
  type AtelierConfirmation,
  type AtelierInstruction,
  type AtelierPlan,
  type AtelierPlanStep,
  type AtelierRun,
  type AtelierStepExecution,
  type AtelierTaskInvocation,
} from "./types.js";

export { TASK_BANK_COUNT, TASK_BANK_VERSION, searchTaskBank, taskBankDomains, getCanonicalTask };

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function inputHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function ensureAtelierLedger(snap: PlatformSnapshot): AtelierCommandLedger {
  if (!snap.atelierCommandLedgers) {
    (snap as { atelierCommandLedgers: AtelierCommandLedgerDocument[] }).atelierCommandLedgers = [];
  }
  let doc = snap.atelierCommandLedgers.find((item) => item.id === ATELIER_COMMAND_LEDGER_ID);
  if (!doc) {
    doc = emptyAtelierCommandLedgerDocument();
    snap.atelierCommandLedgers.push(doc);
  } else if (!doc.version) {
    doc.version = 1;
  }
  return doc;
}

function activeAssignment(actor: ActorSnapshot, organisationId: string, eventId: string) {
  const assignment =
    actor.assignments.find(
      (a) => a.status === "ACTIVE" && a.organisationId === organisationId && (a.eventId === eventId || !a.eventId),
    ) ?? actor.assignments.find((a) => a.status === "ACTIVE" && a.organisationId === organisationId);
  if (!assignment) {
    throw new PlatformError("FORBIDDEN", "No active assignment for this organisation and event");
  }
  return assignment;
}

export type AtelierWorkspaceView = {
  session: AtelierCommandSession;
  instructions: AtelierInstruction[];
  plans: AtelierPlan[];
  planSteps: AtelierPlanStep[];
  runs: AtelierRun[];
  stepExecutions: AtelierStepExecution[];
  confirmations: AtelierConfirmation[];
  receipts: AtelierCommandReceipt[];
  taskBank: {
    version: string;
    count: number;
    domains: string[];
    tasks: ReturnType<typeof searchTaskBank>;
  };
  context: ReturnType<typeof buildEventContextProjection>;
  posture: RuntimePosture;
};

export function openOrGetSession(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  eventName?: string;
  organisationName?: string;
  now?: string;
}): AtelierCommandSession {
  assertAtelierPermission(input.actor, "atelierCommand.view", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const existing = ledger.sessions.find(
    (s) => s.organisationId === input.organisationId && s.eventId === input.eventId && s.status === "OPEN",
  );
  if (existing) return existing;
  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
  const now = nowIso(input.now);
  const session: AtelierCommandSession = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    createdByAssignmentId: assignment.id,
    title: `Atelier Command · ${input.eventName ?? input.eventId}`,
    status: "OPEN",
    scopeSnapshot: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      crossEvent: false,
      eventName: input.eventName,
      organisationName: input.organisationName,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  ledger.sessions.push(session);
  return session;
}

export function getAtelierWorkspace(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  eventName?: string;
  organisationName?: string;
  taskQuery?: string;
  taskDomain?: string;
  roleKey?: string;
  now?: string;
}): AtelierWorkspaceView {
  const session = openOrGetSession(input);
  const ledger = ensureAtelierLedger(input.snap);
  const now = nowIso(input.now);
  const context = buildEventContextProjection({
    snap: input.snap,
    organisationId: input.organisationId,
    eventId: input.eventId,
    eventName: input.eventName,
    organisationName: input.organisationName,
    now,
  });
  const posture = resolveAtelierRuntimePosture();
  return {
    session,
    instructions: ledger.instructions.filter((i) => i.sessionId === session.id),
    plans: ledger.plans.filter((p) => p.eventId === input.eventId && p.organisationId === input.organisationId),
    planSteps: ledger.planSteps.filter((s) => {
      const plan = ledger.plans.find((p) => p.id === s.planId);
      return plan?.eventId === input.eventId;
    }),
    runs: ledger.runs.filter((r) => r.eventId === input.eventId),
    stepExecutions: ledger.stepExecutions.filter((s) => s.eventId === input.eventId),
    confirmations: ledger.confirmations.filter((c) => c.eventId === input.eventId),
    receipts: ledger.receipts.filter((r) => r.eventId === input.eventId),
    taskBank: {
      version: TASK_BANK_VERSION,
      count: TASK_BANK_COUNT,
      domains: taskBankDomains(),
      tasks: searchTaskBank({
        query: input.taskQuery,
        domain: input.taskDomain,
        role: input.roleKey,
      }),
    },
    context,
    posture,
  };
}

export function submitInstruction(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  sessionId: string;
  rawText: string;
  dryRun?: boolean;
  taskInvocationId?: string;
  forcedTools?: string[];
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.instruct", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const session = ledger.sessions.find((s) => s.id === input.sessionId);
  if (!session || session.eventId !== input.eventId || session.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "Atelier Command session was not found for this event");
  }
  assertEventScoped(session.scopeSnapshot, input.eventId, input.organisationId);
  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
  const now = nowIso(input.now);
  const sequence = ledger.instructions.filter((i) => i.sessionId === session.id).length + 1;
  const instruction: AtelierInstruction = {
    id: randomUUID(),
    sessionId: session.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    sequence,
    authorAssignmentId: assignment.id,
    authorPersonId: input.actor.person.id,
    rawText: input.rawText,
    attachmentRefs: [],
    status: "INTERPRETING",
    taskInvocationId: input.taskInvocationId,
    createdAt: now,
    version: 1,
  };
  ledger.instructions.push(instruction);

  const context = buildEventContextProjection({
    snap: input.snap,
    organisationId: input.organisationId,
    eventId: input.eventId,
    eventName: session.scopeSnapshot.eventName,
    organisationName: session.scopeSnapshot.organisationName,
    now,
  });
  const compiled = interpretInstruction({
    organisationId: input.organisationId,
    eventId: input.eventId,
    rawText: input.rawText,
    context,
    dryRun: input.dryRun,
    forcedTools: input.forcedTools,
    now,
  });
  ledger.modelInvocations.push(compiled.modelInvocation);
  ledger.interpretations.push({
    id: randomUUID(),
    instructionId: instruction.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    modelInvocationId: compiled.modelInvocation.id,
    body: compiled.interpretation,
    createdAt: now,
  });

  if (compiled.refused) {
    instruction.status = "REJECTED";
    const receipt: AtelierCommandReceipt = {
      id: randomUUID(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      sessionId: session.id,
      instructionId: instruction.id,
      correlationId: randomUUID(),
      kind: "CROSS_EVENT_HANDOFF",
      summary: compiled.refuseReason ?? "Refused",
      changedRecordIds: [],
      unchangedReasons: [compiled.refuseReason ?? "Refused"],
      evidenceRefs: context.evidenceRefs,
      createdAt: now,
    };
    ledger.receipts.push(receipt);
    return { instruction, plan: null, steps: [], receipt, compiled };
  }

  if (compiled.needsClarification) {
    instruction.status = "NEEDS_CLARIFICATION";
    return { instruction, plan: null, steps: [], receipt: null, compiled };
  }

  instruction.status = "INTERPRETED";
  const planVersion = ledger.plans.filter((p) => p.instructionId === instruction.id).length + 1;
  const plan: AtelierPlan = {
    id: randomUUID(),
    instructionId: instruction.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    planVersion,
    scopeSnapshot: session.scopeSnapshot,
    policyVersion: "eos-s06a-pdp-v1",
    riskSummary: compiled.riskSummary,
    estimatedCost: compiled.modelInvocation.cost,
    estimatedDurationMs: 1500,
    status: "READY",
    dryRun: Boolean(input.dryRun),
    createdAt: now,
    version: 1,
  };
  const steps: AtelierPlanStep[] = compiled.steps.map((step, index) => ({
    id: randomUUID(),
    planId: plan.id,
    ordinal: index + 1,
    dependsOnStepIds: index === 0 ? [] : [],
    toolName: step.toolName,
    toolVersion: step.toolVersion,
    executionRoute: step.executionRoute,
    input: step.input,
    targetRefs: step.targetRefs,
    riskTier: step.riskTier,
    confirmationMode: step.confirmationMode,
    approvalRequirement: step.approvalRequirement,
    preconditions: ["EVENT_SCOPE", "PERMISSION"],
    expectedEvidence: ["step-receipt"],
    compensationPolicy: "supersession-only",
    status: "PENDING",
  }));
  plan.approvedPlanHash = hashPlan(compiled.steps, input.eventId);
  if (plan.riskSummary === "R2" || plan.riskSummary === "R3" || plan.riskSummary === "R4") {
    plan.status = plan.riskSummary === "R3" || plan.riskSummary === "R4" ? "AWAITING_APPROVAL" : "AWAITING_CONFIRMATION";
  }
  ledger.plans.push(plan);
  ledger.planSteps.push(...steps);
  return { instruction, plan, steps, receipt: null, compiled };
}

export function invokeTaskBankTask(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  sessionId: string;
  taskId: string;
  taskVersion?: number;
  operatorEdits?: Record<string, unknown>;
  dryRun?: boolean;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.instruct", input.organisationId, input.eventId);
  const task = getCanonicalTask(input.taskId, input.taskVersion ?? 1);
  if (!task || task.status !== "ACTIVE") {
    throw new PlatformError("NOT_FOUND", "Canonical task was not found or is not active");
  }
  // Operators cannot edit away mandatory constraints.
  const edits = { ...(input.operatorEdits ?? {}) };
  delete edits.eventId;
  delete edits.organisationId;
  delete edits.riskTier;
  delete edits.requiredCapabilities;
  delete edits.approvalRequirement;
  delete edits.allowedDomains;
  delete edits.crossEvent;

  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
  const now = nowIso(input.now);
  const ledger = ensureAtelierLedger(input.snap);
  const invocation: AtelierTaskInvocation = {
    id: randomUUID(),
    taskDefinitionId: task.id,
    taskVersion: task.version,
    organisationId: input.organisationId,
    eventId: input.eventId,
    invokedByAssignmentId: assignment.id,
    invokedByPersonId: input.actor.person.id,
    operatorEdits: edits,
    riskSnapshot: task.riskTier,
    status: "DRAFT",
    createdAt: now,
  };
  ledger.taskInvocations.push(invocation);

  const instructionText =
    typeof edits.instruction === "string" && edits.instruction.trim()
      ? edits.instruction.trim()
      : task.defaultInstruction;
  const notes = typeof edits.notes === "string" ? ` ${edits.notes}` : "";
  const forcedTools = task.planTemplate.map((p) => p.toolName);
  const result = submitInstruction({
    snap: input.snap,
    actor: input.actor,
    organisationId: input.organisationId,
    eventId: input.eventId,
    sessionId: input.sessionId,
    rawText: `${instructionText}${notes}`,
    dryRun: input.dryRun ?? Boolean(edits.dryRun),
    taskInvocationId: invocation.id,
    forcedTools,
    now,
  });
  invocation.status = result.plan ? "COMPILED" : result.instruction.status === "REJECTED" ? "CANCELLED" : "DRAFT";
  invocation.compiledPlanId = result.plan?.id;
  // Material edits invalidate prior approval by creating a new plan version via submitInstruction.
  return { invocation, ...result, task };
}

export function confirmPlan(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  planId: string;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId);
  if (!plan || plan.eventId !== input.eventId || plan.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "Plan was not found for this event");
  }
  if (plan.status === "STALE") {
    throw new PlatformError("VERSION_CONFLICT", "Plan is stale and must be recompiled before confirmation");
  }
  if (plan.riskSummary === "R3" || plan.status === "AWAITING_APPROVAL") {
    throw new PlatformError("FORBIDDEN", "This plan requires independent maker-checker approval");
  }
  plan.status = "APPROVED";
  plan.version += 1;
  return plan;
}

export function approvePlan(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  planId: string;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.approve", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId);
  if (!plan || plan.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "Plan was not found for this event");
  }
  const instruction = ledger.instructions.find((i) => i.id === plan.instructionId);
  if (!instruction) throw new PlatformError("NOT_FOUND", "Instruction missing for plan");
  assertMakerChecker(instruction.authorPersonId, input.actor.person.id, "approve");
  plan.status = "APPROVED";
  plan.version += 1;
  return plan;
}

function executeToolStep(input: {
  snap: PlatformSnapshot;
  ledger: AtelierCommandLedger;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  run: AtelierRun;
  step: AtelierPlanStep;
  posture: RuntimePosture;
  now: string;
  simulateLostResponse?: boolean;
}): AtelierStepExecution {
  const tool = getAtelierTool(input.step.toolName);
  if (!tool) {
    throw new PlatformError("VALIDATION_FAILED", `Unknown tool ${input.step.toolName}`);
  }
  const idempotencyKey = `${input.step.planId}:${input.step.id}:${input.step.toolVersion}:${inputHash(input.step.input)}`;
  const existing = input.ledger.idempotencyReceipts.find(
    (r) => r.idempotencyKey === idempotencyKey && r.eventId === input.eventId,
  );
  if (existing) {
    const replayed: AtelierStepExecution = {
      id: randomUUID(),
      runId: input.run.id,
      stepId: input.step.id,
      organisationId: input.organisationId,
      eventId: input.eventId,
      attempt: 1,
      commandId: existing.commandId,
      idempotencyKey,
      correlationId: randomUUID(),
      effectiveCapability: tool.requiredCapabilities,
      scopeSnapshot: { organisationId: input.organisationId, eventId: input.eventId, crossEvent: false },
      inputHash: inputHash(input.step.input),
      status: "REPLAYED",
      resultRef: existing.resultRef,
      resultSummary: "Idempotent replay — no duplicate mutation",
      startedAt: input.now,
      endedAt: input.now,
    };
    input.ledger.stepExecutions.push(replayed);
    input.step.status = "REPLAYED";
    return replayed;
  }

  const decision = decidePolicy({
    actor: input.actor,
    organisationId: input.organisationId,
    eventId: input.eventId,
    riskTier: tool.riskTier,
    executionMode: input.step.confirmationMode,
    externalEffect: tool.externalEffect,
    browser: tool.route === "BROWSER",
    mutating: tool.mutating,
    planApproved: true,
    posture: input.posture,
  });

  const execution: AtelierStepExecution = {
    id: randomUUID(),
    runId: input.run.id,
    stepId: input.step.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    attempt: 1,
    commandId: randomUUID(),
    idempotencyKey,
    correlationId: randomUUID(),
    effectiveCapability: tool.requiredCapabilities,
    scopeSnapshot: { organisationId: input.organisationId, eventId: input.eventId, crossEvent: false },
    inputHash: inputHash(input.step.input),
    beforeStateHash: inputHash({ eventId: input.eventId, t: input.now }),
    status: "EXECUTING",
    startedAt: input.now,
  };

  if (decision.decision === "REFUSE" || decision.decision === "BLOCK_RUNTIME_POSTURE") {
    execution.status = decision.decision === "REFUSE" ? "REFUSED" : "BLOCKED";
    execution.errorClass = decision.reasonCode;
    execution.resultSummary =
      decision.reasonCode === "PRODUCTION_OR_PROVIDER_BLOCK"
        ? "External effect blocked while production is unauthorised and providers are inactive"
        : `Action refused: ${decision.reasonCode}`;
    execution.endedAt = input.now;
    input.step.status = execution.status;
    input.ledger.stepExecutions.push(execution);
    return execution;
  }

  if (tool.route === "BROWSER") {
    assertAtelierPermission(input.actor, "atelierCommand.browser", input.organisationId, input.eventId);
    const url =
      typeof input.step.input.url === "string"
        ? input.step.input.url
        : "https://portal.venue.example/documents/capacity.pdf";
    const simulated = simulateBrowserRun({
      organisationId: input.organisationId,
      eventId: input.eventId,
      runId: input.run.id,
      stepId: input.step.id,
      allowedDomains: DEFAULT_ALLOWED_DOMAINS,
      startUrl: url,
      pageText: typeof input.step.input.pageText === "string" ? input.step.input.pageText : undefined,
      consequential: tool.externalEffect || tool.riskTier === "R3" || tool.riskTier === "R4",
      confirmationId: typeof input.step.input.confirmationId === "string" ? input.step.input.confirmationId : undefined,
      redirectTo: typeof input.step.input.redirectTo === "string" ? input.step.input.redirectTo : undefined,
      now: input.now,
    });
    input.ledger.browserRuns.push(simulated.run);
    input.ledger.browserActions.push(...simulated.actions);
    if (simulated.blocked) {
      execution.status = "BLOCKED";
      execution.errorClass = "BROWSER_POLICY";
      execution.resultSummary = simulated.blockReason;
      execution.endedAt = input.now;
      input.step.status = "BLOCKED";
      input.ledger.stepExecutions.push(execution);
      return execution;
    }
    execution.status = "SUCCEEDED";
    execution.resultRef = simulated.downloadQuarantineRef;
    execution.resultSummary = "Browser simulation completed; download quarantined; profile destroyed";
    execution.afterStateHash = inputHash({ browserRun: simulated.run.id });
    execution.endedAt = input.now;
  } else {
    // Native deterministic adapters: event-scoped synthetic effect records only.
    execution.status = "SUCCEEDED";
    execution.resultRef = `native:${tool.name}:${execution.commandId}`;
    execution.resultSummary = tool.mutating
      ? `Native draft/command applied within event ${input.eventId} via ${tool.name}`
      : `Native read completed for event ${input.eventId} via ${tool.name}`;
    execution.afterStateHash = inputHash({ tool: tool.name, eventId: input.eventId, commandId: execution.commandId });
    execution.endedAt = input.now;
  }

  if (input.simulateLostResponse) {
    execution.status = "OUTCOME_UNKNOWN";
    execution.resultSummary = "Transport lost after commit — reconcile via idempotency lookup";
    input.step.status = "OUTCOME_UNKNOWN";
    input.ledger.stepExecutions.push(execution);
    input.ledger.idempotencyReceipts.push({
      idempotencyKey,
      organisationId: input.organisationId,
      eventId: input.eventId,
      commandId: execution.commandId,
      resultRef: execution.resultRef ?? execution.id,
      status: "COMMITTED_UNKNOWN",
      createdAt: input.now,
    });
    return execution;
  }

  input.step.status = "SUCCEEDED";
  input.ledger.stepExecutions.push(execution);
  input.ledger.idempotencyReceipts.push({
    idempotencyKey,
    organisationId: input.organisationId,
    eventId: input.eventId,
    commandId: execution.commandId,
    resultRef: execution.resultRef ?? execution.id,
    status: "SUCCEEDED",
    createdAt: input.now,
  });
  return execution;
}

export function executePlan(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  planId: string;
  simulateLostResponse?: boolean;
  failAtOrdinal?: number;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId);
  if (!plan || plan.eventId !== input.eventId || plan.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "Plan was not found for this event");
  }
  if (plan.status === "STALE") {
    throw new PlatformError("VERSION_CONFLICT", "Underlying event state changed; replan required");
  }
  if (plan.status !== "APPROVED" && plan.riskSummary !== "R0" && plan.riskSummary !== "R1") {
    throw new PlatformError("FORBIDDEN", "Plan must be confirmed or approved before execution");
  }
  if ((plan.riskSummary === "R0" || plan.riskSummary === "R1") && plan.status === "READY") {
    plan.status = "APPROVED";
  }

  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
  const now = nowIso(input.now);
  const posture = resolveAtelierRuntimePosture();
  const run: AtelierRun = {
    id: randomUUID(),
    planId: plan.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    initiatedByAssignmentId: assignment.id,
    initiatedByPersonId: input.actor.person.id,
    agentIdentityId: `agent:atelier-command:${assignment.id}`,
    modelPolicySnapshot: "fixture-v1",
    status: "EXECUTING",
    startedAt: now,
    costBudget: 1,
    actualCost: 0,
    lastHeartbeatAt: now,
    version: 1,
  };
  ledger.runs.push(run);

  const steps = ledger.planSteps.filter((s) => s.planId === plan.id).sort((a, b) => a.ordinal - b.ordinal);
  const executions: AtelierStepExecution[] = [];
  let blocked = false;
  for (const step of steps) {
    if (blocked) {
      step.status = "CANCELLED";
      continue;
    }
    if (input.failAtOrdinal === step.ordinal) {
      const failed = executeToolStep({
        snap: input.snap,
        ledger,
        actor: input.actor,
        organisationId: input.organisationId,
        eventId: input.eventId,
        run,
        step,
        posture,
        now,
      });
      failed.status = "FAILED";
      failed.errorClass = "FORCED_PARTIAL_FAILURE";
      failed.resultSummary = "Step failed; earlier commits retained; later steps not executed";
      step.status = "FAILED";
      executions.push(failed);
      blocked = true;
      run.status = "COMPLETED_WITH_RESIDUALS";
      continue;
    }
    const execution = executeToolStep({
      snap: input.snap,
      ledger,
      actor: input.actor,
      organisationId: input.organisationId,
      eventId: input.eventId,
      run,
      step,
      posture,
      now,
      simulateLostResponse: input.simulateLostResponse && step.ordinal === 1,
    });
    executions.push(execution);
    if (execution.status === "REFUSED" || execution.status === "BLOCKED" || execution.status === "FAILED") {
      blocked = true;
      run.status = execution.status === "FAILED" ? "FAILED" : "BLOCKED";
    }
  }

  if (run.status === "EXECUTING") {
    const unknown = executions.some((e) => e.status === "OUTCOME_UNKNOWN");
    run.status = unknown ? "RECOVERING" : "COMPLETED";
  }
  run.endedAt = now;
  run.completionSummary = `Executed ${executions.length} step(s); status ${run.status}`;

  const receipt: AtelierCommandReceipt = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    sessionId: ledger.instructions.find((i) => i.id === plan.instructionId)?.sessionId ?? "",
    instructionId: plan.instructionId,
    planId: plan.id,
    runId: run.id,
    correlationId: executions[0]?.correlationId ?? randomUUID(),
    kind: "RUN_RECEIPT",
    summary: run.completionSummary,
    changedRecordIds: executions.filter((e) => e.status === "SUCCEEDED").map((e) => e.commandId),
    unchangedReasons: executions
      .filter((e) => e.status === "REFUSED" || e.status === "BLOCKED" || e.status === "REPLAYED")
      .map((e) => e.resultSummary ?? e.status),
    evidenceRefs: executions.map((e) => e.id),
    createdAt: now,
  };
  ledger.receipts.push(receipt);
  return { run, executions, receipt };
}

export function reconcileUnknownOutcome(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  stepExecutionId: string;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const execution = ledger.stepExecutions.find((e) => e.id === input.stepExecutionId);
  if (!execution || execution.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "Step execution was not found for this event");
  }
  if (execution.status !== "OUTCOME_UNKNOWN") {
    return execution;
  }
  const prior = ledger.idempotencyReceipts.find((r) => r.idempotencyKey === execution.idempotencyKey);
  execution.status = "REPLAYED";
  execution.resultSummary = prior
    ? "Reconciled durable result without duplicate mutation"
    : "No durable write found; safe to retry";
  execution.resultRef = prior?.resultRef ?? execution.resultRef;
  execution.endedAt = nowIso(input.now);
  const step = ledger.planSteps.find((s) => s.id === execution.stepId);
  if (step) step.status = "REPLAYED";
  return execution;
}

export function cancelRun(input: {
  snap: PlatformSnapshot;
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  runId: string;
  now?: string;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const run = ledger.runs.find((r) => r.id === input.runId && r.eventId === input.eventId);
  if (!run) throw new PlatformError("NOT_FOUND", "Run was not found for this event");
  const steps = ledger.planSteps.filter((s) => s.planId === run.planId);
  for (const step of steps) {
    if (step.status === "PENDING" || step.status === "READY") step.status = "CANCELLED";
  }
  run.status = "CANCELLED";
  run.endedAt = nowIso(input.now);
  run.pauseReason = "Cancelled by operator; completed steps remain recorded";
  return run;
}

export function markPlanStale(input: {
  snap: PlatformSnapshot;
  organisationId: string;
  eventId: string;
  planId: string;
}) {
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId && p.eventId === input.eventId);
  if (!plan) throw new PlatformError("NOT_FOUND", "Plan was not found");
  plan.status = "STALE";
  return plan;
}

export function assertNoCrossEventLeak(ledger: AtelierCommandLedger, eventId: string): void {
  const rows = [
    ...ledger.sessions,
    ...ledger.instructions,
    ...ledger.plans,
    ...ledger.runs,
    ...ledger.stepExecutions,
    ...ledger.receipts,
    ...ledger.taskInvocations,
  ];
  for (const row of rows) {
    if (row.eventId !== eventId) {
      throw new PlatformError("SCOPE_MISMATCH", "Cross-event record detected in Atelier Command ledger view");
    }
  }
}

export function summarizeRisk(steps: AtelierPlanStep[]) {
  return maxRisk(steps.map((s) => s.riskTier));
}
