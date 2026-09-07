import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import {
  AttendanceForecastRunSchema,
  ForecastEstimateSchema,
  ForecastPopulationMemberSchema,
  OperationalProvisionRecommendationSchema,
} from "../src/forecast-schemas.js";
import { prohibitedForecastPayload } from "../src/forecast-operations.js";
import { FIXTURE_IDS } from "../src/fixtures.js";

describe("EOS-S04D contracts", () => {
  it("maps role authority without inventing a global domain-lead role", () => {
    const ceo = permissionsForRole("CEO");
    const director = permissionsForRole("EVENT_DIRECTOR");
    const planner = permissionsForRole("PLANNER");
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    const department = permissionsForRole("DEPARTMENT_LEAD");
    for (const key of [
      "forecast.run",
      "forecast.detail.view",
      "forecast.hostProjection.view",
      "forecast.override.propose",
      "forecast.override.approve",
      "provision.propose",
      "provision.approve",
      "model.parameters.manage",
      "model.evaluate",
      "forecast.audit.view",
    ] as const) {
      assert.ok(ceo.includes(key), key);
    }
    assert.ok(director.includes("forecast.run"));
    assert.ok(director.includes("forecast.override.approve"));
    assert.ok(director.includes("provision.approve"));
    assert.ok(planner.includes("forecast.run"));
    assert.ok(planner.includes("forecast.override.propose"));
    assert.ok(!planner.includes("forecast.override.approve"));
    assert.ok(!planner.includes("provision.approve"));
    assert.ok(!planner.includes("model.parameters.manage"));
    assert.ok(auditor.includes("forecast.detail.view"));
    assert.ok(auditor.includes("forecast.audit.view"));
    assert.ok(!auditor.includes("forecast.run"));
    assert.ok(!auditor.includes("provision.approve"));
    assert.ok(!admin.includes("forecast.run"));
    assert.ok(!admin.includes("model.parameters.manage"));
    assert.ok(!admin.includes("model.evaluate"));
    assert.ok(department.includes("provision.propose"));
    assert.ok(!department.includes("provision.approve"));
  });

  it("rejects unnamed members that fabricate a guestId and keeps products separate", () => {
    const parsed = ForecastPopulationMemberSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000101",
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      forecastRunId: "00000000-0000-4000-8000-000000000102",
      kind: "UNNAMED_ENTITLEMENT",
      guestId: "00000000-0000-4000-8000-000000000103",
      phaseIds: [],
      rsvpClass: "NO_RESPONSE",
      inclusionReason: "bad",
      probabilityLow: 0.2,
      probabilityCentral: 0.5,
      probabilityHigh: 0.8,
      assumptionKind: "UNRESOLVED_UNCERTAINTY",
      schemaVersion: 1,
      version: 1,
      createdAt: "2026-09-07T16:00:00.000Z",
      updatedAt: "2026-09-07T16:00:00.000Z",
    });
    assert.equal(parsed.success, false);
    const provision = OperationalProvisionRecommendationSchema.parse({
      id: "00000000-0000-4000-8000-000000000104",
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      forecastRunId: "00000000-0000-4000-8000-000000000102",
      domain: "CATERING",
      proposedQuantity: 5,
      buffer: 1,
      rationale: "Service buffer",
      ownerLabel: "Event Director",
      status: "PROPOSED",
      proposedByPersonId: FIXTURE_IDS.personPlanner,
      inputChecksumAtProposal: "a".repeat(64),
      product: "PROVISION",
      schemaVersion: 1,
      version: 1,
      createdAt: "2026-09-07T16:00:00.000Z",
      updatedAt: "2026-09-07T16:00:00.000Z",
    });
    assert.equal(provision.product, "PROVISION");
    const estimate = ForecastEstimateSchema.parse({
      id: "00000000-0000-4000-8000-000000000105",
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      forecastRunId: "00000000-0000-4000-8000-000000000102",
      scope: "PROGRAMME",
      product: "FORECAST",
      countsPeople: true,
      eligiblePeople: 6,
      unnamedAllowanceUnits: 0,
      exactLow: 3.7,
      exactExpected: 4.05,
      exactHigh: 4.4,
      low: 3,
      expected: 4,
      high: 5,
      explanation: "Distinct people",
      schemaVersion: 1,
      version: 1,
      createdAt: "2026-09-07T16:00:00.000Z",
      updatedAt: "2026-09-07T16:00:00.000Z",
    });
    assert.equal(estimate.product, "FORECAST");
    assert.equal(AttendanceForecastRunSchema.safeParse({ ...estimate, asOf: "x" }).success, false);
  });

  it("refuses sensitive-trait keys", () => {
    assert.equal(prohibitedForecastPayload({ ethnicity: "x", reason: "no" }), "ethnicity");
    assert.equal(prohibitedForecastPayload({ reason: "planning" }), undefined);
  });
});
