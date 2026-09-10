import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import {
  createContinuityPlanOnSnap,
  evaluateEscalationsOnSnap,
  generateCheckpointInstancesOnSnap,
  proposeFallbackOnSnap,
  recordCheckInOnSnap,
  transitionFallbackOnSnap,
} from "../src/risk-continuity.js";
import { LIFE_SAFETY_PROTOCOL, proposeLearningOnSnap, reportIncidentOnSnap } from "../src/risk-incidents.js";
import { fixtureService, people } from "./helpers.js";

function env() {
  const { store } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { snap: store.snapshot() };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignCeo,
    expectedVersion: 0,
    idempotencyKey: `cont-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

describe("EOS-S05B continuity checkpoints fallback and incidents", () => {
  it("authorises fallback without booking payment or dispatch and records undispatched escalation", () => {
    const { snap } = env();
    const plan = createContinuityPlanOnSnap(
      snap,
      { ...envelope(), title: "AV fallback", recoveryObjectiveMinutes: 60, maximumTolerableInterruptionMinutes: 120, decisionRole: "EVENT_DIRECTOR" },
      "2026-09-10T09:18:00.000Z",
      people.personCeo,
    );
    const proposed = proposeFallbackOnSnap(
      snap,
      { ...envelope(), planId: plan.id, triggerEvidence: "Missed AV checkpoint", impact: "Ceremony sound at risk" },
      "2026-09-10T09:19:00.000Z",
      people.personCeo,
    );
    const authorised = transitionFallbackOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignDirector }), activationId: proposed.id, expectedVersion: proposed.version, to: "AUTHORISED" },
      "2026-09-10T09:20:00.000Z",
      people.personDirector,
      "HUMAN",
    );
    assert.equal(authorised.bookingRequested, false);
    assert.equal(authorised.paymentRequested, false);
    assert.equal(authorised.dispatchRequested, false);
    assert.throws(
      () =>
        transitionFallbackOnSnap(
          snap,
          { ...envelope({ assignmentId: people.assignDirector }), activationId: authorised.id, expectedVersion: authorised.version, to: "CONFIRMED" },
          "2026-09-10T09:20:30.000Z",
          people.personDirector,
          "HUMAN",
        ),
      PlatformError,
    );
    generateCheckpointInstancesOnSnap(snap, envelope(), "2026-09-10T09:17:00.000Z");
    const checkpoint = snap.riskCheckpointInstances.find((item) => item.eventId === people.eventAlphaOne);
    assert.ok(checkpoint);
    recordCheckInOnSnap(snap, { ...envelope(), checkpointId: checkpoint.id, response: "UNAVAILABLE", source: "STAFF" }, checkpoint.dueAt, people.personCeo);
    const escalated = evaluateEscalationsOnSnap(snap, envelope(), "2026-12-20T00:00:00.000Z", people.personCeo);
    assert.ok(escalated.intents.every((item) => item.dispatched === false));
  });

  it("keeps life-safety copy honest and learning proposals off the incident history", () => {
    const { snap } = env();
    const incident = reportIncidentOnSnap(
      snap,
      { ...envelope(), title: "Guest medical", severity: "HIGH", lifeSafety: true, sensitive: true },
      "2026-09-10T09:21:00.000Z",
      people.personCeo,
    );
    assert.ok(LIFE_SAFETY_PROTOCOL.includes("has not dispatched help"));
    assert.equal(incident.lifeSafety, true);
    const learning = proposeLearningOnSnap(
      snap,
      { ...envelope(), incidentId: incident.id, target: "RULE", proposal: "Review check-in timing" },
      "2026-09-10T09:21:30.000Z",
      people.personCeo,
    );
    assert.equal(learning.adopted, false);
  });
});
