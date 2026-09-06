import type { ContactCorrectionReview } from "@maison-doclar/shared-platform";
import { channelLabel, formatOperationalTimestamp, governedRoleLabel } from "./comms-display";

const MAKER_CHECKER_EXPLANATION = "A different authorised person must review this correction.";
const LEGACY_MAKER_COPY = "Proposer unavailable — this historical correction cannot be decided.";
const EVIDENCE_LINK_LABEL = "Review linked inbound message";

export type CorrectionEvidencePresentation =
  | { state: "AVAILABLE"; href: string; linkLabel: typeof EVIDENCE_LINK_LABEL }
  | { state: "NOT_LINKED"; message: "No inbound message was linked to this proposal." }
  | { state: "UNAVAILABLE"; message: "The linked source is no longer available." }
  | { state: "REDACTED"; message: "The linked source is restricted." };

export type CorrectionMakerPresentation =
  | {
      state: "AVAILABLE";
      displayName: string;
      roleLabel: string;
      proposedAtLabel: string;
      explanation: typeof MAKER_CHECKER_EXPLANATION;
    }
  | { state: "UNAVAILABLE"; message: typeof LEGACY_MAKER_COPY };

export type CorrectionDecisionPresentation =
  | { state: "PENDING" }
  | { state: "RECORDED"; displayName: string; decidedAtLabel: string };

export type CorrectionReviewPresentation = {
  id: string;
  expectedVersion: number;
  statusLabel: string;
  guestDisplayName: string;
  channelLabel: string;
  existingValue: string;
  proposedValue: string;
  reason: string;
  maker: CorrectionMakerPresentation;
  evidence: CorrectionEvidencePresentation;
  decision: CorrectionDecisionPresentation;
  decidable: boolean;
  alreadyDecided: boolean;
  decisionClosedCopy?: string;
};

function correctionStatusLabel(status: ContactCorrectionReview["status"]): string {
  switch (status) {
    case "PROPOSED":
      return "Proposed";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "APPLIED":
      return "Applied";
    case "SUPERSEDED":
      return "Superseded";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function isAuthorisedEvidencePath(eventId: string, reviewPath: string): boolean {
  if (reviewPath.includes("://") || reviewPath.includes("\\") || reviewPath.includes("..")) {
    return false;
  }
  const unmatched = `/app/events/${eventId}/communications/unmatched`;
  const inboxPrefix = `/app/events/${eventId}/communications/inbox/`;
  if (reviewPath === unmatched) return true;
  if (!reviewPath.startsWith(inboxPrefix)) return false;
  const rest = reviewPath.slice(inboxPrefix.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rest);
}

export function presentSourceEvidence(
  eventId: string,
  evidence: ContactCorrectionReview["sourceEvidence"],
): CorrectionEvidencePresentation {
  switch (evidence.state) {
    case "AVAILABLE": {
      if (!isAuthorisedEvidencePath(eventId, evidence.reviewPath)) {
        return { state: "UNAVAILABLE", message: "The linked source is no longer available." };
      }
      const separator = evidence.reviewPath.includes("?") ? "&" : "?";
      return {
        state: "AVAILABLE",
        href: `${evidence.reviewPath}${separator}from=corrections`,
        linkLabel: EVIDENCE_LINK_LABEL,
      };
    }
    case "NOT_LINKED":
      return { state: "NOT_LINKED", message: "No inbound message was linked to this proposal." };
    case "UNAVAILABLE":
      return { state: "UNAVAILABLE", message: "The linked source is no longer available." };
    case "REDACTED":
      return { state: "REDACTED", message: "The linked source is restricted." };
    default: {
      const _exhaustive: never = evidence;
      return _exhaustive;
    }
  }
}

function presentMaker(review: ContactCorrectionReview): CorrectionMakerPresentation {
  switch (review.maker.state) {
    case "AVAILABLE":
      return {
        state: "AVAILABLE",
        displayName: review.maker.displayName,
        roleLabel: governedRoleLabel(review.maker.roleKey),
        proposedAtLabel: formatOperationalTimestamp(review.proposedAt),
        explanation: MAKER_CHECKER_EXPLANATION,
      };
    case "UNAVAILABLE":
      return { state: "UNAVAILABLE", message: LEGACY_MAKER_COPY };
    default: {
      const _exhaustive: never = review.maker;
      return _exhaustive;
    }
  }
}

function presentDecision(review: ContactCorrectionReview): CorrectionDecisionPresentation {
  switch (review.decision.state) {
    case "RECORDED":
      return {
        state: "RECORDED",
        displayName: review.decision.displayName,
        decidedAtLabel: formatOperationalTimestamp(review.decision.decidedAt),
      };
    case "PENDING":
      return { state: "PENDING" };
    default: {
      const _exhaustive: never = review.decision;
      return _exhaustive;
    }
  }
}

function decisionClosedCopy(status: ContactCorrectionReview["status"]): string | undefined {
  switch (status) {
    case "APPLIED":
      return "This correction has already been decided. Canonical contact information was updated through guest amend.";
    case "REJECTED":
      return "This correction has already been decided. Canonical contact information was left unchanged.";
    case "APPROVED":
    case "SUPERSEDED":
      return "This correction has already been decided.";
    case "PROPOSED":
      return undefined;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Server-side serialisable adapter. Consumes the governed review projection only. */
export function presentCorrectionReview(review: ContactCorrectionReview): CorrectionReviewPresentation {
  const maker = presentMaker(review);
  const alreadyDecided = review.status !== "PROPOSED";
  const decidable = review.status === "PROPOSED" && maker.state === "AVAILABLE";
  return {
    id: review.id,
    expectedVersion: review.version,
    statusLabel: correctionStatusLabel(review.status),
    guestDisplayName: review.guestDisplayName,
    channelLabel: channelLabel(review.channel),
    existingValue: review.existingValue?.trim() ? review.existingValue : "None on record",
    proposedValue: review.proposedValue,
    reason: review.reason,
    maker,
    evidence: presentSourceEvidence(review.eventId, review.sourceEvidence),
    decision: presentDecision(review),
    decidable,
    alreadyDecided,
    ...(decisionClosedCopy(review.status) ? { decisionClosedCopy: decisionClosedCopy(review.status) } : {}),
  };
}

export function correctionDecisionStatusCopy(status: string | undefined): string | undefined {
  if (status === "applied") {
    return "The correction was applied through guest amend. Canonical contact information now matches the proposed value.";
  }
  if (status === "rejected") {
    return "The correction was rejected. Canonical contact information is unchanged.";
  }
  return undefined;
}
