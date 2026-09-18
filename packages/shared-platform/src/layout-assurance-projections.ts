import {
  LAYOUT_ASSET_PROVIDER_CONFIGURED,
  LAYOUT_DOWNSTREAM_CONTRACT_ID,
  LAYOUT_PDF_EXPORT_AVAILABLE,
  LAYOUT_VALIDATION_ENGINE_ID,
  LAYOUT_VALIDATION_ENGINE_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import type { CapacityReport } from "./layout-assurance-capacity.js";
import { buildCapacityReport } from "./layout-assurance-capacity.js";
import { diffLayoutObjects } from "./layout-assurance-diff.js";
import type {
  LayoutApproval,
  LayoutDiffEntry,
  LayoutFloorPlanAsset,
  LayoutPublication,
  LayoutSnapshot,
  LayoutValidationRun,
} from "./layout-assurance-schemas.js";
import type { PermissionKey } from "./schemas.js";
import { currentLayoutObjects } from "./spatial-operations.js";
import type { SpatialObject } from "./spatial-schemas.js";
import type { PlatformSnapshot } from "./store.js";
import { FROZEN_COORDINATE_SYSTEM } from "./venue-geometry.js";
import type { Layout } from "./venue-schemas.js";
import {
  classifiedSpatialDisclosure,
  overrideAppliesToFinding,
  projectFinding,
  projectLayoutExportJob,
  projectOverrideDecision,
  projectSpatialObjects,
  redactRestrictedText,
  restrictedOriginalLabels,
  runPublicationBlocked,
  selectCurrentOrLatestValidationRun,
  validationCounts,
  type LayoutFindingView,
  type ProjectedLayoutExportJob,
} from "./layout-spatial-disclosure.js";

const PROHIBITED_DOWNSTREAM_KEYS = [
  "guestId",
  "personId",
  "householdId",
  "partyId",
  "invitationId",
  "entitlementId",
  "seatAssignment",
  "communicationStatus",
  "biometric",
] as const;

export type LayoutAssuranceCapabilities = {
  canManageAsset: boolean;
  canRecordCapacity: boolean;
  canRunValidation: boolean;
  canManageSnapshot: boolean;
  canSubmitApproval: boolean;
  canDecideApproval: boolean;
  canPublish: boolean;
  canViewPublication: boolean;
  canReadDownstream: boolean;
  canOverrideConstraint: boolean;
  canRequestExport: boolean;
  canSettleExport: boolean;
};

export function layoutAssurancePermissionAllowed(keys: readonly PermissionKey[]): LayoutAssuranceCapabilities {
  return {
    canManageAsset: keys.includes("layout.asset.manage"),
    canRecordCapacity: keys.includes("layout.capacity.record"),
    canRunValidation: keys.includes("layout.validation.run"),
    canManageSnapshot: keys.includes("layout.snapshot.manage"),
    canSubmitApproval: keys.includes("layout.approval.submit"),
    canDecideApproval: keys.includes("layout.approval.decide"),
  canPublish: keys.includes("layout.publish"),
  canViewPublication: keys.includes("layout.publication.view"),
  canReadDownstream: keys.includes("layout.downstream.read"),
  canOverrideConstraint: keys.includes("layout.constraint.override"),
  canRequestExport: keys.includes("layout.snapshot.manage"),
  canSettleExport: keys.includes("layout.publish"),
  };
}

export type LayoutAssuranceWorkspace = {
  capacity: CapacityReport;
  latestRun?: LayoutValidationRun;
  findings: LayoutFindingView[];
  assets: LayoutFloorPlanAsset[];
  snapshots: Array<Pick<LayoutSnapshot, "id" | "name" | "contentHash" | "revisionNumber" | "createdAt" | "recordedByPersonId">>;
  approvals: LayoutApproval[];
  publications: LayoutPublication[];
  exportJobs: ProjectedLayoutExportJob[];
  publicationBlocked: boolean;
  rawBlockingCount: number;
  overriddenBlockingCount: number;
  unresolvedBlockingCount: number;
  recognisedOverrideCount: number;
  assetProviderConfigured: boolean;
  pdfExportAvailable: boolean;
  certificationClaim: "NONE";
  intelligenceMayApprove: false;
  capabilities: LayoutAssuranceCapabilities;
};

export type PublishedLayoutViewer = {
  eventId: string;
  eventName: string;
  venueName?: string;
  publicationNumber: number;
  contentHash: string;
  publishedAt: string;
  status: LayoutPublication["status"];
  scale: "MILLIMETRE";
  objects: Array<{
    id: string;
    objectType: SpatialObject["objectType"] | "MASKED";
    label: string;
    geometry: SpatialObject["geometry"] | { kind: "MASKED" };
    layer: number;
  }>;
  validationSummary: { engineId: string; engineVersion: string; blockingCount: number; warningCount: number };
  sourceContext: string;
};

export type DownstreamSpatialObject = {
  id: string;
  objectType: SpatialObject["objectType"];
  label: string;
  geometry: SpatialObject["geometry"];
  rotationMillidegree: number;
  layer: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  subtype: SpatialObject["subtype"];
};

export type LayoutDownstreamProjection = {
  contractId: typeof LAYOUT_DOWNSTREAM_CONTRACT_ID;
  publication: {
    id: string;
    publicationNumber: number;
    status: LayoutPublication["status"];
    contentHash: string;
    publishedAt: string;
    supersedesPublicationId?: string;
  };
  eventId: string;
  layoutId: string;
  coordinateSystem: typeof FROZEN_COORDINATE_SYSTEM;
  zones: DownstreamSpatialObject[];
  tables: DownstreamSpatialObject[];
  physicalSeats: DownstreamSpatialObject[];
  fixtures: DownstreamSpatialObject[];
  routes: DownstreamSpatialObject[];
  areas: DownstreamSpatialObject[];
  validationSummary: { engineId: string; engineVersion: string; ruleVersions: string[]; blockingCount: number; warningCount: number };
  checksumSha256: string;
};

function toDownstreamObject(object: SpatialObject): DownstreamSpatialObject {
  return {
    id: object.id,
    objectType: object.objectType,
    label: object.label,
    geometry: object.geometry,
    rotationMillidegree: object.rotationMillidegree,
    layer: object.layer,
    zIndex: object.zIndex,
    locked: object.locked,
    visible: object.visible,
    subtype: object.subtype,
  };
}

function layoutRestrictedLabels(snap: PlatformSnapshot, layoutId: string): string[] {
  const labels = new Set<string>();
  for (const revision of snap.layoutRevisions.filter((item) => item.layoutId === layoutId)) {
    for (const label of restrictedOriginalLabels(revision.objects)) labels.add(label);
  }
  for (const snapshot of snap.layoutSnapshots.filter((item) => item.layoutId === layoutId)) {
    try {
      const objects = (JSON.parse(snapshot.canonicalPayload) as { objects: SpatialObject[] }).objects;
      for (const label of restrictedOriginalLabels(objects)) labels.add(label);
    } catch {
      // Immutable snapshot payload that cannot parse is omitted from redaction, never from masking.
    }
  }
  return [...labels];
}

export function buildLayoutAssuranceWorkspace(
  snap: PlatformSnapshot,
  layout: Layout,
  capabilities: LayoutAssuranceCapabilities,
  options: { assetProviderConfigured?: boolean; pdfExportAvailable?: boolean; revealSensitive?: boolean; now?: string } = {},
): LayoutAssuranceWorkspace {
  const objects = currentLayoutObjects(snap, layout);
  const revealSensitive = Boolean(options.revealSensitive);
  const now = options.now ?? layout.updatedAt;
  const latestRun = selectCurrentOrLatestValidationRun(snap.layoutValidationRuns, layout.id, layout.contentHash);
  const findings = latestRun ? snap.layoutValidationFindings.filter((item) => item.runId === latestRun.id) : [];
  const counts = validationCounts(findings);
  const labels = revealSensitive ? [] : layoutRestrictedLabels(snap, layout.id);
  const projectedFindings: LayoutFindingView[] = findings.map((item) => {
    const projected = projectFinding(item, objects, revealSensitive);
    const candidates = snap.layoutValidationOverrides.filter((override) => overrideAppliesToFinding(override, item));
    const recorded =
      (item.overrideId ? candidates.find((override) => override.id === item.overrideId) : undefined) ??
      [...candidates].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))[0];
    return {
      ...projected,
      overrideDecision: recorded ? projectOverrideDecision(recorded, item, objects, revealSensitive, now) : undefined,
    };
  });
  return {
    capacity: buildCapacityReport(snap, layout, objects),
    latestRun,
    findings: projectedFindings,
    assets: snap.layoutFloorPlanAssets.filter((item) => item.layoutId === layout.id),
    snapshots: snap.layoutSnapshots
      .filter((item) => item.layoutId === layout.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        contentHash: item.contentHash,
        revisionNumber: item.revisionNumber,
        createdAt: item.createdAt,
        recordedByPersonId: item.recordedByPersonId,
      })),
    approvals: snap.layoutApprovals
      .filter((item) => item.layoutId === layout.id)
      .map((item) =>
        revealSensitive
          ? item
          : {
              ...item,
              materialDiffSummary: redactRestrictedText(item.materialDiffSummary, labels),
              capacityBasis: redactRestrictedText(item.capacityBasis, labels),
              downstreamImpact: redactRestrictedText(item.downstreamImpact, labels),
            },
      ),
    publications: snap.layoutPublications.filter((item) => item.layoutId === layout.id),
    exportJobs: snap.layoutExportJobs.filter((item) => item.layoutId === layout.id).map((item) => projectLayoutExportJob(item, revealSensitive)),
    publicationBlocked: runPublicationBlocked(latestRun, layout.contentHash, findings),
    rawBlockingCount: latestRun?.blockingCount ?? counts.rawBlockingCount,
    overriddenBlockingCount: latestRun?.overriddenBlockingCount ?? counts.overriddenBlockingCount,
    unresolvedBlockingCount: latestRun?.unresolvedBlockingCount ?? counts.unresolvedBlockingCount,
    recognisedOverrideCount: latestRun?.recognisedOverrideCount ?? counts.recognisedOverrideCount,
    assetProviderConfigured: Boolean(options.assetProviderConfigured),
    pdfExportAvailable: Boolean(options.pdfExportAvailable ?? LAYOUT_PDF_EXPORT_AVAILABLE),
    certificationClaim: "NONE",
    intelligenceMayApprove: false,
    capabilities,
  };
}

function maskSensitive(objects: readonly SpatialObject[], revealSensitive: boolean): PublishedLayoutViewer["objects"] {
  return projectSpatialObjects(objects, revealSensitive).map((item) => ({
    id: item.id,
    objectType: item.objectType === "MASKED" ? "MASKED" : item.objectType,
    label: item.label,
    geometry: item.geometry,
    layer: item.objectType === "MASKED" ? item.layer : item.layer,
  }));
}

export function buildPublishedLayoutViewer(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  layoutId: string,
  revealSensitive: boolean,
): PublishedLayoutViewer {
  const publication = snap.layoutPublications.find(
    (item) => item.layoutId === layoutId && item.eventId === eventId && item.organisationId === organisationId && item.status === "CURRENT",
  );
  if (!publication) {
    throw new PlatformError("NOT_FOUND", "no current publication exists for this layout");
  }
  const event = snap.events.find((item) => item.id === eventId);
  const layout = snap.layouts.find((item) => item.id === layoutId);
  const revision = snap.layoutRevisions.find((item) => item.id === publication.revisionId);
  if (!event || !layout || !revision) throw new PlatformError("NOT_FOUND", "published layout was not found");
  const venue = snap.eventVenues.find((item) => item.id === layout.eventVenueId);
  const venueName = venue ? snap.venues.find((item) => item.id === venue.venueId)?.displayName : undefined;
  const run = snap.layoutValidationRuns.find((item) => item.contentHash === publication.contentHash && item.layoutId === layoutId);
  return {
    eventId: event.id,
    eventName: event.name,
    venueName,
    publicationNumber: publication.publicationNumber,
    contentHash: publication.contentHash,
    publishedAt: publication.publishedAt,
    status: publication.status,
    scale: "MILLIMETRE",
    objects: maskSensitive(revision.objects, revealSensitive),
    validationSummary: {
      engineId: LAYOUT_VALIDATION_ENGINE_ID,
      engineVersion: LAYOUT_VALIDATION_ENGINE_VERSION,
      blockingCount: run?.blockingCount ?? 0,
      warningCount: run?.warningCount ?? 0,
    },
    sourceContext: `Publication ${publication.publicationNumber} · hash ${publication.contentHash} · ${publication.status}. This view is not a safety certificate.`,
  };
}

export function buildLayoutDownstreamProjection(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  layoutId: string,
  revealSensitive: boolean,
): LayoutDownstreamProjection {
  const publication = snap.layoutPublications.find(
    (item) =>
      item.layoutId === layoutId &&
      item.eventId === eventId &&
      item.organisationId === organisationId &&
      item.status === "CURRENT",
  );
  if (!publication) {
    throw new PlatformError("NOT_FOUND", "no current publication exists for downstream consumption");
  }
  const revision = snap.layoutRevisions.find((item) => item.id === publication.revisionId);
  if (!revision) throw new PlatformError("NOT_FOUND", "published revision was not found");
  const objects = revision.objects.filter((item) => !item.tombstoned);
  const projected = revealSensitive
    ? objects.map(toDownstreamObject)
    : objects.flatMap((item) => {
        const disclosure = classifiedSpatialDisclosure(item);
        if (disclosure === "OMIT" || disclosure === "RESTRICTED_GEOMETRY") return [];
        return [toDownstreamObject(item)];
      });
  const run = snap.layoutValidationRuns.find((item) => item.contentHash === publication.contentHash && item.layoutId === layoutId);
  const findings = run ? snap.layoutValidationFindings.filter((item) => item.runId === run.id) : [];
  const projection: LayoutDownstreamProjection = {
    contractId: LAYOUT_DOWNSTREAM_CONTRACT_ID,
    publication: {
      id: publication.id,
      publicationNumber: publication.publicationNumber,
      status: publication.status,
      contentHash: publication.contentHash,
      publishedAt: publication.publishedAt,
      supersedesPublicationId: publication.supersedesPublicationId,
    },
    eventId,
    layoutId,
    coordinateSystem: FROZEN_COORDINATE_SYSTEM,
    zones: projected.filter((item) => item.objectType === "ZONE"),
    tables: projected.filter((item) => item.objectType === "TABLE"),
    physicalSeats: projected.filter((item) => item.objectType === "SEAT"),
    fixtures: projected.filter((item) => item.objectType === "FIXTURE"),
    routes: projected.filter((item) => item.objectType === "ROUTE"),
    areas: projected.filter(
      (item) => item.objectType === "CLEARANCE_AREA" || item.objectType === "SAFE_AREA" || item.objectType === "RESTRICTED_AREA",
    ),
    validationSummary: {
      engineId: LAYOUT_VALIDATION_ENGINE_ID,
      engineVersion: LAYOUT_VALIDATION_ENGINE_VERSION,
      ruleVersions: [...new Set(findings.map((item) => `${item.ruleId}@${item.ruleVersion}`))],
      blockingCount: run?.blockingCount ?? 0,
      warningCount: run?.warningCount ?? 0,
    },
    checksumSha256: publication.contentHash,
  };
  assertNoProhibitedDownstreamKeys(projection);
  return projection;
}

export function assertNoProhibitedDownstreamKeys(value: unknown, path = "$"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoProhibitedDownstreamKeys(item, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (
      (PROHIBITED_DOWNSTREAM_KEYS as readonly string[]).includes(key) ||
      /^(guestId|personId|householdId|partyId|invitationId|entitlementId)$/i.test(key) ||
      /guest|household|invitation|entitlement|biometric|seatassignment/i.test(key)
    ) {
      throw new PlatformError("VALIDATION_FAILED", `downstream projection must not contain ${key} at ${path}`);
    }
    assertNoProhibitedDownstreamKeys(nested, `${path}.${key}`);
  }
}

export function comparePublishedToDraft(snap: PlatformSnapshot, layout: Layout): LayoutDiffEntry[] {
  const publication = snap.layoutPublications.find((item) => item.layoutId === layout.id && item.status === "CURRENT");
  const published = publication ? snap.layoutRevisions.find((item) => item.id === publication.revisionId)?.objects ?? [] : [];
  return diffLayoutObjects(published, currentLayoutObjects(snap, layout));
}

export { LAYOUT_ASSET_PROVIDER_CONFIGURED, LAYOUT_DOWNSTREAM_CONTRACT_ID };
