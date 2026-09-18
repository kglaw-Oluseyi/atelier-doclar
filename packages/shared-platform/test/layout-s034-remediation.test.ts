import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MASKED_LAYER_LABEL,
  MemoryLayoutBinaryStore,
  MemoryPlatformStore,
  PlatformError,
  applySyntheticSnapshot,
} from "../src/index.js";

const NOW = "2026-09-08T12:00:00.000Z";
const LATER = "2026-09-09T12:00:00.000Z";
const SECRET_LABEL = "Secret redoubt 77";
const SECRET_X = 5432;
const EVIDENCE = "Director authorised overlap for rehearsal";
const REASON = "Rehearsal overlap is authorised for this hash";

function actor(personId: string, correlationId: string, now = NOW) {
  return { personId, correlationId, now };
}
function director(now = NOW) {
  return actor(FIXTURE_IDS.personDirector, "s034-director", now);
}
function planner(now = NOW) {
  return actor(FIXTURE_IDS.personPlanner, "s034-planner", now);
}
function auditor(now = NOW) {
  return actor(FIXTURE_IDS.personAuditor, "s034-auditor", now);
}
function admin(now = NOW) {
  return actor(FIXTURE_IDS.personAdmin, "s034-admin", now);
}
function otherOrg(now = NOW) {
  return actor(FIXTURE_IDS.personOtherOrg, "s034-other", now);
}

function seeded(options: Parameters<typeof applySyntheticSnapshot>[1] = {}) {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store, options);
  return { store, service };
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
) {
  return service.getLayoutSetupWorkspace(actorCtx, FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layoutId).layout;
}

function blankLayout(service: ReturnType<typeof applySyntheticSnapshot>, name: string) {
  const venue = service.createVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `S034 ${name}`,
    reason: "Register S034 venue",
    idempotencyKey: `s034-venue-${name}-${Math.random()}`,
  });
  const adopted = service.adoptVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt for S034",
    idempotencyKey: `s034-adopt-${name}-${Math.random()}`,
  });
  return service.createBlankLayout(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create S034 layout",
    idempotencyKey: `s034-layout-${name}-${Math.random()}`,
  });
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

function recordOverlapOverride(service: ReturnType<typeof applySyntheticSnapshot>, layoutId: string, expiresAt = "2026-12-01T00:00:00.000Z") {
  service.runLayoutValidation(planner(), { ...cas(current(service, layoutId)), reason: "Validate" });
  const workspace = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layoutId);
  const blocking = workspace.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status === "OPEN");
  assert.ok(blocking);
  return service.overrideLayoutFinding(director(), {
    ...cas(workspace.layout),
    findingId: blocking.id,
    authorityKind: "EVENT_DIRECTOR",
    evidenceLabel: EVIDENCE,
    expiresAt,
    reason: REASON,
  });
}

describe("MD-PR-S034 override decision review", () => {
  it("lets an Event Director review the original durable override after same-hash revalidation", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "override-review"));
    const recorded = recordOverlapOverride(service, layout.id);
    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Same hash rerun" });
    const after = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const finding = after.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED" && item.status !== "STALE");
    assert.equal(finding?.status, "OVERRIDDEN");
    assert.equal(finding?.overrideRecognised, true);
    const decision = finding?.overrideDecision;
    assert.ok(decision);
    assert.equal(decision.id, recorded.id);
    assert.equal(decision.status, "ACTIVE");
    assert.equal(decision.recognisedByLaterRun, true);
    assert.equal(decision.reason, REASON);
    assert.equal(decision.evidenceLabel, EVIDENCE);
    assert.equal(decision.authorityKind, "EVENT_DIRECTOR");
    assert.equal(decision.expiresAt, recorded.expiresAt);
    assert.equal(decision.recordedByPersonId, recorded.recordedByPersonId);
    assert.equal(decision.recordedAt, recorded.createdAt);
    assert.equal(decision.ruleId, "RULE-S05-OVERLAP-GOVERNED");
    assert.equal(decision.contentHash, recorded.contentHash);
    assert.equal(decision.applicabilityKey, recorded.applicabilityKey);
    assert.ok(decision.affectedObjectScope.includes(SECRET_LABEL));
    assert.equal(recorded.reason, REASON);
    assert.equal(recorded.createdAt, NOW);
  });

  it("gives Auditor a permission-safe override record without revoke authority or restricted geometry", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "override-auditor"));
    const recorded = recordOverlapOverride(service, layout.id);
    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Rerun" });
    const auditorWs = service.getLayoutSetupWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const finding = auditorWs.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED");
    assert.ok(finding?.overrideDecision);
    assert.equal(finding.overrideDecision.status, "ACTIVE");
    assert.equal(finding.overrideDecision.evidenceLabel, EVIDENCE);
    assert.equal(finding.overrideDecision.reason, REASON);
    assert.equal(finding.overrideDecision.id, recorded.id);
    assert.ok(finding.overrideDecision.affectedObjectScope.every((item) => item !== SECRET_LABEL));
    assert.ok(finding.overrideDecision.affectedObjectScope.includes(MASKED_LAYER_LABEL));
    const json = JSON.stringify(auditorWs);
    assert.doesNotMatch(json, new RegExp(SECRET_LABEL));
    assert.doesNotMatch(json, new RegExp(String(SECRET_X)));
    assert.doesNotMatch(json, /layout-exports\//);
    assert.equal(auditorWs.assurance.capabilities.canOverrideConstraint, false);
    assert.throws(
      () =>
        service.revokeLayoutOverride(auditor(), {
          ...cas(current(service, layout.id, auditor())),
          overrideId: recorded.id,
          reason: "Auditor revoke",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.overrideLayoutFinding(auditor(), {
          ...cas(current(service, layout.id, auditor())),
          findingId: finding.id,
          authorityKind: "EVENT_DIRECTOR",
          evidenceLabel: "Auditor revive",
          expiresAt: "2026-12-01T00:00:00.000Z",
          reason: "Auditor edit",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const adminWs = service.getLayoutSetupWorkspace(admin(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(adminWs.assurance.capabilities.canOverrideConstraint, false);
    assert.doesNotMatch(JSON.stringify(adminWs), new RegExp(SECRET_LABEL));
  });

  it("displays expired and revoked overrides as inactive and keeps them from granting authority", () => {
    const { service } = seeded();
    const expireLayout = governedOverlap(service, blankLayout(service, "override-expire-view"));
    recordOverlapOverride(service, expireLayout.id, "2026-09-08T13:00:00.000Z");
    const expired = service.getLayoutSetupWorkspace(director(LATER), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, expireLayout.id);
    const expiredFinding = expired.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED");
    assert.equal(expiredFinding?.overrideDecision?.status, "EXPIRED");
    service.runLayoutValidation(planner(LATER), { ...cas(current(service, expireLayout.id, planner(LATER))), reason: "After expiry" });
    const afterExpiry = service.getLayoutSetupWorkspace(director(LATER), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, expireLayout.id);
    assert.equal(afterExpiry.assurance.publicationBlocked, true);
    assert.notEqual(afterExpiry.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED")?.status, "OVERRIDDEN");

    const revokeLayout = governedOverlap(service, blankLayout(service, "override-revoke-view"));
    const recorded = recordOverlapOverride(service, revokeLayout.id);
    service.revokeLayoutOverride(director(), {
      ...cas(current(service, revokeLayout.id, director())),
      overrideId: recorded.id,
      reason: "Explicit revocation for S034",
    });
    const revoked = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, revokeLayout.id);
    const revokedFinding = revoked.assurance.findings.find((item) => item.ruleId === "RULE-S05-OVERLAP-GOVERNED");
    assert.equal(revokedFinding?.overrideDecision?.status, "REVOKED");
    assert.equal(revokedFinding?.overrideDecision?.revokedReason, "Explicit revocation for S034");
    assert.equal(revokedFinding?.status, "OPEN");
    assert.equal(revoked.assurance.publicationBlocked, true);
  });

  it("denies cross-organisation retrieval of override details", () => {
    const { service } = seeded();
    const layout = governedOverlap(service, blankLayout(service, "override-scope"));
    recordOverlapOverride(service, layout.id);
    assert.throws(
      () => service.getLayoutSetupWorkspace(otherOrg(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id),
      (error: unknown) => error instanceof PlatformError,
    );
  });
});

describe("MD-PR-S034 export retrieval affordance", () => {
  it("hides privileged download from Auditor while keeping a masked published download and 403 on direct retrieval", () => {
    const binary = new MemoryLayoutBinaryStore();
    const { service } = seeded({ layoutBinaryStore: binary, layoutExportEnabled: true, layoutAssetStoreConfigured: true });
    const layout = blankLayout(service, "export-affordance");
    const draft = service.requestLayoutExport(planner(), { ...cas(layout), format: "PDF", reason: "Draft export" });
    assert.equal(draft.marking, "DRAFT");
    const plannerWs = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(plannerWs.assurance.exportJobs.find((item) => item.id === draft.id)?.retrieveAllowed, true);
    const directorWs = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(directorWs.assurance.exportJobs.find((item) => item.id === draft.id)?.retrieveAllowed, true);
    const auditorDraft = service.getLayoutSetupWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    const privileged = auditorDraft.assurance.exportJobs.find((item) => item.id === draft.id);
    assert.ok(privileged);
    assert.equal(privileged.retrieveAllowed, false);
    assert.match(privileged.retrieveDeniedReason ?? "", /more privileged projection/i);
    assert.equal("objectKey" in privileged, false);
    assert.throws(
      () => service.getStoredLayoutExport(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id, draft.id),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );

    service.runLayoutValidation(planner(), { ...cas(current(service, layout.id)), reason: "Validate export" });
    const submitted = service.submitLayoutApproval(planner(), { ...cas(current(service, layout.id)), reason: "Submit export" });
    service.decideLayoutApproval(director(), {
      ...cas(current(service, layout.id, director())),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve export",
    });
    service.publishLayout(director(), { ...cas(current(service, layout.id, director())), reason: "Publish export" });
    const published = service.requestLayoutExport(planner(), { ...cas(current(service, layout.id)), format: "PDF", reason: "Published privileged" });
    assert.equal(published.marking, "PUBLISHED");
    assert.throws(
      () => service.requestLayoutExport(auditor(), { ...cas(current(service, layout.id, auditor())), format: "PDF", reason: "Auditor published" }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const auditorWs = service.getLayoutSetupWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(auditorWs.assurance.exportJobs.find((item) => item.id === published.id)?.retrieveAllowed, false);
    assert.equal(auditorWs.assurance.capabilities.canRequestExport, false);
    assert.doesNotMatch(JSON.stringify(auditorWs.assurance.exportJobs), /layout-exports\//);
    assert.equal(published.marking, "PUBLISHED");
    assert.notEqual(published.id, draft.id);
  });
});
