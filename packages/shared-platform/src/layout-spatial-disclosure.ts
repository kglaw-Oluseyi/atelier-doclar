import { createHash } from "node:crypto";
import type { LayoutExportJob, LayoutValidationFinding, LayoutValidationOverride, LayoutValidationRun } from "./layout-assurance-schemas.js";
import type { SpatialObject } from "./spatial-schemas.js";

export const MASKED_LAYER_LABEL = "Restricted layer masked" as const;
export const CURRENT_LAYOUT_DRAFT = "CURRENT" as const;
export const COUNT_FACT_GUIDANCE =
  "A count fact needs a whole number. If the count is unknown, choose Text or None instead of Count." as const;

export const SPATIAL_DISCLOSURE_CLASSES = ["OPERATIONAL", "RESTRICTED_GEOMETRY", "OMIT"] as const;
export type SpatialDisclosureClass = (typeof SPATIAL_DISCLOSURE_CLASSES)[number];

export type MaskedGeometry = { kind: "MASKED" };
export type MaskedSubtype = { masked: true };

export type ProjectedSpatialObject = {
  id: string;
  organisationId: string;
  clientId: string;
  eventId: string;
  layoutId: string;
  objectType: SpatialObject["objectType"] | "MASKED";
  label: string;
  geometry: SpatialObject["geometry"] | MaskedGeometry;
  rotationMillidegree: number;
  layer: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  tombstoned: boolean;
  groupId?: string;
  subtype: SpatialObject["subtype"] | MaskedSubtype;
  createdByPersonId: string;
  updatedByPersonId: string;
  schemaVersion: SpatialObject["schemaVersion"];
  version: number;
  createdAt: string;
  updatedAt: string;
  disclosure?: SpatialDisclosureClass;
};

export type ProjectedExportObject = {
  id: string;
  objectType: string;
  label: string;
  geometry: SpatialObject["geometry"] | MaskedGeometry;
};

export function actorRevealsSensitiveSpatial(capabilities: {
  canUpdateLayout?: boolean;
  canOverrideConstraint?: boolean;
}): boolean {
  return Boolean(capabilities.canUpdateLayout || capabilities.canOverrideConstraint);
}

export function classifiedSpatialDisclosure(object: SpatialObject): SpatialDisclosureClass {
  const subtype = object.subtype as { disclosureClass?: SpatialDisclosureClass; governedLocked?: boolean };
  if (subtype.disclosureClass === "OMIT" || subtype.disclosureClass === "RESTRICTED_GEOMETRY" || subtype.disclosureClass === "OPERATIONAL") {
    return subtype.disclosureClass;
  }
  if (object.objectType === "RESTRICTED_AREA") return "RESTRICTED_GEOMETRY";
  if ((object.objectType === "SAFE_AREA" || object.objectType === "CLEARANCE_AREA") && subtype.governedLocked === true) {
    return "RESTRICTED_GEOMETRY";
  }
  return "OPERATIONAL";
}

export function isMaskedGeometry(geometry: { kind: string }): geometry is MaskedGeometry {
  return geometry.kind === "MASKED";
}

export function projectSpatialObject(object: SpatialObject, revealSensitive: boolean): ProjectedSpatialObject | undefined {
  const disclosure = classifiedSpatialDisclosure(object);
  if (revealSensitive || disclosure === "OPERATIONAL") {
    return object as ProjectedSpatialObject;
  }
  if (disclosure === "OMIT") return undefined;
  return {
    ...object,
    objectType: "MASKED",
    label: MASKED_LAYER_LABEL,
    geometry: { kind: "MASKED" },
    rotationMillidegree: 0,
    subtype: { masked: true },
    disclosure,
  };
}

export function projectSpatialObjects(objects: readonly SpatialObject[], revealSensitive: boolean): ProjectedSpatialObject[] {
  return objects.flatMap((item) => {
    if (item.tombstoned) return [];
    const projected = projectSpatialObject(item, revealSensitive);
    return projected ? [projected] : [];
  });
}

export function projectExportObjects(objects: readonly SpatialObject[], revealSensitive: boolean): ProjectedExportObject[] {
  return projectSpatialObjects(objects, revealSensitive).map((item) => ({
    id: item.id,
    objectType: item.objectType,
    label: item.label,
    geometry: item.geometry,
  }));
}

export function restrictedOriginalLabels(objects: readonly SpatialObject[]): string[] {
  const labels = new Set<string>();
  for (const object of objects) {
    if (object.tombstoned) continue;
    if (classifiedSpatialDisclosure(object) === "OPERATIONAL") continue;
    if (object.label && object.label !== MASKED_LAYER_LABEL) labels.add(object.label);
  }
  return [...labels];
}

export function redactRestrictedText(text: string, labels: readonly string[]): string {
  if (!text || labels.length === 0) return text;
  let next = text;
  const ordered = [...labels].sort((left, right) => right.length - left.length);
  for (const label of ordered) {
    if (!label) continue;
    next = next.split(label).join(MASKED_LAYER_LABEL);
  }
  return next;
}

export function projectFinding(
  finding: LayoutValidationFinding,
  objects: readonly SpatialObject[],
  revealSensitive: boolean,
): LayoutValidationFinding {
  if (revealSensitive) return finding;
  const labels = restrictedOriginalLabels(objects);
  const sensitiveIds = new Set(
    objects.filter((item) => classifiedSpatialDisclosure(item) !== "OPERATIONAL").map((item) => item.id),
  );
  const touchesRestricted = finding.objectIds.some((id) => sensitiveIds.has(id));
  if (!touchesRestricted && labels.every((label) => !finding.evidence.includes(label) && !finding.explanation.includes(label))) {
    return finding;
  }
  return {
    ...finding,
    evidence: redactRestrictedText(finding.evidence, labels),
    explanation: redactRestrictedText(finding.explanation, labels),
    recommendedAction: redactRestrictedText(finding.recommendedAction, labels),
  };
}

export function overrideApplicabilityKey(input: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  contentHash: string;
  ruleId: string;
  ruleVersion: string;
  objectIds: readonly string[];
}): string {
  return createHash("sha256")
    .update(
      [
        input.organisationId,
        input.eventId,
        input.layoutId,
        input.contentHash,
        input.ruleId,
        input.ruleVersion,
        [...input.objectIds].sort().join(","),
      ].join("|"),
    )
    .digest("hex");
}

export function effectiveOverrideState(
  override: LayoutValidationOverride,
  now: string,
): "ACTIVE" | "REVOKED" | "EXPIRED" {
  if (override.revokedAt) return "REVOKED";
  if (new Date(override.expiresAt).getTime() <= new Date(now).getTime()) return "EXPIRED";
  return "ACTIVE";
}

export function overrideIdentityFromFinding(finding: LayoutValidationFinding) {
  return {
    organisationId: finding.organisationId,
    eventId: finding.eventId,
    layoutId: finding.layoutId,
    contentHash: finding.contentHash,
    ruleId: finding.ruleId,
    ruleVersion: finding.ruleVersion,
    objectIds: finding.objectIds,
    applicabilityKey: overrideApplicabilityKey(finding),
  };
}

export function validationCounts(findings: readonly LayoutValidationFinding[]) {
  const rawBlockingCount = findings.filter((item) => item.severity === "BLOCKING").length;
  const overriddenBlockingCount = findings.filter((item) => item.severity === "BLOCKING" && item.status === "OVERRIDDEN").length;
  const unresolvedBlockingCount = findings.filter(
    (item) => item.severity === "BLOCKING" && item.status !== "OVERRIDDEN" && item.status !== "RESOLVED" && item.status !== "STALE" && item.status !== "OBSOLETE",
  ).length;
  const recognisedOverrideCount = findings.filter((item) => item.overrideRecognised).length;
  return {
    rawBlockingCount,
    overriddenBlockingCount,
    unresolvedBlockingCount,
    recognisedOverrideCount,
    publicationBlocked: unresolvedBlockingCount > 0,
  };
}

export function selectLatestValidationRun<T extends { layoutId: string; createdAt: string }>(
  runs: readonly T[],
  layoutId: string,
): T | undefined {
  let latest: T | undefined;
  for (const run of runs) {
    if (run.layoutId !== layoutId) continue;
    if (!latest) {
      latest = run;
      continue;
    }
    const time = run.createdAt.localeCompare(latest.createdAt);
    if (time >= 0) latest = run;
  }
  return latest;
}

export function runPublicationBlocked(run: LayoutValidationRun | undefined, layoutContentHash: string, findings: readonly LayoutValidationFinding[]): boolean {
  if (!run || run.contentHash !== layoutContentHash) return false;
  if (typeof run.unresolvedBlockingCount === "number") return run.unresolvedBlockingCount > 0;
  return validationCounts(findings).publicationBlocked;
}

export type OverrideDecisionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type OverrideDecisionRecord = {
  id: string;
  status: OverrideDecisionStatus;
  recognisedByLaterRun: boolean;
  reason?: string;
  evidenceLabel: string;
  authorityKind: LayoutValidationOverride["authorityKind"];
  expiresAt: string;
  recordedByPersonId: string;
  recordedAt: string;
  ruleId?: string;
  ruleVersion?: string;
  contentHash?: string;
  applicabilityKey?: string;
  affectedObjectCount: number;
  affectedObjectScope: string[];
  revokedAt?: string;
  revokedByPersonId?: string;
  revokedReason?: string;
};

export type LayoutFindingView = LayoutValidationFinding & {
  overrideDecision?: OverrideDecisionRecord;
};

export type ProjectedLayoutExportJob = {
  id: string;
  format: LayoutExportJob["format"];
  marking: LayoutExportJob["marking"];
  status: LayoutExportJob["status"];
  contentHash: string;
  publicationNumber?: number;
  generatedAt?: string;
  notes: string;
  projectionMasked: boolean;
  retrieveAllowed: boolean;
  retrieveDeniedReason?: string;
};

export function actorMayRetrieveExportJob(job: Pick<LayoutExportJob, "status" | "projectionMasked">, revealSensitive: boolean): boolean {
  if (job.status !== "COMPLETED") return false;
  return revealSensitive || job.projectionMasked === true;
}

export function projectLayoutExportJob(job: LayoutExportJob, revealSensitive: boolean): ProjectedLayoutExportJob {
  const retrieveAllowed = actorMayRetrieveExportJob(job, revealSensitive);
  return {
    id: job.id,
    format: job.format,
    marking: job.marking,
    status: job.status,
    contentHash: job.contentHash,
    publicationNumber: job.publicationNumber,
    generatedAt: job.generatedAt,
    notes: job.notes,
    projectionMasked: Boolean(job.projectionMasked),
    retrieveAllowed,
    retrieveDeniedReason: retrieveAllowed
      ? undefined
      : job.status === "COMPLETED"
        ? "This export belongs to a more privileged projection and cannot be downloaded from this assignment."
        : undefined,
  };
}

export function overrideAppliesToFinding(override: LayoutValidationOverride, finding: LayoutValidationFinding): boolean {
  if (
    override.organisationId !== finding.organisationId ||
    override.eventId !== finding.eventId ||
    override.layoutId !== finding.layoutId
  ) {
    return false;
  }
  const key = overrideIdentityFromFinding(finding).applicabilityKey;
  if (override.applicabilityKey) return override.applicabilityKey === key;
  if (override.contentHash && override.ruleId && override.ruleVersion) {
    return (
      overrideApplicabilityKey({
        organisationId: override.organisationId,
        eventId: override.eventId,
        layoutId: override.layoutId,
        contentHash: override.contentHash,
        ruleId: override.ruleId,
        ruleVersion: override.ruleVersion,
        objectIds: override.objectIds ?? [],
      }) === key
    );
  }
  return override.findingId === finding.id;
}

export function projectOverrideDecision(
  override: LayoutValidationOverride,
  finding: LayoutValidationFinding,
  objects: readonly SpatialObject[],
  revealSensitive: boolean,
  now: string,
): OverrideDecisionRecord {
  const labels = restrictedOriginalLabels(objects);
  const redact = (text: string | undefined) => (text ? (revealSensitive ? text : redactRestrictedText(text, labels)) : undefined);
  const scope = (override.objectIds.length ? override.objectIds : finding.objectIds).map((id) => {
    const object = objects.find((item) => item.id === id);
    if (!object) return revealSensitive ? id : MASKED_LAYER_LABEL;
    if (revealSensitive || classifiedSpatialDisclosure(object) === "OPERATIONAL") return object.label;
    return MASKED_LAYER_LABEL;
  });
  return {
    id: override.id,
    status: effectiveOverrideState(override, now),
    recognisedByLaterRun: finding.overrideRecognised === true,
    reason: redact(override.reason),
    evidenceLabel: redact(override.evidenceLabel) ?? MASKED_LAYER_LABEL,
    authorityKind: override.authorityKind,
    expiresAt: override.expiresAt,
    recordedByPersonId: override.recordedByPersonId,
    recordedAt: override.createdAt,
    ruleId: override.ruleId ?? finding.ruleId,
    ruleVersion: override.ruleVersion ?? finding.ruleVersion,
    contentHash: override.contentHash ?? finding.contentHash,
    applicabilityKey: override.applicabilityKey,
    affectedObjectCount: scope.length,
    affectedObjectScope: scope,
    revokedAt: override.revokedAt,
    revokedByPersonId: override.revokedByPersonId,
    revokedReason: redact(override.revokedReason),
  };
}
