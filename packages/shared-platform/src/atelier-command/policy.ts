/** EOS-S06A Policy Decision Point — server authority; model cannot raise privileges. */
import { authorize, type ActorSnapshot } from "../policy.js";
import type { PermissionKey } from "../schemas.js";
import { PlatformError } from "../errors.js";
import { assertMakerChecker } from "../risk-command.js";
import type {
  AtelierCommandRiskTier,
  AtelierExecutionMode,
  AtelierPolicyDecision,
  AtelierScopeSnapshot,
} from "./types.js";

export const ATELIER_COMMAND_POLICY_VERSION = "eos-s06a-pdp-v1" as const;

export type AtelierCommandPermission =
  | "atelierCommand.view"
  | "atelierCommand.instruct"
  | "atelierCommand.execute"
  | "atelierCommand.approve"
  | "atelierCommand.browser"
  | "atelierCommand.audit";

export type RuntimePosture = {
  productionAuthorised: boolean;
  providersActive: boolean;
  atelierCommandEnabled: boolean;
  nativeExecutionEnabled: boolean;
  browserExecutionEnabled: boolean;
  externalEffectsEnabled: boolean;
};

export const DEFAULT_RUNTIME_POSTURE: RuntimePosture = {
  productionAuthorised: false,
  providersActive: false,
  atelierCommandEnabled: true,
  nativeExecutionEnabled: true,
  browserExecutionEnabled: true, // simulation only while productionAuthorised:false
  externalEffectsEnabled: false,
};

export function assertEventScoped(scope: AtelierScopeSnapshot, eventId: string, organisationId: string): void {
  if (scope.crossEvent !== false) {
    throw new PlatformError("FORBIDDEN", "Atelier Command cannot operate cross-event");
  }
  if (scope.eventId !== eventId || scope.organisationId !== organisationId) {
    throw new PlatformError("SCOPE_MISMATCH", "instruction scope does not match the selected event");
  }
  if (!eventId || !organisationId) {
    throw new PlatformError("VALIDATION_FAILED", "organisation and event context are required");
  }
}

export function assertAtelierPermission(
  actor: ActorSnapshot,
  permission: AtelierCommandPermission & PermissionKey,
  organisationId: string,
  eventId: string,
): void {
  const decision = authorize({
    actor,
    permission: permission as PermissionKey,
    scope: { organisationId, eventId },
  });
  if (!decision.allow) {
    throw new PlatformError("FORBIDDEN", "You do not have authority for this Atelier Command action");
  }
}

export function riskFromTool(risk: AtelierCommandRiskTier, modelSuggested?: AtelierCommandRiskTier): AtelierCommandRiskTier {
  const order: AtelierCommandRiskTier[] = ["R0", "R1", "R2", "R3", "R4", "R5"];
  if (!modelSuggested) return risk;
  return order.indexOf(modelSuggested) > order.indexOf(risk) ? modelSuggested : risk;
}

export function maxRisk(tiers: AtelierCommandRiskTier[]): AtelierCommandRiskTier {
  const order: AtelierCommandRiskTier[] = ["R0", "R1", "R2", "R3", "R4", "R5"];
  return tiers.reduce((acc, t) => (order.indexOf(t) > order.indexOf(acc) ? t : acc), "R0" as AtelierCommandRiskTier);
}

export function decidePolicy(input: {
  actor: ActorSnapshot;
  organisationId: string;
  eventId: string;
  riskTier: AtelierCommandRiskTier;
  executionMode: AtelierExecutionMode;
  externalEffect: boolean;
  browser: boolean;
  mutating: boolean;
  planApproved: boolean;
  posture: RuntimePosture;
  makerPersonId?: string;
  checkerPersonId?: string;
}): { decision: AtelierPolicyDecision; reasonCode: string } {
  if (!input.posture.atelierCommandEnabled) {
    return { decision: "BLOCK_RUNTIME_POSTURE", reasonCode: "ATELIER_COMMAND_DISABLED" };
  }

  // Read path
  if (!input.mutating && input.riskTier === "R0") {
    try {
      assertAtelierPermission(input.actor, "atelierCommand.view", input.organisationId, input.eventId);
      return { decision: "ALLOW", reasonCode: "READ_WITHIN_SCOPE" };
    } catch {
      return { decision: "REFUSE", reasonCode: "PERMISSION_DENIED" };
    }
  }

  if (input.riskTier === "R5") {
    return { decision: "REFUSE", reasonCode: "PROHIBITED_ACTION" };
  }

  if (input.externalEffect || input.riskTier === "R4") {
    if (input.posture.productionAuthorised !== true || !input.posture.providersActive || !input.posture.externalEffectsEnabled) {
      return { decision: "BLOCK_RUNTIME_POSTURE", reasonCode: "PRODUCTION_OR_PROVIDER_BLOCK" };
    }
    return { decision: "REQUIRE_IMMEDIATE_CONFIRMATION", reasonCode: "EXTERNAL_EFFECT" };
  }

  if (input.browser) {
    if (!input.posture.browserExecutionEnabled) {
      return { decision: "BLOCK_RUNTIME_POSTURE", reasonCode: "BROWSER_DISABLED" };
    }
    try {
      assertAtelierPermission(input.actor, "atelierCommand.browser", input.organisationId, input.eventId);
    } catch {
      return { decision: "REFUSE", reasonCode: "BROWSER_PERMISSION_DENIED" };
    }
  }

  if (input.mutating && !input.posture.nativeExecutionEnabled && !input.browser) {
    return { decision: "BLOCK_RUNTIME_POSTURE", reasonCode: "NATIVE_EXECUTION_DISABLED" };
  }

  if (input.riskTier === "R3" || input.executionMode === "MAKER_CHECKER") {
    try {
      assertAtelierPermission(input.actor, "atelierCommand.approve", input.organisationId, input.eventId);
    } catch {
      // author may submit but not approve
      try {
        assertAtelierPermission(input.actor, "atelierCommand.execute", input.organisationId, input.eventId);
        return { decision: "REQUIRE_MAKER_CHECKER", reasonCode: "CONTROLLED_ACTION" };
      } catch {
        return { decision: "REFUSE", reasonCode: "PERMISSION_DENIED" };
      }
    }
    if (input.makerPersonId && input.checkerPersonId) {
      try {
        assertMakerChecker(input.makerPersonId, input.checkerPersonId, "approve");
      } catch {
        return { decision: "REFUSE", reasonCode: "MAKER_CHECKER_SEPARATION" };
      }
    }
    if (!input.planApproved) {
      return { decision: "REQUIRE_MAKER_CHECKER", reasonCode: "AWAITING_INDEPENDENT_APPROVAL" };
    }
  }

  if (input.riskTier === "R2" || input.executionMode === "CONFIRM_EACH") {
    if (!input.planApproved) {
      return { decision: "ALLOW_WITH_PLAN_CONFIRMATION", reasonCode: "PLAN_CONFIRMATION_REQUIRED" };
    }
  }

  try {
    assertAtelierPermission(
      input.actor,
      input.mutating ? "atelierCommand.execute" : "atelierCommand.instruct",
      input.organisationId,
      input.eventId,
    );
  } catch {
    return { decision: "REFUSE", reasonCode: "PERMISSION_DENIED" };
  }

  return { decision: "ALLOW", reasonCode: "WITHIN_AUTHORITY" };
}

export function refuseCrossEventRequest(
  rawText: string,
  options?: {
    activeEventId: string;
    activeEventName?: string;
    knownEvents?: Array<{ id: string; name: string }>;
  },
): { refuse: boolean; handoff: string | null; refusedPortion?: string } {
  const lowered = rawText.toLowerCase();
  const patterns = [
    /across (all|every) events?/,
    /organisation[- ]wide/,
    /all events in (the )?portfolio/,
    /compare (every|all) events/,
    /control tower/,
    /other event['']?s? (guests?|budgets?|data)/,
    /ignore (this|the) event(['']?s)? scope/,
    /disregard any policy/,
    /instead.*(another|other|different) event/,
  ];
  for (const p of patterns) {
    if (p.test(lowered)) {
      return {
        refuse: true,
        refusedPortion: rawText.trim(),
        handoff:
          "Organisation-wide and cross-event intelligence are handled by Executive Event Command / Control Tower. Atelier Command stays inside the selected event. The cross-event portion of this request was refused; nothing was executed for another event.",
      };
    }
  }

  const activeId = options?.activeEventId?.toLowerCase() ?? "";
  const activeName = (options?.activeEventName ?? "").trim().toLowerCase();
  for (const event of options?.knownEvents ?? []) {
    if (!event?.id || event.id.toLowerCase() === activeId) continue;
    const name = event.name.trim();
    if (!name) continue;
    const nameLower = name.toLowerCase();
    const idLower = event.id.toLowerCase();
    const mentionsOther =
      lowered.includes(nameLower) ||
      lowered.includes(idLower) ||
      new RegExp(`event\\s+[\"']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"']`, "i").test(rawText);
    if (mentionsOther) {
      return {
        refuse: true,
        refusedPortion: `Reference to event "${name}" (${event.id})`,
        handoff: [
          `Requested work referenced another event ("${name}").`,
          `Authorised Atelier Command context remains "${options?.activeEventName ?? options?.activeEventId}".`,
          "The cross-event portion was refused and nothing was executed for the other event.",
          "Open that event’s Atelier Command workspace to work there. Organisation-wide intelligence stays in Executive Event Command / Control Tower.",
        ].join(" "),
      };
    }
  }

  // UUID-looking foreign event ids in the instruction
  const uuidMatches = rawText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
  for (const id of uuidMatches) {
    if (id.toLowerCase() !== activeId) {
      return {
        refuse: true,
        refusedPortion: `Reference to event id ${id}`,
        handoff: [
          `Requested work referenced event id ${id}, which is not the authorised event.`,
          `Authorised context remains ${options?.activeEventName ?? options?.activeEventId}.`,
          "The cross-event portion was refused; no data from the other event was returned.",
        ].join(" "),
      };
    }
  }

  if (activeName && /other event|another event|different event/.test(lowered)) {
    return {
      refuse: true,
      refusedPortion: "Indefinite other-event reference",
      handoff:
        "Requests that reach beyond the selected event are refused here. Open the intended event or use Executive Event Command / Control Tower for organisation-wide work.",
    };
  }

  return { refuse: false, handoff: null };
}

export function treatEventContentAsData(text: string): { suspicious: boolean; excerpt: string } {
  const injection = [
    /ignore (all |previous )?instructions/i,
    /reveal (the )?(system|secret|credential)/i,
    /you are now/i,
    /exfiltrat/i,
    /disable (maker[- ]checker|approval|audit)/i,
  ];
  for (const p of injection) {
    if (p.test(text)) {
      return { suspicious: true, excerpt: text.slice(0, 240) };
    }
  }
  return { suspicious: false, excerpt: "" };
}
