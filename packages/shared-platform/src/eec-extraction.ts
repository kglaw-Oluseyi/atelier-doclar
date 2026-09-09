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

function wordNumber(value: string): string {
  const lookup: Record<string, string> = { two: "2", three: "3", twelve: "12" };
  return lookup[value.toLowerCase()] ?? value;
}

export function extractGuestCountCandidates(text: string): Array<{ count: string; approximation: boolean }> {
  const found = new Map<string, { count: string; approximation: boolean }>();
  const add = (count: string | undefined, approximation: boolean) => {
    if (!count || !/^\d{2,4}$/.test(count)) return;
    const existing = found.get(count);
    if (!existing) found.set(count, { count, approximation });
  };
  for (const match of text.matchAll(/\b(?:approximately|around|about|roughly|closer to)\s+(\d{2,4})\s+(?:guests?|invitees|people)\b/gi)) {
    add(match[1], true);
  }
  for (const match of text.matchAll(/\b(\d{2,4})\s+(?:guests?|invitees)\b/gi)) {
    add(match[1], false);
  }
  const rather = text.match(
    /guest count[^.]*?\b(?:around|approximately|about)?\s*(\d{2,4})\b[^.]*?\brather than\s+(\d{2,4})\b/i,
  );
  if (rather) {
    add(rather[1], true);
    add(rather[2], false);
  }
  const preference = text.match(/\b(\d{2,4})\s+is the current preference[^.]*?\b(\d{2,4})\s+is another principal/i);
  if (preference) {
    add(preference[1], false);
    add(preference[2], false);
  }
  return [...found.values()];
}

export function extractFixtureProposals(segments: readonly SourceSegment[]): CandidateAssertionProposal[] {
  const proposals: CandidateAssertionProposal[] = [];
  for (const segment of segments) {
    const text = sanitiseInertText(segment.text);
    if (INJECTION_MARKERS.some((marker) => marker.test(text))) {
      continue;
    }
    const ceremonyGuest = text.match(/\b(traditional ceremony|reception)\b[^.]*?\b(\d{2,4})\s+(guests?|invitees)\b/i);
    if (ceremonyGuest) {
      const scope = /traditional/i.test(ceremonyGuest[1] ?? "") ? "traditional" : "reception";
      proposals.push({
        kind: "FACT",
        topicKey: `programme.ceremony.${scope}`,
        value: { ceremony: scope, count: ceremonyGuest[2], unit: "guests" },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a ceremony-scoped guest count.",
        sensitivity: "STANDARD",
      });
    } else {
      for (const guest of extractGuestCountCandidates(text)) {
        proposals.push({
          kind: "FACT",
          topicKey: "guest.target_count",
          value: { count: guest.count, unit: "guests" },
          sourceSegmentIds: [segment.id],
          directness: "DIRECT_STATEMENT",
          confidence: guest.approximation ? "MEDIUM" : "HIGH",
          rationale: guest.approximation
            ? `The source names an approximate guest count of ${guest.count}.`
            : `The source names a guest count of ${guest.count}.`,
          sensitivity: "STANDARD",
        });
      }
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
    const locationMatch = text.match(/\bin ([A-ZÀ-ÖØ-öø-ÿ][\p{L}'-]*)\b/u);
    if (locationMatch && !/guests|ceremon/i.test(locationMatch[1] ?? "")) {
      proposals.push({
        kind: "FACT",
        topicKey: "event.location",
        value: { place: locationMatch[1] },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a location.",
        sensitivity: "STANDARD",
      });
    }
    const ceremonyCount = text.match(/\b(\d+|two|three)\s+ceremon(?:y|ies)\b/i);
    if (ceremonyCount) {
      proposals.push({
        kind: "FACT",
        topicKey: "programme.ceremonies",
        value: { count: wordNumber(ceremonyCount[1] ?? "") },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names distinct ceremonies.",
        sensitivity: "STANDARD",
      });
    }
    const brandMatch = text.match(/\bbrand\s+([A-Za-z0-9][A-Za-z0-9 '-]{0,40})/i);
    if (brandMatch) {
      proposals.push({
        kind: "FACT",
        topicKey: "corporate.brand",
        value: { brand: brandMatch[1]?.trim() },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a brand.",
        sensitivity: "STANDARD",
      });
    }
    if (/\b(AV|audio[- ]visual|production technology)\b/i.test(text)) {
      proposals.push({
        kind: "CONSTRAINT",
        topicKey: "production.technology",
        value: { required: true },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a production requirement.",
        sensitivity: "STANDARD",
      });
    }
    if (/\b(confidential|private residence|surprise)\b/i.test(text)) {
      proposals.push({
        kind: "CONSTRAINT",
        topicKey: "privacy.surprise",
        value: { confidential: true },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names a confidentiality requirement.",
        sensitivity: "CONFIDENTIAL_SURPRISE",
      });
    }
    if (/\b(travel|accommodation|local supplier)\b/i.test(text)) {
      proposals.push({
        kind: "PREFERENCE",
        topicKey: "travel.stay",
        value: { required: true },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names travel or stay requirements.",
        sensitivity: "STANDARD",
      });
    }
    if (/\bstep-free access|accessibility\b/i.test(text)) {
      proposals.push({
        kind: "CONSTRAINT",
        topicKey: "access.health",
        value: { stepFree: true },
        sourceSegmentIds: [segment.id],
        directness: "DIRECT_STATEMENT",
        confidence: "HIGH",
        rationale: "The source names an accessibility requirement.",
        sensitivity: "ACCESSIBILITY_HEALTH",
      });
    }
    const preferNot = /prefer not to answer|not decided|not applicable/i.test(text);
    if (preferNot && /budget|envelope|investment/i.test(text)) {
      proposals.push({
        kind: "UNKNOWN",
        topicKey: "investment.envelope",
        value: { status: /prefer not/i.test(text) ? "PREFER_NOT_TO_ANSWER" : "NOT_DECIDED" },
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
    if (proposal.topicKey === "event.location") {
      const place = String((proposal.value as { place?: string })?.place ?? "").toLowerCase();
      if (!place || !haystack.includes(place)) {
        throw new PlatformError("VALIDATION_FAILED", "unsupported assertion rejected: citation does not support the proposal");
      }
    }
    if (proposal.topicKey.startsWith("programme.ceremony.")) {
      const count = String((proposal.value as { count?: string })?.count ?? "");
      if (!count || !haystack.includes(count)) {
        throw new PlatformError("VALIDATION_FAILED", "unsupported assertion rejected: citation does not support the proposal");
      }
    }
  }
  if (INJECTION_MARKERS.some((marker) => marker.test(String(proposal.rationale)))) {
    throw new PlatformError("VALIDATION_FAILED", "prompt injection rejected");
  }
}
