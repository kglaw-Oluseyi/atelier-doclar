import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  S04A_FIXTURE_IDS,
  S04F_FIXTURE_IDS,
  applySyntheticSnapshot,
  assertPlaceholderSetsMatch,
  comparePlaceholderSets,
  renderPlaceholders,
} from "../src/index.js";

const NOW = "2026-09-08T00:30:00.000Z";

function director(now = NOW) {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s04f-lineage-director", now };
}

function planner(now = NOW) {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s04f-lineage-planner", now };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

function reviseInvitation(service: ReturnType<typeof seeded>["service"], text = "Updated English source for {{guestName}}.") {
  return service.createSourceRevision(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    workId: S04F_FIXTURE_IDS.workInvitation,
    sourceEditionId: S04F_FIXTURE_IDS.editionEnGb,
    primaryText: text,
    purposeContext: "Invitation source",
    changeSummary: "Clarify the English greeting.",
    submitForReview: true,
    expectedVersion: 1,
    reason: "Start source revision",
    idempotencyKey: "source-rev-1",
  });
}

describe("EOS-S04F source supersession, staleness and placeholders", () => {
  it("1-5: revision creates a new edition, preserves the old source, and blocks self-approval", () => {
    const { store, service } = seeded();
    assert.throws(
      () =>
        service.decideSourceEdition(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: S04F_FIXTURE_IDS.editionEnGb,
          decision: "APPROVED",
          expectedVersion: 1,
          reason: "edit approved in place",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "TRANSITION_INVALID",
    );
    const revision = reviseInvitation(service);
    assert.notEqual(revision.id, S04F_FIXTURE_IDS.editionEnGb);
    assert.equal(revision.status, "IN_REVIEW");
    assert.equal(revision.supersedesEditionId, S04F_FIXTURE_IDS.editionEnGb);
    const replay = reviseInvitation(service);
    assert.equal(replay.id, revision.id);
    assert.throws(
      () =>
        service.decideSourceEdition(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: revision.id,
          decision: "APPROVED",
          expectedVersion: revision.version,
          reason: "self approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const approved = service.decideSourceEdition(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: revision.id,
      decision: "APPROVED",
      expectedVersion: revision.version,
      reason: "Separate reviewer approval",
    });
    assert.equal(approved.status, "APPROVED");
    const snap = store.snapshot();
    const previous = snap.contentEditions.find((item) => item.id === S04F_FIXTURE_IDS.editionEnGb);
    assert.equal(previous?.status, "SUPERSEDED");
    assert.match(snap.contentBlocks.find((item) => item.editionId === previous?.id)?.exactText ?? "", /Maison Doclar welcomes you/);
    const work = snap.contentWorks.find((item) => item.id === S04F_FIXTURE_IDS.workInvitation);
    assert.equal(work?.primaryEditionId, approved.id);
  });

  it("6-11: stale translations are excluded and fallback uses current approved en-GB", () => {
    const { store, service } = seeded();
    const priorAssembly = store.snapshot().recipientAssemblies.find((item) => item.id === S04F_FIXTURE_IDS.assemblyOlufemi);
    assert.equal(priorAssembly?.status, "READY_FOR_COMMS_REVIEW");
    const revision = reviseInvitation(service);
    service.decideSourceEdition(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: revision.id,
      decision: "APPROVED",
      expectedVersion: revision.version,
      reason: "Approve source revision",
    });
    const snap = store.snapshot();
    const yo = snap.contentEditions.find((item) => item.id === S04F_FIXTURE_IDS.editionYo);
    assert.equal(yo?.coverageStatus, "STALE");
    assert.equal(yo?.reviewRequired, true);
    assert.match(snap.contentBlocks.find((item) => item.editionId === yo?.id)?.exactText ?? "", /Ẹ kú àbọ̀/);
    const coverage = snap.languageCoverageSnapshots.find((item) => item.workId === S04F_FIXTURE_IDS.workInvitation);
    assert.equal(coverage?.coverageStatus, "STALE");
    const prior = snap.recipientAssemblies.find((item) => item.id === S04F_FIXTURE_IDS.assemblyOlufemi);
    assert.equal(prior?.status, "SUPERSEDED");
    const assembly = service.assembleRecipientContent(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      workId: S04F_FIXTURE_IDS.workInvitation,
      reason: "Assembly after source change",
    });
    assert.equal(assembly.selectedLanguageTag, "en-GB");
    assert.equal(assembly.requestedLanguageTag, "yo");
    assert.equal(assembly.dispatched, false);
    assert.equal(assembly.providerInvoked, false);
    assert.equal(assembly.units.some((unit) => unit.fallbackReason === "STALE_TRANSLATION" || unit.fallbackReason === "MISSING_APPROVED_TARGET"), true);
    assert.equal(assembly.units.some((unit) => unit.selectedLanguageTag === "yo"), false);
    assert.throws(
      () =>
        service.decideTranslation(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: S04F_FIXTURE_IDS.editionYo,
          decision: "APPROVED",
          expectedVersion: yo?.version ?? 1,
          reason: "reuse stale",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("12-16: placeholder multisets reject missing, unknown and duplicate names and accept reorder", () => {
    const source = "Dear {{guestName}}, arrive {{time}}.";
    assert.equal(comparePlaceholderSets(source, "Cher {{time}}, {{guestName}}.").valid, true);
    assert.throws(
      () => assertPlaceholderSetsMatch(source, "Cher {{guestName}}."),
      (error: unknown) => error instanceof PlatformError && /missing/i.test(error.message),
    );
    assert.throws(
      () => assertPlaceholderSetsMatch(source, "Cher {{guestName}}, {{time}}, {{title}}."),
      (error: unknown) => error instanceof PlatformError && /unknown/i.test(error.message),
    );
    assert.throws(
      () => assertPlaceholderSetsMatch(source, "Cher {{guestName}} {{guestName}} {{time}}."),
      (error: unknown) => error instanceof PlatformError && /duplicated/i.test(error.message),
    );
    const rendered = renderPlaceholders("Dear {{guestName}} \\{{guestName}}", { guestName: "<img onerror=alert(1)>" }, ["guestName"]);
    assert.equal(rendered.includes("<img"), false);
    assert.match(rendered, /\{\{guestName\}\}/);
    const { service } = seeded();
    const work = service.createContentWork(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      title: "Placeholder note",
      purpose: "GUEST_MESSAGE",
      primaryText: source,
      reason: "Primary with two placeholders",
    });
    const sourceEdition = service.getEventLanguageWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne).editions.find(
      (item) => item.workId === work.id && item.kind === "PRIMARY",
    );
    assert.ok(sourceEdition);
    assert.throws(
      () =>
        service.createDependentEdition(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          workId: work.id,
          sourceEditionId: sourceEdition.id,
          targetLanguageTag: "fr",
          kind: "COMPLETE",
          sourceType: "HUMAN_AUTHORED",
          blocks: [{ sourceBlockId: sourceEdition.blocks[0]!.id, exactText: "Cher {{guestName}}." }],
          reason: "missing placeholder",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const ok = service.createDependentEdition(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      workId: work.id,
      sourceEditionId: sourceEdition.id,
      targetLanguageTag: "fr",
      kind: "COMPLETE",
      sourceType: "HUMAN_AUTHORED",
      blocks: [{ sourceBlockId: sourceEdition.blocks[0]!.id, exactText: "Cher {{time}}, {{guestName}}." }],
      reason: "reordered valid set",
    });
    assert.equal(ok.status, "DRAFT");
  });

  it("17-20: no dispatch, cross-event denial, concurrent conflict and replay idempotency", () => {
    const { store, service } = seeded();
    const campaigns = store.snapshot().campaigns.length;
    const revision = reviseInvitation(service);
    const approved = service.decideSourceEdition(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: revision.id,
      decision: "APPROVED",
      expectedVersion: revision.version,
      reason: "Approve",
      idempotencyKey: "source-approve-1",
    });
    const replay = service.decideSourceEdition(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: revision.id,
      decision: "APPROVED",
      expectedVersion: revision.version,
      reason: "Approve",
      idempotencyKey: "source-approve-1",
    });
    assert.equal(replay.id, approved.id);
    assert.equal(store.snapshot().campaigns.length, campaigns);
    assert.throws(
      () =>
        service.createSourceRevision(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventOther,
          workId: S04F_FIXTURE_IDS.workInvitation,
          sourceEditionId: S04F_FIXTURE_IDS.editionEnGb,
          primaryText: "Cross event {{guestName}}.",
          purposeContext: "Wrong event",
          changeSummary: "Cross event",
          expectedVersion: 1,
          reason: "cross event",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "SCOPE_MISMATCH" || error.code === "NOT_FOUND"),
    );
    const second = service.createSourceRevision(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      workId: S04F_FIXTURE_IDS.workInvitation,
      sourceEditionId: approved.id,
      primaryText: "Second revision for {{guestName}}.",
      purposeContext: "Invitation source",
      changeSummary: "Another change",
      submitForReview: true,
      expectedVersion: approved.version,
      reason: "Second revision",
    });
    assert.throws(
      () =>
        service.createSourceRevision(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          workId: S04F_FIXTURE_IDS.workInvitation,
          sourceEditionId: approved.id,
          primaryText: "Competing tab {{guestName}}.",
          purposeContext: "Invitation source",
          changeSummary: "Competing tab",
          expectedVersion: approved.version,
          reason: "two-tab",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const secondApproved = service.decideSourceEdition(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: second.id,
      decision: "APPROVED",
      expectedVersion: second.version,
      reason: "Approve second revision",
    });
    assert.throws(
      () =>
        service.decideSourceEdition(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: second.id,
          decision: "APPROVED",
          expectedVersion: second.version,
          reason: "stale concurrent approval",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    void secondApproved;
  });
});
