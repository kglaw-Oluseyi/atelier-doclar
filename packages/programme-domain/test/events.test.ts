import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgrammeEvent } from "../src/index.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { VALID_COMMIT, VALID_TIME } from "./helpers.js";
import { makeEvent, testEngine } from "./event-helpers.js";

describe("programme events", () => {
  it("accepts a well-formed event", () => {
    const event = makeEvent({
      eventType: "COMMIT_LINKED",
      payload: { sha: VALID_COMMIT },
    });
    assert.equal(event.schemaVersion, 1);
    assert.equal(event.eventType, "COMMIT_LINKED");
  });

  it("rejects a malformed event", () => {
    assert.throws(
      () => parseProgrammeEvent({ eventType: "COMMIT_LINKED" }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("rejects an unknown event type", () => {
    assert.throws(
      () =>
        parseProgrammeEvent({
          eventId: "EVT-X",
          eventType: "SLICE_DELETED",
          schemaVersion: 1,
          aggregateType: "slice",
          aggregateId: "MD-AA",
          product: "FOUNDATION",
          occurredAt: VALID_TIME,
          recordedAt: VALID_TIME,
          actor: { id: "t", role: "IMPLEMENTER" },
          source: "test",
          idempotencyKey: "k",
          payload: {},
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "UNKNOWN_EVENT_TYPE",
    );
  });

  it("rejects an unsupported event version", () => {
    assert.throws(
      () =>
        parseProgrammeEvent({
          eventId: "EVT-X",
          eventType: "COMMIT_LINKED",
          schemaVersion: 99,
          aggregateType: "slice",
          aggregateId: "MD-AA",
          product: "FOUNDATION",
          occurredAt: VALID_TIME,
          recordedAt: VALID_TIME,
          actor: { id: "t", role: "IMPLEMENTER" },
          source: "test",
          idempotencyKey: "k",
          payload: { sha: VALID_COMMIT },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "UNSUPPORTED_EVENT_VERSION",
    );
  });

  it("rejects acceptance recorded by an implementer", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          actor: { id: "cursor", role: "IMPLEMENTER" },
          payload: { acceptedAt: VALID_TIME, acceptedBy: "Named Reviewer", authorityRole: "REVIEWER" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("rejects a causal reference that does not exist when appending", () => {
    const { engine } = testEngine();
    assert.throws(
      () =>
        engine.append(
          makeEvent({
            eventType: "CORRECTION_APPENDED",
            payload: { correctsEventId: "EVT-MISSING", reason: "no target" },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError,
    );
  });

  it("rejects UNKNOWN as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          actor: { id: "rev", role: "REVIEWER" },
          payload: { acceptedAt: VALID_TIME, acceptedBy: "UNKNOWN", authorityRole: "REVIEWER" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError,
    );
  });
});
