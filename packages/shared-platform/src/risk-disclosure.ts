import {
  RISK_DISCLOSURE_CLASSES,
  type RiskDossierEdition,
  type RiskIncidentNote,
  type RiskPolicyEdition,
  type RiskVendorAssessment,
} from "./risk-schemas.js";

export type RiskDisclosureClassName = (typeof RISK_DISCLOSURE_CLASSES)[number];

export type RiskProjectionAudience =
  | "CEO"
  | "EVENT_DIRECTOR"
  | "PLANNER"
  | "AUDITOR"
  | "CLIENT"
  | "SYSTEM_ADMINISTRATOR"
  | "PUBLIC";

const CLASS_FOR_AUDIENCE: Record<RiskProjectionAudience, readonly RiskDisclosureClassName[]> = {
  CEO: RISK_DISCLOSURE_CLASSES,
  EVENT_DIRECTOR: ["OPERATIONAL", "LIMIT_DEDUCTIBLE", "POLICY_IDENTIFIER", "INTERNAL_VENDOR_ASSESSMENT", "RESTRICTED_INCIDENT"],
  PLANNER: ["OPERATIONAL"],
  AUDITOR: ["OPERATIONAL", "LIMIT_DEDUCTIBLE", "POLICY_IDENTIFIER", "INTERNAL_VENDOR_ASSESSMENT", "RESTRICTED_INCIDENT", "LEGAL_ADVICE"],
  CLIENT: ["OPERATIONAL"],
  SYSTEM_ADMINISTRATOR: [],
  PUBLIC: [],
};

export function allowedDisclosureClasses(audience: RiskProjectionAudience): readonly RiskDisclosureClassName[] {
  return CLASS_FOR_AUDIENCE[audience];
}

export function maySeeClass(audience: RiskProjectionAudience, classification: RiskDisclosureClassName): boolean {
  return allowedDisclosureClasses(audience).includes(classification);
}

export function maskPolicyNumber(_ciphertext: string): never {
  throw new Error("policy identifiers must be omitted, not masked into a recoverable form");
}

export function redactPolicyEdition<T extends RiskPolicyEdition>(edition: T, audience: RiskProjectionAudience): Omit<T, "policyNumberCiphertext"> & {
  policyNumberCiphertext?: undefined;
  policyIdentifierAvailable: boolean;
  deductibles?: T["deductibles"];
  limits?: T["limits"];
} {
  const canSeeIdentifier = maySeeClass(audience, "POLICY_IDENTIFIER");
  const canSeeLimits = maySeeClass(audience, "LIMIT_DEDUCTIBLE");
  const { policyNumberCiphertext: _hidden, ...rest } = edition;
  return {
    ...rest,
    policyIdentifierAvailable: canSeeIdentifier,
    deductibles: canSeeLimits ? edition.deductibles : [],
    limits: canSeeLimits ? edition.limits : [],
  };
}

export function redactVendorAssessment(assessment: RiskVendorAssessment, audience: RiskProjectionAudience) {
  if (maySeeClass(audience, "INTERNAL_VENDOR_ASSESSMENT")) return assessment;
  return {
    id: assessment.id,
    organisationId: assessment.organisationId,
    vendorId: assessment.vendorId,
    eventId: assessment.eventId,
    band: "WITHHELD" as const,
    humanDecision: assessment.humanDecision,
    contentHash: assessment.contentHash,
    indicators: [] as RiskVendorAssessment["indicators"],
  };
}

export function redactIncidentNote(note: RiskIncidentNote, audience: RiskProjectionAudience) {
  if (maySeeClass(audience, note.classification)) return note;
  return {
    id: note.id,
    organisationId: note.organisationId,
    eventId: note.eventId,
    incidentId: note.incidentId,
    kind: note.kind,
    classification: note.classification,
    body: "Restricted",
    actorPersonId: note.actorPersonId,
    schemaVersion: note.schemaVersion,
    version: note.version,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function redactDossier(edition: RiskDossierEdition, audience: RiskProjectionAudience) {
  if (audience === "CLIENT" || audience === "PLANNER") {
    return {
      id: edition.id,
      status: edition.status,
      contentHash: edition.contentHash,
      limitations: edition.limitations,
      publishedAt: edition.publishedAt,
      dispatched: edition.dispatched,
      current: edition.current,
    };
  }
  return edition;
}

export function assertNoObjectKey<T extends { objectKey?: string }>(record: T): Omit<T, "objectKey"> {
  const { objectKey: _omit, ...rest } = record;
  return rest;
}
