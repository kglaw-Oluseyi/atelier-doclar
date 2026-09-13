import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { ensureSeatingLayoutBindingForLayout } from "../src/seating-fixtures.js";
import { historicBindingFromPackage, resolveSeatingLayoutAuthority, requireSeatingLayoutAuthority } from "../src/seating-v2-layout-binding.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { emptySeatingV2State, type SeatingV2LayoutBinding } from "../src/seating-v2-state.js";
import { buildSeatingV2Workspace } from "../src/seating-v2-workspace.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-13T15:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-bind-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-bind-director" });
}
function auditor() {
  return actor(people.personAuditor, { now: NOW, correlationId: "s075-bind-auditor" });
}
function admin() {
  return actor(people.personAdmin, { now: NOW, correlationId: "s075-bind-admin" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `s075-bind-${key}`,
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

function currentPublication(
  store: ReturnType<typeof fixtureService>["store"],
  layoutId: string,
) {
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
      displayName: "S075 binding pavilion",
      reason: "Seed binding venue",
      idempotencyKey: `${name}-venue`,
    });
  const adopted = service.adoptVenue(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt binding venue",
    idempotencyKey: `${name}-adopt`,
  });
  let layout = service.createBlankLayout(planner(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create binding layout",
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
  service.runLayoutValidation(planner(), { ...cas(currentLayout(service, layout.id)), reason: "Validate binding layout" });
  const submitted = service.submitLayoutApproval(planner(), {
    ...cas(currentLayout(service, layout.id)),
    reason: "Submit binding layout",
  });
  service.decideLayoutApproval(director(), {
    ...cas(currentLayout(service, layout.id)),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve binding layout",
  });
  service.publishLayout(director(), { ...cas(currentLayout(service, layout.id)), reason: "Publish binding layout" });
  const publication = currentPublication(store, layout.id);
  return { layoutId: layout.id, publication };
}

describe("EOS-S06 seating layout binding", () => {
  it("fails closed without an active binding and creates no package", async () => {
    const { service, store } = fixtureService();
    await publishLineage(service, store, "Room A", 4);
    await publishLineage(service, store, "Room B", 8);
    const v2 = service.seatingV2Commands();
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "absent-freeze")),
      (error: unknown) => error instanceof PlatformError && error.code === "NO_ACTIVE_SEATING_LAYOUT_BINDING",
    );
    const packages = await v2.repository.transaction(async (tx) =>
      tx.list("inputPackages", envelope(people.assignPlanner, "absent-list")),
    );
    assert.equal(packages.length, 0);
    const effect = service.consumeLastMutationEffect();
    assert.equal(effect?.application, "NOT_APPLIED");
    assert.equal(effect?.didDataChange, false);
    const authority = resolveSeatingLayoutAuthority(
      store.snapshot(),
      emptySeatingV2State().layoutBindings,
      people.orgMaison,
      people.eventAlphaOne,
    );
    assert.equal(authority.state, "ABSENT");
  });

  it("keeps the bound Room B publication after reversing publication array order", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Room A", 4);
    const roomB = await publishLineage(service, store, "Room B", 8);
    assert.notEqual(roomA.publication.id, roomB.publication.id);
    assert.notEqual(roomA.publication.contentHash, roomB.publication.contentHash);
    const binding = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "bind-b",
    });
    const reversed = store.snapshot();
    store.replace({
      ...reversed,
      layoutPublications: [...reversed.layoutPublications].reverse(),
    });
    const authority = requireSeatingLayoutAuthority(
      store.snapshot(),
      [binding],
      people.orgMaison,
      people.eventAlphaOne,
    );
    assert.equal(authority.binding.layoutPublicationId, roomB.publication.id);
    assert.equal(authority.layout.publicationId, roomB.publication.id);
    assert.equal(authority.layout.contentHash, roomB.publication.contentHash);
    const frozen = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "order-freeze"));
    assert.equal(frozen.application, "APPLIED");
    assert.equal(frozen.value.layoutPublicationId, roomB.publication.id);
    assert.equal(frozen.value.layoutContentHash, roomB.publication.contentHash);
    assert.equal(frozen.value.seatingLayoutBindingId, binding.id);
    const view = buildSeatingV2Workspace(store.snapshot(), { ...emptySeatingV2State(), layoutBindings: [binding] }, people.eventAlphaOne, "PLANNER");
    assert.equal(view.seatingLayoutBinding?.status, "BOUND");
    assert.equal(view.seatingLayoutBinding?.publicationNumber, roomB.publication.publicationNumber);
    assert.match(`CURRENT publication ${view.seatingLayoutBinding?.publicationNumber}`, /CURRENT publication \d+/);
    assert.doesNotMatch(view.seatingLayoutBinding?.layoutLabel ?? "", /No current publication/);
  });

  it("stales the binding when the bound lineage publishes a successor", async () => {
    const { service, store } = fixtureService();
    const roomB = await publishLineage(service, store, "Room B successor", 6);
    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "bind-stale",
    });
    const v2 = service.seatingV2Commands();
    const first = await v2.freezePackage(planner(), envelope(people.assignPlanner, "stale-freeze-1"));
    service.applyLayoutCommand(planner(), {
      ...cas(currentLayout(service, roomB.layoutId)),
      reason: "Successor table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Successor",
        geometry: { kind: "RECTANGLE", xMm: 7200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 2 },
      },
    });
    service.runLayoutValidation(planner(), { ...cas(currentLayout(service, roomB.layoutId)), reason: "Validate successor" });
    const submitted = service.submitLayoutApproval(planner(), {
      ...cas(currentLayout(service, roomB.layoutId)),
      reason: "Submit successor",
    });
    service.decideLayoutApproval(director(), {
      ...cas(currentLayout(service, roomB.layoutId)),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve successor",
    });
    service.publishLayout(director(), { ...cas(currentLayout(service, roomB.layoutId)), reason: "Publish successor" });
    const successor = currentPublication(store, roomB.layoutId);
    assert.notEqual(successor.id, roomB.publication.id);
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "stale-freeze-2")),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_LAYOUT_BINDING_STALE",
    );
    const staleEffect = service.consumeLastMutationEffect();
    assert.equal(staleEffect?.application, "NOT_APPLIED");
    assert.equal(staleEffect?.didDataChange, false);
    const packages = await v2.repository.transaction(async (tx) =>
      tx.list<{ id: string }>("inputPackages", envelope(people.assignPlanner, "stale-list")),
    );
    assert.equal(packages.length, 1);
    assert.equal(packages[0]!.id, first.value.id);
    const successorBinding = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "bind-stale-next",
    });
    const next = await v2.freezePackage(planner(), envelope(people.assignPlanner, "stale-freeze-3"));
    assert.equal(next.value.layoutPublicationId, successor.id);
    assert.equal(next.value.seatingLayoutBindingId, successorBinding.id);
    assert.notEqual(next.value.id, first.value.id);
  });

  it("rejects two active bindings and unknown or withdrawn authority", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Ambiguous A", 3);
    const roomB = await publishLineage(service, store, "Ambiguous B", 5);
    const now = NOW;
    const left: SeatingV2LayoutBinding = {
      id: "00000000-0000-4000-8000-00000000b001",
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      state: "ACTIVE",
      version: 1,
      proposedByPersonId: people.personPlanner,
      proposedAt: now,
      activatedByPersonId: people.personDirector,
      activatedAt: now,
      reason: "test left",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    const right: SeatingV2LayoutBinding = {
      ...left,
      id: "00000000-0000-4000-8000-00000000b002",
      layoutId: roomB.layoutId,
      layoutPublicationId: roomB.publication.id,
      layoutContentHash: roomB.publication.contentHash,
      reason: "test right",
    };
    const ambiguous = resolveSeatingLayoutAuthority(store.snapshot(), [left, right], people.orgMaison, people.eventAlphaOne);
    assert.equal(ambiguous.state, "AMBIGUOUS");
    assert.throws(
      () => requireSeatingLayoutAuthority(store.snapshot(), [left, right], people.orgMaison, people.eventAlphaOne),
      (error: unknown) => error instanceof PlatformError && error.code === "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS",
    );
    const withdrawn = resolveSeatingLayoutAuthority(
      store.snapshot(),
      [{ ...left, state: "WITHDRAWN" }],
      people.orgMaison,
      people.eventAlphaOne,
    );
    assert.equal(withdrawn.state, "ABSENT");
    const mismatch = resolveSeatingLayoutAuthority(
      store.snapshot(),
      [{ ...left, layoutContentHash: "0".repeat(64) }],
      people.orgMaison,
      people.eventAlphaOne,
    );
    assert.equal(mismatch.state, "MISMATCH");
  });

  it("keeps maker/checker separation and denies auditor and administrator activation", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Authority Room", 4);
    const v2 = service.seatingV2Commands();
    const proposed = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "auth-propose"), {
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      reason: "Propose Room A",
    });
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(planner(), envelope(people.assignPlanner, "auth-self"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(auditor(), envelope(people.assignAuditor, "auth-auditor"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(admin(), envelope(people.assignAdmin, "auth-admin"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const activated = await v2.activateLayoutBinding(director(), envelope(people.assignDirector, "auth-activate"), {
      bindingId: proposed.value.id,
      expectedVersion: proposed.value.version,
    });
    assert.equal(activated.application, "APPLIED");
    assert.equal(activated.value.state, "ACTIVE");
    assert.equal(activated.value.activatedByPersonId, people.personDirector);
  });

  it("does not treat another event or organisation binding as authority", async () => {
    const { store } = fixtureService();
    const foreign: SeatingV2LayoutBinding = {
      id: "00000000-0000-4000-8000-00000000b099",
      organisationId: people.orgOther,
      eventId: people.eventAlphaOne,
      layoutId: "00000000-0000-4000-8000-00000000b100",
      layoutPublicationId: "00000000-0000-4000-8000-00000000b101",
      layoutContentHash: "ab".repeat(32),
      state: "ACTIVE",
      version: 1,
      proposedByPersonId: people.personPlanner,
      proposedAt: NOW,
      reason: "foreign",
      schemaVersion: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const resolved = resolveSeatingLayoutAuthority(store.snapshot(), [foreign], people.orgMaison, people.eventAlphaOne);
    assert.equal(resolved.state, "ABSENT");
    const { service, store: commandStore } = fixtureService();
    const roomA = await publishLineage(service, commandStore, "Scope A", 4);
    await assert.rejects(
      () =>
        service.seatingV2Commands().proposeLayoutBinding(
          planner(),
          {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaTwo,
            actorAssignmentId: people.assignPlanner,
            idempotencyKey: "s075-bind-cross-event",
          },
          {
            layoutId: roomA.layoutId,
            layoutPublicationId: roomA.publication.id,
            layoutContentHash: roomA.publication.contentHash,
            reason: "Cross-event propose",
          },
        ),
      (error: unknown) =>
        error instanceof PlatformError && (error.code === "SCOPE_MISMATCH" || error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
  });

  it("fails freeze before package on ambiguous, stale and mismatched bindings with NOT_APPLIED", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Fail A", 4);
    const roomB = await publishLineage(service, store, "Fail B", 8);
    const v2 = service.seatingV2Commands();
    const repo = v2.repository as MemorySeatingV2Repository;
    const now = NOW;
    const left: SeatingV2LayoutBinding = {
      id: "00000000-0000-4000-8000-00000000b011",
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      state: "ACTIVE",
      version: 1,
      proposedByPersonId: people.personPlanner,
      proposedAt: now,
      activatedByPersonId: people.personDirector,
      activatedAt: now,
      reason: "left",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    const right: SeatingV2LayoutBinding = {
      ...left,
      id: "00000000-0000-4000-8000-00000000b012",
      layoutId: roomB.layoutId,
      layoutPublicationId: roomB.publication.id,
      layoutContentHash: roomB.publication.contentHash,
    };
    repo.backingStore.replaceState({ ...repo.backingStore.snapshot(), layoutBindings: [left, right] });
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "amb-freeze")),
      (error: unknown) => error instanceof PlatformError && error.code === "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS",
    );
    let effect = service.consumeLastMutationEffect();
    assert.equal(effect?.application, "NOT_APPLIED");
    assert.equal(effect?.didDataChange, false);
    repo.backingStore.replaceState({
      ...repo.backingStore.snapshot(),
      layoutBindings: [{ ...left, layoutContentHash: "f".repeat(64) }],
    });
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "mis-freeze")),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_LAYOUT_PUBLICATION_MISMATCH",
    );
    effect = service.consumeLastMutationEffect();
    assert.equal(effect?.application, "NOT_APPLIED");
    const packages = await v2.repository.transaction(async (tx) =>
      tx.list("inputPackages", envelope(people.assignPlanner, "fail-list")),
    );
    assert.equal(packages.length, 0);
  });

  it("pins binding, layout, publication and hash on the frozen package", async () => {
    const { service, store } = fixtureService();
    const roomB = await publishLineage(service, store, "Provenance B", 8);
    const binding = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "prov-b",
    });
    const frozen = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "prov-freeze"));
    assert.equal(frozen.value.seatingLayoutBindingId, binding.id);
    assert.equal(frozen.value.layoutId, roomB.layoutId);
    assert.equal(frozen.value.layoutPublicationId, roomB.publication.id);
    assert.equal(frozen.value.layoutContentHash, roomB.publication.contentHash);
  });

  it("refuses a second ACTIVE insert and concurrent activation of the same draft", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Concurrent A", 4);
    const v2 = service.seatingV2Commands();
    const proposed = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "conc-propose"), {
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      reason: "Concurrent draft",
    });
    const settled = await Promise.allSettled([
      v2.activateLayoutBinding(director(), envelope(people.assignDirector, "conc-act-1"), {
        bindingId: proposed.value.id,
        expectedVersion: proposed.value.version,
      }),
      v2.activateLayoutBinding(director(), envelope(people.assignDirector, "conc-act-2"), {
        bindingId: proposed.value.id,
        expectedVersion: proposed.value.version,
      }),
    ]);
    const applied = settled.filter((item) => item.status === "fulfilled");
    const rejected = settled.filter((item) => item.status === "rejected");
    assert.equal(applied.length, 1);
    assert.equal(rejected.length, 1);
    if (rejected[0]?.status === "rejected") {
      assert.ok(rejected[0].reason instanceof PlatformError);
      assert.ok(
        rejected[0].reason.code === "VERSION_CONFLICT" ||
          rejected[0].reason.code === "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS",
      );
    }
    const actives = (
      await v2.repository.transaction(async (tx) =>
        tx.list<SeatingV2LayoutBinding>("layoutBindings", envelope(people.assignPlanner, "conc-list")),
      )
    ).filter((item) => item.state === "ACTIVE");
    assert.equal(actives.length, 1);
    await assert.rejects(
      () =>
        v2.repository.transaction(async (tx) =>
          tx.insert("layoutBindings", {
            ...actives[0]!,
            id: "00000000-0000-4000-8000-00000000b020",
          }),
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS",
    );
  });

  it("rejects stale activation versions, replays identical activation, and rolls back a failed write", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Replay A", 4);
    const v2 = service.seatingV2Commands();
    const proposed = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "rep-propose"), {
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      reason: "Replay draft",
    });
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(director(), envelope(people.assignDirector, "rep-stale"), {
          bindingId: proposed.value.id,
          expectedVersion: 9,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const first = await v2.activateLayoutBinding(director(), envelope(people.assignDirector, "rep-act"), {
      bindingId: proposed.value.id,
      expectedVersion: proposed.value.version,
    });
    assert.equal(first.application, "APPLIED");
    const replayed = await v2.activateLayoutBinding(director(), envelope(people.assignDirector, "rep-act"), {
      bindingId: proposed.value.id,
      expectedVersion: proposed.value.version,
    });
    assert.equal(replayed.application, "REPLAYED");
    assert.equal(replayed.didDataChange, false);
    const repo = new MemorySeatingV2Repository();
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.insert("layoutBindings", {
            id: "00000000-0000-4000-8000-00000000b030",
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            layoutId: roomA.layoutId,
            layoutPublicationId: roomA.publication.id,
            layoutContentHash: roomA.publication.contentHash,
            state: "DRAFT",
            version: 1,
            proposedByPersonId: people.personPlanner,
            proposedAt: NOW,
            reason: "rollback",
            schemaVersion: 1,
            createdAt: NOW,
            updatedAt: NOW,
          });
          throw new Error("synthetic binding rollback");
        }),
      /synthetic binding rollback/,
    );
    assert.equal(repo.backingStore.collection("layoutBindings").length, 0);
  });

  it("leaves unrelated CURRENT lineages immutable and never backfills first or latest", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Keep A", 4);
    const roomB = await publishLineage(service, store, "Keep B", 8);
    await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "keep-b",
    });
    const currents = store
      .snapshot()
      .layoutPublications.filter(
        (item) =>
          item.eventId === people.eventAlphaOne &&
          item.status === "CURRENT" &&
          (item.layoutId === roomA.layoutId || item.layoutId === roomB.layoutId),
      );
    assert.equal(currents.length, 2);
    assert.ok(currents.some((item) => item.id === roomA.publication.id));
    assert.ok(currents.some((item) => item.id === roomB.publication.id));
    const historic = historicBindingFromPackage({
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomA.layoutId,
      layoutPublicationId: roomA.publication.id,
      layoutContentHash: roomA.publication.contentHash,
      frozenAt: NOW,
      frozenByPersonId: people.personPlanner,
    });
    assert.equal(historic.state, "SUPERSEDED");
    const { service: fresh, store: freshStore } = fixtureService();
    await publishLineage(fresh, freshStore, "Latest A", 4);
    await publishLineage(fresh, freshStore, "Latest B", 8);
    await assert.rejects(
      () => fresh.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "no-backfill-freeze")),
      (error: unknown) => error instanceof PlatformError && error.code === "NO_ACTIVE_SEATING_LAYOUT_BINDING",
    );
  });

  it("shows governed labels, hash prefix and disables freeze until bound", async () => {
    const { service, store } = fixtureService();
    const roomA = await publishLineage(service, store, "Label A", 4);
    const roomB = await publishLineage(service, store, "Label B", 8);
    const empty = buildSeatingV2Workspace(store.snapshot(), emptySeatingV2State(), people.eventAlphaOne, "PLANNER");
    assert.equal(empty.seatingLayoutBinding?.status, "ABSENT");
    assert.equal(empty.seatingLayoutBinding?.freezeDisabled, true);
    assert.ok(empty.seatingLayoutBindingCandidates?.some((item) => item.layoutLabel === "Label B"));
    assert.ok(empty.seatingLayoutBindingCandidates?.every((item) => item.contentHash.length >= 12));
    assert.equal(empty.nextAction, "Activate a seating layout binding");
    const binding = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: roomB.layoutId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "label-b",
    });
    const bound = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: [binding] },
      people.eventAlphaOne,
      "PLANNER",
    );
    assert.equal(bound.seatingLayoutBinding?.status, "BOUND");
    assert.equal(bound.seatingLayoutBinding?.layoutLabel, "Label B");
    assert.equal(bound.seatingLayoutBinding?.publicationNumber, roomB.publication.publicationNumber);
    assert.equal(bound.seatingLayoutBinding?.contentHashPrefix, roomB.publication.contentHash.slice(0, 12));
    assert.equal(bound.seatingLayoutBinding?.freezeDisabled, false);
    const auditor = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: [binding] },
      people.eventAlphaOne,
      "AUDITOR",
    );
    assert.equal(auditor.seatingLayoutBinding?.activeId, undefined);
    assert.equal(auditor.seatingLayoutBindingCandidates?.length, 0);
    const staleSnap = {
      ...store.snapshot(),
      layoutPublications: store.snapshot().layoutPublications.map((item) =>
        item.id === roomB.publication.id ? { ...item, status: "SUPERSEDED" as const } : item,
      ),
    };
    const stale = buildSeatingV2Workspace(
      staleSnap,
      { ...emptySeatingV2State(), layoutBindings: [binding] },
      people.eventAlphaOne,
      "PLANNER",
    );
    assert.equal(stale.seatingLayoutBinding?.status, "STALE");
    assert.equal(stale.seatingLayoutBinding?.freezeDisabled, true);
    const ambiguous = buildSeatingV2Workspace(
      store.snapshot(),
      {
        ...emptySeatingV2State(),
        layoutBindings: [
          binding,
          { ...binding, id: "00000000-0000-4000-8000-00000000b040", layoutId: roomA.layoutId },
        ],
      },
      people.eventAlphaOne,
      "PLANNER",
    );
    assert.equal(ambiguous.seatingLayoutBinding?.status, "AMBIGUOUS");
    assert.equal(ambiguous.seatingLayoutBinding?.freezeDisabled, true);
  });
});
