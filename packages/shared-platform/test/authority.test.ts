import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("authority separation", () => {
  it("keeps identity, membership, role, permission and assignment distinct", () => {
    const { service } = fixtureService();
    const snap = service.currentSnapshot();
    const person = snap.persons.find((item) => item.id === people.personDirector);
    const membership = snap.memberships.find((item) => item.personId === people.personDirector);
    const assignment = snap.assignments.find((item) => item.personId === people.personDirector);
    const role = snap.roles.find((item) => item.id === assignment?.roleId);
    assert.ok(person);
    assert.ok(membership);
    assert.ok(assignment);
    assert.ok(role);
    assert.notEqual(person.id, membership.id);
    assert.notEqual(membership.id, assignment.id);
    assert.notEqual(assignment.roleId, assignment.personId);
    assert.equal(role?.key, "EVENT_DIRECTOR");
    assert.equal(person.email === person.externalSubject, false);
  });

  it("denies System Administrator CEO-reserved archive", () => {
    const { service } = fixtureService();
    assert.throws(
      () =>
        service.archiveClient(actor(people.personAdmin), {
          organisationId: people.orgMaison,
          clientId: people.clientAlpha,
          expectedVersion: 1,
          reason: "admin attempt",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("denies planner access administration", () => {
    const { service } = fixtureService();
    assert.throws(
      () =>
        service.grantAssignment(actor(people.personPlanner), {
          organisationId: people.orgMaison,
          personId: people.personUnassigned,
          roleKey: "PLANNER",
          reason: "self grant",
          eventId: people.eventAlphaOne,
          clientId: people.clientAlpha,
        }),
      PlatformError,
    );
  });

  it("denies AI actors from updating Master Event File truth", () => {
    const { service } = fixtureService();
    assert.throws(
      () =>
        service.updateMasterEventFileSlot(
          { ...actor(people.personCeo), actorKind: "AI" },
          {
            masterEventFileId: people.mefAlphaOne,
            organisationId: people.orgMaison,
            expectedVersion: 1,
            slot: "DISCOVERY",
            status: "DRAFT",
            reason: "model inference",
          },
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("treats an unassigned authenticated person as access pending", () => {
    const { service } = fixtureService();
    assert.throws(
      () => service.listClients(actor(people.personUnassigned), people.orgMaison),
      (error: unknown) => error instanceof PlatformError && error.code === "ACCESS_PENDING",
    );
  });
});
