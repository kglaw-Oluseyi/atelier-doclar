import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HONORIFICS, applyS04AFixtures, S04A_FIXTURE_IDS } from "@maison-doclar/shared-platform";
import { actor, fixtureService, people } from "../../../packages/shared-platform/test/helpers.ts";

describe("Event OS addressing frontend contracts", () => {
  it("keeps a blank honorific option and never requires a default title", () => {
    assert.ok(HONORIFICS.includes("Dr (Mrs)"));
    assert.ok(!HONORIFICS.includes(""));
  });

  it("exposes a typed workspace to authorised operators and denies Client Lead", () => {
    const { store, service } = fixtureService();
    store.replace(applyS04AFixtures(store.snapshot()));
    const workspace = service.getGuestAddressingWorkspace(
      actor(people.personDirector),
      people.orgMaison,
      people.eventAlphaOne,
      S04A_FIXTURE_IDS.guestEbunoluwa,
    );
    assert.equal(workspace.guest.honorific, "Dr (Mrs)");
    assert.equal(workspace.guest.formalSalutation.inferredTitle, false);
    assert.equal(workspace.capabilities.canConfirmAddressing, true);
    service.grantAssignment(actor(people.personCeo), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "CLIENT_LEAD",
      eventId: people.eventAlphaOne,
      reason: "client lead contract",
    });
    assert.throws(() =>
      service.getGuestAddressingWorkspace(
        actor(people.personUnassigned),
        people.orgMaison,
        people.eventAlphaOne,
        S04A_FIXTURE_IDS.guestEbunoluwa,
      ),
    );
  });
});
