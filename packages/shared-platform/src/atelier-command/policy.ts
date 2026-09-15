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

export function refuseCrossEventRequest(rawText: string): { refuse: boolean; handoff: string | null } {
  const lowered = rawText.toLowerCase();
  const patterns = [
    /across (all|every) events?/,
    /organisation[- ]wide/,
    /all events in (the )?portfolio/,
    /compare (every|all) events/,
    /control tower/,
    /other event['']?s? (guests?|budgets?|data)/,
  ];
  for (const p of patterns) {
    if (p.test(lowered)) {
      return {
        refuse: true,
        handoff:
          "Organisation-wide and cross-event intelligence are handled by Executive Event Command / Control Tower. Atelier Command stays inside the selected event.",
      };
    }
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
