import { exactHash } from "./eec-hash.js";
import type { Applicability } from "./risk-applicability.js";
import type { RiskGapFinding, RiskPolicyEdition, RiskResidualDecision } from "./risk-schemas.js";

export type CoverageMatch = {
  requirementKey: string;
  matched: boolean;
  partial: boolean;
  unknown: boolean;
  reasons: string[];
  policyEditionId?: string;
};

export function matchCoverage(requirement: Applicability, policies: readonly RiskPolicyEdition[], eventStart?: string, eventEnd?: string): CoverageMatch {
  if (requirement.decision !== "APPLIES") {
    return {
      requirementKey: requirement.requirementKey,
      matched: false,
      partial: false,
      unknown: requirement.decision === "INDETERMINATE",
      reasons: [requirement.decision],
    };
  }
  const policy = policies.find((item) => item.id === requirement.policyEditionId);
  if (!policy) {
    return {
      requirementKey: requirement.requirementKey,
      matched: false,
      partial: false,
      unknown: false,
      reasons: ["MISSING_POLICY_OR_CERTIFICATE"],
    };
  }
  const reasons: string[] = [];
  if (policy.verificationState !== "VERIFIED") reasons.push("UNVERIFIED_DOCUMENT");
  if (eventStart && policy.period.endOn < eventStart) reasons.push("EXPIRED_OR_EXPIRING");
  if (eventEnd && policy.period.startOn > eventEnd) reasons.push("EVENT_VENUE_ACTIVITY_NOT_EVIDENCED");
  if (!policy.limits.length) reasons.push("INSUFFICIENT_OR_INDETERMINATE_LIMIT");
  if (policy.exclusionNotes) reasons.push("EXCLUSION_REQUIRING_REVIEW");
  return {
    requirementKey: requirement.requirementKey,
    matched: reasons.length === 0,
    partial: reasons.length > 0 && policy.verificationState === "VERIFIED",
    unknown: false,
    reasons,
    policyEditionId: policy.id,
  };
}

export function gapIdentity(eventId: string, snapshotHash: string, requirementKey: string, affected: readonly string[]): string {
  return exactHash({ eventId, snapshotHash, requirementKey, affected: [...affected].sort() });
}

export function taxonomyForReasons(reasons: readonly string[]): RiskGapFinding["taxonomy"] {
  const order: RiskGapFinding["taxonomy"][] = [
    "MISSING_POLICY_OR_CERTIFICATE",
    "UNVERIFIED_DOCUMENT",
    "EXPIRED_OR_EXPIRING",
    "INSUFFICIENT_OR_INDETERMINATE_LIMIT",
    "EVENT_VENUE_ACTIVITY_NOT_EVIDENCED",
    "PARTY_NAME_MISMATCH",
    "ASSET_OR_TRANSIT_SCOPE_MISMATCH",
    "EXCLUSION_REQUIRING_REVIEW",
    "RULE_OR_SOURCE_STALE",
    "EVIDENCE_INACCESSIBLE",
    "DUPLICATE_OR_CONFLICTING_CERTIFICATE",
  ];
  return order.find((item) => reasons.includes(item)) ?? "MISSING_POLICY_OR_CERTIFICATE";
}

export function inheritResidualDecision(
  previous: RiskResidualDecision | undefined,
  snapshotHash: string,
): RiskResidualDecision | undefined {
  if (!previous || previous.status !== "APPROVED") return undefined;
  if (previous.snapshotHash !== snapshotHash) return undefined;
  return previous;
}
