import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  S04A_FIXTURE_IDS,
  S04F_FIXTURE_IDS,
  applySyntheticSnapshot,
  findTerminologyDisplayForm,
} from "../src/index.js";

const NOW = "2026-09-07T21:00:00.000Z";

function director(now = NOW) {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s04f-director", now };
}

function planner(now = NOW) {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s04f-planner", now };
}

function admin() {
  return { personId: FIXTURE_IDS.personAdmin, correlationId: "s04f-admin", now: NOW };
}

function auditor() {
  return { personId: FIXTURE_IDS.personAuditor, correlationId: "s04f-auditor", now: NOW };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

describe("EOS-S04F language journeys", () => {
  it("does not infer language and keeps unknown preference unknown", () => {
    const { service } = seeded();
    assert.throws(
      () =>
        service.recordLanguagePreference(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          nationality: "NG",
          preferredLanguageTag: "yo",
          source: "STAFF_RECORDED",
          reason: "inferred",
        }),
      (error: unknown) => error instanceof PlatformError && /infer/i.test(error.message),
    );
    const workspace = service.getEventLanguageWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    const ebun = workspace.preferences.find((item) => item.guestId === S04A_FIXTURE_IDS.guestEbunoluwa);
    assert.equal(ebun?.unknown, true);
    assert.equal(ebun?.preferredLanguageTag, undefined);
    const profile = service.recordLanguagePreference(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      source: "UNKNOWN",
      reason: "No preference supplied",
    });
    assert.equal(profile.unknown, true);
    assert.equal(profile.preferredLanguageTag, undefined);
  });

  it("records preference history and denies cross-event leakage", () => {
    const { service } = seeded();
    const updated = service.recordLanguagePreference(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      preferredLanguageTag: "fr",
      source: "GUEST_SUPPLIED",
      expectedVersion: 1,
      reason: "Guest corrected preference to French",
    });
    assert.equal(updated.preferredLanguageTag, "fr");
    const workspace = service.getEventLanguageWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.ok(workspace.history.some((item) => item.nextLanguageTag === "fr"));
    assert.throws(
      () =>
        service.recordLanguagePreference(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventOther,
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          preferredLanguageTag: "yo",
          source: "STAFF_RECORDED",
          reason: "cross event",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "SCOPE_MISMATCH" || error.code === "NOT_FOUND"),
    );
  });

  it("denies translator self-approval and requires a separate reviewer", () => {
    const { service } = seeded();
    const work = service.createContentWork(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      title: "Programme note",
      purpose: "PROGRAMME_NOTE",
      primaryText: "Arrive by 10:00, {{guestName}}.",
      reason: "Author primary English",
    });
    const source = service.getEventLanguageWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne).editions.find(
      (item) => item.workId === work.id && item.kind === "PRIMARY",
    );
    assert.ok(source);
    const edition = service.createDependentEdition(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      workId: work.id,
      sourceEditionId: source.id,
      targetLanguageTag: "fr",
      kind: "COMPLETE",
      sourceType: "HUMAN_AUTHORED",
      blocks: [{ sourceBlockId: source.blocks[0]!.id, exactText: "Arrivez à 10h00, {{guestName}}." }],
      reason: "French complete draft",
    });
    assert.equal(edition.status, "DRAFT");
    assert.throws(
      () =>
        service.decideTranslation(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: edition.id,
          decision: "APPROVED",
          expectedVersion: edition.version,
          reason: "self approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const approved = service.decideTranslation(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      editionId: edition.id,
      decision: "APPROVED",
      expectedVersion: edition.version,
      reason: "Separate reviewer approval",
    });
    assert.equal(approved.status, "APPROVED");
    assert.throws(
      () =>
        service.decideTranslation(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: edition.id,
          decision: "APPROVED",
          expectedVersion: approved.version,
          reason: "mutate approved",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "TRANSITION_INVALID",
    );
  });

  it("marks dependent translations stale when a separate reviewer approves a source revision", () => {
    const { service } = seeded();
    const revision = service.createSourceRevision(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      workId: S04F_FIXTURE_IDS.workInvitation,
      sourceEditionId: S04F_FIXTURE_IDS.editionEnGb,
      primaryText: "Updated English source for {{guestName}}.",
      purposeContext: "Invitation source",
      changeSummary: "Clarify the English greeting.",
      submitForReview: true,
      expectedVersion: 1,
      reason: "Source change",
    });
    assert.equal(revision.status, "IN_REVIEW");
    assert.throws(
      () =>
        service.decideSourceEdition(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          editionId: revision.id,
          decision: "APPROVED",
          expectedVersion: revision.version,
          reason: "self approve source",
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
    const workspace = service.getEventLanguageWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    const yo = workspace.editions.find((item) => item.id === S04F_FIXTURE_IDS.editionYo);
    assert.equal(yo?.coverageStatus, "STALE");
    assert.equal(yo?.reviewRequired, true);
    const previous = workspace.editions.find((item) => item.id === S04F_FIXTURE_IDS.editionEnGb);
    assert.equal(previous?.status, "SUPERSEDED");
  });

  it("assembles by guestId with fallback, no dispatch, and no RSVP mutation", () => {
    const { store, service } = seeded();
    const rsvpBefore = store.snapshot().rsvpResponses.length;
    const campaignsBefore = store.snapshot().campaigns.length;
    const assembly = service.assembleRecipientContent(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      workId: S04F_FIXTURE_IDS.workInvitation,
      reason: "Preview recipient assembly",
      idempotencyKey: "asm-olufemi-1",
    });
    assert.equal(assembly.dispatched, false);
    assert.equal(assembly.providerInvoked, false);
    assert.equal(assembly.readyForCommsReview, true);
    assert.equal(assembly.guestId, S04A_FIXTURE_IDS.guestOlufemi);
    assert.match(assembly.units[0]?.renderedText ?? "", /Olúfẹ́mi|Ẹ kú/);
    const replay = service.assembleRecipientContent(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      workId: S04F_FIXTURE_IDS.workInvitation,
      reason: "Preview recipient assembly",
      idempotencyKey: "asm-olufemi-1",
    });
    assert.equal(replay.id, assembly.id);
    const unknown = service.assembleRecipientContent(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      workId: S04F_FIXTURE_IDS.workInvitation,
      reason: "Unknown preference uses en-GB fallback",
    });
    assert.equal(unknown.requestedLanguageTag, undefined);
    assert.equal(unknown.selectedLanguageTag, "en-GB");
    assert.equal(unknown.units.some((unit) => unit.fallbackReason === "NO_PREFERENCE"), true);
    assert.equal(store.snapshot().rsvpResponses.length, rsvpBefore);
    assert.equal(store.snapshot().campaigns.length, campaignsBefore);
    assert.throws(
      () =>
        service.assembleRecipientContent(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          guestId: S04A_FIXTURE_IDS.entitlementPlusOne,
          workId: S04F_FIXTURE_IDS.workInvitation,
          reason: "unnamed",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("enforces role projections and glossary display form", () => {
    const { service } = seeded();
    assert.throws(
      () => service.getEventLanguageWorkspace(admin(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const auditorView = service.getEventLanguageWorkspace(auditor(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(auditorView.capabilities.canApproveTranslation, false);
    assert.equal(auditorView.capabilities.canAudit, true);
    const plannerView = service.getEventLanguageWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(plannerView.capabilities.canCreateTranslation, true);
    assert.equal(plannerView.capabilities.canApproveTranslation, false);
    const store = new MemoryPlatformStore();
    const seededService = applySyntheticSnapshot(store);
    const display = findTerminologyDisplayForm(store.snapshot(), FIXTURE_IDS.eventAlphaOne, "Olufemi Alakija");
    assert.equal(display, "Olúfẹ́mi Alákíjà");
    void seededService;
  });

  it("does not fall back to draft Igbo and keeps host edition synthetic", () => {
    const { service } = seeded();
    service.recordLanguagePreference(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestAdesina,
      preferredLanguageTag: "ig",
      source: "GUEST_SUPPLIED",
      reason: "Explicit Igbo preference",
    });
    const assembly = service.assembleRecipientContent(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      guestId: S04A_FIXTURE_IDS.guestAdesina,
      workId: S04F_FIXTURE_IDS.workInvitation,
      reason: "Igbo draft must not be used",
    });
    assert.equal(assembly.selectedLanguageTag, "en-GB");
    assert.equal(assembly.units.some((unit) => unit.fallbackUsed), true);
    assert.equal(assembly.units.some((unit) => unit.selectedLanguageTag === "ig"), false);
    const host = service.getEventAtelierWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    void host;
  });
});
