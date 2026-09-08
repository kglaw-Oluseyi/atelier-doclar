import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryLayoutBinaryStore,
  MemoryPlatformStore,
  PlatformError,
  PlatformService,
  applySyntheticSnapshot,
  inspectFloorPlanPayload,
  layoutContentHash,
  layoutSourceObjectKey,
  renderLayoutExport,
  type LayoutBinaryStore,
} from "../src/index.js";

const NOW = "2026-09-08T08:00:00.000Z";

function director() {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s05m4-director", now: NOW };
}
function planner() {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s05m4-planner", now: NOW };
}
function otherOrg() {
  return { personId: FIXTURE_IDS.personOtherOrg, correlationId: "s05m4-other", now: NOW };
}

function seeded(options: ConstructorParameters<typeof PlatformService>[1] = {}) {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store, options);
  return { store, service };
}

function blankLayout(service: ReturnType<typeof applySyntheticSnapshot>, name: string) {
  const venue = service.createVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `M4 ${name}`,
    reason: "Register milestone 4 venue",
    idempotencyKey: `m4-venue-${name}-${Math.random()}`,
  });
  const adopted = service.adoptVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt for milestone 4",
    idempotencyKey: `m4-adopt-${name}-${Math.random()}`,
  });
  return service.createBlankLayout(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 40000,
    heightMm: 28000,
    reason: "Create milestone 4 layout",
    idempotencyKey: `m4-layout-${name}-${Math.random()}`,
  });
}

function cas(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

function current(service: ReturnType<typeof applySyntheticSnapshot>, layoutId: string) {
  return service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layoutId).layout;
}

const INERT_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
const ACTIVE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cf00000101010018dd8d180000000049454e44ae426082",
  "hex",
);

function sha(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("EOS-S05 Milestone 4 production assets and export", () => {
  it("stores a clean floor-plan privately and refuses spatial authority before verified calibration", () => {
    const binary = new MemoryLayoutBinaryStore();
    const { service } = seeded({ layoutBinaryStore: binary, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "store");
    const bytes = new TextEncoder().encode(INERT_SVG);
    const inspection = inspectFloorPlanPayload({
      originalFileName: "plan.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: bytes.byteLength,
      checksumSha256: sha(bytes),
      bytes,
      storeConfigured: true,
    });
    assert.equal(inspection.storageState, "AVAILABLE");
    assert.equal(inspection.scanStatus, "CLEAN");
    assert.ok(inspection.storedBytes);
    const assetId = randomUUID();
    const objectKey = layoutSourceObjectKey({
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      assetId,
      ext: "svg",
    });
    binary.put({ key: objectKey, bytes: inspection.storedBytes, contentType: "image/svg+xml" });
    const asset = service.recordStoredFloorPlan(planner(), {
      ...cas(layout),
      id: assetId,
      originalFileName: "plan.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: inspection.storedBytes.byteLength,
      checksumSha256: sha(inspection.storedBytes),
      objectKey,
      derivativeKind: "INERT_SVG",
      scanStatus: "CLEAN",
      storageState: "AVAILABLE",
      reason: "Store scanned floor-plan",
    });
    assert.equal(asset.uploadAvailable, true);
    assert.equal(asset.calibrated, false);
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(workspace.assurance.assetProviderConfigured, true);
    service.calibrateFloorPlan(planner(), {
      ...cas(workspace.layout),
      assetId: asset.id,
      measurementMm: 12000,
      sourceKind: "STAFF_OBSERVED",
      sourceLabel: "Tape",
      verificationState: "UNVERIFIED",
      reason: "Unverified calibration is not authoritative",
    });
    const after = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(after.assurance.assets.find((item) => item.id === asset.id)?.calibrated, false);
    const accessed = service.getStoredLayoutAsset(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id, asset.id);
    assert.equal(accessed.objectKey, objectKey);
    assert.throws(
      () => service.getStoredLayoutAsset(otherOrg(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id, asset.id),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("rejects unsafe SVG and PDF content without claiming a stored success", () => {
    const svg = inspectFloorPlanPayload({
      originalFileName: "bad.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: ACTIVE_SVG.length,
      checksumSha256: sha(ACTIVE_SVG),
      bytes: new TextEncoder().encode(ACTIVE_SVG),
      storeConfigured: true,
    });
    assert.equal(svg.storageState, "QUARANTINED");
    assert.equal(svg.rejected, true);
    assert.equal(svg.storedBytes, undefined);
    const pdf = inspectFloorPlanPayload({
      originalFileName: "bad.pdf",
      declaredMime: "application/pdf",
      detectedKind: "PDF",
      byteSize: 64,
      checksumSha256: sha("%PDF-1.4 /JavaScript"),
      bytes: Buffer.from("%PDF-1.4\n/JavaScript\n"),
      storeConfigured: true,
    });
    assert.equal(pdf.storageState, "QUARANTINED");
    const png = inspectFloorPlanPayload({
      originalFileName: "plan.png",
      declaredMime: "image/png",
      detectedKind: "PNG",
      byteSize: TINY_PNG.byteLength,
      checksumSha256: sha(TINY_PNG),
      bytes: TINY_PNG,
      storeConfigured: true,
    });
    assert.equal(png.storageState, "AVAILABLE");
    const mismatch = inspectFloorPlanPayload({
      originalFileName: "plan.pdf",
      declaredMime: "application/pdf",
      detectedKind: "PDF",
      byteSize: TINY_PNG.byteLength,
      checksumSha256: sha(TINY_PNG),
      bytes: TINY_PNG,
      storeConfigured: true,
    });
    assert.equal(mismatch.storageState, "REJECTED");
  });

  it("completes PDF and PNG export only after durable put and binds the published hash", () => {
    const binary = new MemoryLayoutBinaryStore();
    const { service } = seeded({ layoutBinaryStore: binary, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "export");
    service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "Restricted layer",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "RESTRICTED_AREA",
        label: "Back of house",
        geometry: { kind: "RECTANGLE", xMm: 500, yMm: 500, widthMm: 2000, heightMm: 1500 },
        subtype: {
          sourceKind: "VENUE_SUPPLIED",
          authorityLabel: "Venue",
          verificationState: "VERIFIED",
          thresholdUnknown: false,
          governedLocked: true,
        },
      },
    });
    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Validate export" });
    const submitted = service.submitLayoutApproval(planner(), { ...cas(current(service, layout.id)), reason: "Submit export" });
    service.decideLayoutApproval(director(), {
      ...cas(current(service, layout.id)),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve export",
    });
    const publication = service.publishLayout(director(), { ...cas(current(service, layout.id)), reason: "Publish export" });
    service.applyLayoutCommand(planner(), {
      ...cas(current(service, layout.id)),
      reason: "Later draft must not be exported silently",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "ANNOTATION",
        label: "Later draft",
        geometry: { kind: "RECTANGLE", xMm: 3000, yMm: 3000, widthMm: 800, heightMm: 400 },
        subtype: { body: "Draft only", tone: "NOTE" },
      },
    });
    const later = current(service, layout.id);
    assert.notEqual(later.contentHash, publication.contentHash);
    const pdf = service.requestLayoutExport(planner(), { ...cas(later), format: "PDF", reason: "Export published PDF" });
    assert.equal(pdf.status, "COMPLETED");
    assert.equal(pdf.marking, "PUBLISHED");
    assert.equal(pdf.contentHash, publication.contentHash);
    assert.ok(pdf.objectKey && pdf.byteSize && pdf.checksumSha256 && pdf.generatedAt);
    const stored = binary.get(pdf.objectKey!);
    assert.ok(stored);
    assert.match(Buffer.from(stored.bytes).toString("latin1"), /PUBLISHED/);
    assert.doesNotMatch(Buffer.from(stored.bytes).toString("latin1"), /Back of house/);
    const png = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PNG", reason: "Export published PNG" });
    assert.equal(png.status, "COMPLETED");
    assert.equal(png.format, "PNG");
    const again = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PDF", reason: "Idempotent export" });
    assert.equal(again.id, pdf.id);
    assert.throws(
      () => service.getStoredLayoutExport(otherOrg(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id, pdf.id),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("does not record export completion when storage fails", () => {
    const failing: LayoutBinaryStore = {
      configured: true,
      put() {
        throw new Error("object store unavailable");
      },
      get() {
        return undefined;
      },
      delete() {},
    };
    const { service } = seeded({ layoutBinaryStore: failing, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "fail-export");
    assert.throws(
      () => service.requestLayoutExport(planner(), { ...cas(layout), format: "PDF", reason: "Fail closed" }),
      (error: unknown) => error instanceof Error,
    );
    const jobs = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).assurance.exportJobs;
    assert.equal(jobs.filter((item) => item.status === "COMPLETED").length, 0);
  });

  it("keeps default runtimes fail-closed for upload and export", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "default");
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(workspace.assurance.assetProviderConfigured, false);
    assert.equal(workspace.assurance.pdfExportAvailable, false);
    const job = service.requestLayoutExport(planner(), { ...cas(layout), format: "PDF", reason: "Disabled default" });
    assert.equal(job.status, "DISABLED");
  });

  it("creates PENDING export jobs when export is enabled without a synchronous store", () => {
    const { service } = seeded({ layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "pending");
    const job = service.requestLayoutExport(planner(), { ...cas(layout), format: "PNG", reason: "Queue pending" });
    assert.equal(job.status, "PENDING");
    const failed = service.failLayoutExport(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      jobId: job.id,
      notes: "Worker interrupted before durable put. No success was recorded.",
      reason: "Fail pending export",
    });
    assert.equal(failed.status, "FAILED");
  });

  it("hashes, validates, snapshots and exports a representative venue within measured budgets", () => {
    const binary = new MemoryLayoutBinaryStore();
    const { service } = seeded({ layoutBinaryStore: binary, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    let layout = blankLayout(service, "scale");
    const started = Date.now();
    for (let i = 0; i < 8; i += 1) {
      layout = service.applyLayoutCommand(planner(), {
        ...cas(layout),
        reason: `Zone ${i}`,
        command: {
          kind: "CREATE_OBJECT",
          objectType: "ZONE",
          label: `Zone ${i}`,
          geometry: { kind: "RECTANGLE", xMm: 1000 + i * 4000, yMm: 1000, widthMm: 3500, heightMm: 8000 },
          subtype: { category: "DINING" },
        },
      });
    }
    for (let i = 0; i < 24; i += 1) {
      layout = service.applyLayoutCommand(planner(), {
        ...cas(layout),
        reason: `Table ${i}`,
        command: {
          kind: "CREATE_OBJECT",
          objectType: "TABLE",
          label: `Table ${i}`,
          geometry: { kind: "RECTANGLE", xMm: 1200 + (i % 8) * 4000, yMm: 1200 + Math.floor(i / 8) * 2500, widthMm: 1600, heightMm: 1600 },
          subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
        },
      });
    }
    for (let i = 0; i < 6; i += 1) {
      layout = service.applyLayoutCommand(planner(), {
        ...cas(layout),
        reason: `Fixture ${i}`,
        command: {
          kind: "CREATE_OBJECT",
          objectType: "FIXTURE",
          label: `Fixture ${i}`,
          geometry: { kind: "RECTANGLE", xMm: 2000 + i * 3000, yMm: 20000, widthMm: 1200, heightMm: 800 },
          subtype: { fixtureKind: "AV", movable: true, safetyImplication: false },
        },
      });
    }
    for (let i = 0; i < 6; i += 1) {
      layout = service.applyLayoutCommand(planner(), {
        ...cas(layout),
        reason: `Route ${i}`,
        command: {
          kind: "CREATE_OBJECT",
          objectType: "ROUTE",
          label: `Route ${i}`,
          geometry: { kind: "POLYLINE", points: [{ xMm: 400, yMm: 26000 + i * 200 }, { xMm: 38000, yMm: 26000 + i * 200 }], widthMm: 1200 },
          subtype: {
            purpose: "EGRESS",
            direction: "BIDIRECTIONAL",
            accessibleState: "UNKNOWN",
            sourceKind: "STAFF_OBSERVED",
            sourceLabel: "Planner route",
          },
        },
      });
    }
    layout = service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "Safety area",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "SAFE_AREA",
        label: "Assembly",
        geometry: { kind: "RECTANGLE", xMm: 32000, yMm: 20000, widthMm: 5000, heightMm: 4000 },
        subtype: {
          sourceKind: "VENUE_SUPPLIED",
          authorityLabel: "Venue",
          verificationState: "UNVERIFIED",
          thresholdUnknown: true,
          governedLocked: false,
        },
      },
    });
    const populateMs = Date.now() - started;
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const hashStarted = Date.now();
    const hash = layoutContentHash({
      coordinateSystem: workspace.coordinateSystem,
      bounds: {
        minXMm: 0,
        minYMm: 0,
        maxXMm: workspace.layout.widthMm,
        maxYMm: workspace.layout.heightMm,
        widthMm: workspace.layout.widthMm,
        heightMm: workspace.layout.heightMm,
      },
      objects: workspace.objects,
    });
    const hashMs = Date.now() - hashStarted;
    assert.equal(hash, workspace.layout.contentHash);
    const validateStarted = Date.now();
    const run = service.runLayoutValidation(planner(), { ...cas(workspace.layout), reason: "Scale validation" });
    const validateMs = Date.now() - validateStarted;
    assert.equal(run.engineId, "EOS-S05-VALIDATION");
    const snapStarted = Date.now();
    service.createLayoutSnapshot(planner(), { ...cas(current(service, layout.id)), name: "Scale snapshot", reason: "Scale snapshot" });
    const snapMs = Date.now() - snapStarted;
    const exportStarted = Date.now();
    const job = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PNG", reason: "Scale export" });
    const exportMs = Date.now() - exportStarted;
    assert.equal(job.status, "COMPLETED");
    assert.ok(populateMs < 20_000, `populate ${populateMs}ms`);
    assert.ok(hashMs < 250, `hash ${hashMs}ms`);
    assert.ok(validateMs < 2_000, `validate ${validateMs}ms`);
    assert.ok(snapMs < 1_000, `snapshot ${snapMs}ms`);
    assert.ok(exportMs < 3_000, `export ${exportMs}ms`);
  });

  it("renders deterministic PDF identity without guest fields", () => {
    const first = renderLayoutExport({
      format: "PDF",
      marking: "DRAFT",
      eventName: "Alpha One",
      layoutName: "Ballroom",
      contentHash: "abc",
      generatedAt: NOW,
      widthMm: 10000,
      heightMm: 8000,
      objects: [],
    });
    const second = renderLayoutExport({
      format: "PDF",
      marking: "DRAFT",
      eventName: "Alpha One",
      layoutName: "Ballroom",
      contentHash: "abc",
      generatedAt: NOW,
      widthMm: 10000,
      heightMm: 8000,
      objects: [],
    });
    assert.equal(first.contentType, "application/pdf");
    assert.doesNotMatch(Buffer.from(second.bytes).toString("latin1"), /guestId|personId|seatAssignment/i);
  });
});
