import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertMakerCheckerFor,
  assertProtectedHuman,
  assertSameEvent,
  assertSameOrganisation,
  bumpVersion,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import { parseRiskSchema } from "./risk-form-contract.js";
import { assertGovernedProtectionParty } from "./risk-protection-parties.js";
import {
  RiskRosterAssignmentSchema,
  RiskVendorAssessmentSchema,
  RiskVendorEvidenceSchema,
  type RiskRosterAssignment,
  type RiskVendorAssessment,
  type RiskVendorEvidence,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const PROTECTED_KEYS = ["ethnicity", "religion", "gender", "disability", "nationality", "neighbourhood", "tribe"];

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export const VENDOR_ASSESSMENT_MODEL = "s05b-vendor-model-v1";

export function computeVendorBand(indicators: RiskVendorAssessment["indicators"]): RiskVendorAssessment["band"] {
  if (indicators.some((item) => item.status === "UNKNOWN")) {
    if (indicators.every((item) => item.status === "UNKNOWN")) return "INDETERMINATE";
  }
  if (indicators.some((item) => item.key === "missing_required_evidence" && item.status === "CONCERN")) return "HEIGHTENED";
  const concerns = indicators.filter((item) => item.status === "CONCERN").length;
  if (concerns >= 3) return "CRITICAL";
  if (concerns === 2) return "HEIGHTENED";
  if (concerns === 1) return "MODERATE";
  if (indicators.some((item) => item.status === "UNKNOWN")) return "INDETERMINATE";
  return "LOWER";
}

export function assertNoProtectedIndicators(indicators: Array<{ key: string }>): void {
  if (indicators.some((item) => PROTECTED_KEYS.some((key) => item.key.toLowerCase().includes(key)))) {
    throw new PlatformError("VALIDATION_FAILED", "protected attributes and proxies cannot influence vendor assessment");
  }
}

export function recordVendorEvidenceOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    vendorId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    category: string;
    sourceLabel: string;
    observationDate: string;
    summary: string;
    verified: boolean;
    expiresOn?: string;
    documentId?: string;
  },
  now: string,
  actorPersonId: string,
): RiskVendorEvidence {
  envelope(input, input.organisationId, input.eventId);
  if (!input.verified && /allegation|rumour/i.test(input.summary)) {
    throw new PlatformError("VALIDATION_FAILED", "free-text allegations are not verified incidents");
  }
  const record = RiskVendorEvidenceSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    vendorId: input.vendorId,
    eventId: input.eventId,
    category: input.category,
    sourceLabel: input.sourceLabel,
    observationDate: input.observationDate,
    summary: input.summary,
    verified: input.verified,
    expiresOn: input.expiresOn,
    documentId: input.documentId,
    recordedByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskVendorEvidence.push(record);
  return record;
}

export function assessVendorOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    vendorId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    indicators?: RiskVendorAssessment["indicators"];
  },
  now: string,
  actorPersonId: string,
): RiskVendorAssessment {
  envelope(input, input.organisationId, input.eventId);
  assertGovernedProtectionParty(snap, input.organisationId, input.vendorId, "VENDOR");
  const evidence = snap.riskVendorEvidence.filter((item) => item.organisationId === input.organisationId && item.vendorId === input.vendorId);
  const missed = snap.riskCheckIns.filter((item) => item.organisationId === input.organisationId && item.response !== "CONFIRMED");
  const indicators = input.indicators ?? [
    {
      key: "missing_required_evidence",
      status: evidence.some((item) => item.verified) ? "POSITIVE" : "CONCERN",
      evidenceIds: evidence.map((item) => item.id).slice(0, 8),
      explanation: evidence.some((item) => item.verified) ? "Verified evidence is on file." : "Required evidence is missing or unverified.",
    },
    {
      key: "missed_checkpoint_rate",
      status: missed.length ? "CONCERN" : "NEUTRAL",
      evidenceIds: missed.map((item) => item.id).slice(0, 8),
      explanation: missed.length ? "Recent missed or at-risk check-ins exist." : "No missed check-in evidence in this file.",
    },
  ];
  assertNoProtectedIndicators(indicators);
  const band = computeVendorBand(indicators);
  const record = RiskVendorAssessmentSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    vendorId: input.vendorId,
    eventId: input.eventId,
    evidenceCutoff: now,
    modelEdition: VENDOR_ASSESSMENT_MODEL,
    indicators,
    band,
    recommendedControls: band === "LOWER" ? [] : ["Require updated evidence before standby engagement."],
    submittedByPersonId: actorPersonId,
    contentHash: exactHash({ indicators, band, model: VENDOR_ASSESSMENT_MODEL }),
    ...riskStamp(now),
  });
  snap.riskVendorAssessments.push(record);
  return record;
}

export function decideVendorAssessmentOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    assessmentId: string;
    decision: "APPROVED" | "RESTRICTED" | "DECLINED";
    reason: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskVendorAssessment {
  envelope(input, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  const assessment = snap.riskVendorAssessments.find((item) => item.id === input.assessmentId && item.organisationId === input.organisationId);
  if (!assessment) throw new PlatformError("NOT_FOUND", "vendor assessment not found");
  assertExpectedVersion(assessment.version, input.expectedVersion, "vendor assessment");
  assertMakerCheckerFor(snap, assessment.submittedByPersonId, actorPersonId, "decide vendor assessment", input.organisationId);
  Object.assign(
    assessment,
    RiskVendorAssessmentSchema.parse({
      ...assessment,
      humanDecision: input.decision,
      decisionReason: input.reason,
      decidedByPersonId: actorPersonId,
      ...bumpVersion(assessment, now),
    }),
  );
  return assessment;
}

export function assignRosterOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    vendorId: string;
    vendorLabel?: string;
    role: RiskRosterAssignment["role"];
    criticalFunctionKey: string;
    commercialStatus: RiskRosterAssignment["commercialStatus"];
    booked?: boolean;
    bookedAuthority?: string;
    availabilityWindow?: RiskRosterAssignment["availabilityWindow"];
    canonicalVendorAssignmentId?: string;
  },
  now: string,
  actorPersonId: string,
): RiskRosterAssignment {
  envelope(input, input.organisationId, input.eventId);
  const vendor = assertGovernedProtectionParty(snap, input.organisationId, input.vendorId, "VENDOR");
  if (input.booked && !input.bookedAuthority) {
    throw new PlatformError("VALIDATION_FAILED", "an assignment cannot be labelled booked without source authority");
  }
  const record = parseRiskSchema(RiskRosterAssignmentSchema, {
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    vendorId: input.vendorId,
    vendorLabel: input.vendorLabel?.trim() || vendor.label,
    canonicalVendorAssignmentId: input.canonicalVendorAssignmentId,
    role: input.role,
    criticalFunctionKey: input.criticalFunctionKey,
    availabilityWindow: input.availabilityWindow,
    readiness: "EVIDENCE_PENDING",
    commercialStatus: input.role === "STANDBY" ? "NOT_ENGAGED" : input.commercialStatus,
    booked: Boolean(input.booked),
    bookedAuthority: input.bookedAuthority,
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskRosterAssignments.push(record);
  return record;
}
