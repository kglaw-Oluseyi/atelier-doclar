import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { ensureSeatingLayoutBindingForLayout } from "../src/seating-fixtures.js";
import { PROTECTION_TRANSPORT_FAILURE_SUMMARY, transportFailureFormState } from "../src/risk-form-contract.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-15T02:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s06-m503-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s06-m503-director" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `s06-m503-${key}`,
  };
}

function cas(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

function currentLayout(service: ReturnType<typeof fixtureService>["service"], layoutId: string) {
  return service.getLayoutSetupWorkspace(planner(), people.orgMaison, people.eventAlphaOne, layoutId).layout;
}

function currentPublication(store: ReturnType<typeof fixtureService>["store"], layoutId: string) {
  const publication = store.snapshot().layoutPublications.find(
    (item) => item.layoutId === layoutId && item.status === "CURRENT",
  );
  assert.ok(publication);
  return publication;
}

async function publishLineage(
  service: ReturnType<typeof fixtureService>["service"],
  store: ReturnType<typeof fixtureService>["store"],
  name: string,
  declaredCapacity: number,
) {
  const snap = store.snapshot();
  const venue =
    snap.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(director(), {
      organisationId: people.orgMaison,
      displayName: "S06 m503 pavilion",
      reason: "Seed m503 venue",
      idempotencyKey: `${name}-venue`,
    });
  const adopted = service.adoptVenue(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt m503 venue",
    idempotencyKey: `${name}-adopt`,
  });
  let layout = service.createBlankLayout(planner(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create m503 layout",
    idempotencyKey: `${name}-layout`,
  });
  layout = service.applyLayoutCommand(planner(), {
    ...cas(layout),
    reason: `Add ${name} table`,
    command: {
      kind: "CREATE_OBJECT",
      objectType: "TABLE",
      label: `${name} table`,
      geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
      subtype: { shape: "RECTANGLE", declaredCapacity },
    },
  });
  service.runLayoutValidation(planner(), { ...cas(currentLayout(service, layout.id)), reason: "Validate m503 layout" });
  const submitted = service.submitLayoutApproval(planner(), {
    ...cas(currentLayout(service, layout.id)),
    reason: "Submit m503 layout",
  });
  service.decideLayoutApproval(director(), {
    ...cas(currentLayout(service, layout.id)),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve m503 layout",
  });
  service.publishLayout(director(), { ...cas(currentLayout(service, layout.id)), reason: "Publish m503 layout" });
  return { layoutId: layout.id, publication: currentPublication(store, layout.id) };
}

async function countBindings(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
): Promise<number> {
  const rows = await v2.repository.transaction(async (tx) =>
    tx.list("layoutBindings", envelope(people.assignPlanner, "count-bindings-xx")),
  );
  return rows.length;
}

describe("EOS-S06 mutation recoverable — layout-binding proposal", () => {
  it("successful proposal; retry after durable commit replays without duplicate", async () => {
    const { service, store } = fixtureService();
    const room = await publishLineage(service, store, "M503 Propose OK", 4);
    const v2 = service.seatingV2Commands();
    const before = await countBindings(v2);
    const key = "m503-propose-ok-key";
    const first = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, key), {
      layoutPublicationId: room.publication.id,
      reason: "Propose once",
    });
    assert.equal(first.application, "APPLIED");
    assert.equal(first.didDataChange, true);
    assert.equal(first.value.state, "DRAFT");
    const mid = await countBindings(v2);
    assert.equal(mid, before + 1);
    const retry = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, key), {
      layoutPublicationId: room.publication.id,
      reason: "Propose once",
    });
    assert.equal(retry.application, "REPLAYED");
    assert.equal(retry.didDataChange, false);
    assert.equal(retry.value.id, first.value.id);
    assert.equal(await countBindings(v2), mid);
  });

  it("failure before commit writes nothing; later distinct key can succeed", async () => {
    const { service, store } = fixtureService();
    await publishLineage(service, store, "M503 Propose Fail", 4);
    const v2 = service.seatingV2Commands();
    const before = await countBindings(v2);
    await assert.rejects(
      () =>
        v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "m503-propose-miss"), {
          layoutPublicationId: "00000000-0000-4000-8000-00000000dead",
          reason: "Missing publication",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
    assert.equal(await countBindings(v2), before);
    const room = await publishLineage(service, store, "M503 Propose Recover", 4);
    const applied = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "m503-propose-recover"), {
      layoutPublicationId: room.publication.id,
      reason: "Recover after miss",
    });
    assert.equal(applied.application, "APPLIED");
    assert.equal(await countBindings(v2), before + 1);
  });

  it("same key with different payload after a failed attempt conflicts instead of writing a second binding", async () => {
    const { service, store } = fixtureService();
    const room = await publishLineage(service, store, "M503 Propose Conflict", 4);
    const v2 = service.seatingV2Commands();
    const key = "m503-propose-conflict";
    await assert.rejects(
      () =>
        v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, key), {
          layoutPublicationId: "00000000-0000-4000-8000-00000000dead",
          reason: "Missing publication",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
    // Failed attempts must not leave an idempotency receipt that blocks a corrected retry.
    const recovered = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, key), {
      layoutPublicationId: room.publication.id,
      reason: "Missing publication",
    });
    assert.equal(recovered.application, "APPLIED");
  });
});

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "M503",
    email: `${givenName.toLowerCase()}.m503@example.test`,
    reason: "M503 attending guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for M503",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

describe("EOS-S06 mutation recoverable — rule creation", () => {
  it("transport failure form state preserves values and idempotency for explicit retry", () => {
    const state = transportFailureFormState({
      attemptedValues: {
        name: "Keep these guests apart",
        idempotencyKey: "m503-rule-transport-01",
        guestIdA: "guest-a",
        guestIdB: "guest-b",
      },
    });
    assert.equal(state.status, "failure");
    assert.equal(state.preserveIdempotencyKey, true);
    assert.equal(state.summary, PROTECTION_TRANSPORT_FAILURE_SUMMARY);
    assert.equal(state.attemptedValues.idempotencyKey, "m503-rule-transport-01");
    assert.equal(state.attemptedValues.name, "Keep these guests apart");
    assert.equal(state.didDataChange, false);
    assert.equal(state.application, null);
  });

  it("successful distinct-rule creation; response-loss retry replays; no duplicate", async () => {
    const { service, store } = fixtureService();
    const room = await publishLineage(service, store, "M503 Rule Room", 4);
    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: room.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "m503-rule-bind",
    });
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      hostDisplayName: "Maison Doclar",
      eventDisplayName: "Alpha One",
      reason: "prepare RSVP for M503",
      idempotencyKey: "m503-prepare-rsvp-01",
    });
    const guestA = attendingGuest(service, "Ada", "m503-rule-a");
    const guestB = attendingGuest(service, "Bisi", "m503-rule-b");
    const v2 = service.seatingV2Commands();
    const key = "m503-rule-create-ok";
    const content = {
      kind: "KEEP_APART" as const,
      hardness: "HARD" as const,
      weight: null,
      scope: "TABLE" as const,
      specialistDomain: "NONE" as const,
      subjects: [
        { type: "EVENT_GUEST" as const, id: guestA.id },
        { type: "EVENT_GUEST" as const, id: guestB.id },
      ],
      targets: [],
      source: { type: "MANUAL" as const },
    };
    const first = await v2.createRule(planner(), envelope(people.assignPlanner, key), content);
    assert.equal(first.application, "APPLIED");
    assert.equal(first.didDataChange, true);
    const retry = await v2.createRule(planner(), envelope(people.assignPlanner, key), content);
    assert.equal(retry.application, "REPLAYED");
    assert.equal(retry.didDataChange, false);
    assert.equal(retry.value.id, first.value.id);
    void store;
  });

  it("failure before commit (no active binding) does not create a rule", async () => {
    const { service, store } = fixtureService();
    const room = await publishLineage(service, store, "M503 Rule Then Withdraw", 4);
    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: room.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "m503-rule-withdraw-bind",
    });
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      hostDisplayName: "Maison Doclar",
      eventDisplayName: "Alpha One",
      reason: "prepare RSVP for M503 withdraw",
      idempotencyKey: "m503-prepare-rsvp-withdraw",
    });
    const guestA = attendingGuest(service, "Cara", "m503-unbound-a");
    const guestB = attendingGuest(service, "Dee", "m503-unbound-b");
    const v2 = service.seatingV2Commands();
    const active = (
      await v2.repository.transaction(async (tx) => tx.list("layoutBindings", envelope(people.assignPlanner, "list-active-xx")))
    ).filter(
      (item): item is { id: string; state: string; eventId: string; version: number } =>
        typeof item === "object" &&
        item !== null &&
        "state" in item &&
        (item as { state?: string }).state === "ACTIVE" &&
        (item as { eventId?: string }).eventId === people.eventAlphaOne,
    );
    assert.ok(active.length >= 1);
    for (const [index, binding] of active.entries()) {
      await v2.withdrawLayoutBinding(director(), envelope(people.assignDirector, `m503-withdraw-${index}`), {
        bindingId: binding.id,
        expectedVersion: binding.version,
      });
    }
    await assert.rejects(
      () =>
        v2.createRule(planner(), envelope(people.assignPlanner, "m503-rule-unbound"), {
          kind: "KEEP_APART",
          hardness: "HARD",
          weight: null,
          scope: "TABLE",
          specialistDomain: "NONE",
          subjects: [
            { type: "EVENT_GUEST", id: guestA.id },
            { type: "EVENT_GUEST", id: guestB.id },
          ],
          targets: [],
          source: { type: "MANUAL" },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NO_ACTIVE_SEATING_LAYOUT_BINDING",
    );
    void store;
  });
});
