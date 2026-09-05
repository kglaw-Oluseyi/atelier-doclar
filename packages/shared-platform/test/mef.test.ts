import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MEF_COMPOSITION_SLOTS } from "../src/constants.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("Master Event File foundation", () => {
  it("creates a versioned MEF with doctrine composition slots on event create", () => {
    const { service } = fixtureService();
    const created = service.createEvent(actor(people.personCeo), {
      organisationId: people.orgMaison,
      clientId: people.clientBeta,
      code: "B1",
      name: "Beta First",
      startsAt: "2026-11-01T09:00:00.000Z",
      endsAt: "2026-11-01T18:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    const mef = service.getMasterEventFile(actor(people.personCeo), people.orgMaison, created.id);
    assert.equal(mef.eventId, created.id);
    assert.equal(mef.slots.length, MEF_COMPOSITION_SLOTS.length);
    assert.ok(mef.slots.every((slot) => slot.status === "NOT_COMPOSED"));
    assert.ok(mef.slots.every((slot) => slot.verificationState === "UNVERIFIED"));
    const updated = service.updateMasterEventFileSlot(actor(people.personCeo), {
      masterEventFileId: mef.id,
      organisationId: people.orgMaison,
      expectedVersion: 1,
      slot: "DISCOVERY",
      status: "DRAFT",
      reason: "human-authored discovery note",
      note: "Foundation slot only",
    });
    assert.equal(updated.version, 2);
    assert.equal(updated.slots.find((slot) => slot.key === "DISCOVERY")?.authorityPersonId, people.personCeo);
  });
});
