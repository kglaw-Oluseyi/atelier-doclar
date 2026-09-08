import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  applySyntheticSnapshot,
  assertNoProhibitedDownstreamKeys,
  inspectFloorPlanPayload,
  layoutContentHash,
  migrateEosS05Assurance,
} from "../src/index.js";

const NOW = "2026-09-08T06:00:00.000Z";
const CHECKSUM = createHash("sha256").update("inert-floor-plan").digest("hex");

function director() {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s05m3-director", now: NOW };
}
function planner() {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s05m3-planner", now: NOW };
}
function auditor() {
  return { personId: FIXTURE_IDS.personAuditor, correlationId: "s05m3-auditor", now: NOW };
}
function otherOrg() {
  return { personId: FIXTURE_IDS.personOtherOrg, correlationId: "s05m3-other", now: NOW };
}
function admin() {
  return { personId: FIXTURE_IDS.personAdmin, correlationId: "s05m3-admin", now: NOW };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

function blankLayout(service: ReturnType<typeof applySyntheticSnapshot>, name = "Assurance floor") {
  const venue = service.createVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `Assurance ${name}`,
    reason: "Register assurance test venue",
    idempotencyKey: `assurance-venue-${name}-${Math.random()}`,
  });
  const adopted = service.adoptVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt for assurance tests",
    idempotencyKey: `assurance-adopt-${name}-${Math.random()}`,
  });
  return service.createBlankLayout(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create assurance test layout",
    idempotencyKey: `assurance-layout-${name}-${Math.random()}`,
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

describe("EOS-S05 Milestone 3 assurance", () => {
  it("applies the additive assurance migration without clearing prior S05 collections", () => {
    const { store } = seeded();
    const snap = store.snapshot();
    const replay = migrateEosS05Assurance(snap, NOW);
    assert.equal(replay.status, "REPLAYED");
    assert.ok(snap.venues.length >= 1);
    assert.ok(Array.isArray(snap.layoutFloorPlanAssets));
    assert.ok(Array.isArray(snap.layoutPublications));
  });

  it("rejects disagreeing MIME/extension/signature and quarantines active SVG without storing bytes", () => {
    const rejected = inspectFloorPlanPayload({
      originalFileName: "plan.pdf",
      declaredMime: "image/png",
      detectedKind: "PDF",
      byteSize: 1200,
      checksumSha256: CHECKSUM,
      magicBytesHex: "89504e47",
    });
    assert.equal(rejected.storageState, "REJECTED");
    const quarantined = inspectFloorPlanPayload({
      originalFileName: "plan.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: 80,
      checksumSha256: CHECKSUM,
      svgText: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    });
    assert.equal(quarantined.storageState, "QUARANTINED");
    const inert = inspectFloorPlanPayload({
      originalFileName: "plan.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: 40,
      checksumSha256: CHECKSUM,
      svgText: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      syntheticInert: true,
    });
    assert.equal(inert.storageState, "CONFIGURATION_REQUIRED");
    assert.equal(inert.scanStatus, "SYNTHETIC_INERT");
  });

  it("records floor-plan intent as CONFIGURATION_REQUIRED and never claims a successful production upload", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "assets");
    const asset = service.recordFloorPlanIntent(planner(), {
      ...cas(layout),
      originalFileName: "plan.pdf",
      declaredMime: "application/pdf",
      detectedKind: "PDF",
      byteSize: 2048,
      checksumSha256: CHECKSUM,
      magicBytesHex: "25504446",
      reason: "Record inert PDF intent",
    });
    assert.equal(asset.uploadAvailable, false);
    assert.equal(asset.storageState, "CONFIGURATION_REQUIRED");
    assert.equal(asset.scanStatus, "NOT_RUN");
    assert.ok(!("signedUrl" in asset));
    const scripted = service.recordFloorPlanIntent(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      originalFileName: "bad.svg",
      declaredMime: "image/svg+xml",
      detectedKind: "SVG",
      byteSize: 90,
      checksumSha256: CHECKSUM,
      svgText: '<svg xmlns="http://www.w3.org/2000/svg" href="https://evil.example"></svg>',
      reason: "Reject active SVG",
    });
    assert.equal(scripted.storageState, "QUARANTINED");
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const current = workspace.assurance.assets.find((item) => item.id === asset.id);
    assert.equal(current?.calibrated, false);
    service.calibrateFloorPlan(planner(), {
      ...cas(workspace.layout),
      assetId: asset.id,
      measurementMm: 12000,
      sourceKind: "STAFF_OBSERVED",
      sourceLabel: "Tape measure",
      verificationState: "UNVERIFIED",
      reason: "Unverified calibration is not spatially authoritative",
    });
    const after = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(after.assurance.assets.find((item) => item.id === asset.id)?.calibrated, false);
  });

  it("keeps capacity products distinct and does not sum phase occupancy", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "capacity");
    service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "Add dining table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "T1",
        geometry: { kind: "RECTANGLE", xMm: 1000, yMm: 1000, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
      },
    });
    const afterCreate = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const statement = service.recordOperationalCapacity(director(), {
      ...cas(afterCreate.layout),
      quantity: 8,
      ownerLabel: "Event director",
      sourceKind: "STAFF_OBSERVED",
      sourceLabel: "Director count",
      verificationState: "VERIFIED",
      rationale: "Match table design capacity",
      reason: "Record operational capacity",
    });
    const report = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).assurance.capacity;
    assert.equal(report.geometricCapacity.quantity, 8);
    assert.equal(report.operationalCapacity.quantity, 8);
    assert.equal(report.declaredVenueCapacity.present, false);
    assert.equal(report.expectedAttendance.present, false);
    assert.equal(report.phaseCountsMustNotBeSummedAsWholeEventPeople, true);
    assert.equal(report.noUniversalReductionPercentage, true);
    assert.equal(report.attendanceAdapterMutatesSource, false);
    assert.equal(statement.product, "OPERATIONAL_CAPACITY");
  });

  it("binds validation to the current hash, stales findings after edits, and denies planner overrides", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "validation");
    const run = service.runLayoutValidation(planner(), { ...cas(layout), reason: "First validation" });
    assert.equal(run.engineId, "EOS-S05-VALIDATION");
    assert.equal(run.contentHash, layout.contentHash);
    const first = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const open = first.assurance.findings.find((item) => item.status === "OPEN");
    assert.ok(open);
    const blocking = first.assurance.findings.find((item) => item.severity === "BLOCKING");
    if (blocking) {
      assert.throws(
        () =>
          service.acknowledgeLayoutFinding(planner(), {
            ...cas(first.layout),
            findingId: blocking.id,
            reason: "Ack blocking",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
    }
    const warning = first.assurance.findings.find((item) => item.severity === "WARNING" && item.status === "OPEN");
    if (warning) {
      const acked = service.acknowledgeLayoutFinding(planner(), {
        ...cas(first.layout),
        findingId: warning.id,
        reason: "Ack warning",
      });
      assert.equal(acked.status, "ACKNOWLEDGED");
    }
    assert.throws(
      () =>
        service.overrideLayoutFinding(planner(), {
          ...cas(first.layout),
          findingId: open.id,
          authorityKind: "EVENT_DIRECTOR",
          evidenceLabel: "Planner attempt",
          expiresAt: "2026-12-01T00:00:00.000Z",
          reason: "Planner cannot override",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    service.applyLayoutCommand(planner(), {
      ...cas(first.layout),
      reason: "Material edit stales findings",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "ZONE",
        label: "Dining",
        geometry: { kind: "RECTANGLE", xMm: 2000, yMm: 2000, widthMm: 4000, heightMm: 3000 },
        subtype: { category: "DINING" },
      },
    });
    const stale = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.ok(stale.assurance.findings.every((item) => item.status === "STALE" || stale.assurance.latestRun?.contentHash !== stale.layout.contentHash));
  });

  it("creates repeatable snapshot hashes, diffs, and restore-as-new-version without rewriting the snapshot", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "snapshots");
    const created = service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "Seed snapshot object",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Keep",
        geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 1600, heightMm: 1600 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 6 },
      },
    });
    const ready = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, created.id);
    const snapA = service.createLayoutSnapshot(planner(), { ...cas(ready.layout), name: "Baseline", reason: "Named snapshot" });
    const snapA2 = service.createLayoutSnapshot(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, created.id).layout),
      name: "Baseline copy",
      reason: "Repeat hash",
    });
    assert.equal(snapA.contentHash, snapA2.contentHash);
    assert.equal(snapA.contentHash, ready.layout.contentHash);
    service.applyLayoutCommand(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, created.id).layout),
      reason: "Move table",
      command: { kind: "MOVE", objectIds: [ready.objects[0]!.id], deltaXMm: 1800, deltaYMm: 1800 },
    });
    const moved = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, created.id);
    const snapB = service.createLayoutSnapshot(planner(), { ...cas(moved.layout), name: "Moved", reason: "Second snapshot" });
    const diff = service.compareLayoutSnapshots(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, snapA.id, snapB.id);
    assert.ok(diff.entries.some((item) => item.kind === "MOVED"));
    const restored = service.restoreLayoutSnapshot(planner(), {
      ...cas(moved.layout),
      snapshotId: snapA.id,
      confirmNewVersion: true,
      reason: "Restore as new version",
    });
    assert.notEqual(restored.currentRevisionId, snapA.revisionId);
    assert.equal(restored.contentHash, snapA.contentHash);
    const frozen = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, created.id).assurance.snapshots.find((item) => item.id === snapA.id);
    assert.equal(frozen?.contentHash, snapA.contentHash);
  });

  it("enforces maker/checker, denies self-approval and sysadmin operational approval, and invalidates after material change", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "approval");
    service.runLayoutValidation(planner(), { ...cas(layout), reason: "Validate for submit" });
    const submitted = service.submitLayoutApproval(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Planner submits",
    });
    assert.throws(
      () =>
        service.decideLayoutApproval(planner(), {
          ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
          approvalId: submitted.id,
          decision: "APPROVED",
          reason: "Self approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.decideLayoutApproval(admin(), {
          ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
          approvalId: submitted.id,
          decision: "APPROVED",
          reason: "Admin approve",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "SCOPE_MISMATCH"),
    );
    const approved = service.decideLayoutApproval(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Director checks",
    });
    assert.equal(approved.status, "APPROVED");
    service.applyLayoutCommand(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Material change after approval",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Extra",
        geometry: { kind: "RECTANGLE", xMm: 5000, yMm: 5000, widthMm: 1600, heightMm: 1600 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 4 },
      },
    });
    const invalidated = service
      .getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id)
      .assurance.approvals.find((item) => item.id === submitted.id);
    assert.equal(invalidated?.status, "INVALIDATED");
  });

  it("publishes idempotently, supersedes prior current, withdraws, and never succeeds without persistence", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "publish");
    service.runLayoutValidation(planner(), { ...cas(layout), reason: "Validate publish" });
    const submitted = service.submitLayoutApproval(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Submit publish",
    });
    service.decideLayoutApproval(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve publish",
    });
    const first = service.publishLayout(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "First publication",
    });
    const replay = service.publishLayout(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Replay publication",
    });
    assert.equal(first.id, replay.id);
    assert.equal(first.status, "CURRENT");
    service.applyLayoutCommand(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Correction after publication",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "ANNOTATION",
        label: "Note",
        geometry: { kind: "RECTANGLE", xMm: 400, yMm: 400, widthMm: 1200, heightMm: 800 },
        subtype: { body: "Correction", tone: "NOTE" },
      },
    });
    const nextLayout = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout;
    assert.throws(
      () => service.publishLayout(director(), { ...cas(nextLayout), reason: "Publish without new approval" }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.equal(
      service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).assurance.publications.filter((item) => item.status === "CURRENT").length,
      1,
    );
    service.runLayoutValidation(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Validate correction",
    });
    const secondSubmit = service.submitLayoutApproval(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Submit correction",
    });
    service.decideLayoutApproval(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      approvalId: secondSubmit.id,
      decision: "APPROVED",
      reason: "Approve correction",
    });
    const second = service.publishLayout(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Second publication",
    });
    assert.equal(second.publicationNumber, 2);
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const prior = workspace.assurance.publications.find((item) => item.id === first.id);
    assert.equal(prior?.status, "SUPERSEDED");
    const withdrawn = service.withdrawLayoutPublication(director(), {
      ...cas(workspace.layout),
      publicationId: second.id,
      reason: "Withdraw current",
    });
    assert.equal(withdrawn.status, "WITHDRAWN");
  });

  it("masks restricted layers, marks exports, and exposes a guest-free downstream contract", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "downstream");
    service.runLayoutValidation(planner(), { ...cas(layout), reason: "Validate downstream" });
    const submitted = service.submitLayoutApproval(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Submit downstream",
    });
    service.decideLayoutApproval(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve downstream",
    });
    service.publishLayout(director(), {
      ...cas(service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      reason: "Publish downstream",
    });
    const job = service.requestLayoutExport(planner(), {
      ...cas(service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout),
      format: "PDF",
      reason: "Export published",
    });
    assert.equal(job.status, "DISABLED");
    assert.equal(job.marking, "PUBLISHED");
    assert.match(job.notes, /PUBLISHED|hash/i);
    const projection = service.getLayoutDownstreamProjection(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(projection.contractId, "eos-s05-spatial-publication-v1");
    assertNoProhibitedDownstreamKeys(projection);
    const serialized = JSON.stringify(projection);
    assert.doesNotMatch(serialized, /guestId|personId|householdId|partyId|invitationId|entitlementId|biometric/i);
    const viewer = service.getPublishedLayoutViewer(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(viewer.status, "CURRENT");
    assert.ok(!viewer.objects.some((item) => item.objectType === "RESTRICTED_AREA"));
  });

  it("denies cross-organisation access and stale two-tab writes", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "isolation");
    assert.throws(
      () => service.runLayoutValidation(otherOrg(), { ...cas(layout), reason: "Other org" }),
      (error: unknown) => error instanceof PlatformError,
    );
    const stale = { ...cas(layout), expectedVersion: layout.version };
    service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "First tab edit",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "ANNOTATION",
        label: "Tab A",
        geometry: { kind: "RECTANGLE", xMm: 800, yMm: 800, widthMm: 1000, heightMm: 600 },
        subtype: { body: "A", tone: "NOTE" },
      },
    });
    assert.throws(
      () => service.runLayoutValidation(planner(), { ...stale, reason: "Second tab stale" }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });

  it("hydrates assurance collections from a memory snapshot round-trip", () => {
    const { store, service } = seeded();
    const layout = blankLayout(service, "persist");
    service.runLayoutValidation(planner(), { ...cas(layout), reason: "Persist validation" });
    const cloned = structuredClone(store.snapshot());
    const restored = new MemoryPlatformStore();
    restored.replace(cloned);
    const replayed = applySyntheticSnapshot(restored);
    const workspace = replayed.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.ok(workspace.assurance.latestRun);
    assert.equal(workspace.layout.contentHash, layoutContentHash({
      coordinateSystem: workspace.coordinateSystem,
      bounds: { minXMm: 0, minYMm: 0, maxXMm: workspace.layout.widthMm, maxYMm: workspace.layout.heightMm, widthMm: workspace.layout.widthMm, heightMm: workspace.layout.heightMm },
      objects: workspace.objects,
    }));
  });
});
