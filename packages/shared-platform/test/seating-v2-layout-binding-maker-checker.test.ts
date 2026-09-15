import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import {
  EOS_S06_SUCCESSOR_LAYOUT_A_NAME,
  EOS_S06_SUCCESSOR_LAYOUT_B_NAME,
  ensureEosS06SuccessorLayoutFixture,
  pendingSeatingLayoutBindings,
  selectPendingSeatingLayoutBinding,
} from "../src/index.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { emptySeatingV2State, type SeatingV2LayoutBinding } from "../src/seating-v2-state.js";
import { buildSeatingV2Workspace } from "../src/seating-v2-workspace.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-15T10:00:00.000Z";
const LATER = "2026-09-15T11:00:00.000Z";

function memoryRepo(v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>) {
  assert.ok(v2.repository instanceof MemorySeatingV2Repository);
  return v2.repository;
}
function planner(now = NOW) {
  return actor(people.personPlanner, { now, correlationId: "maker-checker-planner" });
}
function director(now = NOW) {
  return actor(people.personDirector, { now, correlationId: "maker-checker-director" });
}
function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `maker-checker-${key}`,
  };
}

describe("EOS-S06 layout-binding maker-checker target identity", () => {
  it("1–3: Planner proposes A; Director sees that exact binding/hash; older draft cannot hide A", async () => {
    const { service, store } = fixtureService();
    const fixture = ensureEosS06SuccessorLayoutFixture(store, service);
    const snap = store.snapshot();
    const pubA = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutAId && item.status === "CURRENT");
    const pubB = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutBId && item.status === "CURRENT");
    assert.ok(pubA && pubB);

    const v2 = service.seatingV2Commands();
    // Residue: older pending draft for a different publication inserted first.
    const oldDraft: SeatingV2LayoutBinding = {
      id: "00000000-0000-4000-8000-00000000b0aa",
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      layoutPublicationId: pubB.id,
      layoutContentHash: pubB.contentHash,
      state: "DRAFT",
      version: 1,
      proposedByPersonId: people.personPlanner,
      proposedAt: "2026-09-14T01:00:00.000Z",
      reason: "obsolete residue",
      schemaVersion: 1,
      createdAt: "2026-09-14T01:00:00.000Z",
      updatedAt: "2026-09-14T01:00:00.000Z",
    };
    await v2.repository.transaction(async (tx) => {
      await tx.insert("layoutBindings", oldDraft);
    });

    // Projection with residue alone would prefer latest if multiple remain.
    const residueView = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: [oldDraft] },
      people.eventAlphaOne,
      "DIRECTOR",
    );
    assert.equal(residueView.seatingLayoutBinding?.draftId, oldDraft.id);

    const proposed = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "propose-a-exact"), {
      layoutPublicationId: pubA.id,
      layoutId: fixture.layoutAId,
      layoutContentHash: pubA.contentHash,
      reason: "Propose Layout A",
    });
    assert.equal(proposed.value.state, "DRAFT");
    assert.equal(proposed.value.layoutContentHash, pubA.contentHash);
    assert.equal(proposed.value.layoutId, fixture.layoutAId);

    const bindings = await v2.repository.transaction(async (tx) =>
      tx.list<SeatingV2LayoutBinding>("layoutBindings", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const pending = pendingSeatingLayoutBindings(bindings, people.orgMaison, people.eventAlphaOne);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]!.id, proposed.value.id);
    assert.ok(bindings.some((item) => item.id === oldDraft.id && item.state === "SUPERSEDED"));

    const directorView = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: bindings },
      people.eventAlphaOne,
      "DIRECTOR",
    );
    assert.equal(directorView.seatingLayoutBinding?.draftId, proposed.value.id);
    assert.equal(directorView.seatingLayoutBinding?.draftLayoutLabel, EOS_S06_SUCCESSOR_LAYOUT_A_NAME);
    assert.equal(directorView.seatingLayoutBinding?.draftContentHashPrefix, pubA.contentHash.slice(0, 12));
    assert.equal(directorView.seatingLayoutBinding?.draftPublicationId, pubA.id);
    assert.equal(directorView.seatingLayoutBinding?.draftContentHash, pubA.contentHash);
    assert.equal(directorView.seatingLayoutBinding?.draftStatus, "DRAFT");
    assert.match(directorView.seatingLayoutBinding?.draftProposedByLabel ?? "", /Planner/i);
    assert.equal(selectPendingSeatingLayoutBinding(bindings, people.orgMaison, people.eventAlphaOne)?.id, proposed.value.id);
  });

  it("4–6: displayed target fields must match activation; tamper and stale version and maker self-approve refused", async () => {
    const { service, store } = fixtureService();
    const fixture = ensureEosS06SuccessorLayoutFixture(store, service);
    const snap = store.snapshot();
    const pubA = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutAId && item.status === "CURRENT")!;
    const pubB = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutBId && item.status === "CURRENT")!;
    const v2 = service.seatingV2Commands();
    const proposed = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "propose-a-checks"), {
      layoutPublicationId: pubA.id,
      reason: "Propose A",
    });
    const view = buildSeatingV2Workspace(
      store.snapshot(),
      {
        ...emptySeatingV2State(),
        layoutBindings: [proposed.value],
      },
      people.eventAlphaOne,
      "DIRECTOR",
    );
    assert.equal(view.seatingLayoutBinding?.draftId, proposed.value.id);
    assert.equal(view.seatingLayoutBinding?.draftPublicationId, proposed.value.layoutPublicationId);
    assert.equal(view.seatingLayoutBinding?.draftContentHash, proposed.value.layoutContentHash);
    assert.equal(view.seatingLayoutBinding?.draftVersion, proposed.value.version);

    await assert.rejects(
      () =>
        v2.activateLayoutBinding(director(), envelope(people.assignDirector, "tamper-pub"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version,
          layoutPublicationId: pubB.id,
          layoutContentHash: pubA.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "SEATING_LAYOUT_PUBLICATION_MISMATCH",
    );
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(director(), envelope(people.assignDirector, "stale-ver"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version + 1,
          layoutPublicationId: pubA.id,
          layoutContentHash: pubA.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    await assert.rejects(
      () =>
        v2.activateLayoutBinding(planner(LATER), envelope(people.assignPlanner, "self-approve"), {
          bindingId: proposed.value.id,
          expectedVersion: proposed.value.version,
          layoutPublicationId: pubA.id,
          layoutContentHash: pubA.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );

    const stillDraft = (
      await v2.repository.transaction(async (tx) =>
        tx.list<SeatingV2LayoutBinding>("layoutBindings", {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
        }),
      )
    ).find((item) => item.id === proposed.value.id);
    assert.equal(stillDraft?.state, "DRAFT");
  });

  it("7–11: A then B successor chain with Director seeing B while A is current; audit/replay identities", async () => {
    const { service, store } = fixtureService();
    const fixture = ensureEosS06SuccessorLayoutFixture(store, service);
    const snap = store.snapshot();
    const pubA = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutAId && item.status === "CURRENT")!;
    const pubB = snap.layoutPublications.find((item) => item.layoutId === fixture.layoutBId && item.status === "CURRENT")!;
    const v2 = service.seatingV2Commands();

    const draftA = await v2.proposeLayoutBinding(planner(), envelope(people.assignPlanner, "journey-propose-a"), {
      layoutPublicationId: pubA.id,
      reason: "Propose A",
    });
    const activeA = await v2.activateLayoutBinding(director(), envelope(people.assignDirector, "journey-activate-a"), {
      bindingId: draftA.value.id,
      expectedVersion: draftA.value.version,
      layoutPublicationId: pubA.id,
      layoutContentHash: pubA.contentHash,
    });
    assert.equal(activeA.value.state, "ACTIVE");
    assert.equal(activeA.value.layoutId, fixture.layoutAId);

    const afterA = await v2.repository.transaction(async (tx) =>
      tx.list<SeatingV2LayoutBinding>("layoutBindings", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const directorAfterA = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: afterA },
      people.eventAlphaOne,
      "DIRECTOR",
    );
    assert.equal(directorAfterA.seatingLayoutBinding?.status, "BOUND");
    assert.equal(directorAfterA.seatingLayoutBinding?.layoutLabel, EOS_S06_SUCCESSOR_LAYOUT_A_NAME);
    assert.equal(directorAfterA.seatingLayoutBinding?.draftId, undefined);

    const draftB = await v2.proposeLayoutBinding(planner(LATER), envelope(people.assignPlanner, "journey-propose-b"), {
      layoutPublicationId: pubB.id,
      reason: "Propose B successor",
    });
    const afterProposeB = await v2.repository.transaction(async (tx) =>
      tx.list<SeatingV2LayoutBinding>("layoutBindings", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const directorSeesB = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: afterProposeB },
      people.eventAlphaOne,
      "DIRECTOR",
    );
    assert.equal(directorSeesB.seatingLayoutBinding?.draftId, draftB.value.id);
    assert.equal(directorSeesB.seatingLayoutBinding?.draftLayoutLabel, EOS_S06_SUCCESSOR_LAYOUT_B_NAME);
    assert.equal(directorSeesB.seatingLayoutBinding?.draftContentHashPrefix, pubB.contentHash.slice(0, 12));
    assert.equal(directorSeesB.seatingLayoutBinding?.status, "BOUND");
    assert.equal(directorSeesB.seatingLayoutBinding?.activeLayoutLabel, EOS_S06_SUCCESSOR_LAYOUT_A_NAME);
    assert.equal(directorSeesB.seatingLayoutBinding?.activeContentHashPrefix, pubA.contentHash.slice(0, 12));

    // Role transition / refresh: planner and director projections share the same draft identity.
    const plannerRefresh = buildSeatingV2Workspace(
      store.snapshot(),
      { ...emptySeatingV2State(), layoutBindings: afterProposeB },
      people.eventAlphaOne,
      "PLANNER",
    );
    assert.equal(plannerRefresh.seatingLayoutBinding?.draftId, directorSeesB.seatingLayoutBinding?.draftId);
    assert.equal(plannerRefresh.seatingLayoutBinding?.draftContentHash, directorSeesB.seatingLayoutBinding?.draftContentHash);

    const activeB = await v2.activateLayoutBinding(director(LATER), envelope(people.assignDirector, "journey-activate-b"), {
      bindingId: draftB.value.id,
      expectedVersion: draftB.value.version,
      layoutPublicationId: pubB.id,
      layoutContentHash: pubB.contentHash,
    });
    assert.equal(activeB.value.state, "ACTIVE");
    assert.equal(activeB.value.layoutId, fixture.layoutBId);

    const final = await v2.repository.transaction(async (tx) =>
      tx.list<SeatingV2LayoutBinding>("layoutBindings", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    assert.ok(final.some((item) => item.id === activeA.value.id && item.state === "SUPERSEDED"));
    assert.ok(final.some((item) => item.id === activeB.value.id && item.state === "ACTIVE"));

    const audits = memoryRepo(v2).backingStore.audit.filter(
      (item) => item.action.startsWith("seatingV2.") && item.eventId === people.eventAlphaOne,
    );
    const proposeAudits = audits.filter((item) => item.action === "seatingV2.proposeLayoutBinding");
    const activateAudits = audits.filter((item) => item.action === "seatingV2.activateLayoutBinding");
    assert.ok(proposeAudits.length >= 2);
    assert.ok(activateAudits.length >= 2);
    assert.ok(proposeAudits.some((item) => item.resourceId === draftA.value.id && item.actorPersonId === people.personPlanner));
    assert.ok(activateAudits.some((item) => item.resourceId === activeA.value.id && item.actorPersonId === people.personDirector));
    assert.ok(activateAudits.some((item) => item.resourceId === activeB.value.id && item.actorPersonId === people.personDirector));
  });
});
