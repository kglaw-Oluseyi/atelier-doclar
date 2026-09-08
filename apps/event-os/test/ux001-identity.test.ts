import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_IDS, loadNonProductionFixtures, MemoryPlatformStore } from "@maison-doclar/shared-platform";
import {
  IDENTITY_UNAVAILABLE,
  buildGovernanceLabelIndex,
  presentAssignment,
  presentAuditEvent,
} from "../src/server/identity-resolution";

const NOW = "2026-09-08T20:00:00.000Z";

describe("MD-PR-UX001 role-safe identity resolution", () => {
  it("resolves authorised staff and event labels without using UUIDs as the primary label", () => {
    const service = loadNonProductionFixtures(new MemoryPlatformStore());
    const actor = { personId: FIXTURE_IDS.personCeo, correlationId: "ux001-id-ceo", now: NOW };
    const index = buildGovernanceLabelIndex(service, actor, FIXTURE_IDS.orgMaison);
    assert.equal(index.persons.get(FIXTURE_IDS.personDirector), "Event Director");
    assert.equal(index.events.get(FIXTURE_IDS.eventAlphaOne), "Alpha One");
    assert.equal(index.persons.has(FIXTURE_IDS.personOtherOrg), false);
    const assignment = service.listAssignments(actor, FIXTURE_IDS.orgMaison).find((item) => item.eventId === FIXTURE_IDS.eventAlphaOne);
    assert.ok(assignment);
    const presented = presentAssignment(assignment, index, NOW);
    assert.equal(presented.scopeLabel, "Alpha One");
    assert.doesNotMatch(presented.personLabel, /00000000-0000-4000-8000/);
    assert.doesNotMatch(presented.roleLabel, /EVENT_DIRECTOR/);
  });

  it("does not leak other-organisation or out-of-scope event names to a Planner", () => {
    const service = loadNonProductionFixtures(new MemoryPlatformStore());
    const actor = { personId: FIXTURE_IDS.personPlanner, correlationId: "ux001-id-planner", now: NOW };
    const index = buildGovernanceLabelIndex(service, actor, FIXTURE_IDS.orgMaison);
    assert.equal(index.events.has(FIXTURE_IDS.eventAlphaTwo), false);
    assert.equal(index.events.has(FIXTURE_IDS.eventOther), false);
    assert.equal(index.persons.has(FIXTURE_IDS.personOtherOrg), false);
    const hiddenEvent = presentAuditEvent(
      {
        id: "00000000-0000-4000-8000-000000009901",
        occurredAt: NOW,
        actorType: "STAFF",
        actorPersonId: FIXTURE_IDS.personOtherOrg,
        service: "event-os",
        action: "event.viewed",
        outcome: "SUCCESS",
        organisationId: FIXTURE_IDS.orgOther,
        eventId: FIXTURE_IDS.eventOther,
        resourceType: "event",
        resourceId: FIXTURE_IDS.eventOther,
        correlationId: "corr-hidden",
        schemaVersion: 1,
      },
      index,
    );
    assert.equal(hiddenEvent.actorLabel, IDENTITY_UNAVAILABLE);
    assert.match(hiddenEvent.targetLabel, /unavailable|Event/i);
    assert.doesNotMatch(JSON.stringify(hiddenEvent), /Other Org|Alpha Two/);
  });
});
