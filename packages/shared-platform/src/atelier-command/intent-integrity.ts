/** Trusted intent/effect compatibility — server-side; never authorised by model output. */
import { getAtelierTool } from "./tools.js";

export type RequestedEffectClass =
  | "READ"
  | "RETRIEVE"
  | "SIMULATE"
  | "MUTATE"
  | "EXTERNAL_WRITE"
  | "EXTERNAL_PAYMENT"
  | "EXTERNAL_SEND"
  | "APPROVE"
  | "PUBLISH"
  | "UNKNOWN";

export type IntentCompatibility = {
  requestedOutcome: string;
  requestedTarget: string | null;
  requestedOperation: string;
  requestedEffectClass: RequestedEffectClass;
  requestedEventId: string;
  matchedToolName: string | null;
  supportedPortion: string | null;
  unsupportedPortion: string | null;
  refusedPortion: string | null;
  materialSemanticDifferences: string[];
  decision: "ALLOW" | "REFUSE";
  refuseReason?: string;
};

const PAYMENT = /\b(pay|payment|purchase|buy|checkout|invoice payment|stripe|card charge|remit)\b/i;
const EXTERNAL_WRITE =
  /\b(submit|post|upload|write to|update on|book|reserve|confirm (a |the )?booking|create on|delete on)\b/i;
const REAL_EXTERNAL =
  /\b(real (payment|send|submission|external)|live (payment|send)|not (a )?simulation|actual (payment|send|write)|production (payment|send))\b/i;
const SEND = /\b(send\b.*(message|communication|email|sms)|outbound (message|communication))\b/i;
const APPROVE = /\b(approve|authorise|authorize)\b/i;
const PUBLISH = /\b(publish|release (the )?plan)\b/i;
const RETRIEVE = /\b(retrieve|download|fetch|get (the )?(document|pdf|file)|floor plan)\b/i;
const NON_ALLOWLIST =
  /\b(not on (our |the )?approved|non[- ]allowlisted|unapproved (portal|vendor|site)|outside (the )?allowlist)\b/i;
const EXTERNAL_VENDOR = /\b(external vendor|vendor site|third[- ]party (site|portal)|http(s)?:\/\/)\b/i;

export function classifyRequestedEffect(rawText: string): {
  effect: RequestedEffectClass;
  operation: string;
  target: string | null;
} {
  const text = rawText.trim();
  const url = text.match(/https?:\/\/[^\s)]+/i)?.[0] ?? null;
  const target =
    url ??
    (EXTERNAL_VENDOR.test(text) ? "external-vendor-or-non-allowlisted-target" : null) ??
    (/\bportal\b/i.test(text) ? "portal" : null);

  if (PAYMENT.test(text) || /payment confirmation/i.test(text)) {
    return { effect: "EXTERNAL_PAYMENT", operation: "pay/purchase", target };
  }
  if (SEND.test(text)) {
    return { effect: "EXTERNAL_SEND", operation: "send-communication", target };
  }
  if (PUBLISH.test(text)) {
    return { effect: "PUBLISH", operation: "publish", target };
  }
  if (APPROVE.test(text) && /plan|publication|binding/i.test(text)) {
    return { effect: "APPROVE", operation: "approve", target };
  }
  if (REAL_EXTERNAL.test(text) || (EXTERNAL_WRITE.test(text) && (EXTERNAL_VENDOR.test(text) || NON_ALLOWLIST.test(text)))) {
    return { effect: "EXTERNAL_WRITE", operation: "external-write/submit", target };
  }
  if (EXTERNAL_WRITE.test(text) && /portal|browser|vendor/i.test(text)) {
    return { effect: "EXTERNAL_WRITE", operation: "external-write/submit", target };
  }
  if (RETRIEVE.test(text) || (/portal|venue document/i.test(text) && /download|retrieve|pdf|document/i.test(text))) {
    return { effect: "RETRIEVE", operation: "retrieve-document", target: target ?? "approved-portal" };
  }
  if (/browser simulation|simulated browser/i.test(text)) {
    return { effect: "SIMULATE", operation: "explain-simulation", target: null };
  }
  return { effect: "READ", operation: "read/diagnose", target: null };
}

function toolSatisfiesEffect(toolName: string, effect: RequestedEffectClass): boolean {
  const tool = getAtelierTool(toolName);
  if (!tool) return false;
  if (effect === "EXTERNAL_PAYMENT" || effect === "EXTERNAL_WRITE") {
    return false; // no tool may silently satisfy real payment/external write under current posture
  }
  if (effect === "EXTERNAL_SEND") {
    return toolName === "communication.sendApproved";
  }
  if (effect === "PUBLISH" || effect === "APPROVE") {
    return false; // free-text cannot silently map to consequential publish/approve
  }
  if (effect === "RETRIEVE") {
    return toolName === "browser.retrieveDocument" || toolName.startsWith("intelligence.");
  }
  if (effect === "SIMULATE") {
    return toolName.startsWith("intelligence.") || tool.route === "BROWSER";
  }
  // READ / UNKNOWN / MUTATE residual — browser retrieve only for read-class.
  if (tool.route === "BROWSER" && toolName === "browser.retrieveDocument") {
    return effect === "READ" || effect === "UNKNOWN";
  }
  return true;
}

/**
 * Validate that selected tools are semantically compatible with the requested operation/effect.
 * Model/interpreter output cannot authorise the match — this is trusted server code.
 */
export function assessIntentCompatibility(input: {
  rawText: string;
  eventId: string;
  toolNames: string[];
  forcedTools?: boolean;
}): IntentCompatibility {
  const classified = classifyRequestedEffect(input.rawText);
  const matchedToolName = input.toolNames[0] ?? null;
  const differences: string[] = [];

  // Prompt claims of lower risk / already approved cannot change classification.
  if (/\b(r0|already approved|treat as low risk|without further checks)\b/i.test(input.rawText)) {
    differences.push("Prompt language claiming lower risk or prior approval is ignored for classification.");
  }

  if (
    classified.effect === "EXTERNAL_PAYMENT" ||
    classified.effect === "EXTERNAL_WRITE" ||
    (NON_ALLOWLIST.test(input.rawText) && (PAYMENT.test(input.rawText) || EXTERNAL_WRITE.test(input.rawText) || REAL_EXTERNAL.test(input.rawText)))
  ) {
    return {
      requestedOutcome: input.rawText.trim().slice(0, 500),
      requestedTarget: classified.target,
      requestedOperation: classified.operation,
      requestedEffectClass: classified.effect,
      requestedEventId: input.eventId,
      matchedToolName: null,
      supportedPortion: null,
      unsupportedPortion: `Requested ${classified.operation} against ${classified.target ?? "an external target"} is unsupported under current Atelier Command posture.`,
      refusedPortion: "Real payment / non-allowlisted external write / real external effect.",
      materialSemanticDifferences: [
        ...differences,
        "A read/retrieve or simulated browser tool cannot satisfy a real payment or external-write intent.",
      ],
      decision: "REFUSE",
      refuseReason:
        "Unsupported or disallowed external effect: real payment / non-allowlisted external write cannot be fulfilled. No executable plan was created. Use an authorised native workflow or Control Tower handoff when such effects are separately authorised.",
    };
  }

  if (matchedToolName && !toolSatisfiesEffect(matchedToolName, classified.effect)) {
    return {
      requestedOutcome: input.rawText.trim().slice(0, 500),
      requestedTarget: classified.target,
      requestedOperation: classified.operation,
      requestedEffectClass: classified.effect,
      requestedEventId: input.eventId,
      matchedToolName,
      supportedPortion: null,
      unsupportedPortion: `Selected tool ${matchedToolName} is not semantically compatible with requested ${classified.operation}.`,
      refusedPortion: classified.operation,
      materialSemanticDifferences: [
        ...differences,
        `Incompatible mapping: ${classified.operation} → ${matchedToolName}`,
      ],
      decision: "REFUSE",
      refuseReason: `Intent refused: ${matchedToolName} cannot satisfy requested ${classified.operation}. No substitute executable step was authorised.`,
    };
  }

  // Forced Task Bank tools: still refuse if free-text (when present on invoke) claims real payment — invoke uses task default text.
  if (input.forcedTools && matchedToolName === "browser.retrieveDocument" && PAYMENT.test(input.rawText)) {
    return {
      requestedOutcome: input.rawText.trim().slice(0, 500),
      requestedTarget: classified.target,
      requestedOperation: classified.operation,
      requestedEffectClass: "EXTERNAL_PAYMENT",
      requestedEventId: input.eventId,
      matchedToolName,
      supportedPortion: null,
      unsupportedPortion: "Payment intent cannot ride on retrieve-document.",
      refusedPortion: "payment",
      materialSemanticDifferences: differences,
      decision: "REFUSE",
      refuseReason: "Payment intent cannot be fulfilled by browser.retrieveDocument.",
    };
  }

  return {
    requestedOutcome: input.rawText.trim().slice(0, 500),
    requestedTarget: classified.target,
    requestedOperation: classified.operation,
    requestedEffectClass: classified.effect,
    requestedEventId: input.eventId,
    matchedToolName,
    supportedPortion: matchedToolName ? `Compatible tool ${matchedToolName} for ${classified.operation}` : null,
    unsupportedPortion: null,
    refusedPortion: null,
    materialSemanticDifferences: differences,
    decision: "ALLOW",
  };
}

export const PLAN_TERMINAL_STATUSES = [
  "COMPLETED",
  "BLOCKED",
  "REFUSED",
  "CANCELLED",
  "SUPERSEDED",
  "FAILED",
  "REJECTED",
  "STALE",
] as const;

export function isPlanTerminal(status: string): boolean {
  return (PLAN_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export const STEP_TERMINAL_STATUSES = [
  "SUCCEEDED",
  "BLOCKED",
  "REFUSED",
  "CANCELLED",
  "SUPERSEDED",
  "FAILED",
  "REPLAYED",
  "SKIPPED",
] as const;

export function isStepTerminal(status: string): boolean {
  return (STEP_TERMINAL_STATUSES as readonly string[]).includes(status);
}
