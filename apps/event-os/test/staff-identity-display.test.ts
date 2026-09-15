import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_IDS, loadNonProductionFixtures } from "@maison-doclar/shared-platform";
import { MemoryPlatformStore } from "@maison-doclar/shared-platform";
import { projectStaffIdentity } from "../src/server/staff-identity-projection";
import { signInStatusMessage } from "../src/server/staff-session-status";

const NOW = "2026-09-05T15:00:00.000Z";

describe("staff identity presentation", () => {
  it("shows the Event Director name and event role without raw keys", () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const resolved = service.resolveActor(FIXTURE_IDS.personDirector);
    const presented = projectStaffIdentity({
      displayName: resolved.person.displayName,
      assignments: resolved.assignments,
      roles: resolved.roles,
      events: service.currentSnapshot().events,
      eventId: FIXTURE_IDS.eventAlphaOne,
      now: NOW,
    });
    assert.equal(presented.displayName, "Amara Okonkwo");
    assert.equal(presented.roleLabel, "Event Director");
    assert.notEqual(presented.displayName, presented.roleLabel);
    assert.doesNotMatch(presented.roleLabel, /EVENT_DIRECTOR/);
    assert.doesNotMatch(JSON.stringify(presented), new RegExp(FIXTURE_IDS.personDirector));
  });

  it("shows CEO without substituting another identity", () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const resolved = service.resolveActor(FIXTURE_IDS.personCeo);
    const presented = projectStaffIdentity({
      displayName: resolved.person.displayName,
      assignments: resolved.assignments,
      roles: resolved.roles,
      events: service.currentSnapshot().events,
      eventId: FIXTURE_IDS.eventAlphaOne,
      now: NOW,
    });
    assert.equal(presented.displayName, "George Lawson");
    assert.equal(presented.roleLabel, "CEO");
  });

  it("joins multiple same-scope roles instead of choosing CEO", () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const ceo = service.resolveActor(FIXTURE_IDS.personCeo);
    const director = service.resolveActor(FIXTURE_IDS.personDirector);
    const presented = projectStaffIdentity({
      displayName: "Adaeze Okonkwo-Chukwuemeka",
      assignments: [...ceo.assignments, ...director.assignments],
      roles: ceo.roles,
      events: service.currentSnapshot().events,
      eventId: FIXTURE_IDS.eventAlphaOne,
      now: NOW,
    });
    assert.equal(presented.displayName, "Adaeze Okonkwo-Chukwuemeka");
    assert.equal(presented.roleLabel, "CEO · Event Director");
  });

  it("uses a dignified fallback when no event assignment applies", () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const planner = service.resolveActor(FIXTURE_IDS.personPlanner);
    const presented = projectStaffIdentity({
      displayName: planner.person.displayName,
      assignments: planner.assignments,
      roles: planner.roles,
      events: service.currentSnapshot().events,
      eventId: FIXTURE_IDS.eventOther,
      now: NOW,
    });
    assert.equal(presented.roleLabel, "No event assignment in this scope");
  });
});

describe("sign-in status copy", () => {
  it("maps known session states without echoing unknown values", () => {
    assert.equal(signInStatusMessage("signed-out"), "You have been signed out.");
    assert.equal(signInStatusMessage("already-signed-out"), "You are already signed out.");
    assert.equal(signInStatusMessage("expired"), "Your session has expired. Sign in again.");
    assert.equal(signInStatusMessage("revoked"), "This session is no longer active. Sign in again.");
    assert.equal(signInStatusMessage("legacy"), "This sign-in is no longer valid. Sign in again.");
    assert.equal(signInStatusMessage("token=secret"), undefined);
  });
});
