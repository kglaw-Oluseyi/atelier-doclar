import { PlatformError } from "./errors.js";
import type { PermissionKey } from "./schemas.js";
import type {
  CandidateAssertion,
  DiscoveryDisclosureClass,
  DiscoveryDisclosureGrant,
  SourceArtefact,
  SourceSegment,
} from "./eec-schemas.js";

export const RESTRICTED_EVIDENCE_LABEL = "Restricted evidence" as const;
export const CONFIDENTIALITY_GRANT_REQUIRED = "CONFIDENTIALITY_GRANT_REQUIRED" as const;
export const CLIENT_PROJECTION_RESTRICTED = "CLIENT_PROJECTION_RESTRICTED" as const;
export const ASSIGNMENT_SCOPE_RESTRICTED = "ASSIGNMENT_SCOPE_RESTRICTED" as const;

export const RESTRICTED_DISCLOSURE_CLASSES: readonly DiscoveryDisclosureClass[] = [
  "FINANCIAL_RESTRICTED",
  "HEALTH_ACCESSIBILITY_RESTRICTED",
  "SECURITY_RESTRICTED",
  "CULTURAL_RELIGIOUS_RESTRICTED",
  "CONFIDENTIAL_SURPRISE",
  "PRINCIPAL_PRIVATE",
];

export type DiscoveryDisclosureDecision =
  | { kind: "REVEAL" }
  | {
      kind: "MASK";
      publicLabel: string;
      reasonCode: "CONFIDENTIALITY_GRANT_REQUIRED" | "CLIENT_PROJECTION_RESTRICTED" | "ASSIGNMENT_SCOPE_RESTRICTED";
    }
  | { kind: "OMIT"; reasonCode: string };

export type DiscoveryDisclosureActor = {
  organisationId: string;
  engagementId: string;
  personId?: string;
  permissionKeys: readonly PermissionKey[];
  grants: readonly DiscoveryDisclosureGrant[];
  now: string;
  clientProjection: boolean;
  inScope: boolean;
};

const SENSITIVITY_TO_DISCLOSURE: Record<string, DiscoveryDisclosureClass> = {
  STANDARD: "OPERATIONAL",
  CONTACT: "PRINCIPAL_PRIVATE",
  FAMILY_PRIVATE: "PRINCIPAL_PRIVATE",
  CULTURAL_RELIGIOUS: "CULTURAL_RELIGIOUS_RESTRICTED",
  ACCESSIBILITY_HEALTH: "HEALTH_ACCESSIBILITY_RESTRICTED",
  SECURITY: "SECURITY_RESTRICTED",
  FINANCIAL: "FINANCIAL_RESTRICTED",
  CONFIDENTIAL_SURPRISE: "CONFIDENTIAL_SURPRISE",
};

export function isRestrictedDisclosureClass(value: DiscoveryDisclosureClass): boolean {
  return RESTRICTED_DISCLOSURE_CLASSES.includes(value);
}

export function grantIsActive(grant: DiscoveryDisclosureGrant, now: string): boolean {
  if (grant.revokedAt) return false;
  if (grant.expiresAt && Date.parse(grant.expiresAt) <= Date.parse(now)) return false;
  return true;
}

export function grantCovers(
  grant: DiscoveryDisclosureGrant,
  organisationId: string,
  engagementId: string,
  disclosureClass: DiscoveryDisclosureClass,
  personId: string | undefined,
  now: string,
): boolean {
  if (!personId || grant.personId !== personId) return false;
  if (grant.organisationId !== organisationId) return false;
  if (grant.engagementId && grant.engagementId !== engagementId) return false;
  if (grant.disclosureClass !== disclosureClass) return false;
  return grantIsActive(grant, now);
}

export function actorRevealsRestricted(
  actor: Pick<DiscoveryDisclosureActor, "permissionKeys" | "grants" | "now" | "personId" | "organisationId" | "engagementId">,
  disclosureClass: DiscoveryDisclosureClass,
): boolean {
  if (actor.permissionKeys.includes("discovery.confidential.reveal")) return true;
  if (!actor.personId) return false;
  return actor.grants.some((grant) =>
    grantCovers(grant, actor.organisationId, actor.engagementId, disclosureClass, actor.personId, actor.now),
  );
}

export function decideDiscoveryDisclosure(
  disclosureClass: DiscoveryDisclosureClass,
  actor: DiscoveryDisclosureActor,
): DiscoveryDisclosureDecision {
  if (!actor.inScope) {
    return { kind: "OMIT", reasonCode: ASSIGNMENT_SCOPE_RESTRICTED };
  }
  if (actor.clientProjection) {
    if (disclosureClass === "CLIENT_VISIBLE") return { kind: "REVEAL" };
    return { kind: "OMIT", reasonCode: CLIENT_PROJECTION_RESTRICTED };
  }
  if (!actor.permissionKeys.includes("discovery.source.view") && !actor.permissionKeys.includes("discovery.source.manage")) {
    return { kind: "OMIT", reasonCode: ASSIGNMENT_SCOPE_RESTRICTED };
  }
  if (disclosureClass === "OPERATIONAL" || disclosureClass === "CLIENT_VISIBLE") {
    return { kind: "REVEAL" };
  }
  if (actorRevealsRestricted(actor, disclosureClass)) {
    return { kind: "REVEAL" };
  }
  return {
    kind: "MASK",
    publicLabel: RESTRICTED_EVIDENCE_LABEL,
    reasonCode: CONFIDENTIALITY_GRANT_REQUIRED,
  };
}

export function resolveArtefactDisclosureClass(
  artefact: SourceArtefact,
  assertions: readonly CandidateAssertion[] = [],
  segments: readonly SourceSegment[] = [],
): DiscoveryDisclosureClass {
  if (artefact.disclosureClass) return artefact.disclosureClass;
  const linked = assertions.filter((item) =>
    item.sourceSegmentIds.some((id) => segments.some((segment) => segment.id === id && segment.artefactId === artefact.id)),
  );
  const mapped = linked
    .map((item) => SENSITIVITY_TO_DISCLOSURE[item.sensitivity])
    .filter((item): item is DiscoveryDisclosureClass => Boolean(item) && item !== "OPERATIONAL");
  if (mapped.includes("CONFIDENTIAL_SURPRISE")) return "CONFIDENTIAL_SURPRISE";
  if (mapped.includes("SECURITY_RESTRICTED")) return "SECURITY_RESTRICTED";
  if (mapped.includes("FINANCIAL_RESTRICTED")) return "FINANCIAL_RESTRICTED";
  if (mapped.includes("HEALTH_ACCESSIBILITY_RESTRICTED")) return "HEALTH_ACCESSIBILITY_RESTRICTED";
  if (mapped.includes("CULTURAL_RELIGIOUS_RESTRICTED")) return "CULTURAL_RELIGIOUS_RESTRICTED";
  if (mapped.includes("PRINCIPAL_PRIVATE")) return "PRINCIPAL_PRIVATE";
  return "OPERATIONAL";
}

export function disclosureClassFromSensitivity(sensitivity: string): DiscoveryDisclosureClass {
  return SENSITIVITY_TO_DISCLOSURE[sensitivity] ?? "OPERATIONAL";
}

export function maskDiscoveryText(): string {
  return RESTRICTED_EVIDENCE_LABEL;
}

export function projectMaskedArtefact(artefact: SourceArtefact, decision: Extract<DiscoveryDisclosureDecision, { kind: "MASK" }>) {
  return {
    id: artefact.id,
    engagementId: artefact.engagementId,
    sessionId: artefact.sessionId,
    kind: artefact.kind,
    title: decision.publicLabel,
    contentSafetyStatus: artefact.contentSafetyStatus,
    language: artefact.language,
    disclosureClass: artefact.disclosureClass && !isRestrictedDisclosureClass(artefact.disclosureClass) ? artefact.disclosureClass : undefined,
    organisationId: artefact.organisationId,
    schemaVersion: artefact.schemaVersion,
    version: artefact.version,
    createdAt: artefact.createdAt,
    updatedAt: artefact.updatedAt,
    hasPrivateObject: false,
    disclosureDecision: decision.kind,
    disclosureReason: decision.reasonCode,
  };
}

export function projectMaskedSegment(segment: SourceSegment, decision: Extract<DiscoveryDisclosureDecision, { kind: "MASK" }>) {
  return {
    ...segment,
    text: decision.publicLabel,
    speakerParticipantId: undefined,
    speakerClaim: "UNRESOLVED" as const,
    contentHash: "restricted",
    disclosureDecision: decision.kind,
    disclosureReason: decision.reasonCode,
  };
}

export function assertDirectSourceReveal(decision: DiscoveryDisclosureDecision): void {
  if (decision.kind === "REVEAL") return;
  throw new PlatformError("FORBIDDEN", "this assignment cannot retrieve restricted source evidence");
}

export function dtoContainsRestrictedSecrets(dto: unknown, original: { title?: string; text?: string; objectKey?: string }): boolean {
  const blob = JSON.stringify(dto ?? {});
  if (original.title && original.title !== RESTRICTED_EVIDENCE_LABEL && blob.includes(original.title)) return true;
  if (original.text && original.text !== RESTRICTED_EVIDENCE_LABEL && blob.includes(original.text)) return true;
  if (original.objectKey && blob.includes(original.objectKey)) return true;
  return false;
}
