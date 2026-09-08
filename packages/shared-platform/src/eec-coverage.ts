import type { CoverageRequirement, CoverageState, PredicateAst } from "./eec-schemas.js";

export const SYNTHETIC_EVENT_TYPES = [
  "WEDDING",
  "CORPORATE",
  "PRIVATE_DINNER",
  "FUNERAL_MEMORIAL",
  "CHIEFTAINCY",
  "DESTINATION",
  "GENERIC",
] as const;

export function evaluatePredicate(predicate: PredicateAst, eventType?: string): boolean {
  switch (predicate.kind) {
    case "ALWAYS":
      return true;
    case "EVENT_TYPE_IN":
      return Boolean(eventType && predicate.values?.includes(eventType));
    case "AND":
      return (predicate.conditions ?? []).every((item) => evaluatePredicate(item as PredicateAst, eventType));
    case "OR":
      return (predicate.conditions ?? []).some((item) => evaluatePredicate(item as PredicateAst, eventType));
    default:
      return false;
  }
}

export function rankGap(
  requirement: CoverageRequirement,
  state: CoverageState,
  sessionFatigue: number,
): number {
  if (state === "CONFIRMED" || state === "NOT_APPLICABLE" || state === "NOT_YET_RELEVANT") return 0;
  const severity = requirement.omissionRisk === "HIGH" ? 3 : requirement.omissionRisk === "MEDIUM" ? 2 : 1;
  const urgency = requirement.latestSafePhase === "FIRST_CONTACT" ? 3 : requirement.latestSafePhase === "DISCOVERY" ? 2 : 1;
  const answerability = state === "UNASSESSED" || state === "UNKNOWN" ? 2 : 1;
  const fatiguePenalty = Math.min(2, Math.max(0, sessionFatigue));
  return severity * 10 + urgency * 3 + answerability - fatiguePenalty;
}

export function completenessDimensions(states: readonly CoverageState[]): {
  known: number;
  unknown: number;
  conflicted: number;
  stale: number;
  deferred: number;
} {
  return {
    known: states.filter((state) => state === "CONFIRMED" || state === "ANSWERED_UNCONFIRMED").length,
    unknown: states.filter((state) => state === "UNKNOWN" || state === "UNASSESSED").length,
    conflicted: states.filter((state) => state === "CONFLICTED").length,
    stale: states.filter((state) => state === "STALE").length,
    deferred: states.filter((state) => state === "NOT_YET_RELEVANT" || state === "NOT_APPLICABLE").length,
  };
}
