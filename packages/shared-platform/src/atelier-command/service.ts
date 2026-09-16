/** Atelier Command application service — event-scoped orchestration. */
import { createHash, randomUUID } from "node:crypto";
import type { ActorSnapshot } from "../policy.js";
import { PlatformError } from "../errors.js";
import { assertMakerChecker } from "../risk-command.js";
import type { PlatformSnapshot } from "../store.js";
import { simulateBrowserRun, DEFAULT_ALLOWED_DOMAINS } from "./browser.js";
import { buildEventContextProjection } from "./context.js";
import { buildIntelligenceResult } from "./intelligence.js";
import type { DomainEvidenceBag } from "./domain-resolvers.js";
import { interpretInstruction, hashPlan } from "./interpreter.js";
import { assessIntentCompatibility, isPlanTerminal, isStepTerminal } from "./intent-integrity.js";
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
  type AtelierCommandRiskTier,
  type AtelierCommandSession,
  type AtelierConfirmation,
  type AtelierInstruction,
  type AtelierIntelligenceResultPayload,
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

export type AtelierPlanQueueGroup =
  | "NEEDS_YOUR_ACTION"
  | "PENDING_CONFIRMATION"
  | "PENDING_APPROVAL"
  | "APPROVED_READY"
  | "EXECUTING"
  | "HISTORY";

export type AtelierPlanSummary = {
  planId: string;
  planVersion: number;
  status: AtelierPlan["status"];
  riskSummary: AtelierCommandRiskTier;
  effectLabel: string;
  instructionId: string;
  intendedOutcome: string;
  makerPersonId: string;
  makerLabel: string;
  checkerPersonId?: string;
  checkerLabel?: string;
  approvalIdentityId?: string;
  approvalCorrelationId?: string;
  settlementCorrelationId?: string;
  taskDefinitionId?: string;
  taskVersion?: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  settledAt?: string;
  dryRun: boolean;
  approvalRequirement: boolean;
  queueGroup: AtelierPlanQueueGroup;
  availableActions: Array<"CONFIRM" | "APPROVE" | "EXECUTE" | "VIEW">;
};

export type AtelierWorkspaceView = {
  session: AtelierCommandSession;
  instructions: AtelierInstruction[];
  eventInstructions: AtelierInstruction[];
  plans: AtelierPlan[];
  planSteps: AtelierPlanStep[];
  planSummaries: AtelierPlanSummary[];
  selectedPlanId: string | null;
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

function personLabel(snap: PlatformSnapshot, personId: string | undefined): string {
  if (!personId) return "Unknown";
  const person = snap.persons.find((p) => p.id === personId);
  return person?.displayName ?? personId;
}

function effectLabelForPlan(risk: AtelierCommandRiskTier, browser: boolean): string {
  if (browser) return "SIMULATED_BROWSER";
  if (risk === "R4" || risk === "R5") return "External effect";
  if (risk === "R0") return "Read-only";
  if (risk === "R1") return "Preparatory / draft";
  if (risk === "R3") return "Maker-checker";
  if (risk === "R2") return "Confirm before act";
  return risk;
}

function queueGroupFor(
  plan: AtelierPlan,
  actorPersonId: string,
  makerPersonId: string,
  canApprove: boolean,
  canExecute: boolean,
): AtelierPlanQueueGroup {
  if (plan.status === "AWAITING_APPROVAL") {
    if (canApprove && makerPersonId !== actorPersonId) return "NEEDS_YOUR_ACTION";
    return "PENDING_APPROVAL";
  }
  if (plan.status === "AWAITING_CONFIRMATION" || (plan.status === "READY" && (plan.riskSummary === "R2" || plan.riskSummary === "R4" || plan.riskSummary === "R5"))) {
    if (canExecute) return "NEEDS_YOUR_ACTION";
    return "PENDING_CONFIRMATION";
  }
  if (plan.status === "APPROVED" || (plan.status === "READY" && (plan.riskSummary === "R0" || plan.riskSummary === "R1"))) {
    if (canExecute) return "NEEDS_YOUR_ACTION";
    return "APPROVED_READY";
  }
  if (plan.status === "EXECUTING") return "EXECUTING";
  return "HISTORY";
}

function buildPlanSummaries(input: {
  snap: PlatformSnapshot;
  ledger: AtelierCommandLedger;
  eventId: string;
  organisationId: string;
  actor: ActorSnapshot;
}): AtelierPlanSummary[] {
  const canApprove = (() => {
    try {
      assertAtelierPermission(input.actor, "atelierCommand.approve", input.organisationId, input.eventId);
      return true;
    } catch {
      return false;
    }
  })();
  const canExecute = (() => {
    try {
      assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
      return true;
    } catch {
      return false;
    }
  })();
  const canInstruct = (() => {
    try {
      assertAtelierPermission(input.actor, "atelierCommand.instruct", input.organisationId, input.eventId);
      return true;
    } catch {
      return false;
    }
  })();

  return input.ledger.plans
    .filter((p) => p.eventId === input.eventId && p.organisationId === input.organisationId)
    .map((plan) => {
      const instruction = input.ledger.instructions.find((i) => i.id === plan.instructionId);
      const steps = input.ledger.planSteps.filter((s) => s.planId === plan.id);
      const taskInv = instruction?.taskInvocationId
        ? input.ledger.taskInvocations.find((t) => t.id === instruction.taskInvocationId)
        : undefined;
      const makerId = plan.makerPersonId ?? instruction?.authorPersonId ?? "";
      const browser = steps.some((s) => s.executionRoute === "BROWSER");
      const approvalRequirement = steps.some((s) => s.approvalRequirement) || plan.riskSummary === "R3";
      const actions: AtelierPlanSummary["availableActions"] = ["VIEW"];
      if (canExecute && (plan.status === "AWAITING_CONFIRMATION" || (plan.status === "READY" && plan.riskSummary !== "R0" && plan.riskSummary !== "R1" && plan.riskSummary !== "R3"))) {
        actions.push("CONFIRM");
      }
      if (canApprove && plan.status === "AWAITING_APPROVAL" && makerId !== input.actor.person.id) {
        actions.push("APPROVE");
      }
      if (
        canExecute &&
        (plan.status === "APPROVED" ||
          ((plan.riskSummary === "R0" || plan.riskSummary === "R1") && plan.status === "READY"))
      ) {
        actions.push("EXECUTE");
      }
      // Auditor / non-mutating roles: VIEW only
      if (!canInstruct && !canExecute && !canApprove) {
        return {
          ...baseSummary(),
          availableActions: ["VIEW"] as AtelierPlanSummary["availableActions"],
        };
      }
      function baseSummary(): Omit<AtelierPlanSummary, "availableActions"> & { availableActions?: AtelierPlanSummary["availableActions"] } {
        return {
          planId: plan.id,
          planVersion: plan.planVersion,
          status: plan.status,
          riskSummary: plan.riskSummary,
          effectLabel: effectLabelForPlan(plan.riskSummary, browser),
          instructionId: plan.instructionId,
          intendedOutcome: (instruction?.rawText ?? "").trim().slice(0, 200) || "Plan",
          makerPersonId: makerId,
          makerLabel: personLabel(input.snap, makerId),
          checkerPersonId: plan.checkerPersonId,
          checkerLabel: plan.checkerPersonId ? personLabel(input.snap, plan.checkerPersonId) : undefined,
          approvalIdentityId: plan.approvalIdentityId,
          approvalCorrelationId: plan.approvalCorrelationId,
          settlementCorrelationId: plan.settlementCorrelationId,
          taskDefinitionId: taskInv?.taskDefinitionId,
          taskVersion: taskInv?.taskVersion,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt ?? plan.approvedAt ?? plan.settledAt ?? plan.createdAt,
          approvedAt: plan.approvedAt,
          settledAt: plan.settledAt,
          dryRun: plan.dryRun,
          approvalRequirement,
          queueGroup: queueGroupFor(plan, input.actor.person.id, makerId, canApprove, canExecute),
        };
      }
      return { ...baseSummary(), availableActions: actions };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.planId.localeCompare(a.planId));
}

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
  selectedPlanId?: string | null;
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
  const plans = ledger.plans.filter((p) => p.eventId === input.eventId && p.organisationId === input.organisationId);
  const eventInstructions = ledger.instructions.filter(
    (i) => i.eventId === input.eventId && i.organisationId === input.organisationId,
  );
  const planSummaries = buildPlanSummaries({
    snap: input.snap,
    ledger,
    eventId: input.eventId,
    organisationId: input.organisationId,
    actor: input.actor,
  });
  const selectedPlanId =
    (input.selectedPlanId && plans.some((p) => p.id === input.selectedPlanId) ? input.selectedPlanId : null) ??
    planSummaries.find((p) => p.queueGroup === "NEEDS_YOUR_ACTION")?.planId ??
    planSummaries[0]?.planId ??
    null;
  return {
    session,
    instructions: ledger.instructions.filter((i) => i.sessionId === session.id),
    eventInstructions,
    plans,
    planSteps: ledger.planSteps.filter((s) => {
      const plan = ledger.plans.find((p) => p.id === s.planId);
      return plan?.eventId === input.eventId;
    }),
    planSummaries,
    selectedPlanId,
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
  riskFloor?: import("./types.js").AtelierCommandRiskTier;
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
  const knownEvents = input.snap.events
    .filter((event) => event.organisationId === input.organisationId)
    .map((event) => ({ id: event.id, name: event.name }));
  const compiled = interpretInstruction({
    organisationId: input.organisationId,
    eventId: input.eventId,
    rawText: input.rawText,
    context,
    dryRun: input.dryRun,
    forcedTools: input.forcedTools,
    riskFloor: input.riskFloor,
    knownEvents,
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
    const unsupported = compiled.interpretation.intentType === "UNSUPPORTED_INTENT_REFUSED";
    const receipt: AtelierCommandReceipt = {
      id: randomUUID(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      sessionId: session.id,
      instructionId: instruction.id,
      correlationId: randomUUID(),
      kind: unsupported ? "UNSUPPORTED_INTENT_REFUSED" : "CROSS_EVENT_HANDOFF",
      summary: compiled.refuseReason ?? "Refused",
      changedRecordIds: [],
      unchangedReasons: [
        compiled.refuseReason ?? "Refused",
        ...(compiled.interpretation.unsupportedPortion ? [compiled.interpretation.unsupportedPortion] : []),
        ...(compiled.interpretation.refusedPortion
          ? [`Refused portion: ${compiled.interpretation.refusedPortion}`]
          : []),
        "No substitute executable step was authorised.",
        ...(compiled.handoffMessage ? [compiled.handoffMessage] : []),
      ],
      evidenceRefs: context.evidenceRefs,
      createdAt: now,
      effectClass: "REFUSED",
      dataChanged: false,
      settlementStatus: "REFUSED",
      originalRequestedIntent: compiled.interpretation.requestedOutcome,
      actualAction: "none — refused",
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
  // Re-derive risk from trusted tool catalogue only (ignore any client/model downgrade).
  plan.riskSummary = maxRisk([plan.riskSummary, ...steps.map((step) => step.riskTier), ...(input.riskFloor ? [input.riskFloor] : [])]);
  for (const step of steps) {
    const tool = getAtelierTool(step.toolName);
    if (tool && tool.riskTier !== step.riskTier) {
      step.riskTier = tool.riskTier;
    }
  }
  plan.approvedPlanHash = hashPlan(
    steps.map((step) => ({
      toolName: step.toolName,
      toolVersion: step.toolVersion,
      riskTier: step.riskTier,
      confirmationMode: step.confirmationMode,
      approvalRequirement: step.approvalRequirement,
      executionRoute: step.executionRoute,
      input: step.input,
      targetRefs: step.targetRefs,
    })),
    input.eventId,
  );
  if (plan.riskSummary === "R3") {
    plan.status = "AWAITING_APPROVAL";
  } else if (plan.riskSummary === "R2" || plan.riskSummary === "R4" || plan.riskSummary === "R5") {
    plan.status = "AWAITING_CONFIRMATION";
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
  delete edits.toolName;
  delete edits.executionMode;
  delete edits.externalEffect;

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
    riskFloor: task.riskTier,
    now,
  });
  if (result.plan) {
    // Never allow compiled plan risk below canonical task risk.
    result.plan.riskSummary = maxRisk([result.plan.riskSummary, task.riskTier]);
    if (task.riskTier === "R4" || task.executionMode === "EXTERNAL_EFFECT") {
      const toolsOk = result.steps.every((step) => {
        const tool = getAtelierTool(step.toolName);
        return tool && (tool.externalEffect || tool.riskTier === "R4" || tool.riskTier === "R5");
      });
      if (!toolsOk || (result.plan.riskSummary !== "R4" && result.plan.riskSummary !== "R5")) {
        throw new PlatformError("FORBIDDEN", "External-effect task cannot be compiled below its canonical risk");
      }
    }
  }
  invocation.status = result.plan ? "COMPILED" : result.instruction.status === "REJECTED" ? "CANCELLED" : "DRAFT";
  invocation.compiledPlanId = result.plan?.id;
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
  if (isPlanTerminal(plan.status)) {
    throw new PlatformError("FORBIDDEN", `Plan is terminal (${plan.status}) and cannot be confirmed`);
  }
  if (plan.status === "STALE") {
    throw new PlatformError("VERSION_CONFLICT", "Plan is stale and must be recompiled before confirmation");
  }
  if (plan.riskSummary === "R3" || plan.status === "AWAITING_APPROVAL") {
    throw new PlatformError("FORBIDDEN", "This plan requires independent maker-checker approval");
  }
  const instruction = ledger.instructions.find((i) => i.id === plan.instructionId);
  const now = nowIso(input.now);
  plan.status = "APPROVED";
  plan.makerPersonId = instruction?.authorPersonId ?? input.actor.person.id;
  plan.approvalIdentityId = `confirm:${plan.id}:v${plan.planVersion}:${plan.approvedPlanHash ?? "none"}`;
  plan.approvedAt = now;
  plan.updatedAt = now;
  plan.approvalCorrelationId = plan.approvalCorrelationId ?? randomUUID();
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
  if (isPlanTerminal(plan.status)) {
    throw new PlatformError("FORBIDDEN", `Plan is terminal (${plan.status}) and cannot be approved again`);
  }
  const instruction = ledger.instructions.find((i) => i.id === plan.instructionId);
  if (!instruction) throw new PlatformError("NOT_FOUND", "Instruction missing for plan");
  assertMakerChecker(instruction.authorPersonId, input.actor.person.id, "approve");
  const now = nowIso(input.now);
  const approvalCorrelationId = randomUUID();
  plan.status = "APPROVED";
  plan.makerPersonId = instruction.authorPersonId;
  plan.checkerPersonId = input.actor.person.id;
  plan.approvalIdentityId = `approve:${plan.id}:v${plan.planVersion}:${plan.approvedPlanHash ?? "none"}:${input.actor.person.id}`;
  plan.approvedAt = now;
  plan.updatedAt = now;
  plan.approvalCorrelationId = approvalCorrelationId;
  plan.version += 1;
  const receipt: AtelierCommandReceipt = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    sessionId: instruction.sessionId,
    instructionId: instruction.id,
    planId: plan.id,
    correlationId: approvalCorrelationId,
    kind: "PLAN_APPROVAL",
    summary: `Maker-checker approval recorded for plan ${plan.id} v${plan.planVersion}`,
    changedRecordIds: [],
    unchangedReasons: [
      "Approval is a governance decision; business data unchanged.",
      `Maker: ${instruction.authorPersonId}`,
      `Checker: ${input.actor.person.id}`,
      `Hash: ${plan.approvedPlanHash ?? "none"}`,
      `Approval identity: ${plan.approvalIdentityId}`,
    ],
    evidenceRefs: [],
    createdAt: now,
    effectClass: "NONE",
    dataChanged: false,
    settlementStatus: "EXECUTED",
    riskSummary: plan.riskSummary,
    taskDefinitionId: instruction.taskInvocationId
      ? ledger.taskInvocations.find((t) => t.id === instruction.taskInvocationId)?.taskDefinitionId
      : undefined,
    taskVersion: instruction.taskInvocationId
      ? ledger.taskInvocations.find((t) => t.id === instruction.taskInvocationId)?.taskVersion
      : undefined,
    originalRequestedIntent: instruction.rawText,
    actualAction: "checker approval recorded",
  };
  ledger.receipts.push(receipt);
  return plan;
}

/** Preserve history while ensuring an unexecuted pending plan cannot be actioned after policy change. */
export function supersedePlan(input: {
  snap: PlatformSnapshot;
  planId: string;
  reason: string;
  now?: string;
}) {
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId);
  if (!plan) throw new PlatformError("NOT_FOUND", "Plan was not found");
  if (plan.status === "SUPERSEDED") return plan;
  if (plan.status === "COMPLETED") {
    throw new PlatformError("FORBIDDEN", "Completed plans cannot be superseded for replay safety");
  }
  plan.status = "SUPERSEDED";
  plan.version += 1;
  for (const step of ledger.planSteps.filter((s) => s.planId === plan.id)) {
    if (!isStepTerminal(step.status) || step.status === "PENDING" || step.status === "READY") {
      step.status = "SUPERSEDED";
    }
  }
  const instruction = ledger.instructions.find((i) => i.id === plan.instructionId);
  const receipt: AtelierCommandReceipt = {
    id: randomUUID(),
    organisationId: plan.organisationId,
    eventId: plan.eventId,
    sessionId: instruction?.sessionId ?? "",
    instructionId: plan.instructionId,
    planId: plan.id,
    correlationId: randomUUID(),
    kind: "PLAN_CONFIRMATION",
    summary: `Plan superseded — ${input.reason}`,
    changedRecordIds: [],
    unchangedReasons: [input.reason, "History preserved; plan is no longer executable."],
    evidenceRefs: [],
    createdAt: nowIso(input.now),
    effectClass: "REFUSED",
    dataChanged: false,
    settlementStatus: "REFUSED",
    riskSummary: plan.riskSummary,
    originalRequestedIntent: instruction?.rawText,
    actualAction: "superseded — no execution",
  };
  ledger.receipts.push(receipt);
  return plan;
}

function buildAlreadySettledResponse(input: {
  ledger: AtelierCommandLedger;
  plan: AtelierPlan;
  organisationId: string;
  eventId: string;
  now: string;
  actor: ActorSnapshot;
}) {
  const original =
    input.ledger.receipts.find((r) => r.id === input.plan.settlementReceiptId) ??
    input.ledger.receipts
      .filter((r) => r.planId === input.plan.id && r.settlementStatus === "EXECUTED")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ??
    input.ledger.receipts
      .filter((r) => r.planId === input.plan.id && (r.kind === "RUN_RECEIPT" || r.kind === "INTELLIGENCE_RESULT"))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const originalCorr = input.plan.settlementCorrelationId ?? original?.correlationId ?? "unknown";
  const originalAt = input.plan.settledAt ?? original?.createdAt ?? input.now;
  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
  const run: AtelierRun = {
    id: randomUUID(),
    planId: input.plan.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    initiatedByAssignmentId: assignment.id,
    initiatedByPersonId: input.actor.person.id,
    agentIdentityId: `agent:atelier-command:${assignment.id}`,
    modelPolicySnapshot: "fixture-v1",
    status: "COMPLETED",
    startedAt: input.now,
    endedAt: input.now,
    costBudget: 0,
    actualCost: 0,
    lastHeartbeatAt: input.now,
    completionSummary: "ALREADY_SETTLED — original settlement returned; no new effect",
    version: 1,
  };
  input.ledger.runs.push(run);
  const observation: AtelierStepExecution = {
    id: randomUUID(),
    runId: run.id,
    stepId: input.ledger.planSteps.find((s) => s.planId === input.plan.id)?.id ?? "none",
    organisationId: input.organisationId,
    eventId: input.eventId,
    attempt: 1,
    commandId: original?.changedRecordIds[0] ?? originalCorr,
    idempotencyKey: `replay:${input.plan.id}:${input.plan.planVersion}:${originalCorr}`,
    correlationId: randomUUID(),
    effectiveCapability: [],
    scopeSnapshot: { organisationId: input.organisationId, eventId: input.eventId, crossEvent: false },
    inputHash: "replay",
    status: "REPLAYED",
    resultSummary: `ALREADY_SETTLED / REPLAYED — original correlation ${originalCorr} at ${originalAt}; no new effect occurred`,
    resultPayload: {
      effectClass: original?.effectClass ?? "ALREADY_SETTLED",
      dataChanged: false,
      settlementStatus: "ALREADY_SETTLED",
      originalCorrelationId: originalCorr,
    },
    startedAt: input.now,
    endedAt: input.now,
  };
  input.ledger.stepExecutions.push(observation);
  const simulated = original?.effectClass === "SIMULATED_BROWSER" || original?.simulated === true;
  const receipt: AtelierCommandReceipt = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    sessionId: original?.sessionId ?? "",
    instructionId: input.plan.instructionId,
    planId: input.plan.id,
    runId: run.id,
    correlationId: observation.correlationId,
    kind: "ALREADY_SETTLED",
    summary: simulated
      ? `REPLAYED / ALREADY_SETTLED — SIMULATED browser settlement ${originalCorr}; no real browser/provider/external system changed; no new effect`
      : `REPLAYED / ALREADY_SETTLED — original settlement ${originalCorr}; no new effect occurred`,
    changedRecordIds: [],
    unchangedReasons: [
      "ALREADY_SETTLED",
      `Original correlation: ${originalCorr}`,
      `Original settlement time: ${originalAt}`,
      "Tool was not invoked again.",
      "dataChanged:false for this replay.",
    ],
    evidenceRefs: [observation.id, ...(original ? [original.id] : [])],
    createdAt: input.now,
    effectClass: simulated ? "SIMULATED_BROWSER" : original?.effectClass === "REFUSED" ? "REFUSED" : "ALREADY_SETTLED",
    dataChanged: false,
    settlementStatus: "ALREADY_SETTLED",
    originalCorrelationId: originalCorr,
    originalSettlementAt: originalAt,
    simulated: simulated || undefined,
    riskSummary: input.plan.riskSummary,
    taskDefinitionId: original?.taskDefinitionId,
    taskVersion: original?.taskVersion,
    intelligenceResult: original?.intelligenceResult,
    originalRequestedIntent: original?.originalRequestedIntent,
    actualAction: original?.actualAction ?? "replay of original settlement only",
  };
  input.ledger.receipts.push(receipt);
  return { run, executions: [observation], receipt, alreadySettled: true as const };
}

/**
 * Claim plan for execution before any await (concurrency). Returns already-settled response or null to proceed.
 */
export function claimPlanExecution(input: {
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
  const now = nowIso(input.now);
  if (plan.settlementCorrelationId || plan.status === "COMPLETED") {
    if (plan.status !== "COMPLETED") plan.status = "COMPLETED";
    return buildAlreadySettledResponse({ ledger, plan, organisationId: input.organisationId, eventId: input.eventId, now, actor: input.actor });
  }
  if (isPlanTerminal(plan.status) && plan.status !== "FAILED") {
    throw new PlatformError("FORBIDDEN", `Plan is terminal (${plan.status}) and cannot execute`);
  }
  // Retryable FAILED / RECOVERING paths may re-enter; EXECUTING means another request claimed first.
  if (plan.status === "EXECUTING") {
    if (plan.settlementCorrelationId) {
      return buildAlreadySettledResponse({ ledger, plan, organisationId: input.organisationId, eventId: input.eventId, now, actor: input.actor });
    }
    // Another caller holds the claim. If a successful step already committed, settle as replay.
    const steps = ledger.planSteps.filter((s) => s.planId === plan.id);
    const priorSuccess = ledger.stepExecutions
      .filter((e) => steps.some((s) => s.id === e.stepId) && e.status === "SUCCEEDED")
      .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))[0];
    if (priorSuccess) {
      plan.settlementCorrelationId = priorSuccess.correlationId;
      plan.settledAt = priorSuccess.endedAt ?? priorSuccess.startedAt ?? now;
      plan.status = "COMPLETED";
      return buildAlreadySettledResponse({ ledger, plan, organisationId: input.organisationId, eventId: input.eventId, now, actor: input.actor });
    }
    throw new PlatformError("VERSION_CONFLICT", "Plan execution already in progress");
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
  // Steps already terminal with prior success → settle without re-tooling.
  const steps = ledger.planSteps.filter((s) => s.planId === plan.id);
  const allTerminalSuccess = steps.length > 0 && steps.every((s) => s.status === "SUCCEEDED" || s.status === "REPLAYED");
  if (allTerminalSuccess) {
    const priorExec = ledger.stepExecutions
      .filter((e) => steps.some((s) => s.id === e.stepId) && e.status === "SUCCEEDED")
      .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))[0];
    if (priorExec) {
      plan.settlementCorrelationId = priorExec.correlationId;
      plan.settledAt = priorExec.endedAt ?? priorExec.startedAt;
      plan.status = "COMPLETED";
      return buildAlreadySettledResponse({ ledger, plan, organisationId: input.organisationId, eventId: input.eventId, now, actor: input.actor });
    }
  }
  plan.status = "EXECUTING";
  plan.version += 1;
  return null;
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
  domainEvidence?: DomainEvidenceBag;
}): AtelierStepExecution {
  const tool = getAtelierTool(input.step.toolName);
  if (!tool) {
    throw new PlatformError("VALIDATION_FAILED", `Unknown tool ${input.step.toolName}`);
  }
  if (isStepTerminal(input.step.status) && input.step.status !== "OUTCOME_UNKNOWN") {
    const prior = input.ledger.stepExecutions
      .filter((e) => e.stepId === input.step.id && (e.status === "SUCCEEDED" || e.status === "REPLAYED"))
      .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))[0];
    const replayed: AtelierStepExecution = {
      id: randomUUID(),
      runId: input.run.id,
      stepId: input.step.id,
      organisationId: input.organisationId,
      eventId: input.eventId,
      attempt: 1,
      commandId: prior?.commandId ?? randomUUID(),
      idempotencyKey: prior?.idempotencyKey ?? `terminal:${input.step.id}`,
      correlationId: randomUUID(),
      effectiveCapability: tool.requiredCapabilities,
      scopeSnapshot: { organisationId: input.organisationId, eventId: input.eventId, crossEvent: false },
      inputHash: inputHash(input.step.input),
      status: "REPLAYED",
      resultRef: prior?.resultRef,
      resultSummary: `ALREADY_SETTLED — step terminal (${input.step.status}); tool not invoked`,
      resultPayload: {
        effectClass: "ALREADY_SETTLED",
        dataChanged: false,
        originalCorrelationId: prior?.correlationId,
      },
      startedAt: input.now,
      endedAt: input.now,
    };
    input.ledger.stepExecutions.push(replayed);
    return replayed;
  }

  // Intent integrity re-check at execution (trusted server code).
  const instructionText =
    typeof input.step.input.instruction === "string" ? input.step.input.instruction : tool.description;
  const intent = assessIntentCompatibility({
    rawText: instructionText,
    eventId: input.eventId,
    toolNames: [tool.name],
  });
  if (intent.decision === "REFUSE") {
    const execution: AtelierStepExecution = {
      id: randomUUID(),
      runId: input.run.id,
      stepId: input.step.id,
      organisationId: input.organisationId,
      eventId: input.eventId,
      attempt: 1,
      commandId: randomUUID(),
      idempotencyKey: `${input.step.planId}:${input.step.id}:intent-refuse`,
      correlationId: randomUUID(),
      effectiveCapability: tool.requiredCapabilities,
      scopeSnapshot: { organisationId: input.organisationId, eventId: input.eventId, crossEvent: false },
      inputHash: inputHash(input.step.input),
      status: "REFUSED",
      errorClass: "INTENT_INCOMPATIBLE",
      resultSummary: intent.refuseReason ?? "Intent incompatible at execution",
      resultPayload: { effectClass: "REFUSED", dataChanged: false },
      startedAt: input.now,
      endedAt: input.now,
    };
    input.step.status = "REFUSED";
    input.ledger.stepExecutions.push(execution);
    return execution;
  }

  const idempotencyKey = `${input.step.planId}:${input.step.id}:${input.step.toolVersion}:${inputHash(input.step.input)}`;
  const existing = input.ledger.idempotencyReceipts.find(
    (r) => r.idempotencyKey === idempotencyKey && r.eventId === input.eventId,
  );
  if (existing) {
    const original = input.ledger.stepExecutions.find(
      (e) => e.idempotencyKey === idempotencyKey && e.status === "SUCCEEDED",
    );
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
      resultSummary: `ALREADY_SETTLED / REPLAYED — original correlation ${original?.correlationId ?? existing.commandId}; no duplicate mutation`,
      resultPayload: {
        effectClass: original?.resultPayload && typeof original.resultPayload === "object" && "effectClass" in original.resultPayload
          ? (original.resultPayload as { effectClass?: string }).effectClass
          : "ALREADY_SETTLED",
        dataChanged: false,
        settlementStatus: "ALREADY_SETTLED",
        originalCorrelationId: original?.correlationId,
      },
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
        ? "External effect blocked — production is unauthorised and providers are inactive. No real send or provider action occurred. This is a governance refusal, not a completed send."
        : `Action refused: ${decision.reasonCode}`;
    execution.resultPayload = {
      effectClass: "EXTERNAL_BLOCKED",
      dataChanged: false,
      reasonCode: decision.reasonCode,
    };
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
    execution.resultSummary =
      "SIMULATED browser retrieve completed; download quarantined; profile destroyed. No real browser, provider, or external system changed.";
    execution.resultPayload = { effectClass: "SIMULATED_BROWSER", dataChanged: false, simulated: true };
    execution.afterStateHash = inputHash({ browserRun: simulated.run.id });
    execution.endedAt = input.now;
  } else if (!tool.mutating && tool.riskTier === "R0") {
    const context = buildEventContextProjection({
      snap: input.snap,
      organisationId: input.organisationId,
      eventId: input.eventId,
      eventName: input.snap.events.find((event) => event.id === input.eventId)?.name,
      now: input.now,
    });
    const intelligence = buildIntelligenceResult({
      toolName: tool.name.startsWith("intelligence.") ? tool.name : tool.name,
      instruction: instructionText,
      organisationId: input.organisationId,
      eventId: input.eventId,
      context,
      posture: input.posture,
      now: input.now,
      snap: input.snap,
      evidence: input.domainEvidence,
    });
    if (!tool.name.startsWith("intelligence.")) {
      intelligence.supportingFacts = [
        ...intelligence.supportingFacts,
        `Read tool ${tool.name} completed inside the authorised event only.`,
      ];
      intelligence.provenance = [...intelligence.provenance, `tool:${tool.name}`];
    }
    execution.status = "SUCCEEDED";
    execution.resultRef = `read:${tool.name}:${execution.commandId}`;
    execution.resultSummary = intelligence.answer;
    execution.resultPayload = intelligence as AtelierIntelligenceResultPayload;
    execution.afterStateHash = inputHash({ intelligence: intelligence.answer, eventId: input.eventId, tool: tool.name });
    execution.endedAt = input.now;
  } else {
    execution.status = "SUCCEEDED";
    execution.resultRef = `native:${tool.name}:${execution.commandId}`;
    execution.resultSummary = tool.mutating
      ? `Native draft/command applied within event ${input.eventId} via ${tool.name}`
      : `Native read completed for event ${input.eventId} via ${tool.name}`;
    execution.resultPayload = {
      effectClass: tool.mutating ? "DRAFT" : "READ",
      dataChanged: Boolean(tool.mutating && !input.step.input.dryRun),
      toolName: tool.name,
    };
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
  domainEvidence?: DomainEvidenceBag;
  /** When claimPlanExecution already claimed — skip re-claim. */
  alreadyClaimed?: boolean;
}) {
  assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
  const ledger = ensureAtelierLedger(input.snap);
  const plan = ledger.plans.find((p) => p.id === input.planId);
  if (!plan || plan.eventId !== input.eventId || plan.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "Plan was not found for this event");
  }
  const now = nowIso(input.now);

  if (!input.alreadyClaimed) {
    const claimed = claimPlanExecution({
      snap: input.snap,
      actor: input.actor,
      organisationId: input.organisationId,
      eventId: input.eventId,
      planId: input.planId,
      now,
    });
    if (claimed) return claimed;
  } else if (plan.settlementCorrelationId || plan.status === "COMPLETED") {
    return buildAlreadySettledResponse({
      ledger,
      plan,
      organisationId: input.organisationId,
      eventId: input.eventId,
      now,
      actor: input.actor,
    });
  }

  const steps = ledger.planSteps.filter((s) => s.planId === plan.id).sort((a, b) => a.ordinal - b.ordinal);
  for (const step of steps) {
    const tool = getAtelierTool(step.toolName);
    if (!tool) throw new PlatformError("VALIDATION_FAILED", `Unknown tool ${step.toolName}`);
    if (tool.riskTier !== step.riskTier) {
      throw new PlatformError("FORBIDDEN", "Plan step risk does not match trusted tool catalogue");
    }
    if (step.input && typeof step.input === "object") {
      if ("eventId" in step.input && step.input.eventId !== input.eventId) {
        throw new PlatformError("SCOPE_MISMATCH", "Plan step event does not match authorised event");
      }
    }
  }
  const trustedRisk = maxRisk(steps.map((s) => s.riskTier));
  if (trustedRisk !== plan.riskSummary) {
    throw new PlatformError("FORBIDDEN", "Plan risk summary does not match trusted step risks");
  }
  const expectedHash = hashPlan(
    steps.map((step) => ({
      toolName: step.toolName,
      toolVersion: step.toolVersion,
      riskTier: step.riskTier,
      confirmationMode: step.confirmationMode,
      approvalRequirement: step.approvalRequirement,
      executionRoute: step.executionRoute,
      input: step.input,
      targetRefs: step.targetRefs,
    })),
    input.eventId,
  );
  if (plan.approvedPlanHash && plan.approvedPlanHash !== expectedHash) {
    throw new PlatformError("VERSION_CONFLICT", "Plan hash mismatch — refuse stale or tampered plan");
  }
  // Approval binding: R3+ must carry approval identity bound to this plan version/hash.
  if ((plan.riskSummary === "R3" || plan.riskSummary === "R4" || plan.riskSummary === "R5") && !plan.approvalIdentityId) {
    throw new PlatformError("FORBIDDEN", "R3+ plan requires bound approval identity before execution");
  }
  if (plan.approvalIdentityId && plan.approvedPlanHash) {
    const expectedApprovalSuffix = plan.approvedPlanHash;
    if (!plan.approvalIdentityId.includes(expectedApprovalSuffix) && !plan.approvalIdentityId.includes(plan.id)) {
      throw new PlatformError("FORBIDDEN", "Approval identity does not bind to this plan");
    }
  }

  const assignment = activeAssignment(input.actor, input.organisationId, input.eventId);
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
        domainEvidence: input.domainEvidence,
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
      domainEvidence: input.domainEvidence,
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

  const instruction = ledger.instructions.find((i) => i.id === plan.instructionId);
  const taskInvocation = instruction?.taskInvocationId
    ? ledger.taskInvocations.find((t) => t.id === instruction.taskInvocationId)
    : undefined;
  const intelligence = executions
    .map((e) => e.resultPayload)
    .find((payload): payload is AtelierIntelligenceResultPayload =>
      Boolean(payload && typeof payload === "object" && "answer" in payload && "instruction" in payload),
    );
  const mutatingSuccesses = executions.filter((e) => {
    const tool = getAtelierTool(ledger.planSteps.find((s) => s.id === e.stepId)?.toolName ?? "");
    return e.status === "SUCCEEDED" && tool?.mutating;
  });
  const effectOf = (payload: AtelierStepExecution["resultPayload"]) =>
    payload && typeof payload === "object" && "effectClass" in payload
      ? String((payload as { effectClass?: unknown }).effectClass ?? "")
      : "";
  const blockedExternal = executions.some(
    (e) => e.status === "BLOCKED" && (e.errorClass === "PRODUCTION_OR_PROVIDER_BLOCK" || effectOf(e.resultPayload) === "EXTERNAL_BLOCKED"),
  );
  const allReplayed = executions.length > 0 && executions.every((e) => e.status === "REPLAYED");
  const simulatedBrowser = executions.some(
    (e) =>
      (e.status === "SUCCEEDED" || e.status === "REPLAYED") &&
      (effectOf(e.resultPayload) === "SIMULATED_BROWSER" ||
        /SIMULATED browser/i.test(e.resultSummary ?? "")),
  );
  const effectClass: AtelierCommandReceipt["effectClass"] = allReplayed
    ? simulatedBrowser
      ? "SIMULATED_BROWSER"
      : "ALREADY_SETTLED"
    : blockedExternal
      ? "EXTERNAL_BLOCKED"
      : intelligence
        ? "READ"
        : mutatingSuccesses.length
          ? "DRAFT"
          : simulatedBrowser
            ? "SIMULATED_BROWSER"
            : executions.some((e) => e.status === "REFUSED" || e.status === "BLOCKED")
              ? "REFUSED"
              : "NONE";

  const browserStep = executions.find((e) => effectOf(e.resultPayload) === "SIMULATED_BROWSER" || /SIMULATED browser/i.test(e.resultSummary ?? ""));
  run.completionSummary = intelligence
    ? `Intelligence completed for event ${input.eventId}`
    : allReplayed
      ? `ALREADY_SETTLED / REPLAYED — no new effect`
      : blockedExternal
        ? `External effect blocked under current posture; status ${run.status}`
        : simulatedBrowser
          ? `SIMULATED · SIMULATED_BROWSER · ${browserStep?.resultSummary ?? "Browser simulation completed"} · dataChanged:false`
          : `Executed ${executions.length} step(s); status ${run.status}`;

  const primaryCorr =
    executions.find((e) => e.status === "SUCCEEDED")?.correlationId ??
    executions[0]?.correlationId ??
    randomUUID();

  if (run.status === "COMPLETED" && !allReplayed && !executions.some((e) => e.status === "OUTCOME_UNKNOWN")) {
    plan.status = "COMPLETED";
    plan.settlementCorrelationId = primaryCorr;
    plan.settledAt = now;
  } else if (run.status === "BLOCKED") {
    plan.status = "BLOCKED";
  } else if (run.status === "FAILED") {
    plan.status = "FAILED";
  } else if (run.status === "RECOVERING") {
    // Leave non-terminal so reconcile/retry policy can recover durable receipt.
    plan.status = "APPROVED";
  } else if (allReplayed) {
    plan.status = "COMPLETED";
    if (!plan.settlementCorrelationId) {
      const prior = ledger.stepExecutions.find(
        (e) => steps.some((s) => s.id === e.stepId) && e.status === "SUCCEEDED",
      );
      plan.settlementCorrelationId = prior?.correlationId ?? primaryCorr;
      plan.settledAt = prior?.endedAt ?? now;
    }
  }

  const receipt: AtelierCommandReceipt = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    sessionId: instruction?.sessionId ?? "",
    instructionId: plan.instructionId,
    planId: plan.id,
    runId: run.id,
    correlationId: primaryCorr,
    kind: allReplayed
      ? "ALREADY_SETTLED"
      : intelligence
        ? "INTELLIGENCE_RESULT"
        : blockedExternal
          ? "EXTERNAL_EFFECT_BLOCKED"
          : "RUN_RECEIPT",
    summary: intelligence?.answer ?? run.completionSummary,
    changedRecordIds: mutatingSuccesses.map((e) => e.commandId),
    unchangedReasons: [
      ...executions
        .filter((e) => e.status === "REFUSED" || e.status === "BLOCKED" || e.status === "REPLAYED")
        .map((e) => e.resultSummary ?? e.status),
      ...(intelligence ? ["Intelligence read path — no event records mutated"] : []),
      ...(simulatedBrowser
        ? [
            "SIMULATED",
            "effectClass=SIMULATED_BROWSER",
            "No real browser, provider, or external system changed.",
            "dataChanged:false",
          ]
        : []),
    ],
    evidenceRefs: executions.map((e) => e.id),
    createdAt: now,
    intelligenceResult: intelligence,
    effectClass,
    dataChanged: mutatingSuccesses.length > 0,
    taskDefinitionId: taskInvocation?.taskDefinitionId,
    taskVersion: taskInvocation?.taskVersion,
    riskSummary: plan.riskSummary,
    settlementStatus: allReplayed ? "ALREADY_SETTLED" : "EXECUTED",
    simulated: simulatedBrowser || undefined,
    originalCorrelationId: allReplayed ? plan.settlementCorrelationId : undefined,
    originalSettlementAt: allReplayed ? plan.settledAt : undefined,
    originalRequestedIntent: instruction?.rawText,
    actualAction: simulatedBrowser
      ? "SIMULATED browser.retrieveDocument (quarantined download; profile destroyed)"
      : intelligence
        ? "intelligence read"
        : executions.map((e) => `${e.status}:${ledger.planSteps.find((s) => s.id === e.stepId)?.toolName ?? "?"}`).join(", "),
  };
  ledger.receipts.push(receipt);
  if (plan.status === "COMPLETED" && !plan.settlementReceiptId) {
    plan.settlementReceiptId = receipt.id;
  }
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
