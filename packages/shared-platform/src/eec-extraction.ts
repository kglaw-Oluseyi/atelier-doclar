import { PlatformError } from "./errors.js";
import type { CandidateAssertionProposal, SourceSegment } from "./eec-schemas.js";
import { nfc } from "./eec-hash.js";

const INJECTION_MARKERS = [/ignore (all|previous) instructions/i, /system prompt/i, /<script/i, /javascript:/i];

export function sanitiseInertText(raw: string): string {
  return nfc(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFixtureProposals(segments: readonly SourceSegment[]): CandidateAssertionProposal[] {
  const proposals: CandidateAssertionProposal[] = [];
  for (const segment of segments) {
    const text = sanitiseInertText(segment.text);
    if (INJECTION_MARKERS.some((marker) => marker.test(text))) {
      continue;
    }
    const guestMatch = text.match(/\b(\d{2,4})\s+(guests?|invitees)\b/i);
    if (guestMatch) {
      proposals.push({
        kind: "FACT",
        topicKey: "guest.target_count",
        value: { count: guestMatch[1], unit: "guests" },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a guest count.",
        sensitivity: "STANDARD",
      });
    }
    const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      proposals.push({
        kind: "FACT",
        topicKey: "event.date",
        value: { date: dateMatch[1] },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names an event date.",
        sensitivity: "STANDARD",
      });
    }
    const preferNot = /prefer not to answer|not decided|not applicable/i.test(text);
    if (preferNot && /budget|envelope|investment/i.test(text)) {
      proposals.push({
        kind: "UNKNOWN",
        topicKey: "investment.envelope",
        value: { status: "PREFER_NOT_TO_ANSWER" },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The speaker declined to disclose an envelope.",
        sensitivity: "FINANCIAL",
      });
    }
  }
  return proposals;
}

export function assertProposalSupported(
  proposal: CandidateAssertionProposal,
  segments: readonly SourceSegment[],
  engagementId: string,
  organisationId: string,
): void {
  if (proposal.sourceSegmentIds.length === 0) {
    throw new PlatformError("VALIDATION_FAILED", "unsupported assertion rejected: no source segments");
  }
  for (const segmentId of proposal.sourceSegmentIds) {
    const segment = segments.find((item) => item.id === segmentId);
    if (!segment || segment.engagementId !== engagementId || segment.organisationId !== organisationId) {
      throw new PlatformError("VALIDATION_FAILED", "citation lies outside the actor projection");
    }
    const haystack = sanitiseInertText(segment.text).toLowerCase();
    if (proposal.topicKey === "guest.target_count") {
      const count = String((proposal.value as { count?: string })?.count ?? "");
      if (!count || !haystack.includes(count)) {
        throw new PlatformError("VALIDATION_FAILED", "unsupported assertion rejected: citation does not support the proposal");
      }
    }
    if (proposal.topicKey === "event.date") {
      const date = String((proposal.value as { date?: string })?.date ?? "");
      if (!date || !haystack.includes(date)) {
        throw new PlatformError("VALIDATION_FAILED", "unsupported assertion rejected: citation does not support the proposal");
      }
    }
  }
  if (INJECTION_MARKERS.some((marker) => marker.test(String(proposal.rationale)))) {
    throw new PlatformError("VALIDATION_FAILED", "prompt injection rejected");
  }
}
