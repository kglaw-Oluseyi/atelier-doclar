/** Deterministic Intelligence answers — fixture posture; never authority. */
import type { ContextBrokerProjection } from "./context.js";
import type { RuntimePosture } from "./policy.js";

export type AtelierIntelligenceResult = {
  instruction: string;
  eventId: string;
  eventName?: string;
  organisationId: string;
  intent: "ANSWER" | "DIAGNOSE" | "RECOMMEND" | "EXPLAIN_BLOCK";
  answer: string;
  supportingFacts: string[];
  assumptions: string[];
  recommendations: string[];
  limitations: string[];
  interpreterPosture: "FIXTURE";
  providersActive: boolean;
  productionAuthorised: boolean;
  dataChanged: false;
  completedAt: string;
};

function factsFromContext(context: ContextBrokerProjection): string[] {
  return context.knowledge
    .filter((item) => item.epistemicClass === "CONFIRMED_FACT" || item.epistemicClass === "DERIVED")
    .map((item) => item.statement);
}

function assumptionsFromContext(context: ContextBrokerProjection): string[] {
  return context.knowledge
    .filter((item) => item.epistemicClass === "ASSUMPTION" || item.epistemicClass === "UNKNOWN")
    .map((item) => item.statement);
}

export function buildIntelligenceResult(input: {
  toolName: string;
  instruction: string;
  organisationId: string;
  eventId: string;
  context: ContextBrokerProjection;
  posture: RuntimePosture;
  now: string;
}): AtelierIntelligenceResult {
  const eventName = input.context.scope.eventName;
  const supportingFacts = factsFromContext(input.context);
  const assumptions = assumptionsFromContext(input.context);
  const lowered = input.instruction.toLowerCase();
  const intent: AtelierIntelligenceResult["intent"] =
    input.toolName === "intelligence.diagnose" || /diagnos|blocker|wrong|blocking/.test(lowered)
      ? "DIAGNOSE"
      : input.toolName === "intelligence.recommend" || /recommend|should i|options/.test(lowered)
        ? "RECOMMEND"
        : /sending is blocked|why .*send|communication.*block|explain why sending/.test(lowered)
          ? "EXPLAIN_BLOCK"
          : "ANSWER";

  let answer: string;
  let recommendations: string[] = [];
  const limitations = [
    "Answer is produced by the deterministic fixture interpreter while the model provider is inactive.",
    "Authority, permissions and mutations remain enforced by trusted application code — not by this text.",
  ];

  if (intent === "EXPLAIN_BLOCK") {
    answer = [
      `Sending communications for ${eventName ?? "the selected event"} is blocked under the current runtime posture.`,
      `productionAuthorised is ${String(input.posture.productionAuthorised)} and providersActive is ${String(input.posture.providersActive)}.`,
      "External-effect tools (R4), including communication.sendApproved, cannot perform a real send until production is authorised and the communications provider is active.",
      "Drafting or explaining remains permitted as a preparatory / read-only action inside this event only.",
    ].join(" ");
    recommendations = [
      "Use Task Bank task “Draft event update” or “Submit communication for approval” for preparatory work.",
      "Do not use “Send an approved communication…” unless production authorisation and provider posture change under separate authority.",
    ];
    limitations.push("This explanation is not a send, draft mutation, or provider activation.");
  } else if (intent === "DIAGNOSE") {
    const gaps = [
      ...assumptions,
      ...input.context.contradictions.map((c) => `Contradiction signal: ${c}`),
    ];
    answer = [
      `Diagnosis for ${eventName ?? input.eventId}:`,
      gaps.length
        ? `Current readiness gaps and signals — ${gaps.join(" ")}`
        : "No material contradiction signals were present in the authorised event projection.",
      supportingFacts[0] ? `Grounding: ${supportingFacts[0]}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    recommendations = [
      "Resolve missing brief or guest information before consequential seating or communications work.",
      "Re-run this diagnosis after publishing an updated brief edition.",
    ];
  } else if (intent === "RECOMMEND") {
    answer = [
      `Recommended next decisions for ${eventName ?? input.eventId} stay inside this event’s authorised scope.`,
      supportingFacts[0] ?? "Event facts are limited in the current projection.",
      "Prefer native governed commands with plan preview over browser assistance.",
    ].join(" ");
    recommendations = [
      "Confirm seating authority and input readiness before launching a seating run.",
      "Keep investment and roadmap decisions maker-checker separated where risk is R3+.",
    ];
  } else if (/status|readiness|missing information|gaps/.test(lowered)) {
    answer = [
      `Status for ${eventName ?? input.eventId}:`,
      supportingFacts.join(" ") || "Limited confirmed facts are available in the authorised projection.",
      assumptions.length ? `Open assumptions — ${assumptions.join(" ")}` : "No open assumptions were listed.",
    ].join(" ");
    recommendations = [
      "Close discovery gaps before treating guest or seating counts as final.",
      "Use Task Bank readiness tasks for seating, guests and communications when preparing work.",
    ];
  } else if (/seat|authority|layout/.test(lowered)) {
    answer = [
      `Seating authority for ${eventName ?? input.eventId} is explained only from this event’s authorised seating records.`,
      supportingFacts.find((f) => /guest/i.test(f)) ?? supportingFacts[0] ?? "Guest and layout inputs should be verified before binding.",
    ].join(" ");
    recommendations = ["Open the seating workspace for the same event to inspect authoritative plan state."];
  } else {
    answer = [
      `For ${eventName ?? input.eventId}: ${input.instruction.trim()}`,
      supportingFacts.slice(0, 3).join(" ") || "Authorised event facts were insufficient for a deeper answer.",
    ].join(" — ");
    recommendations = ["Ask a more specific question about investment, roadmap, guests, seating or communications inside this event."];
  }

  return {
    instruction: input.instruction,
    eventId: input.eventId,
    eventName,
    organisationId: input.organisationId,
    intent,
    answer,
    supportingFacts,
    assumptions,
    recommendations,
    limitations,
    interpreterPosture: "FIXTURE",
    providersActive: input.posture.providersActive,
    productionAuthorised: input.posture.productionAuthorised,
    dataChanged: false,
    completedAt: input.now,
  };
}
