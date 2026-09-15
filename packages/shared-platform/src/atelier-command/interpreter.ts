/** Deterministic fixture interpreter — provider-inactive posture. */
import { createHash, randomUUID } from "node:crypto";
import type { ContextBrokerProjection } from "./context.js";
import { refuseCrossEventRequest, treatEventContentAsData } from "./policy.js";
import { getAtelierTool, modeForRisk } from "./tools.js";
import type {
  AtelierAmbiguity,
  AtelierCommandRiskTier,
  AtelierInterpretationBody,
  AtelierModelInvocation,
} from "./types.js";

export type CompiledPlanDraft = {
  interpretation: AtelierInterpretationBody;
  modelInvocation: AtelierModelInvocation;
  steps: Array<{
    toolName: string;
    toolVersion: string;
    riskTier: AtelierCommandRiskTier;
    confirmationMode: ReturnType<typeof modeForRisk>;
    approvalRequirement: boolean;
    executionRoute: "NATIVE" | "INTEGRATION" | "BROWSER";
    input: Record<string, unknown>;
    targetRefs: string[];
  }>;
  riskSummary: AtelierCommandRiskTier;
  needsClarification: boolean;
  ambiguities: AtelierAmbiguity[];
  handoffMessage?: string;
  refused?: boolean;
  refuseReason?: string;
};

function pickTools(rawText: string): string[] {
  const t = rawText.toLowerCase();
  if (/seat|layout binding|table plan/.test(t)) return ["seating.explainAuthority"];
  if (/budget|investment|spend|scenario/.test(t)) return ["investment.explain"];
  if (/roadmap|critical path|milestone/.test(t)) return ["roadmap.explainCriticalPath"];
  if (/guest|rsvp|household/.test(t)) return ["guest.find"];
  if (/risk|incident|mitigation/.test(t)) return ["risk.raise"];
  if (/brief|discovery|interview/.test(t)) return ["eventBrief.read"];
  if (/portal|browser|download|venue document/.test(t)) return ["browser.retrieveDocument"];
  if (/send (the )?(message|communication|email)/.test(t)) return ["communication.sendApproved"];
  if (/diagnos|blocker|what (is|are) (wrong|blocking)/.test(t)) return ["intelligence.diagnose"];
  if (/recommend|should i|options/.test(t)) return ["intelligence.recommend"];
  return ["intelligence.answer"];
}

export function interpretInstruction(input: {
  organisationId: string;
  eventId: string;
  rawText: string;
  context: ContextBrokerProjection;
  dryRun?: boolean;
  forcedTools?: string[];
  /** Canonical minimum risk that cannot be downgraded by interpretation. */
  riskFloor?: AtelierCommandRiskTier;
  knownEvents?: Array<{ id: string; name: string }>;
  now: string;
}): CompiledPlanDraft {
  const cross = refuseCrossEventRequest(input.rawText, {
    activeEventId: input.eventId,
    activeEventName: input.context.scope.eventName,
    knownEvents: input.knownEvents,
  });
  const modelInvocation: AtelierModelInvocation = {
    id: randomUUID(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    purpose: "INTERPRET_INSTRUCTION",
    provider: "FIXTURE",
    model: "deterministic-fixture-v1",
    policyClass: "event-scoped-orchestration",
    inputTokenCount: Math.ceil(input.rawText.length / 4),
    outputTokenCount: 128,
    cost: 0,
    latencyMs: 12,
    cacheUsage: 0,
    status: "SUCCEEDED",
    createdAt: input.now,
  };

  if (cross.refuse) {
    return {
      interpretation: {
        requestedOutcome: "Handoff to Executive Event Command / Control Tower",
        scope: input.context.scope,
        entities: [],
        knowledge: input.context.knowledge,
        ambiguities: [],
        successCriteria: [],
        intentType: "CROSS_EVENT_HANDOFF",
        confidence: 1,
      },
      modelInvocation: { ...modelInvocation, status: "REFUSED" },
      steps: [],
      riskSummary: "R0",
      needsClarification: false,
      ambiguities: [],
      refused: true,
      refuseReason: cross.handoff ?? "Cross-event request refused",
      handoffMessage: cross.handoff ?? undefined,
    };
  }

  const injection = treatEventContentAsData(input.rawText);
  const toolNames = input.forcedTools?.length ? input.forcedTools : pickTools(input.rawText);
  const ambiguities: AtelierAmbiguity[] = [];

  if (/update (the )?guest/.test(input.rawText.toLowerCase()) && !/guest [0-9a-f-]{8,}/i.test(input.rawText)) {
    ambiguities.push({
      id: randomUUID(),
      question: "Which guest in this event should be updated?",
      blocksStepIds: ["step-1"],
      material: true,
    });
  }

  const steps = [];
  let riskSummary: AtelierCommandRiskTier = input.riskFloor ?? "R0";
  const order: AtelierCommandRiskTier[] = ["R0", "R1", "R2", "R3", "R4", "R5"];
  for (const name of toolNames) {
    const tool = getAtelierTool(name);
    if (!tool) continue;
    if (order.indexOf(tool.riskTier) > order.indexOf(riskSummary)) riskSummary = tool.riskTier;
    steps.push({
      toolName: tool.name,
      toolVersion: tool.version,
      riskTier: tool.riskTier,
      confirmationMode: input.dryRun ? ("DRY_RUN" as const) : modeForRisk(tool.riskTier),
      approvalRequirement: tool.approvalPolicy === "MAKER_CHECKER",
      executionRoute: tool.route,
      input: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        instruction: input.rawText,
        dryRun: Boolean(input.dryRun),
      },
      targetRefs: [`event:${input.eventId}`],
    });
  }
  if (input.riskFloor && order.indexOf(input.riskFloor) > order.indexOf(riskSummary)) {
    riskSummary = input.riskFloor;
  }

  if (injection.suspicious) {
    ambiguities.push({
      id: randomUUID(),
      question: "Instruction-like content was detected. Confirm you intend this as event data, not a policy override.",
      blocksStepIds: steps.map((_, i) => `step-${i + 1}`),
      material: riskSummary !== "R0",
    });
  }

  const needsClarification = ambiguities.some((a) => a.material);

  return {
    interpretation: {
      requestedOutcome: input.rawText.trim().slice(0, 500) || "Understand the selected event",
      scope: input.context.scope,
      entities: [
        {
          kind: "EVENT",
          suppliedText: input.eventId,
          resolvedId: input.eventId,
          resolution: "EXACT",
        },
      ],
      knowledge: input.context.knowledge,
      ambiguities,
      successCriteria: ["Plan previewed", "Authority respected", "Receipt durable"],
      intentType: needsClarification
        ? "NEEDS_CLARIFICATION"
        : steps[0]?.toolName.startsWith("intelligence.")
          ? "ANSWER"
          : "EXECUTE",
      confidence: needsClarification ? 0.45 : 0.86,
    },
    modelInvocation,
    steps,
    riskSummary,
    needsClarification,
    ambiguities,
  };
}

export function hashPlan(steps: CompiledPlanDraft["steps"], scopeEventId: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ scopeEventId, steps: steps.map((s) => ({ n: s.toolName, i: s.input, r: s.riskTier })) }))
    .digest("hex");
}
