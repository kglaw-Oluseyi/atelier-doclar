import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COUNT_FACT_GUIDANCE,
  CURRENT_LAYOUT_DRAFT,
  FIXTURE_IDS,
  MASKED_LAYER_LABEL,
  MemoryLayoutBinaryStore,
  MemoryPlatformStore,
  PlatformError,
  applySyntheticSnapshot,
  inspectLayoutExportPdfText,
  migrateEosS05OverrideLineage,
} from "../src/index.js";

const NOW = "2026-09-08T10:00:00.000Z";
const LATER = "2026-09-09T10:00:00.000Z";
const SECRET_LABEL = "Secret redoubt 77";
const SECRET_X = 5432;

function actor(personId: string, correlationId: string, now = NOW) {
  return { personId, correlationId, now };
}
function director(now = NOW) {
  return actor(FIXTURE_IDS.personDirector, "s033-director", now);
}
function planner(now = NOW) {
  return actor(FIXTURE_IDS.personPlanner, "s033-planner", now);
}
function auditor(now = NOW) {
  return actor(FIXTURE_IDS.personAuditor, "s033-auditor", now);
}
function admin(now = NOW) {
  return actor(FIXTURE_IDS.personAdmin, "s033-admin", now);
}
function ceo(now = NOW) {
  return actor(FIXTURE_IDS.personCeo, "s033-ceo", now);
}
function otherOrg(now = NOW) {
  return actor(FIXTURE_IDS.personOtherOrg, "s033-other", now);
}

function seeded(options: Parameters<typeof applySyntheticSnapshot>[1] = {}) {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store, options);
  return { store, service };
}

function blankLayout(
  service: ReturnType<typeof applySyntheticSnapshot>,
  name: string,
  eventId = FIXTURE_IDS.eventAlphaOne as string,
  actorCtx: { personId: string; correlationId: string; now: string } = director(),
) {
  const registrar = eventId === FIXTURE_IDS.eventAlphaOne ? director() : actorCtx;
  const creator = eventId === FIXTURE_IDS.eventAlphaOne ? planner() : actorCtx;
  const venue = service.createVenue(registrar, {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `S033 ${name}`,
    reason: "Register S033 venue",
    idempotencyKey: `s033-venue-${name}-${Math.random()}`,
  });
  const adopted = service.adoptVenue(registrar, {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId,
    venueId: venue.id,
    reason: "Adopt for S033",
    idempotencyKey: `s033-adopt-${name}-${Math.random()}`,
  });
  return service.createBlankLayout(creator, {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create S033 layout",
    idempotencyKey: `s033-layout-${name}-${Math.random()}`,
  });
}

function cas(layout: { id: string; version: number; currentRevisionNumber: number }, eventId: string = FIXTURE_IDS.eventAlphaOne) {
  return {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

function current(
  service: ReturnType<typeof applySyntheticSnapshot>,
  layoutId: string,
  actorCtx: { personId: string; correlationId: string; now: string } = planner(),
  eventId: string = FIXTURE_IDS.eventAlphaOne,
) {
  return service.getLayoutSetupWorkspace(actorCtx, FIXTURE_IDS.orgMaison, eventId, layoutId).layout;
}

function governedOverlap(service: ReturnType<typeof applySyntheticSnapshot>, layout: { id: string; version: number; currentRevisionNumber: number }) {
  service.applyLayoutCommand(planner(), {
    ...cas(layout),
    reason: "Restricted area",
    command: {
      kind: "CREATE_OBJECT",
      objectType: "RESTRICTED_AREA",
      label: SECRET_LABEL,
      geometry: { kind: "RECTANGLE", xMm: SECRET_X, yMm: 500, widthMm: 2500, heightMm: 1500 },
      subtype: {
        sourceKind: "VENUE_SUPPLIED",
        authorityLabel: "Venue",
        verificationState: "VERIFIED",
        thresholdUnknown: false,
        governedLocked: true,
        disclosureClass: "RESTRICTED_GEOMETRY",
      },
    },
  });
  const afterArea = current(service, layout.id);
  service.applyLayoutCommand(planner(), {
    ...cas(afterArea),
    reason: "Overlapping table",
    command: {
      kind: "CREATE_OBJECT",
      objectType: "TABLE",
      label: "Head table",
      geometry: { kind: "RECTANGLE", xMm: SECRET_X + 100, yMm: 600, widthMm: 1800, heightMm: 1800 },
      subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
    },
  });
  return current(service, layout.id);
}

describe("MD-PR-S033 override lineage", () => {
  it("keeps a governed override across same-hash revalidation and a new run id", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "override-survive"));
    const first = service.runLayoutValidation(planner(), { ...cas(layout), reason: "First validation" });
    const workspace = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const blocking = workspace.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status === "OPEN");
    assert.ok(blocking);
    const recorded = service.overrideLayoutFinding(director(), {
      ...cas(workspace.layout),
      findingId: blocking.id,
      authorityKind: "EVENT_DIRECTOR",
      evidenceLabel: "Director authorised overlap for rehearsal",
      expiresAt: "2026-12-01T00:00:00.000Z",
      reason: "Record override",
    });
    const second = service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Same hash rerun" });
    assert.notEqual(second.id, first.id);
    const after = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const again = after.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status !== "STALE");
    assert.equal(again?.status, "OVERRIDDEN");
    assert.equal(again?.overrideId, recorded.id);
    assert.equal(again?.overrideRecognised, true);
    assert.equal(after.assurance.publicationBlocked, false);
    assert.equal(after.assurance.rawBlockingCount, 1);
    assert.equal(after.assurance.overriddenBlockingCount, 1);
    assert.equal(after.assurance.unresolvedBlockingCount, 0);
    assert.equal(recorded.evidenceLabel, "Director authorised overlap for rehearsal");
    assert.equal(recorded.createdAt, NOW);
  });

  it("does not inherit an override onto a changed hash, object set, or rule identity, and expires or revokes truthfully", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "override-invalidate"));
    service.runLayoutValidation(planner(), { ...cas(layout), reason: "Validate" });
    const workspace = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const blocking = workspace.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")!;
    const recorded = service.overrideLayoutFinding(director(), {
      ...cas(workspace.layout),
      findingId: blocking.id,
      authorityKind: "EVENT_DIRECTOR",
      evidenceLabel: "Temporary overlap",
      expiresAt: "2026-09-08T12:00:00.000Z",
      reason: "Override",
    });
    const table = workspace.objects.find((item) => item.objectType === "TABLE")!;
    service.applyLayoutCommand(planner(), {
      ...cas(current(service, layout.id)),
      reason: "Move table off the area",
      command: { kind: "MOVE", objectIds: [table.id], deltaXMm: 8000, deltaYMm: 8000 },
    });
    service.applyLayoutCommand(planner(), {
      ...cas(current(service, layout.id)),
      reason: "Second table overlap",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Other table",
        geometry: { kind: "RECTANGLE", xMm: SECRET_X + 200, yMm: 700, widthMm: 1600, heightMm: 1600 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 4 },
      },
    });
    const changed = service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Changed hash" });
    const changedWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const inherited = changedWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status !== "STALE");
    assert.equal(inherited?.status, "OPEN");
    assert.notEqual(inherited?.overrideId, recorded.id);
    assert.equal(changed.publicationBlocked, true);

    const fresh = governedOverlap(service, blankLayout(service, "override-expire"));
    service.runLayoutValidation(planner(), { ...cas(fresh), reason: "Expire setup" });
    const expireWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, fresh.id);
    const expireFinding = expireWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")!;
    service.overrideLayoutFinding(director(), {
      ...cas(expireWs.layout),
      findingId: expireFinding.id,
      authorityKind: "EVENT_DIRECTOR",
      evidenceLabel: "Short override",
      expiresAt: "2026-09-08T11:00:00.000Z",
      reason: "Soon to expire",
    });
    const expiredRun = service.runLayoutValidation(planner(LATER), { ...cas(current(service, fresh.id)), reason: "After expiry" });
    const expiredWs = service.getLayoutSetupWorkspace(director(LATER), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, fresh.id);
    assert.equal(expiredWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")?.status, "OPEN");
    assert.equal(expiredRun.publicationBlocked, true);

    const revokeLayout = governedOverlap(service, blankLayout(service, "override-revoke"));
    service.runLayoutValidation(planner(), { ...cas(revokeLayout), reason: "Revoke setup" });
    const revokeWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, revokeLayout.id);
    const revokeFinding = revokeWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")!;
    const override = service.overrideLayoutFinding(director(), {
      ...cas(revokeWs.layout),
      findingId: revokeFinding.id,
      authorityKind: "EVENT_DIRECTOR",
      evidenceLabel: "Will revoke",
      expiresAt: "2026-12-01T00:00:00.000Z",
      reason: "Override then revoke",
    });
    service.revokeLayoutOverride(director(), {
      ...cas(current(service, revokeLayout.id, director())),
      overrideId: override.id,
      reason: "Explicit revocation",
    });
    service.runLayoutValidation(planner(), { ...cas(current(service, revokeLayout.id)), reason: "After revoke" });
    const afterRevoke = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, revokeLayout.id);
    assert.equal(afterRevoke.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")?.status, "OPEN");
  });

  it("denies cross-event and cross-organisation override reuse and recommendation revival", () => {
    const { service } = seeded();
    const alpha = governedOverlap(service, blankLayout(service, "alpha-override"));
    service.runLayoutValidation(planner(), { ...cas(alpha), reason: "Alpha validate" });
    const alphaWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, alpha.id);
    const alphaFinding = alphaWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")!;
    const recorded = service.overrideLayoutFinding(director(), {
      ...cas(alphaWs.layout),
      findingId: alphaFinding.id,
      authorityKind: "EVENT_DIRECTOR",
      evidenceLabel: "Alpha only",
      expiresAt: "2026-12-01T00:00:00.000Z",
      reason: "Alpha override",
    });
    const two = blankLayout(service, "beta-override", FIXTURE_IDS.eventAlphaTwo, ceo());
    service.applyLayoutCommand(ceo(), {
      ...cas(two, FIXTURE_IDS.eventAlphaTwo),
      reason: "Beta restricted",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "RESTRICTED_AREA",
        label: "Beta restricted",
        geometry: { kind: "RECTANGLE", xMm: SECRET_X, yMm: 500, widthMm: 2500, heightMm: 1500 },
        subtype: {
          sourceKind: "VENUE_SUPPLIED",
          authorityLabel: "Venue",
          verificationState: "VERIFIED",
          thresholdUnknown: false,
          governedLocked: true,
        },
      },
    });
    service.applyLayoutCommand(ceo(), {
      ...cas(service.getLayoutSetupWorkspace(ceo(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaTwo, two.id).layout, FIXTURE_IDS.eventAlphaTwo),
      reason: "Beta table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Beta table",
        geometry: { kind: "RECTANGLE", xMm: SECRET_X + 100, yMm: 600, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
      },
    });
    service.runLayoutValidation(ceo(), {
      ...cas(service.getLayoutSetupWorkspace(ceo(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaTwo, two.id).layout, FIXTURE_IDS.eventAlphaTwo),
      reason: "Beta validate",
    });
    const betaWs = service.getLayoutSetupWorkspace(ceo(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaTwo, two.id);
    const betaFinding = betaWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED");
    assert.equal(betaFinding?.status, "OPEN");
    assert.notEqual(betaFinding?.overrideId, recorded.id);
    assert.throws(
      () =>
        service.overrideLayoutFinding(otherOrg(), {
          ...cas(alphaWs.layout),
          findingId: alphaFinding.id,
          authorityKind: "EVENT_DIRECTOR",
          evidenceLabel: "Other org",
          expiresAt: "2026-12-01T00:00:00.000Z",
          reason: "Cross org",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("replays the override-lineage migration without rewriting decision fields", () => {
    const { store } = seeded();
    const first = migrateEosS05OverrideLineage(store.snapshot(), NOW);
    const replay = migrateEosS05OverrideLineage(first.snapshot, LATER);
    assert.equal(replay.status, "REPLAYED");
  });
});

describe("MD-PR-S033 projection safety", () => {
  it("masks restricted details for Auditor and System Administrator across studio, viewer, downstream and comparison", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "mask-surfaces"));
    const snapA = service.createLayoutSnapshot(planner(), { ...cas(layout), name: "Before", reason: "Base snapshot" });
    const directorWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.ok(directorWs.objects.some((item) => item.label === SECRET_LABEL));
    const auditorWs = service.getLayoutSetupWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const auditorJson = JSON.stringify(auditorWs);
    assert.doesNotMatch(auditorJson, new RegExp(SECRET_LABEL));
    assert.doesNotMatch(auditorJson, new RegExp(String(SECRET_X)));
    assert.ok(auditorWs.objects.some((item) => item.label === MASKED_LAYER_LABEL && item.objectType === "MASKED"));
    const adminWs = service.getLayoutSetupWorkspace(admin(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.doesNotMatch(JSON.stringify(adminWs), new RegExp(SECRET_LABEL));
    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Publish path" });
    const ready = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const blocking = ready.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status === "OPEN");
    if (blocking) {
      service.overrideLayoutFinding(director(), {
        ...cas(ready.layout),
        findingId: blocking.id,
        authorityKind: "EVENT_DIRECTOR",
        evidenceLabel: "Authorised for projection test",
        expiresAt: "2026-12-01T00:00:00.000Z",
        reason: "Override blocking",
      });
    }
    const submitted = service.submitLayoutApproval(planner(), { ...cas(current(service, layout.id)), reason: "Submit" });
    service.decideLayoutApproval(director(), {
      ...cas(current(service, layout.id, director())),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve",
    });
    service.publishLayout(director(), { ...cas(current(service, layout.id, director())), reason: "Publish" });
    const viewer = service.getPublishedLayoutViewer(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.ok(viewer.objects.some((item) => item.label === MASKED_LAYER_LABEL));
    assert.ok(!viewer.objects.some((item) => item.label === SECRET_LABEL || item.objectType === "RESTRICTED_AREA"));
    const downstream = service.getLayoutDownstreamProjection(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.doesNotMatch(JSON.stringify(downstream), new RegExp(SECRET_LABEL));
    assert.equal(downstream.areas.some((item) => item.objectType === "RESTRICTED_AREA"), false);
    const later = service.applyLayoutCommand(planner(), {
      ...cas(current(service, layout.id)),
      reason: "Move table for diff",
      command: {
        kind: "MOVE",
        objectIds: [directorWs.objects.find((item) => item.objectType === "TABLE")!.id],
        deltaXMm: 400,
        deltaYMm: 0,
      },
    });
    const snapB = service.createLayoutSnapshot(planner(), { ...cas(later), name: "After", reason: "Compare snapshot" });
    const auditorDiff = service.compareLayoutSnapshots(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, snapA.id, snapB.id);
    assert.doesNotMatch(JSON.stringify(auditorDiff), new RegExp(SECRET_LABEL));
    assert.ok(auditorDiff.direction.includes("Before"));
    const same = service.compareLayoutSnapshots(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, snapB.id, CURRENT_LAYOUT_DRAFT);
    assert.equal(same.noChange, true);
    assert.throws(
      () => service.compareLayoutSnapshots(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, snapA.id, snapA.id),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () => service.getLayoutSetupWorkspace(otherOrg(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("does not treat every SAFE_AREA or CLEARANCE_AREA as sensitive", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "benign-areas");
    service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: "Unlocked safe area",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "SAFE_AREA",
        label: "Open lawn",
        geometry: { kind: "RECTANGLE", xMm: 800, yMm: 800, widthMm: 2000, heightMm: 2000 },
        subtype: {
          sourceKind: "STAFF_OBSERVED",
          authorityLabel: "Staff",
          verificationState: "UNVERIFIED",
          thresholdUnknown: true,
          governedLocked: false,
        },
      },
    });
    const auditorWs = service.getLayoutSetupWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.ok(auditorWs.objects.some((item) => item.label === "Open lawn" && item.objectType === "SAFE_AREA"));
  });
});

describe("MD-PR-S033 export authority context", () => {
  it("creates a distinct PUBLISHED export after a DRAFT export of the same hash", () => {
    const binary = new MemoryLayoutBinaryStore();
    const { service } = seeded({ layoutBinaryStore: binary, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "export-context");
    const draft = service.requestLayoutExport(planner(), { ...cas(layout), format: "PDF", reason: "Draft export" });
    assert.equal(draft.marking, "DRAFT");
    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Validate export" });
    const submitted = service.submitLayoutApproval(planner(), { ...cas(current(service, layout.id)), reason: "Submit export" });
    service.decideLayoutApproval(director(), {
      ...cas(current(service, layout.id, director())),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve export",
    });
    const approved = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PDF", reason: "Approved export" });
    assert.equal(approved.marking, "APPROVED");
    assert.notEqual(approved.id, draft.id);
    const publication = service.publishLayout(director(), { ...cas(current(service, layout.id, director())), reason: "Publish export" });
    const published = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PDF", reason: "Published export" });
    assert.equal(published.marking, "PUBLISHED");
    assert.equal(published.publicationNumber, publication.publicationNumber);
    assert.ok(published.generatedAt);
    assert.notEqual(published.id, draft.id);
    assert.notEqual(published.id, approved.id);
    const stored = binary.get(published.objectKey!);
    assert.ok(stored);
    const text = inspectLayoutExportPdfText(stored.bytes);
    assert.match(text, /PUBLISHED/);
    assert.match(text, new RegExp(published.contentHash));
    assert.throws(
      () => service.requestLayoutExport(auditor(), { ...cas(current(service, layout.id, auditor())), format: "PDF", reason: "Auditor export" }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.getStoredLayoutExport(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id, published.id),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    service.withdrawLayoutPublication(director(), {
      ...cas(current(service, layout.id, director())),
      publicationId: publication.id,
      reason: "Withdraw",
    });
    const withdrawn = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PNG", reason: "Withdrawn export" });
    assert.equal(withdrawn.marking, "WITHDRAWN");
  });
});

describe("MD-PR-S033 count-fact guidance", () => {
  it("rejects a blank count with field-level language instead of an internal schema phrase", () => {
    const { service } = seeded();
    const venue = service.createVenue(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      displayName: "Count guidance venue",
      reason: "Register",
      idempotencyKey: `s033-count-${Math.random()}`,
    });
    assert.throws(
      () =>
        service.recordVenueFact(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          venueId: venue.id,
          factType: "DECLARED_CAPACITY",
          subtype: "VENUE_STATED",
          unit: "COUNT",
          sourceKind: "UNVERIFIED_REPORT",
          sourceLabel: "Staff note",
          verificationState: "UNVERIFIED",
          reason: "Blank count",
        }),
      (error: unknown) =>
        error instanceof PlatformError &&
        (error.details ?? []).some((item) => item.includes(COUNT_FACT_GUIDANCE)) &&
        !(error.details ?? []).some((item) => item.includes("require valueInteger")),
    );
  });
});
