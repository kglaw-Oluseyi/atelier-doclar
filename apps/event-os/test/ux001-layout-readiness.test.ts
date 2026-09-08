import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayoutSetupWorkspace } from "@maison-doclar/shared-platform";
import { layoutPublishReadiness, layoutSubmitReadiness } from "../src/lib/layout-action-readiness";

function workspace(overrides: Partial<LayoutSetupWorkspace["assurance"]> & { contentHash?: string }): LayoutSetupWorkspace {
  return {
    layout: {
      id: "layout-1",
      organisationId: "org",
      eventId: "event",
      name: "Ceremony floor",
      eventVenueId: "venue",
      widthMm: 1000,
      heightMm: 1000,
      displayLengthUnit: "METRE",
      currentRevisionNumber: 1,
      contentHash: overrides.contentHash ?? "abc",
      version: 1,
      editorExclusive: true,
    },
    objects: [],
    canUndo: false,
    canRedo: false,
    lease: { mine: true, readOnly: false },
    persistenceState: "saved",
    binaryBackgroundAvailable: false,
    validationPlaceholders: [],
    assurance: {
      capacity: {
        layoutId: "layout-1",
        eventId: "event",
        declaredVenueCapacity: { product: "DECLARED_VENUE_CAPACITY", present: false, substitutesAnotherProduct: false, explanation: "" },
        geometricCapacity: { product: "GEOMETRIC_CAPACITY", present: false, substitutesAnotherProduct: false, explanation: "" },
        operationalCapacity: { product: "OPERATIONAL_CAPACITY", present: false, substitutesAnotherProduct: false, explanation: "" },
        expectedAttendance: { product: "EXPECTED_ATTENDANCE", present: false, substitutesAnotherProduct: false, explanation: "" },
        observedRsvp: { product: "OBSERVED_RSVP", present: false, substitutesAnotherProduct: false, explanation: "" },
        forecastRange: { product: "FORECAST_RANGE", present: false, substitutesAnotherProduct: false, explanation: "" },
        phaseOccupancy: [],
        operationalProvision: { product: "OPERATIONAL_PROVISION", present: false, substitutesAnotherProduct: false, explanation: "" },
        observedAttendance: { product: "OBSERVED_ATTENDANCE", present: false, substitutesAnotherProduct: false, explanation: "" },
        tableBreakdown: [],
        phaseCountsMustNotBeSummedAsWholeEventPeople: true,
        noUniversalReductionPercentage: true,
        attendanceAdapterMutatesSource: false,
        attendance: {
          eventId: "event",
          observedRsvp: { product: "OBSERVED_RSVP", present: false, mutable: false, sourceCollection: "x", explanation: "" },
          wholeEventDistinctPersonForecast: { product: "WHOLE_EVENT_FORECAST", present: false, mutable: false, sourceCollection: "x", explanation: "" },
          phaseOccupancy: [],
          operationalProvision: { product: "OPERATIONAL_PROVISION", present: false, mutable: false, sourceCollection: "x", explanation: "" },
          observedAttendance: { product: "OBSERVED_ATTENDANCE", present: false, mutable: false, sourceCollection: "x", explanation: "" },
          phaseCountsMustNotBeSummedAsWholeEventPeople: true,
          adapterMutatesSource: false,
        },
      },
      findings: [],
      assets: [],
      snapshots: [],
      approvals: [],
      publications: [],
      exportJobs: [],
      publicationBlocked: false,
      rawBlockingCount: 0,
      overriddenBlockingCount: 0,
      unresolvedBlockingCount: 0,
      recognisedOverrideCount: 0,
      assetProviderConfigured: false,
      pdfExportAvailable: false,
      certificationClaim: "NONE",
      intelligenceMayApprove: false,
      capabilities: {
        canManageAsset: false,
        canRecordCapacity: false,
        canRunValidation: true,
        canManageSnapshot: false,
        canSubmitApproval: true,
        canDecideApproval: true,
        canPublish: true,
        canViewPublication: true,
        canReadDownstream: false,
        canOverrideConstraint: false,
      },
      ...overrides,
    },
    coordinateSystem: {
      origin: "TOP_LEFT",
      xIncreases: "RIGHT",
      yIncreases: "DOWN",
      unit: "MILLIMETRE",
    },
    pendingPixelPersistence: false,
    capabilities: {
      canCreateLayout: true,
      canUpdateLayout: true,
      canSubmitApproval: true,
      canDecideApproval: true,
      canPublish: true,
      canViewPublication: true,
      canReadDownstream: false,
      canOverrideConstraint: false,
      canAcquireLease: true,
      canManageAsset: false,
      canRecordCapacity: false,
      canRunValidation: true,
      canManageSnapshot: false,
    },
  } as unknown as LayoutSetupWorkspace;
}

describe("MD-PR-UX001 layout action readiness", () => {
  it("blocks submit without a current validation run", () => {
    const readiness = layoutSubmitReadiness(workspace({}));
    assert.equal(readiness.ready, false);
    assert.match(readiness.reason, /validation/i);
  });

  it("blocks publish until the exact current hash is approved", () => {
    const readiness = layoutPublishReadiness(workspace({}));
    assert.equal(readiness.ready, false);
    assert.match(readiness.reason, /approved/i);
  });
});
