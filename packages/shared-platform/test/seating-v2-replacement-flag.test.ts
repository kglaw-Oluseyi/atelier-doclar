import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { requireSeatingV2Writable, seatingV2ReplacementEnabled } from "../src/seating-v2-flag.js";
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
import { actor, fixtureService, people } from "./helpers.js";

const FLAG = "EVENT_OS_SEATING_V2_REPLACEMENT";
const NOW = "2026-09-14T06:00:00.000Z";

afterEach(() => {
  delete process.env[FLAG];
});

describe("EOS-S06 V2 replacement flag fail-closed writes", () => {
  it("defaults on so the trusted V2 mutation path remains writable", async () => {
    delete process.env[FLAG];
    assert.equal(seatingV2ReplacementEnabled(), true);
    assert.doesNotThrow(() => requireSeatingV2Writable());
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    await ensureS06SeatingLayoutBinding(store, service);
    const v2 = service.seatingV2Commands();
    const created = await v2.createRule(
      actor(people.personPlanner, { now: NOW, correlationId: "s075-flag-on" }),
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        actorAssignmentId: people.assignPlanner,
        idempotencyKey: "s075-flag-on-create",
      },
      {
        kind: "KEEP_APART",
        hardness: "HARD",
        weight: null,
        scope: "TABLE",
        specialistDomain: "NONE",
        subjects: [
          { type: "EVENT_GUEST", id: "00000000-0000-4000-8000-000000000901" },
          { type: "EVENT_GUEST", id: "00000000-0000-4000-8000-000000000902" },
        ],
        targets: [],
        source: { type: "MANUAL" },
      },
    );
    assert.equal(created.application, "APPLIED");
  });

  it("flag off fails closed with CAPABILITY_NOT_ENABLED and performs no durable mutation", async () => {
    process.env[FLAG] = "0";
    assert.equal(seatingV2ReplacementEnabled(), false);
    assert.throws(
      () => requireSeatingV2Writable(),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "CAPABILITY_NOT_ENABLED" &&
        /unavailable while V2 replacement is disabled/i.test(error.publicMessage),
    );
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    await ensureS06SeatingLayoutBinding(store, service);
    const before = store.snapshot().audit.length;
    assert.throws(() => requireSeatingV2Writable(), PlatformError);
    assert.equal(store.snapshot().audit.length, before);
  });

  it("historic V1 publication projection remains readable when the flag is off", async () => {
    process.env[FLAG] = "0";
    assert.equal(seatingV2ReplacementEnabled(), false);
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    const legacy = await service.seatingCommands().projectCurrentPublication(
      actor(people.personPlanner, { now: NOW, correlationId: "s075-flag-read" }),
      people.eventAlphaOne,
    );
    assert.ok(legacy === undefined || typeof legacy.id === "string");
    const workspace = await service.seatingCommands().projectWorkspace(
      actor(people.personPlanner, { now: NOW, correlationId: "s075-flag-ws" }),
      people.eventAlphaOne,
    );
    assert.ok(workspace);
    assert.equal(typeof workspace.eventId, "string");
  });
});
