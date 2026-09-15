/** Deterministic Intelligence answers — domain-grounded, fixture posture; never authority. */
import type { PlatformSnapshot } from "../store.js";
import type { ContextBrokerProjection } from "./context.js";
import {
  resolveDomainIntelligence,
  resolveIntelligenceDomain,
  type DomainEvidenceBag,
} from "./domain-resolvers.js";
import type { RuntimePosture } from "./policy.js";

export type AtelierIntelligenceResult = {
  instruction: string;
  eventId: string;
  eventName?: string;
  organisationId: string;
  intent: "ANSWER" | "DIAGNOSE" | "RECOMMEND" | "EXPLAIN_BLOCK";
  domain: string;
  answer: string;
  supportingFacts: string[];
  assumptions: string[];
  recommendations: string[];
  limitations: string[];
  risksOrBlockers: string[];
  provenance: string[];
  availability: string;
  interpreterPosture: "FIXTURE";
  providersActive: boolean;
  productionAuthorised: boolean;
  /** Business / domain data mutation — always false for Intelligence. */
  businessDataChanged: false;
  /** Alias retained for older consumers; always false for Intelligence. */
  dataChanged: false;
  /** Atelier Command ledger/history recording may still occur for the instruction/receipt. */
  commandRecordSaved: true;
  completedAt: string;
};

export function buildIntelligenceResult(input: {
  toolName: string;
  instruction: string;
  organisationId: string;
  eventId: string;
  context: ContextBrokerProjection;
  posture: RuntimePosture;
  now: string;
  snap: PlatformSnapshot;
  evidence?: DomainEvidenceBag;
  taskDomain?: string;
}): AtelierIntelligenceResult {
  const lowered = input.instruction.toLowerCase();
  const domain = resolveIntelligenceDomain({
    toolName: input.toolName,
    instruction: input.instruction,
    taskDomain: input.taskDomain,
  });
  const intent: AtelierIntelligenceResult["intent"] =
    domain === "communications" &&
    /explain why sending|sending is blocked|why (is )?sending|communication.*(blocked|block)/.test(lowered)
      ? "EXPLAIN_BLOCK"
      : input.toolName === "intelligence.diagnose" || /diagnos|blocker|what (is|are) (wrong|blocking)/.test(lowered)
        ? "DIAGNOSE"
        : input.toolName === "intelligence.recommend" || /recommend|should i|options/.test(lowered)
          ? "RECOMMEND"
          : "ANSWER";

  const resolved = resolveDomainIntelligence({
    toolName: input.toolName,
    instruction: input.instruction,
    organisationId: input.organisationId,
    eventId: input.eventId,
    context: input.context,
    posture: input.posture,
    snap: input.snap,
    evidence: input.evidence,
    taskDomain: input.taskDomain,
  });

  const limitations = [
    ...resolved.limitations,
    "Answer is produced by the deterministic fixture interpreter while the model provider is inactive.",
    "Authority, permissions and mutations remain enforced by trusted application code — not by this text.",
    "Business event data was not changed; Atelier Command may still record instruction/receipt history.",
  ];

  return {
    instruction: input.instruction,
    eventId: input.eventId,
    eventName: input.context.scope.eventName,
    organisationId: input.organisationId,
    intent,
    domain: resolved.domain,
    answer: resolved.answer,
    supportingFacts: resolved.supportingFacts,
    assumptions: resolved.assumptions,
    recommendations: resolved.recommendations,
    limitations,
    risksOrBlockers: resolved.risksOrBlockers,
    provenance: resolved.provenance,
    availability: resolved.availability,
    interpreterPosture: "FIXTURE",
    providersActive: input.posture.providersActive,
    productionAuthorised: input.posture.productionAuthorised,
    businessDataChanged: false,
    dataChanged: false,
    commandRecordSaved: true,
    completedAt: input.now,
  };
}
