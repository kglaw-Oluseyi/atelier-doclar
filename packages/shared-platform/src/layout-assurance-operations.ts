import { createHash, randomUUID } from "node:crypto";
import {
  LAYOUT_ASSET_MAX_FILES,
  LAYOUT_ASSET_PROVIDER_CONFIGURED,
  LAYOUT_PDF_EXPORT_AVAILABLE,
  LAYOUT_VALIDATION_ENGINE_ID,
  LAYOUT_VALIDATION_ENGINE_VERSION,
  SCHEMA_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import { assertNoAssetSecrets, inspectFloorPlanPayload, sanitiseFloorPlanFileName } from "./layout-assurance-assets.js";
import { buildCapacityReport } from "./layout-assurance-capacity.js";
import { diffLayoutObjects, summarizeDiff } from "./layout-assurance-diff.js";
import { renderLayoutExport } from "./layout-export-render.js";
import {
  layoutExportObjectKey,
  type LayoutBinaryObject,
  type LayoutBinaryStore,
} from "./layout-asset-store.js";
import {
  AcknowledgeFindingInputSchema,
  CalibrateFloorPlanInputSchema,
  CreateLayoutSnapshotInputSchema,
  DecideLayoutApprovalInputSchema,
  LayoutApprovalSchema,
  LayoutAssetCalibrationSchema,
  LayoutCapacityStatementSchema,
  LayoutExportJobSchema,
  LayoutFloorPlanAssetSchema,
  LayoutPublicationSchema,
  LayoutSnapshotSchema,
  LayoutValidationOverrideSchema,
  LayoutValidationRunSchema,
  OverrideFindingInputSchema,
  PublishLayoutInputSchema,
  CompleteLayoutExportInputSchema,
  FailLayoutExportInputSchema,
  RecordFloorPlanIntentInputSchema,
  RecordOperationalCapacityInputSchema,
  RequestLayoutExportInputSchema,
  RestoreLayoutSnapshotInputSchema,
  RevokeLayoutOverrideInputSchema,
  RunLayoutValidationInputSchema,
  RecordStoredFloorPlanInputSchema,
  SubmitLayoutApprovalInputSchema,
  WithdrawLayoutAssetInputSchema,
  WithdrawLayoutPublicationInputSchema,
  type LayoutApproval,
  type LayoutAssetCalibration,
  type LayoutCapacityStatement,
  type LayoutDiffEntry,
  type LayoutExportJob,
  type LayoutFloorPlanAsset,
  type LayoutPublication,
  type LayoutSnapshot,
  type LayoutValidationFinding,
  type LayoutValidationOverride,
  type LayoutValidationRun,
} from "./layout-assurance-schemas.js";
import { evaluateLayoutValidation, stampFindings } from "./layout-assurance-validation.js";
import { requireScopedEvent } from "./programme-operations.js";
import { currentLayoutObjects, replaceLayoutObjectsOnSnap } from "./spatial-operations.js";
import type { SpatialObject } from "./spatial-schemas.js";
import type { PlatformSnapshot } from "./store.js";
import { canonicalSerialize, layoutContentHash } from "./venue-geometry.js";
import { assertNoVenueGuestIdentity } from "./venue-operations.js";
import type { Layout, LayoutRevision } from "./venue-schemas.js";
import {
  CURRENT_LAYOUT_DRAFT,
  classifiedSpatialDisclosure,
  effectiveOverrideState,
  overrideApplicabilityKey,
  overrideIdentityFromFinding,
  projectExportObjects,
  redactRestrictedText,
  restrictedOriginalLabels,
  selectLatestValidationRun,
  validationCounts,
} from "./layout-spatial-disclosure.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, version: 1, createdAt: now, updatedAt: now } as const;
}

function requireLayout(snap: PlatformSnapshot, organisationId: string, eventId: string, layoutId: string): Layout {
  const layout = snap.layouts.find((item) => item.id === layoutId);
  if (!layout || layout.organisationId !== organisationId || layout.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "layout was not found");
  }
  return layout;
}

function requireRevision(snap: PlatformSnapshot, layout: Layout): LayoutRevision {
  const revision = snap.layoutRevisions.find((item) => item.id === layout.currentRevisionId);
  if (!revision) throw new PlatformError("INTERNAL_ERROR", "layout revision is missing");
  return revision;
}

function assertLayoutVersion(layout: Layout, expectedVersion: number, expectedRevisionNumber: number): void {
  if (layout.version !== expectedVersion || layout.currentRevisionNumber !== expectedRevisionNumber) {
    throw new PlatformError("VERSION_CONFLICT", "this layout changed while you were editing", {
      publicMessage: "Reload the current layout before retrying. The attempted edit was not saved.",
    });
  }
}

function snapshotEnvelope(layout: Layout, objects: readonly SpatialObject[]) {
  return {
    coordinateSystem: layout.coordinateSystem,
    bounds: layout.bounds,
    objects,
  };
}

export function markFindingsStale(snap: PlatformSnapshot, layoutId: string, now: string): void {
  for (const finding of snap.layoutValidationFindings) {
    if (finding.layoutId !== layoutId) continue;
    if (finding.status === "STALE" || finding.status === "OBSOLETE" || finding.status === "RESOLVED") continue;
    finding.status = "STALE";
    finding.updatedAt = now;
    finding.version += 1;
  }
}

export function invalidateApprovalsForLayout(snap: PlatformSnapshot, layoutId: string, contentHash: string, now: string): void {
  for (const approval of snap.layoutApprovals) {
    if (approval.layoutId !== layoutId) continue;
    if (approval.status !== "SUBMITTED" && approval.status !== "APPROVED") continue;
    if (approval.contentHash === contentHash) continue;
    approval.status = "INVALIDATED";
    approval.updatedAt = now;
    approval.version += 1;
  }
}

export function afterLayoutMaterialChange(snap: PlatformSnapshot, layout: Layout, previousHash: string, now: string): void {
  if (layout.contentHash === previousHash) return;
  markFindingsStale(snap, layout.id, now);
  invalidateApprovalsForLayout(snap, layout.id, layout.contentHash, now);
}

export function afterVenueFactChange(snap: PlatformSnapshot, venueId: string, eventId: string | undefined, now: string): void {
  const eventVenues = snap.eventVenues.filter(
    (item) => item.venueId === venueId && item.status === "ACTIVE" && (!eventId || item.eventId === eventId),
  );
  for (const adopted of eventVenues) {
    for (const layout of snap.layouts.filter((item) => item.eventVenueId === adopted.id)) {
      invalidateApprovalsForLayout(snap, layout.id, "fact-change", now);
      markFindingsStale(snap, layout.id, now);
    }
  }
}

function currentFindings(snap: PlatformSnapshot, layoutId: string, contentHash: string): LayoutValidationFinding[] {
  const matching = snap.layoutValidationRuns.filter((item) => item.layoutId === layoutId && item.contentHash === contentHash);
  const run = selectLatestValidationRun(matching, layoutId);
  if (!run) return [];
  return snap.layoutValidationFindings.filter((item) => item.runId === run.id);
}

function overrideKeyOf(override: LayoutValidationOverride, snap: PlatformSnapshot): string | undefined {
  if (override.applicabilityKey) return override.applicabilityKey;
  if (override.contentHash && override.ruleId && override.ruleVersion) {
    return overrideApplicabilityKey({
      organisationId: override.organisationId,
      eventId: override.eventId,
      layoutId: override.layoutId,
      contentHash: override.contentHash,
      ruleId: override.ruleId,
      ruleVersion: override.ruleVersion,
      objectIds: override.objectIds ?? [],
    });
  }
  const finding = snap.layoutValidationFindings.find((item) => item.id === override.findingId);
  if (!finding) return undefined;
  return overrideIdentityFromFinding(finding).applicabilityKey;
}

function applyDurableOverrides(
  snap: PlatformSnapshot,
  findings: LayoutValidationFinding[],
  now: string,
): LayoutValidationFinding[] {
  const active = snap.layoutValidationOverrides.filter((item) => effectiveOverrideState(item, now) === "ACTIVE");
  for (const finding of findings) {
    if (finding.severity === "RECOMMENDATION") continue;
    const key = overrideIdentityFromFinding(finding).applicabilityKey;
    const match = active.find(
      (item) =>
        item.organisationId === finding.organisationId &&
        item.eventId === finding.eventId &&
        item.layoutId === finding.layoutId &&
        overrideKeyOf(item, snap) === key,
    );
    if (!match) continue;
    finding.status = "OVERRIDDEN";
    finding.overrideId = match.id;
    finding.overrideRecognised = true;
    finding.updatedAt = now;
  }
  return findings;
}

export function recordFloorPlanIntentOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutFloorPlanAsset {
  assertNoVenueGuestIdentity(raw);
  assertNoAssetSecrets(raw);
  const input = RecordFloorPlanIntentInputSchema.parse(raw);
  requireScopedEvent(snap, input.organisationId, input.eventId);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const activeCount = snap.layoutFloorPlanAssets.filter(
    (item) => item.layoutId === layout.id && item.retentionState === "ACTIVE",
  ).length;
  if (activeCount >= LAYOUT_ASSET_MAX_FILES) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan file count limit reached", {
      publicMessage: `At most ${LAYOUT_ASSET_MAX_FILES} active floor-plan assets are allowed.`,
    });
  }
  const inspection = inspectFloorPlanPayload({
    originalFileName: input.originalFileName,
    declaredMime: input.declaredMime,
    detectedKind: input.detectedKind,
    byteSize: input.byteSize,
    checksumSha256: input.checksumSha256,
    svgText: input.svgText,
    magicBytesHex: input.magicBytesHex,
  });
  if (LAYOUT_ASSET_PROVIDER_CONFIGURED) {
    throw new PlatformError("INTERNAL_ERROR", "asset provider configured without an approved adapter");
  }
  const asset = LayoutFloorPlanAssetSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    originalFileName: sanitiseFloorPlanFileName(input.originalFileName),
    declaredMime: input.declaredMime,
    detectedKind: inspection.detectedKind,
    byteSize: input.byteSize,
    checksumSha256: input.checksumSha256.toLowerCase(),
    storageState: inspection.storageState,
    uploadAvailable: false,
    scanStatus: inspection.scanStatus,
    quarantineReason: inspection.quarantine ? inspection.notes : undefined,
    derivativeKind: inspection.inert ? "INERT_METADATA" : "NONE",
    calibrated: false,
    supersedesAssetId: input.supersedesAssetId,
    retentionState: inspection.rejected ? "WITHDRAWN" : "ACTIVE",
    notes: inspection.notes,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  if (input.supersedesAssetId) {
    const prior = snap.layoutFloorPlanAssets.find((item) => item.id === input.supersedesAssetId && item.layoutId === layout.id);
    if (prior && !inspection.rejected) {
      prior.replacedByAssetId = asset.id;
      prior.retentionState = "SUPERSEDED";
      prior.storageState = "SUPERSEDED";
      prior.updatedAt = now;
      prior.version += 1;
    }
  }
  snap.layoutFloorPlanAssets.push(asset);
  return asset;
}

export function recordStoredFloorPlanOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutFloorPlanAsset {
  assertNoVenueGuestIdentity(raw);
  assertNoAssetSecrets(raw);
  const input = RecordStoredFloorPlanInputSchema.parse(raw);
  requireScopedEvent(snap, input.organisationId, input.eventId);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const duplicate = snap.layoutFloorPlanAssets.find(
    (item) =>
      item.layoutId === layout.id &&
      item.checksumSha256 === input.checksumSha256.toLowerCase() &&
      item.storageState === "AVAILABLE" &&
      item.retentionState === "ACTIVE",
  );
  if (duplicate) return duplicate;
  const activeCount = snap.layoutFloorPlanAssets.filter(
    (item) => item.layoutId === layout.id && item.retentionState === "ACTIVE",
  ).length;
  if (activeCount >= LAYOUT_ASSET_MAX_FILES) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan file count limit reached", {
      publicMessage: `At most ${LAYOUT_ASSET_MAX_FILES} active floor-plan assets are allowed.`,
    });
  }
  const asset = LayoutFloorPlanAssetSchema.parse({
    id: input.id,
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    originalFileName: sanitiseFloorPlanFileName(input.originalFileName),
    declaredMime: input.declaredMime,
    detectedKind: input.detectedKind,
    byteSize: input.byteSize,
    checksumSha256: input.checksumSha256.toLowerCase(),
    storageState: "AVAILABLE",
    uploadAvailable: true,
    scanStatus: "CLEAN",
    derivativeKind: input.derivativeKind,
    objectKey: input.objectKey,
    derivativeObjectKey: input.derivativeObjectKey,
    calibrated: false,
    supersedesAssetId: input.supersedesAssetId,
    retentionState: "ACTIVE",
    notes: "Private stored floor-plan. Not spatially authoritative until verified calibration.",
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  if (input.supersedesAssetId) {
    const prior = snap.layoutFloorPlanAssets.find((item) => item.id === input.supersedesAssetId && item.layoutId === layout.id);
    if (prior) {
      prior.replacedByAssetId = asset.id;
      prior.retentionState = "SUPERSEDED";
      prior.storageState = "SUPERSEDED";
      prior.updatedAt = now;
      prior.version += 1;
    }
  }
  snap.layoutFloorPlanAssets.push(asset);
  return asset;
}

export function calibrateFloorPlanOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutAssetCalibration {
  const input = CalibrateFloorPlanInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const asset = snap.layoutFloorPlanAssets.find((item) => item.id === input.assetId && item.layoutId === layout.id);
  if (!asset) throw new PlatformError("NOT_FOUND", "floor-plan asset was not found");
  if (asset.storageState === "REJECTED" || asset.storageState === "QUARANTINED") {
    throw new PlatformError("VALIDATION_FAILED", "a rejected or quarantined asset cannot be calibrated");
  }
  const spatiallyAuthoritative = input.verificationState === "VERIFIED";
  const calibration = LayoutAssetCalibrationSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    assetId: asset.id,
    measurementMm: input.measurementMm,
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    verificationState: input.verificationState,
    spatiallyAuthoritative,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  asset.calibrated = spatiallyAuthoritative;
  asset.updatedAt = now;
  asset.version += 1;
  snap.layoutAssetCalibrations.push(calibration);
  invalidateApprovalsForLayout(snap, layout.id, "calibration", now);
  markFindingsStale(snap, layout.id, now);
  return calibration;
}

export function recordOperationalCapacityOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutCapacityStatement {
  const input = RecordOperationalCapacityInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const statement = LayoutCapacityStatementSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    product: "OPERATIONAL_CAPACITY",
    quantity: input.quantity,
    ownerPersonId: actorPersonId,
    ownerLabel: input.ownerLabel,
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    verificationState: input.verificationState,
    rationale: input.rationale,
    zoneObjectId: input.zoneObjectId,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  for (const prior of snap.layoutCapacityStatements.filter((item) => item.layoutId === layout.id && item.id !== statement.id && !item.supersededById)) {
    prior.supersededById = statement.id;
    prior.updatedAt = now;
    prior.version += 1;
  }
  snap.layoutCapacityStatements.push(statement);
  invalidateApprovalsForLayout(snap, layout.id, "capacity", now);
  markFindingsStale(snap, layout.id, now);
  return statement;
}

export function runLayoutValidationOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutValidationRun {
  const input = RunLayoutValidationInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const revision = requireRevision(snap, layout);
  markFindingsStale(snap, layout.id, now);
  const drafts = evaluateLayoutValidation(snap, layout, revision);
  const runId = randomUUID();
  const findings = applyDurableOverrides(
    snap,
    stampFindings(drafts, { runId, layout, revision, actorPersonId, now }),
    now,
  );
  const counts = validationCounts(findings);
  const run = LayoutValidationRunSchema.parse({
    id: runId,
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    engineId: LAYOUT_VALIDATION_ENGINE_ID,
    engineVersion: LAYOUT_VALIDATION_ENGINE_VERSION,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    contentHash: revision.contentHash,
    blockingCount: counts.rawBlockingCount,
    warningCount: findings.filter((item) => item.severity === "WARNING").length,
    recommendationCount: findings.filter((item) => item.severity === "RECOMMENDATION").length,
    informationCount: findings.filter((item) => item.severity === "INFORMATION").length,
    overriddenBlockingCount: counts.overriddenBlockingCount,
    unresolvedBlockingCount: counts.unresolvedBlockingCount,
    recognisedOverrideCount: counts.recognisedOverrideCount,
    publicationBlocked: counts.publicationBlocked,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.layoutValidationRuns.push(run);
  snap.layoutValidationFindings.push(...findings);
  return run;
}

export function acknowledgeFindingOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
): LayoutValidationFinding {
  const input = AcknowledgeFindingInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const finding = snap.layoutValidationFindings.find((item) => item.id === input.findingId && item.layoutId === layout.id);
  if (!finding) throw new PlatformError("NOT_FOUND", "finding was not found");
  if (finding.status === "STALE" || finding.status === "OBSOLETE") {
    throw new PlatformError("VALIDATION_FAILED", "stale findings cannot be acknowledged");
  }
  if (finding.severity === "BLOCKING") {
    throw new PlatformError("FORBIDDEN", "blocking findings cannot be acknowledged away", {
      publicMessage: "A blocking finding must be resolved by a layout change or an authorised override.",
    });
  }
  finding.status = "ACKNOWLEDGED";
  finding.updatedAt = now;
  finding.version += 1;
  return finding;
}

export function overrideFindingOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
  canOverride: boolean,
): LayoutValidationOverride {
  const input = OverrideFindingInputSchema.parse(raw);
  if (!canOverride) {
    throw new PlatformError("FORBIDDEN", "ordinary operators cannot weaken a locked qualified-source constraint", {
      publicMessage: "This override needs authorised constraint authority. Administration status is not enough.",
    });
  }
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const finding = snap.layoutValidationFindings.find((item) => item.id === input.findingId && item.layoutId === layout.id);
  if (!finding) throw new PlatformError("NOT_FOUND", "finding was not found");
  if (finding.status === "STALE" || finding.status === "OBSOLETE") {
    throw new PlatformError("VALIDATION_FAILED", "stale findings cannot be overridden");
  }
  if (finding.severity === "RECOMMENDATION") {
    throw new PlatformError("FORBIDDEN", "recommendations cannot create or revive overrides", {
      publicMessage: "A recommendation cannot authorise an override.",
    });
  }
  if (new Date(input.expiresAt).getTime() <= new Date(now).getTime()) {
    throw new PlatformError("VALIDATION_FAILED", "override expiry must be in the future");
  }
  const identity = overrideIdentityFromFinding(finding);
  const existing = snap.layoutValidationOverrides.find(
    (item) =>
      item.organisationId === layout.organisationId &&
      item.eventId === layout.eventId &&
      item.layoutId === layout.id &&
      overrideKeyOf(item, snap) === identity.applicabilityKey &&
      effectiveOverrideState(item, now) === "ACTIVE",
  );
  if (existing) {
    finding.status = "OVERRIDDEN";
    finding.overrideId = existing.id;
    finding.overrideRecognised = true;
    finding.updatedAt = now;
    finding.version += 1;
    return existing;
  }
  const recorded = LayoutValidationOverrideSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    findingId: finding.id,
    authorityKind: input.authorityKind,
    evidenceLabel: input.evidenceLabel,
    expiresAt: input.expiresAt,
    recordedByPersonId: actorPersonId,
    contentHash: identity.contentHash,
    ruleId: identity.ruleId,
    ruleVersion: identity.ruleVersion,
    objectIds: identity.objectIds,
    applicabilityKey: identity.applicabilityKey,
    reason: input.reason,
    ...stamp(now),
  });
  finding.status = "OVERRIDDEN";
  finding.overrideId = recorded.id;
  finding.overrideRecognised = false;
  finding.updatedAt = now;
  finding.version += 1;
  snap.layoutValidationOverrides.push(recorded);
  return recorded;
}

export function revokeLayoutOverrideOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
  canOverride: boolean,
): LayoutValidationOverride {
  const input = RevokeLayoutOverrideInputSchema.parse(raw);
  if (!canOverride) {
    throw new PlatformError("FORBIDDEN", "ordinary operators cannot revoke a governed override", {
      publicMessage: "Revoking an override needs authorised constraint authority.",
    });
  }
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const recorded = snap.layoutValidationOverrides.find((item) => item.id === input.overrideId && item.layoutId === layout.id);
  if (!recorded) throw new PlatformError("NOT_FOUND", "override was not found");
  if (recorded.organisationId !== layout.organisationId || recorded.eventId !== layout.eventId) {
    throw new PlatformError("FORBIDDEN", "override cannot be reused across events or organisations");
  }
  if (recorded.revokedAt) return recorded;
  recorded.revokedAt = now;
  recorded.revokedByPersonId = actorPersonId;
  recorded.revokedReason = input.reason;
  recorded.updatedAt = now;
  recorded.version += 1;
  for (const finding of snap.layoutValidationFindings) {
    if (finding.overrideId !== recorded.id || finding.layoutId !== layout.id) continue;
    if (finding.status === "OVERRIDDEN") {
      finding.status = "OPEN";
      finding.overrideRecognised = false;
      finding.updatedAt = now;
      finding.version += 1;
    }
  }
  return recorded;
}

export function createLayoutSnapshotOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutSnapshot {
  const input = CreateLayoutSnapshotInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const revision = requireRevision(snap, layout);
  const payload = canonicalSerialize(snapshotEnvelope(layout, revision.objects));
  const contentHash = layoutContentHash(snapshotEnvelope(layout, revision.objects));
  if (contentHash !== layout.contentHash) {
    throw new PlatformError("INTERNAL_ERROR", "snapshot hash diverged from layout content hash");
  }
  const snapshot = LayoutSnapshotSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    name: input.name,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    contentHash,
    canonicalPayload: payload,
    immutable: true,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.layoutSnapshots.push(snapshot);
  return snapshot;
}

export function restoreLayoutSnapshotOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): Layout {
  const input = RestoreLayoutSnapshotInputSchema.parse(raw);
  if (input.confirmNewVersion !== true) {
    throw new PlatformError("VALIDATION_FAILED", "restore requires explicit confirmation that a new version will be created");
  }
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  const snapshot = snap.layoutSnapshots.find((item) => item.id === input.snapshotId && item.layoutId === layout.id);
  if (!snapshot) throw new PlatformError("NOT_FOUND", "snapshot was not found");
  const parsed = JSON.parse(snapshot.canonicalPayload) as { objects: SpatialObject[] };
  const previousHash = layout.contentHash;
  const frozenPayload = snapshot.canonicalPayload;
  const frozenHash = snapshot.contentHash;
  const next = replaceLayoutObjectsOnSnap(snap, input, parsed.objects, now, actorPersonId);
  const frozen = snap.layoutSnapshots.find((item) => item.id === snapshot.id);
  if (!frozen || frozen.canonicalPayload !== frozenPayload || frozen.contentHash !== frozenHash) {
    throw new PlatformError("INTERNAL_ERROR", "restore mutated an immutable snapshot");
  }
  afterLayoutMaterialChange(snap, next, previousHash, now);
  return next;
}

export function submitLayoutApprovalOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutApproval {
  const input = SubmitLayoutApprovalInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const revision = requireRevision(snap, layout);
  const findings = currentFindings(snap, layout.id, layout.contentHash);
  if (findings.length === 0) {
    throw new PlatformError("VALIDATION_FAILED", "submission requires a current validation run for this exact hash", {
      publicMessage: "Run validation on the current revision before submitting for approval.",
    });
  }
  const unresolvedBlocking = findings.filter(
    (item) => item.severity === "BLOCKING" && item.status !== "OVERRIDDEN" && item.status !== "RESOLVED" && item.status !== "STALE",
  );
  if (unresolvedBlocking.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "unresolved blocking findings prevent submission", {
      publicMessage: "Resolve or obtain an authorised override for every blocking finding before submission.",
    });
  }
  const run = snap.layoutValidationRuns.find((item) => item.id === findings[0]?.runId);
  if (!run) throw new PlatformError("INTERNAL_ERROR", "validation run is missing");
  const published = snap.layoutPublications.find((item) => item.layoutId === layout.id && item.status === "CURRENT");
  const publishedObjects = published
    ? snap.layoutRevisions.find((item) => item.id === published.revisionId)?.objects ?? []
    : [];
  const diff = diffLayoutObjects(publishedObjects, currentLayoutObjects(snap, layout));
  const capacity = buildCapacityReport(snap, layout, currentLayoutObjects(snap, layout));
  const approval = LayoutApprovalSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    contentHash: layout.contentHash,
    revisionId: revision.id,
    validationRunId: run.id,
    status: "SUBMITTED",
    submittedByPersonId: actorPersonId,
    materialDiffSummary: summarizeDiff(diff),
    capacityBasis: `operational=${capacity.operationalCapacity.quantity ?? "unknown"}; geometric=${capacity.geometricCapacity.quantity}; declared=${capacity.declaredVenueCapacity.quantity ?? "unknown"}`,
    downstreamImpact: diff.some((item) => item.kind === "DOWNSTREAM_IDENTIFIER")
      ? "Stable downstream identifiers are affected."
      : "No published downstream identifier impact.",
    ...stamp(now),
  });
  snap.layoutApprovals.push(approval);
  return approval;
}

export function decideLayoutApprovalOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
  canDecide: boolean,
  isSystemAdministrator: boolean,
): LayoutApproval {
  const input = DecideLayoutApprovalInputSchema.parse(raw);
  if (!canDecide || isSystemAdministrator) {
    throw new PlatformError("FORBIDDEN", "this actor cannot make an operational layout approval decision", {
      publicMessage: "System administration does not grant operational approval. A different authorised checker must decide.",
    });
  }
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const approval = snap.layoutApprovals.find((item) => item.id === input.approvalId && item.layoutId === layout.id);
  if (!approval) throw new PlatformError("NOT_FOUND", "approval was not found");
  if (input.decision === "APPROVED") {
    if (approval.submittedByPersonId === actorPersonId) {
      throw new PlatformError("FORBIDDEN", "the author of a submitted hash cannot approve it", {
        publicMessage: "Maker/checker: the person who submitted this hash cannot approve it.",
      });
    }
    if (approval.status !== "SUBMITTED") {
      throw new PlatformError("VALIDATION_FAILED", "only a submitted approval can be approved");
    }
    if (approval.contentHash !== layout.contentHash) {
      throw new PlatformError("VALIDATION_FAILED", "the submitted hash is no longer current");
    }
    approval.status = "APPROVED";
    approval.decidedByPersonId = actorPersonId;
  } else if (input.decision === "REJECTED") {
    if (approval.status !== "SUBMITTED") {
      throw new PlatformError("VALIDATION_FAILED", "only a submitted approval can be rejected");
    }
    approval.status = "REJECTED";
    approval.decidedByPersonId = actorPersonId;
  } else {
    if (approval.status !== "APPROVED" && approval.status !== "SUBMITTED") {
      throw new PlatformError("VALIDATION_FAILED", "only submitted or approved records can be revoked");
    }
    approval.status = "REVOKED";
    approval.decidedByPersonId = actorPersonId;
  }
  approval.updatedAt = now;
  approval.version += 1;
  return LayoutApprovalSchema.parse(approval);
}

export function publishLayoutOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
): LayoutPublication {
  const input = PublishLayoutInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const approval = [...snap.layoutApprovals]
    .filter((item) => item.layoutId === layout.id && item.status === "APPROVED" && item.contentHash === layout.contentHash)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (!approval) {
    throw new PlatformError("VALIDATION_FAILED", "publication requires an approval bound to the exact current hash", {
      publicMessage: "Publish is refused until this exact content hash is approved. Drafts are not published.",
    });
  }
  const existingCurrent = snap.layoutPublications.find(
    (item) => item.layoutId === layout.id && item.status === "CURRENT" && item.contentHash === layout.contentHash,
  );
  if (existingCurrent) return existingCurrent;
  const previous = snap.layoutPublications.filter((item) => item.layoutId === layout.id && item.status === "CURRENT");
  const nextNumber =
    Math.max(0, ...snap.layoutPublications.filter((item) => item.layoutId === layout.id).map((item) => item.publicationNumber)) + 1;
  const publication = LayoutPublicationSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    publicationNumber: nextNumber,
    contentHash: layout.contentHash,
    revisionId: layout.currentRevisionId,
    approvalId: approval.id,
    status: "CURRENT",
    purpose: "EVENT_LAYOUT",
    supersedesPublicationId: previous[0]?.id,
    publishedByPersonId: actorPersonId,
    publishedAt: now,
    ...stamp(now),
  });
  snap.layoutPublications.push(publication);
  for (const item of previous) {
    item.status = "SUPERSEDED";
    item.updatedAt = now;
    item.version += 1;
  }
  return publication;
}

export function withdrawLayoutPublicationOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
): LayoutPublication {
  const input = WithdrawLayoutPublicationInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const publication = snap.layoutPublications.find((item) => item.id === input.publicationId && item.layoutId === layout.id);
  if (!publication) throw new PlatformError("NOT_FOUND", "publication was not found");
  publication.status = "WITHDRAWN";
  publication.updatedAt = now;
  publication.version += 1;
  return publication;
}

function resolveExportAuthority(
  snap: PlatformSnapshot,
  layout: Layout,
  publicationId: string | undefined,
): {
  marking: LayoutExportJob["marking"];
  publication?: LayoutPublication;
  sourceRevision: LayoutRevision;
  contentHash: string;
} {
  if (publicationId) {
    const publication = snap.layoutPublications.find(
      (item) => item.id === publicationId && item.layoutId === layout.id && item.organisationId === layout.organisationId && item.eventId === layout.eventId,
    );
    if (!publication) throw new PlatformError("NOT_FOUND", "publication was not found");
    const sourceRevision = snap.layoutRevisions.find((item) => item.id === publication.revisionId);
    if (!sourceRevision) throw new PlatformError("NOT_FOUND", "export source revision was not found");
    const marking =
      publication.status === "CURRENT"
        ? "PUBLISHED"
        : publication.status === "SUPERSEDED"
          ? "SUPERSEDED"
          : publication.status === "WITHDRAWN"
            ? "WITHDRAWN"
            : "DRAFT";
    return { marking, publication, sourceRevision, contentHash: publication.contentHash };
  }
  const current = snap.layoutPublications.find((item) => item.layoutId === layout.id && item.status === "CURRENT");
  if (current) {
    const sourceRevision = snap.layoutRevisions.find((item) => item.id === current.revisionId);
    if (!sourceRevision) throw new PlatformError("NOT_FOUND", "export source revision was not found");
    return { marking: "PUBLISHED", publication: current, sourceRevision, contentHash: current.contentHash };
  }
  const matchingPublication = [...snap.layoutPublications]
    .filter((item) => item.layoutId === layout.id && item.contentHash === layout.contentHash)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))[0];
  if (matchingPublication?.status === "WITHDRAWN" || matchingPublication?.status === "SUPERSEDED") {
    const sourceRevision = snap.layoutRevisions.find((item) => item.id === matchingPublication.revisionId) ?? requireRevision(snap, layout);
    return {
      marking: matchingPublication.status,
      publication: matchingPublication,
      sourceRevision,
      contentHash: matchingPublication.contentHash,
    };
  }
  const sourceRevision = requireRevision(snap, layout);
  const approval = snap.layoutApprovals.find(
    (item) => item.layoutId === layout.id && item.status === "APPROVED" && item.contentHash === layout.contentHash,
  );
  return {
    marking: approval ? "APPROVED" : "DRAFT",
    publication: matchingPublication,
    sourceRevision,
    contentHash: layout.contentHash,
  };
}

export function requestLayoutExportOnSnap(
  snap: PlatformSnapshot,
  raw: unknown,
  now: string,
  actorPersonId: string,
  options: { exportEnabled?: boolean; binaryStore?: LayoutBinaryStore; revealSensitive?: boolean } = {},
): LayoutExportJob {
  const input = RequestLayoutExportInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const authority = resolveExportAuthority(snap, layout, input.publicationId);
  const projectionMasked = !options.revealSensitive;
  const existing = snap.layoutExportJobs.find(
    (item) =>
      item.layoutId === layout.id &&
      item.format === input.format &&
      item.contentHash === authority.contentHash &&
      item.marking === authority.marking &&
      item.publicationNumber === authority.publication?.publicationNumber &&
      Boolean(item.projectionMasked) === projectionMasked &&
      item.status === "COMPLETED",
  );
  if (existing && options.exportEnabled) return existing;
  const eventName = snap.events.find((item) => item.id === layout.eventId)?.name ?? "Event";
  const objects = projectExportObjects(authority.sourceRevision.objects, Boolean(options.revealSensitive));
  const publicationNote = authority.publication?.publicationNumber
    ? ` publication ${authority.publication.publicationNumber}`
    : "";
  if (!options.exportEnabled) {
    const job = LayoutExportJobSchema.parse({
      id: randomUUID(),
      organisationId: layout.organisationId,
      clientId: layout.clientId,
      eventId: layout.eventId,
      layoutId: layout.id,
      format: input.format,
      marking: authority.marking,
      status: LAYOUT_PDF_EXPORT_AVAILABLE ? "QUEUED_UNAVAILABLE" : "DISABLED",
      contentHash: authority.contentHash,
      publicationNumber: authority.publication?.publicationNumber,
      revisionId: authority.sourceRevision.id,
      projectionMasked,
      notes:
        authority.marking === "DRAFT"
          ? "DRAFT — not a publication. PDF/PNG generation is unavailable; no file was fabricated."
          : `${authority.marking} export for hash ${authority.contentHash}${publicationNote}. PDF/PNG generation is unavailable; no file was fabricated. No guest names, seating rationale, storage keys or signed URLs are included.`,
      recordedByPersonId: actorPersonId,
      ...stamp(now),
    });
    snap.layoutExportJobs.push(job);
    return job;
  }
  const pending = snap.layoutExportJobs.find(
    (item) =>
      item.layoutId === layout.id &&
      item.format === input.format &&
      item.contentHash === authority.contentHash &&
      item.marking === authority.marking &&
      item.publicationNumber === authority.publication?.publicationNumber &&
      Boolean(item.projectionMasked) === projectionMasked &&
      item.status === "PENDING",
  );
  if (pending) return pending;
  if (!options.binaryStore?.configured) {
    const job = LayoutExportJobSchema.parse({
      id: randomUUID(),
      organisationId: layout.organisationId,
      clientId: layout.clientId,
      eventId: layout.eventId,
      layoutId: layout.id,
      format: input.format,
      marking: authority.marking,
      status: "PENDING",
      contentHash: authority.contentHash,
      publicationNumber: authority.publication?.publicationNumber,
      revisionId: authority.sourceRevision.id,
      projectionMasked,
      notes: `${authority.marking} ${input.format} for hash ${authority.contentHash}${publicationNote} is pending private storage. Completion is recorded only after a durable object exists.`,
      recordedByPersonId: actorPersonId,
      ...stamp(now),
    });
    snap.layoutExportJobs.push(job);
    return job;
  }
  const rendered = renderLayoutExport({
    format: input.format,
    marking: authority.marking,
    eventName,
    layoutName: layout.name,
    contentHash: authority.contentHash,
    publicationNumber: authority.publication?.publicationNumber,
    generatedAt: now,
    widthMm: layout.bounds.widthMm,
    heightMm: layout.bounds.heightMm,
    objects,
  });
  const jobId = randomUUID();
  const objectKey = layoutExportObjectKey({
    organisationId: layout.organisationId,
    eventId: layout.eventId,
    layoutId: layout.id,
    jobId,
    format: input.format,
  });
  const put = options.binaryStore.put({
    key: objectKey,
    bytes: rendered.bytes,
    contentType: rendered.contentType,
  });
  if (put && typeof (put as Promise<void>).then === "function") {
    throw new PlatformError("INTERNAL_ERROR", "synchronous export store required inside snapshot mutation", {
      publicMessage: "Export storage failed. No success was recorded.",
    });
  }
  const stored = options.binaryStore.get(objectKey);
  if (stored && typeof (stored as Promise<unknown>).then === "function") {
    throw new PlatformError("INTERNAL_ERROR", "synchronous export store required inside snapshot mutation", {
      publicMessage: "Export storage failed. No success was recorded.",
    });
  }
  const storedBytes = stored as LayoutBinaryObject | undefined;
  if (!storedBytes || storedBytes.bytes.byteLength !== rendered.bytes.byteLength) {
    throw new PlatformError("INTERNAL_ERROR", "export object was not durably stored", {
      publicMessage: "Export storage failed. No success was recorded.",
    });
  }
  const job = LayoutExportJobSchema.parse({
    id: jobId,
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    format: input.format,
    marking: authority.marking,
    status: "COMPLETED",
    contentHash: authority.contentHash,
    publicationNumber: authority.publication?.publicationNumber,
    revisionId: authority.sourceRevision.id,
    objectKey,
    byteSize: rendered.bytes.byteLength,
    checksumSha256: createHash("sha256").update(rendered.bytes).digest("hex"),
    generatedAt: now,
    projectionMasked,
    notes: `${authority.marking} ${input.format} for hash ${authority.contentHash}${publicationNote}. Generated ${now}. No guest names, seating rationale, storage keys or signed URLs are included.`,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.layoutExportJobs.push(job);
  return job;
}

export function completeLayoutExportOnSnap(snap: PlatformSnapshot, raw: unknown, now: string): LayoutExportJob {
  const input = CompleteLayoutExportInputSchema.parse(raw);
  const job = snap.layoutExportJobs.find(
    (item) =>
      item.id === input.jobId &&
      item.layoutId === input.layoutId &&
      item.organisationId === input.organisationId &&
      item.eventId === input.eventId,
  );
  if (!job) throw new PlatformError("NOT_FOUND", "export job was not found");
  if (job.status === "COMPLETED") return job;
  if (job.status !== "PENDING") {
    throw new PlatformError("TRANSITION_INVALID", "only a pending export can complete", {
      publicMessage: "This export is not waiting for storage. No completion was recorded.",
    });
  }
  if (!input.objectKey.includes(job.id)) {
    throw new PlatformError("VALIDATION_FAILED", "export object key must belong to this job", {
      publicMessage: "The export object does not match this job. No completion was recorded.",
    });
  }
  job.status = "COMPLETED";
  job.objectKey = input.objectKey;
  job.byteSize = input.byteSize;
  job.checksumSha256 = input.checksumSha256.toLowerCase();
  job.generatedAt = input.generatedAt;
  job.notes = `${job.marking} ${job.format} for hash ${job.contentHash}. Durable private object recorded. No guest names, seating rationale, storage keys or signed URLs are included.`;
  job.updatedAt = now;
  job.version += 1;
  return LayoutExportJobSchema.parse(job);
}

export function failLayoutExportOnSnap(snap: PlatformSnapshot, raw: unknown, now: string): LayoutExportJob {
  const input = FailLayoutExportInputSchema.parse(raw);
  const job = snap.layoutExportJobs.find(
    (item) =>
      item.id === input.jobId &&
      item.layoutId === input.layoutId &&
      item.organisationId === input.organisationId &&
      item.eventId === input.eventId,
  );
  if (!job) throw new PlatformError("NOT_FOUND", "export job was not found");
  if (job.status === "COMPLETED") return job;
  job.status = "FAILED";
  job.notes = input.notes;
  job.updatedAt = now;
  job.version += 1;
  return LayoutExportJobSchema.parse(job);
}

export function withdrawLayoutAssetOnSnap(snap: PlatformSnapshot, raw: unknown, now: string): LayoutFloorPlanAsset {
  const input = WithdrawLayoutAssetInputSchema.parse(raw);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  assertLayoutVersion(layout, input.expectedVersion, input.expectedRevisionNumber);
  const asset = snap.layoutFloorPlanAssets.find((item) => item.id === input.assetId && item.layoutId === layout.id);
  if (!asset) throw new PlatformError("NOT_FOUND", "floor-plan asset was not found");
  const publicationEvidence = snap.layoutPublications.some((item) => item.layoutId === layout.id);
  const snapshotEvidence = snap.layoutSnapshots.some((item) => item.layoutId === layout.id);
  asset.retentionState = publicationEvidence || snapshotEvidence ? "SUPERSEDED" : "WITHDRAWN";
  if (asset.storageState === "AVAILABLE") asset.storageState = publicationEvidence || snapshotEvidence ? "RETAINED" : "SUPERSEDED";
  asset.uploadAvailable = asset.storageState === "RETAINED";
  asset.updatedAt = now;
  asset.version += 1;
  asset.notes = publicationEvidence || snapshotEvidence
    ? "Removed from active layout use. Private object retained because snapshot or publication evidence exists."
    : "Removed from active layout use. The object is not served.";
  return asset;
}

export function describeLayoutExportSourceFromSnap(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  layoutId: string,
  jobId: string,
  revealSensitive: boolean,
) {
  const job = snap.layoutExportJobs.find(
    (item) => item.id === jobId && item.layoutId === layoutId && item.organisationId === organisationId && item.eventId === eventId,
  );
  if (!job) throw new PlatformError("NOT_FOUND", "export job was not found");
  const layout = requireLayout(snap, organisationId, eventId, layoutId);
  const revision = job.revisionId
    ? snap.layoutRevisions.find((item) => item.id === job.revisionId)
    : requireRevision(snap, layout);
  if (!revision) throw new PlatformError("NOT_FOUND", "export source revision was not found");
  const reveal = revealSensitive && job.projectionMasked !== true;
  return {
    job,
    eventName: snap.events.find((item) => item.id === layout.eventId)?.name ?? "Event",
    layoutName: layout.name,
    widthMm: layout.bounds.widthMm,
    heightMm: layout.bounds.heightMm,
    objects: projectExportObjects(revision.objects, reveal),
  };
}

function snapshotObjects(snapshot: { canonicalPayload: string }): SpatialObject[] {
  return (JSON.parse(snapshot.canonicalPayload) as { objects: SpatialObject[] }).objects;
}

function maskDiffEntries(
  entries: LayoutDiffEntry[],
  objects: readonly SpatialObject[],
  revealSensitive: boolean,
): LayoutDiffEntry[] {
  if (revealSensitive) return entries;
  const labels = restrictedOriginalLabels(objects);
  const sensitiveIds = new Set(
    objects.filter((item) => classifiedSpatialDisclosure(item) !== "OPERATIONAL").map((item) => item.id),
  );
  return entries.map((entry) => {
    const summary = redactRestrictedText(entry.summary, labels);
    if (entry.objectId && sensitiveIds.has(entry.objectId)) {
      return { ...entry, summary: redactRestrictedText(summary, labels) };
    }
    return { ...entry, summary };
  });
}

export function compareLayoutSnapshots(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  leftId: string,
  rightId: string,
  options: { revealSensitive?: boolean } = {},
) {
  if (leftId === rightId) {
    throw new PlatformError("VALIDATION_FAILED", "comparison sources must be different", {
      publicMessage: "Choose two different snapshots, or a snapshot and the current draft.",
    });
  }
  const left = snap.layoutSnapshots.find((item) => item.id === leftId && item.organisationId === organisationId && item.eventId === eventId);
  if (!left) throw new PlatformError("NOT_FOUND", "snapshot was not found");
  const layout = requireLayout(snap, organisationId, eventId, left.layoutId);
  let rightObjects: SpatialObject[];
  let rightMeta: { id: string; name: string; contentHash: string; revisionNumber: number };
  if (rightId === CURRENT_LAYOUT_DRAFT) {
    rightObjects = currentLayoutObjects(snap, layout);
    rightMeta = {
      id: CURRENT_LAYOUT_DRAFT,
      name: "Current draft",
      contentHash: layout.contentHash,
      revisionNumber: layout.currentRevisionNumber,
    };
  } else {
    const right = snap.layoutSnapshots.find((item) => item.id === rightId && item.organisationId === organisationId && item.eventId === eventId);
    if (!right) throw new PlatformError("NOT_FOUND", "snapshot was not found");
    if (right.layoutId !== left.layoutId) {
      throw new PlatformError("FORBIDDEN", "snapshots cannot be compared across layouts");
    }
    rightObjects = snapshotObjects(right);
    rightMeta = { id: right.id, name: right.name, contentHash: right.contentHash, revisionNumber: right.revisionNumber };
  }
  const leftObjects = snapshotObjects(left);
  const entries = maskDiffEntries(
    diffLayoutObjects(leftObjects, rightObjects),
    [...leftObjects, ...rightObjects],
    Boolean(options.revealSensitive),
  );
  return {
    left: { id: left.id, name: left.name, contentHash: left.contentHash, revisionNumber: left.revisionNumber },
    right: rightMeta,
    direction: `${left.name} → ${rightMeta.name}`,
    entries,
    noChange: entries.length === 0,
  };
}
