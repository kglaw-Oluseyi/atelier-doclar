import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures } from "../src/addressing-fixtures.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04CFixturesIfMissing } from "../src/merchandise-fixtures.js";
import { applyEosS04CToSnapshot } from "../src/merchandise-migration.js";
import { applyS04DFixturesIfMissing } from "../src/forecast-fixtures.js";
import { applyEosS04DToSnapshot } from "../src/forecast-migration.js";
import { PlatformError } from "../src/errors.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { actor, fixtureService, people } from "./helpers.js";

function s04dService() {
  const { store, service } = fixtureService();
  store.replace(applyS04AFixtures(store.snapshot()));
  store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
  store.replace(applyS04BFixturesIfMissing(store.snapshot()));
  store.replace(applyEosS04CToSnapshot(store.snapshot(), "2026-09-07T12:00:00.000Z"));
  store.replace(applyS04CFixturesIfMissing(store.snapshot()));
  store.replace(applyEosS04DToSnapshot(store.snapshot(), "2026-09-07T16:00:00.000Z"));
  store.replace(applyS04DFixturesIfMissing(store.snapshot()));
  return { store, service };
}

describe("EOS-S04D journeys", () => {
  it("fails stale concurrent provision approval after the underlying forecast is superseded", () => {
    const { service } = s04dService();
    const scope = { organisationId: FIXTURE_IDS.orgMaison, eventId: FIXTURE_IDS.eventAlphaOne, reason: "journey" };
    const run = service.runAttendanceForecast(actor(people.personPlanner), { ...scope, idempotencyKey: "j1" });
    const provision = service.proposeProvisionRecommendation(actor(people.personPlanner), {
      ...scope,
      forecastRunId: run.id,
      domain: "SEATING",
      proposedQuantity: 6,
      buffer: 0,
      rationale: "Seat to the high range",
      ownerLabel: "Planner",
    });
    service.runAttendanceForecast(actor(people.personDirector, { now: "2026-09-07T17:00:00.000Z" }), {
      ...scope,
      idempotencyKey: "j2",
    });
    assert.throws(
      () =>
        service.decideProvisionRecommendation(actor(people.personDirector), {
          ...scope,
          provisionId: provision.id,
          decision: "APPROVE",
          expectedVersion: provision.version,
          decisionReason: "stale",
          reason: "stale approve",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "TRANSITION_INVALID" || error.code === "VERSION_CONFLICT"),
    );
  });

  it("keeps RSVP, forecast and provision as separate products in the workspace", () => {
    const { service } = s04dService();
    const scope = { organisationId: FIXTURE_IDS.orgMaison, eventId: FIXTURE_IDS.eventAlphaOne, reason: "products" };
    const run = service.runAttendanceForecast(actor(people.personDirector), scope);
    service.proposeProvisionRecommendation(actor(people.personPlanner), {
      ...scope,
      forecastRunId: run.id,
      domain: "TRANSPORT",
      proposedQuantity: 4,
      buffer: 1,
      rationale: "Shuttle buffer",
      ownerLabel: "Planner",
    });
    const workspace = service.getEventForecastWorkspace(actor(people.personDirector), scope.organisationId, scope.eventId);
    assert.match(workspace.products.observedRsvp, /not a forecast/i);
    assert.match(workspace.products.forecast, /estimate/i);
    assert.match(workspace.products.provision, /not attendance/i);
    assert.equal(workspace.provisions[0]?.status, "PROPOSED");
    assert.equal(workspace.programmePeople?.product, "FORECAST");
  });
});
