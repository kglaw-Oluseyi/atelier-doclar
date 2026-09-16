import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterEventsByQuery, isSyntheticQualificationEvent } from "../src/server/event-search.ts";
import { formatProgrammePostureLine, EVENT_OS_PROGRAMME_POSTURE } from "../src/server/programme-posture.ts";

describe("event search filter", () => {
  const events = [
    { id: "c188d79b-4c1a-4734-9da2-6296324958d0", name: "EOS-S06-CUR Seating", code: "S73941100" },
    {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      name: "[SYNTHETIC QUALIFICATION] Capacity Qualification 600",
      code: "CAP600",
    },
    {
      id: "ffffffff-1111-4222-8333-444444444444",
      name: "[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000",
      code: "CAP1000",
    },
  ];

  it("matches CAP600, 600, capacity, stretch, 1000, and ids", () => {
    assert.equal(filterEventsByQuery(events, "CAP600").length, 1);
    assert.equal(filterEventsByQuery(events, "600").length, 1);
    assert.equal(filterEventsByQuery(events, "capacity").length, 2);
    assert.equal(filterEventsByQuery(events, "stretch").length, 1);
    assert.equal(filterEventsByQuery(events, "1000").length, 1);
    assert.equal(filterEventsByQuery(events, "CAP1000").length, 1);
    assert.equal(filterEventsByQuery(events, "aaaaaaaa-bbbb").length, 1);
  });

  it("does not invent events outside the permitted set", () => {
    assert.equal(filterEventsByQuery(events, "missing").length, 0);
  });

  it("labels synthetic qualification fixtures", () => {
    assert.equal(isSyntheticQualificationEvent(events[1]!), true);
    assert.equal(isSyntheticQualificationEvent(events[2]!), true);
    assert.equal(isSyntheticQualificationEvent(events[0]!), false);
  });
});

describe("programme posture", () => {
  it("renders accepted S06/S06A and pending Gate 1 without false S06A not-accepted", () => {
    const line = formatProgrammePostureLine();
    assert.match(line, /EOS-S06 ACCEPTED \(MD-PR-S077\)/);
    assert.match(line, /EOS-S06A ACCEPTED \(MD-PR-S079\)/);
    assert.match(line, /Gate 1: qualification awaiting independent verification/);
    assert.match(line, /EOS-S06B NOT_STARTED/);
    assert.match(line, /EOS-S07 NOT_STARTED/);
    assert.doesNotMatch(line, /IMPLEMENTED \(not accepted\)/);
    assert.equal(EVENT_OS_PROGRAMME_POSTURE.productionAuthorised, false);
  });
});
