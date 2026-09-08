import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_IDS, loadNonProductionFixtures, MemoryPlatformStore, PlatformError } from "@maison-doclar/shared-platform";
import { eventPermissionsFromActor } from "../src/server/event-permissions";
import { phaseTransitionOptions, scaffoldedPhaseExplanation } from "../src/server/phase-transition-display";

const NOW = "2026-09-08T20:00:00.000Z";

function actor(personId: string, correlationId: string) {
  return { personId, correlationId, now: NOW };
}

describe("MD-PR-UX001 event-create authority", () => {
  it("denies Read-Only Auditor and Planner event.create while CEO and Event Director remain allowed", () => {
    const service = loadNonProductionFixtures(new MemoryPlatformStore());
    const org = FIXTURE_IDS.orgMaison;
    assert.equal(eventPermissionsFromActor(service.resolveActor(FIXTURE_IDS.personAuditor), org).create, false);
    assert.equal(eventPermissionsFromActor(service.resolveActor(FIXTURE_IDS.personPlanner), org).create, false);
    assert.equal(eventPermissionsFromActor(service.resolveActor(FIXTURE_IDS.personCeo), org).create, true);
    assert.equal(eventPermissionsFromActor(service.resolveActor(FIXTURE_IDS.personDirector), org).create, true);
  });

  it("server-denies Auditor createEvent even when the form is not shown", () => {
    const service = loadNonProductionFixtures(new MemoryPlatformStore());
    assert.throws(
      () =>
        service.createEvent(actor(FIXTURE_IDS.personAuditor, "ux001-auditor-create"), {
          organisationId: FIXTURE_IDS.orgMaison,
          clientId: FIXTURE_IDS.clientAlpha,
          code: "UX001A",
          name: "Auditor should not create",
          startsAt: "2026-12-12T09:00:00.000Z",
          endsAt: "2026-12-12T18:00:00.000Z",
          timezone: "Africa/Lagos",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("keeps authorised Event Director creation functional", () => {
    const service = loadNonProductionFixtures(new MemoryPlatformStore());
    const created = service.createEvent(actor(FIXTURE_IDS.personDirector, "ux001-director-create"), {
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      code: "UX001D",
      name: "Director created event",
      startsAt: "2026-12-12T09:00:00.000Z",
      endsAt: "2026-12-12T18:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    assert.equal(created.name, "Director created event");
    assert.equal(created.phase, "DISCOVER");
  });

  it("presents Ready as unavailable and not selectable from Prepare", () => {
    const options = phaseTransitionOptions("PREPARE");
    assert.deepEqual(options.selectable, ["DESIGN"]);
    assert.deepEqual(options.unavailable, ["READY"]);
    assert.equal(options.selectable.includes("READY"), false);
    assert.match(scaffoldedPhaseExplanation("READY"), /cannot be selected or submitted/i);
  });
});
