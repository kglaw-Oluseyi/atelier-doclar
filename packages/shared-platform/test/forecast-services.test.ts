import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04CFixturesIfMissing } from "../src/merchandise-fixtures.js";
import { applyEosS04CToSnapshot } from "../src/merchandise-migration.js";
import { applyS04DFixturesIfMissing, S04D_FIXTURE_IDS, S04D_KNOWN_COUNTS } from "../src/forecast-fixtures.js";
import { applyEosS04DToSnapshot } from "../src/forecast-migration.js";
import { coreTruthFingerprint } from "../src/forecast-operations.js";
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

const scope = {
  organisationId: FIXTURE_IDS.orgMaison,
  eventId: FIXTURE_IDS.eventAlphaOne,
  reason: "EOS-S04D synthetic verification",
};

describe("EOS-S04D services", () => {
  it("runs a governed forecast that counts people once and does not mutate RSVP truth", () => {
    const { store, service } = s04dService();
    const before = coreTruthFingerprint(store.snapshot(), FIXTURE_IDS.eventAlphaOne);
    const guestCount = store.snapshot().operationalGuests.length;
    const rsvpCount = store.snapshot().rsvpResponses.length;
    const run = service.runAttendanceForecast(actor(people.personCeo), { ...scope, idempotencyKey: "run-1" });
    assert.equal(run.status, "SUCCEEDED");
    assert.equal(run.observedRsvp.eligiblePeople, S04D_KNOWN_COUNTS.distinctPeople);
    assert.equal(run.observedRsvp.yes, S04D_KNOWN_COUNTS.yes);
    assert.equal(run.observedRsvp.no, S04D_KNOWN_COUNTS.no);
    assert.equal(run.observedRsvp.noResponse, S04D_KNOWN_COUNTS.noResponse);
    assert.equal(run.observedRsvp.unnamedAllowanceUnits, S04D_KNOWN_COUNTS.unnamedAllowance);
    const workspace = service.getEventForecastWorkspace(actor(people.personCeo), scope.organisationId, scope.eventId);
    assert.equal(workspace.programmePeople?.expected, S04D_KNOWN_COUNTS.programmeExpectedDisplay);
    assert.equal(workspace.programmePeople?.low, S04D_KNOWN_COUNTS.programmeLowDisplay);
    assert.equal(workspace.programmePeople?.high, S04D_KNOWN_COUNTS.programmeHighDisplay);
    assert.ok(workspace.phaseSumWarning);
    assert.equal(store.snapshot().operationalGuests.length, guestCount);
    assert.equal(store.snapshot().rsvpResponses.length, rsvpCount);
    assert.equal(coreTruthFingerprint(store.snapshot(), FIXTURE_IDS.eventAlphaOne), before);
    const unnamed = store.snapshot().forecastPopulationMembers.filter((item) => item.kind === "UNNAMED_ENTITLEMENT");
    assert.equal(unnamed.length, 1);
    assert.equal(unnamed[0]?.guestId, undefined);
    const peopleMembers = store.snapshot().forecastPopulationMembers.filter((item) => item.kind === "PERSON");
    assert.equal(new Set(peopleMembers.map((item) => item.guestId)).size, 6);
    assert.ok(peopleMembers.some((item) => item.guestId === S04A_FIXTURE_IDS.guestEbunoluwa));
    assert.ok(peopleMembers.some((item) => item.guestId === S04D_FIXTURE_IDS.guestBabatunde));
  });

  it("reproduces the same checksum and does not rewrite a prior run when RSVP later changes", () => {
    const { store, service } = s04dService();
    const first = service.runAttendanceForecast(actor(people.personDirector, { now: "2026-09-07T16:10:00.000Z" }), {
      ...scope,
      idempotencyKey: "run-a",
    });
    const replay = service.runAttendanceForecast(actor(people.personDirector, { now: "2026-09-07T16:10:00.000Z" }), {
      ...scope,
      idempotencyKey: "run-a",
    });
    assert.equal(replay.id, first.id);
    const next = store.snapshot();
    const kemi = next.rsvpResponses.find((item) => item.id === S04D_FIXTURE_IDS.responseKemi);
    assert.ok(kemi);
    kemi.status = "SUBMITTED";
    kemi.attendanceIntent = "ATTENDING";
    kemi.updatedAt = "2026-09-07T16:20:00.000Z";
    kemi.version += 1;
    store.replace(next);
    const second = service.runAttendanceForecast(actor(people.personDirector, { now: "2026-09-07T16:21:00.000Z" }), {
      ...scope,
      idempotencyKey: "run-b",
    });
    assert.notEqual(second.id, first.id);
    const original = store.snapshot().attendanceForecastRuns.find((item) => item.id === first.id);
    assert.equal(original?.status, "SUPERSEDED");
    assert.equal(original?.observedRsvp.noResponse, 1);
    assert.equal(second.observedRsvp.noResponse, 0);
  });

  it("enforces maker/checker, stale approval and host projection restrictions", () => {
    const { service } = s04dService();
    const run = service.runAttendanceForecast(actor(people.personPlanner), { ...scope, idempotencyKey: "run-mc" });
    const workspace = service.getEventForecastWorkspace(actor(people.personPlanner), scope.organisationId, scope.eventId);
    const estimateId = workspace.programmePeople?.id;
    assert.ok(estimateId);
    const override = service.proposeForecastOverride(actor(people.personPlanner), {
      ...scope,
      forecastRunId: run.id,
      estimateId,
      proposedLow: 3,
      proposedExpected: 4,
      proposedHigh: 5,
      evidence: "Director briefing",
      reason: "Hold the published range",
    });
    assert.throws(
      () =>
        service.decideForecastOverride(actor(people.personPlanner), {
          ...scope,
          overrideId: override.id,
          decision: "APPROVE",
          expectedVersion: override.version,
          decisionReason: "self",
          reason: "self-approval",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const approved = service.decideForecastOverride(actor(people.personDirector), {
      ...scope,
      overrideId: override.id,
      decision: "APPROVE",
      expectedVersion: override.version,
      decisionReason: "Range remains honest",
      reason: "checker approval",
    });
    assert.equal(approved.status, "APPROVED");
    const provision = service.proposeProvisionRecommendation(actor(people.personPlanner), {
      ...scope,
      forecastRunId: run.id,
      domain: "CATERING",
      proposedQuantity: 5,
      buffer: 1,
      rationale: "One-plate buffer above the high range",
      ownerLabel: "Planner",
      reason: "propose catering",
    });
    assert.throws(
      () =>
        service.decideProvisionRecommendation(actor(people.personPlanner), {
          ...scope,
          provisionId: provision.id,
          decision: "APPROVE",
          expectedVersion: provision.version,
          decisionReason: "self",
          reason: "self-approval",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const provisionApproved = service.decideProvisionRecommendation(actor(people.personDirector), {
      ...scope,
      provisionId: provision.id,
      decision: "APPROVE",
      expectedVersion: provision.version,
      decisionReason: "Planning only",
      reason: "approve catering",
    });
    assert.equal(provisionApproved.status, "APPROVED");
    assert.equal(provisionApproved.product, "PROVISION");
    assert.throws(
      () =>
        service.approveHostForecastProjection(actor(people.personPlanner), {
          ...scope,
          forecastRunId: run.id,
          expectedVersion: run.version,
          reason: "planner cannot approve host projection",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const host = service.approveHostForecastProjection(actor(people.personDirector), {
      ...scope,
      forecastRunId: run.id,
      expectedVersion: service.getEventForecastWorkspace(actor(people.personDirector), scope.organisationId, scope.eventId).currentRun?.version,
      reason: "release calm host projection",
    });
    assert.equal(host.hostProjectionStatus, "APPROVED");
    const projection = service.getHostForecastProjection(actor(people.personCeo), scope.organisationId, scope.eventId);
    assert.equal(projection.available, true);
    if (projection.available) {
      assert.ok(!JSON.stringify(projection).includes("PARAM-SET"));
      assert.ok(!JSON.stringify(projection).includes("probability"));
      assert.ok(projection.disclaimer.includes("not a counted attendance"));
    }
  });

  it("denies auditor mutation, sysadmin model authority and sensitive traits", () => {
    const { service } = s04dService();
    assert.throws(
      () => service.runAttendanceForecast(actor(people.personAuditor), scope),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.runAttendanceForecast(actor(people.personAdmin), scope),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.createEventForecastParameterSet(actor(people.personAdmin), { ...scope, yesLow: 0.8, yesCentral: 0.9, yesHigh: 0.95, noResponseLow: 0.3, noResponseCentral: 0.4, noResponseHigh: 0.5, noLow: 0, noCentral: 0.05, noHigh: 0.1, unnamedLow: 0.2, unnamedCentral: 0.5, unnamedHigh: 0.8, explanation: "no" }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.runAttendanceForecast(actor(people.personCeo), { ...scope, ethnicity: "x" }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.runAttendanceForecast(actor(people.personCeo), {
          ...scope,
          organisationId: FIXTURE_IDS.orgOther,
          eventId: FIXTURE_IDS.eventOther,
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH"),
    );
  });

  it("records shadow calibration without rewriting the original forecast", () => {
    const { store, service } = s04dService();
    const run = service.runAttendanceForecast(actor(people.personDirector), { ...scope, idempotencyKey: "cal-1" });
    const estimate = store.snapshot().forecastEstimates.find((item) => item.forecastRunId === run.id && item.countsPeople && item.scope === "PROGRAMME");
    assert.ok(estimate);
    const observation = service.recordForecastCalibration(actor(people.personDirector), {
      ...scope,
      forecastRunId: run.id,
      estimateId: estimate.id,
      evidenceKind: "SYNTHETIC_SHADOW",
      completeness: "ACCEPTED",
      observedCount: 4,
      sourceLedger: "synthetic-shadow",
      notes: "Shadow comparison only",
    });
    assert.equal(observation.originalExpected, estimate.expected);
    const evaluation = service.evaluateForecast(actor(people.personDirector), {
      ...scope,
      observationId: observation.id,
      reason: "shadow review",
    });
    assert.equal(evaluation.releaseRecommendation, "NOT_RELEASED");
    const preserved = store.snapshot().forecastEstimates.find((item) => item.id === estimate.id);
    assert.equal(preserved?.expected, estimate.expected);
    assert.equal(preserved?.low, estimate.low);
    assert.equal(preserved?.high, estimate.high);
  });
});
