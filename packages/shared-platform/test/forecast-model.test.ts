import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeForecast, displayRange, classifyAttendanceIntent } from "../src/forecast-model.js";
import { defaultModelParameterSet } from "../src/forecast-operations.js";
import { S04D_KNOWN_COUNTS } from "../src/forecast-fixtures.js";
import { FIXTURE_IDS } from "../src/fixtures.js";

const parameters = defaultModelParameterSet(FIXTURE_IDS.orgMaison, "2026-09-07T16:00:00.000Z", FIXTURE_IDS.personCeo);

describe("EOS-S04D forecast model", () => {
  it("classifies RSVP without inventing a silent unknown rate", () => {
    assert.equal(classifyAttendanceIntent("ATTENDING", true), "YES");
    assert.equal(classifyAttendanceIntent("NOT_ATTENDING", true), "NO");
    assert.equal(classifyAttendanceIntent(undefined, false), "NO_RESPONSE");
    assert.equal(classifyAttendanceIntent("mystery", true), "UNKNOWN");
  });

  it("counts distinct people and keeps unnamed allowances out of the people union", () => {
    const result = computeForecast(
      {
        eventId: FIXTURE_IDS.eventAlphaOne,
        asOf: "2026-09-07T16:00:00.000Z",
        people: [
          { guestId: "g1", phaseIds: ["church", "reception"], rsvpClass: "YES", inclusionReason: "p" },
          { guestId: "g2", phaseIds: ["church"], rsvpClass: "YES", inclusionReason: "p" },
          { guestId: "g3", phaseIds: ["reception"], rsvpClass: "YES", inclusionReason: "p" },
          { guestId: "g4", phaseIds: ["reception"], rsvpClass: "NO_RESPONSE", inclusionReason: "p" },
          { guestId: "g5", phaseIds: ["church"], rsvpClass: "NO", inclusionReason: "p" },
          { guestId: "g6", phaseIds: ["reception"], rsvpClass: "YES", inclusionReason: "p" },
        ],
        unnamed: [{ entitlementId: "e1", principalGuestId: "g1", allowance: 1, phaseIds: ["church", "reception"], inclusionReason: "u" }],
      },
      parameters,
      "2026-09-07T16:00:00.000Z",
    );
    assert.equal(result.programmePeople.eligiblePeople, S04D_KNOWN_COUNTS.distinctPeople);
    assert.equal(result.programmePeople.unnamedAllowanceUnits, 0);
    assert.equal(result.programmeOccupancy.unnamedAllowanceUnits, 1);
    assert.equal(result.programmePeople.exactExpected, S04D_KNOWN_COUNTS.programmeExpectedExact);
    assert.equal(result.programmePeople.exactLow, S04D_KNOWN_COUNTS.programmeLowExact);
    assert.equal(result.programmePeople.exactHigh, S04D_KNOWN_COUNTS.programmeHighExact);
    assert.equal(result.programmePeople.low, S04D_KNOWN_COUNTS.programmeLowDisplay);
    assert.equal(result.programmePeople.expected, S04D_KNOWN_COUNTS.programmeExpectedDisplay);
    assert.equal(result.programmePeople.high, S04D_KNOWN_COUNTS.programmeHighDisplay);
    const church = result.phases.find((item) => item.phaseId === "church");
    const reception = result.phases.find((item) => item.phaseId === "reception");
    assert.equal(church?.people.eligiblePeople, 3);
    assert.equal(reception?.people.eligiblePeople, 4);
    assert.equal(church?.people.exactExpected, S04D_KNOWN_COUNTS.churchExpectedExact);
    assert.equal(reception?.people.exactExpected, S04D_KNOWN_COUNTS.receptionExpectedExact);
    const phaseSum = (church?.people.expected ?? 0) + (reception?.people.expected ?? 0);
    assert.notEqual(phaseSum, result.programmePeople.expected);
    assert.ok(result.programmePeople.low <= result.programmePeople.expected && result.programmePeople.expected <= result.programmePeople.high);
    assert.ok(result.programmePeople.high <= result.programmePeople.eligiblePeople);
  });

  it("reproduces the same result from the same inputs and parameter version", () => {
    const input = {
      eventId: FIXTURE_IDS.eventAlphaOne,
      asOf: "2026-09-07T16:00:00.000Z",
      people: [{ guestId: "g1", phaseIds: ["church"], rsvpClass: "YES" as const, inclusionReason: "p" }],
      unnamed: [] as const,
    };
    const first = computeForecast(input, parameters, "2026-09-07T16:00:00.000Z");
    const second = computeForecast(input, parameters, "2026-09-07T16:00:00.000Z");
    assert.equal(first.populationChecksum, second.populationChecksum);
    assert.equal(first.programmePeople.exactExpected, second.programmePeople.exactExpected);
    assert.equal(first.modelVersion, "FORECAST-MODEL-V1");
  });

  it("keeps displayed bounds non-negative and inside the eligible population", () => {
    const range = displayRange(0.1, 0.4, 0.9, 1);
    assert.equal(range.low, 0);
    assert.equal(range.high, 1);
    assert.ok(range.low <= range.expected && range.expected <= range.high);
    const empty = displayRange(0, 0, 0, 0);
    assert.equal(empty.high, 0);
  });
});
