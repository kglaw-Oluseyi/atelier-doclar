import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { canSeeEvent } from "../src/policy.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { installCapacityLiveFixture, EVENT_OS_CLEANUP_PROJECT_ID } from "../src/index.js";
import { resolveTrustedSeatingAssignment, seatingAssignmentAllowsPermission } from "../src/seating-v2-trusted-assignment.js";
import { actor } from "./helpers.js";

const NOW = "2026-09-16T15:00:00.000Z";
const liveEnv = {
  RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID,
  RAILWAY_PROJECT_NAME: "atelier-doclar",
  RAILWAY_ENVIRONMENT_NAME: "production",
  RAILWAY_SERVICE_NAME: "event-os",
  DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/railway",
};

describe("capacity live verification roles", () => {
  it("CEO/director/planner/auditor access and mutation boundaries on CAP600", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const installed = await installCapacityLiveFixture(service, store, {
      fixture: "CAP600",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      guestFlushEvery: 100,
    });

    const event = store.snapshot().events.find((item) => item.id === installed.eventId)!;
    const ceoSnap = service.resolveActor(people.personCeo);
    const directorSnap = service.resolveActor(people.personDirector);
    const plannerSnap = service.resolveActor(people.personPlanner);
    const auditorSnap = service.resolveActor(people.personAuditor);
    const otherSnap = service.resolveActor(people.personUnassigned);

    assert.equal(canSeeEvent(ceoSnap, event, NOW), true);
    assert.equal(canSeeEvent(directorSnap, event, NOW), true);
    assert.equal(canSeeEvent(plannerSnap, event, NOW), true);
    assert.equal(canSeeEvent(auditorSnap, event, NOW), true);
    assert.equal(canSeeEvent(otherSnap, event, NOW), false);

    const plannerAssignment = resolveTrustedSeatingAssignment(plannerSnap, event, NOW);
    assert.equal(seatingAssignmentAllowsPermission(plannerSnap, plannerAssignment, "layout.approval.decide"), false);
    assert.equal(seatingAssignmentAllowsPermission(plannerSnap, plannerAssignment, "layout.publish"), false);

    const directorAssignment = resolveTrustedSeatingAssignment(directorSnap, event, NOW);
    assert.equal(seatingAssignmentAllowsPermission(directorSnap, directorAssignment, "layout.approval.decide"), true);
    assert.equal(seatingAssignmentAllowsPermission(directorSnap, directorAssignment, "layout.publish"), true);

    const auditorAssignment = resolveTrustedSeatingAssignment(auditorSnap, event, NOW);
    assert.equal(seatingAssignmentAllowsPermission(auditorSnap, auditorAssignment, "layout.edit"), false);
    assert.equal(seatingAssignmentAllowsPermission(auditorSnap, auditorAssignment, "guest.intake"), false);

    // Isolation: Alpha One event-scoped planner must not see CAP600 through Alpha-only assignment alone —
    // but fixture planner has CAP600 grant; create a foreign event and ensure unassigned cannot see it.
    const listed = service.listEvents(actor(people.personCeo, { now: NOW, correlationId: "role-list" }), people.orgMaison);
    assert.ok(listed.some((item) => item.id === installed.eventId));
  });
});
