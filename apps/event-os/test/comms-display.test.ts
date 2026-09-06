import {
  channelLabel,
  eventGuestOptions,
  formatOperationalTimestamp,
  governedRoleLabel,
  maskedContactHint,
  maskedEmail,
  maskedPhone,
} from "../src/server/comms-display.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actor, fixtureService, people } from "../../../packages/shared-platform/test/helpers.ts";

const NOW = "2026-09-05T15:00:00.000Z";
const director = () => actor(people.personDirector, { now: NOW });

describe("comms display masking", () => {
  it("masks full email addresses", () => {
    assert.equal(maskedEmail("tunde.okafor@example.test"), "t***@example.test");
    assert.doesNotMatch(maskedEmail("tunde.okafor@example.test"), /tunde\.okafor@example\.test/);
  });

  it("masks full telephone numbers", () => {
    assert.equal(maskedPhone("+2348012345678"), "***5678");
    assert.doesNotMatch(maskedPhone("+2348012345678"), /8012345678/);
  });

  it("prefers masked email hints for guest selectors", () => {
    const hint = maskedContactHint({ email: "amaka.iroko@example.test" });
    assert.ok(hint);
    assert.doesNotMatch(hint, /amaka\.iroko@example\.test/);
  });

  it("does not expose complete contact values from eventGuestOptions", () => {
    const { service } = fixtureService();
    service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Mask",
      familyName: "Test",
      email: "mask.test@example.test",
      phone: "+2348099988776",
      reason: "masking test",
    });
    const options = eventGuestOptions(service, director(), people.orgMaison, people.eventAlphaOne);
    const target = options.find((item) => item.displayName.includes("Mask"));
    assert.ok(target);
    assert.doesNotMatch(target.contactHint, /mask\.test@example\.test/);
    assert.doesNotMatch(target.contactHint, /8099988776/);
    assert.match(target.contactHint, /@example\.test/);
  });
});

describe("comms display role and time labels", () => {
  it("renders governed role labels without raw keys", () => {
    assert.equal(governedRoleLabel("EVENT_DIRECTOR"), "Event Director");
    assert.equal(governedRoleLabel("CEO"), "CEO");
    assert.equal(governedRoleLabel("PLANNER"), "Planner");
    assert.notEqual(governedRoleLabel("EVENT_DIRECTOR"), "EVENT_DIRECTOR");
  });

  it("formats proposal timestamps in Africa/Lagos without raw ISO", () => {
    const label = formatOperationalTimestamp("2026-09-05T14:00:00.000Z");
    assert.match(label, /2026/);
    assert.match(label, /15:00|3:00/);
    assert.doesNotMatch(label, /T14:00:00/);
    assert.doesNotMatch(label, /Z$/);
  });

  it("labels channels without raw codes as ordinary copy", () => {
    assert.equal(channelLabel("EMAIL"), "Email");
    assert.equal(channelLabel("WHATSAPP"), "WhatsApp");
  });
});
