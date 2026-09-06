import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORBIDDEN_PARALLEL_TRUTH,
  PLATFORM_PACKAGE,
  PLATFORM_PERSISTENCE_CONTRACT,
  SHARED_PLATFORM_OWNERSHIP,
} from "../src/constants.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("shared platform ownership", () => {
  it("declares a single authoritative owner for shared concepts", () => {
    for (const owner of Object.values(SHARED_PLATFORM_OWNERSHIP)) {
      assert.equal(owner, PLATFORM_PACKAGE);
    }
    assert.equal(PLATFORM_PERSISTENCE_CONTRACT.competingTruthStores, false);
    assert.equal(PLATFORM_PERSISTENCE_CONTRACT.productionMigrationAuthorised, true);
    assert.equal(PLATFORM_PERSISTENCE_CONTRACT.railwayMutationAuthorised, true);
    assert.equal(PLATFORM_PERSISTENCE_CONTRACT.railwayProject, "atelier-doclar");
    assert.ok(FORBIDDEN_PARALLEL_TRUTH.includes("EventOSUser"));
    assert.ok(FORBIDDEN_PARALLEL_TRUTH.includes("EventDayUser"));
    assert.ok(FORBIDDEN_PARALLEL_TRUTH.includes("EventOSGuest"));
    assert.ok(FORBIDDEN_PARALLEL_TRUTH.includes("GuestPerson"));
  });

  it("uses the same person and event identifiers for consent and guest references", () => {
    const { service } = fixtureService();
    const consent = service.recordConsent(actor(people.personDirector), {
      organisationId: people.orgMaison,
      personId: people.personPlanner,
      eventId: people.eventAlphaOne,
      purpose: "fixture-communication-preference",
    });
    const guest = service.registerGuestReference(actor(people.personDirector), {
      organisationId: people.orgMaison,
      personId: people.personPlanner,
      eventId: people.eventAlphaOne,
    });
    assert.equal(consent.personId, guest.personId);
    assert.equal(consent.eventId, guest.eventId);
    assert.equal(consent.organisationId, people.orgMaison);
    assert.equal(guest.status, "REFERENCE_ONLY");
  });
});
