import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  S04E_FIXTURE_IDS,
  applySyntheticSnapshot,
} from "../src/index.js";

const NOW = "2026-09-07T19:00:00.000Z";
const LATER = "2026-09-07T21:00:00.000Z";
const AFTER_ELEVATION = "2026-09-07T19:16:00.000Z";

function director() {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s04e-director", now: NOW };
}

function planner() {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s04e-planner", now: NOW };
}

function admin() {
  return { personId: FIXTURE_IDS.personAdmin, correlationId: "s04e-admin", now: NOW };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

describe("EOS-S04E atelier journeys", () => {
  it("publishes an atelier, issues a host link, exchanges once, and records a receipt without canonical mutation", () => {
    const { store, service } = seeded();
    const rsvpBefore = store.snapshot().rsvpResponses.length;
    const personsBefore = store.snapshot().persons.length;
    const workspace = service.getEventAtelierWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(workspace.atelier.publicationState, "DRAFT");
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal the synthetic Atelier",
    });
    const issued = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["TODAY", "VISION", "JOURNEY", "BLUEPRINT", "DECISIONS", "ASSURANCE", "EDITIONS", "UPDATES"],
      canDecide: true,
      canExport: false,
      reason: "Issue principal host access",
    });
    const exchanged = service.exchangeAtelierAccess(issued.token, NOW);
    assert.equal(exchanged.view.hostRole, "PRINCIPAL_HOST");
    assert.ok(exchanged.view.chapters.some((item) => item.type === "VISION"));
    assert.ok(exchanged.view.chapters.some((item) => item.type === "JOURNEY"));
    assert.ok(exchanged.view.chapters.some((item) => item.type === "ASSURANCE"));
    assert.equal(exchanged.view.chapters.some((item) => /probability|yesBand|PARAM-SET/i.test(item.body)), false);
    assert.throws(() => service.exchangeAtelierAccess(issued.token, LATER), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      return /unavailable/i.test(error.message);
    });
    const receipt = service.submitHostAtelierDecision(
      exchanged.sessionToken,
      {
        requestId: S04E_FIXTURE_IDS.decision,
        choice: "A short family blessing",
        expectedVersion: 1,
      },
      NOW,
    );
    assert.equal(receipt.changedCanonicalData, false);
    assert.equal(receipt.reviewStatus, "PENDING");
    assert.equal(store.snapshot().rsvpResponses.length, rsvpBefore);
    assert.equal(store.snapshot().persons.length, personsBefore);
    assert.throws(
      () =>
        service.reviewAtelierDecision(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          requestId: S04E_FIXTURE_IDS.decision,
          receiptId: receipt.id,
          expectedVersion: 2,
          approve: true,
          reason: "Planner published this decision",
        }),
      /permission|FORBIDDEN|maker cannot check/i,
    );
    const published = service.publishAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      kind: "REQUIRES_STAFF_REVIEW",
      title: "Ceremony seating colour",
      question: "Which seating cloth should the family see first?",
      consequence: "Maison Doclar will prepare the chosen cloth. RSVP is unchanged.",
      options: ["Ivory", "Deep indigo", "Talk this through"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      requiresReview: true,
      requiresStepUp: false,
      reason: "Director publishes a second decision",
    });
    const second = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personCoHost,
      hostRole: "CO_HOST",
      chapters: ["TODAY", "DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Issue co-host access",
    });
    const secondSession = service.exchangeAtelierAccess(second.token, NOW);
    const secondReceipt = service.submitHostAtelierDecision(
      secondSession.sessionToken,
      {
        requestId: published.id,
        choice: "Ivory",
        expectedVersion: 1,
      },
      NOW,
    );
    assert.throws(
      () =>
        service.reviewAtelierDecision(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          requestId: published.id,
          receiptId: secondReceipt.id,
          expectedVersion: 2,
          approve: true,
          reason: "Director published this decision",
        }),
      /maker cannot check/i,
    );
    const reviewed = service.reviewAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      requestId: S04E_FIXTURE_IDS.decision,
      receiptId: receipt.id,
      expectedVersion: 2,
      approve: true,
      reason: "Director reviews host welcome",
    });
    assert.equal(reviewed.reviewStatus, "APPROVED");
    assert.equal(reviewed.changedCanonicalData, false);
  });

  it("keeps host, staff, guest and vendor sessions isolated and denies read-only decisions", () => {
    const { service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Publish",
    });
    const readOnly = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personReadOnly,
      hostRole: "READ_ONLY_HOST",
      chapters: ["TODAY", "VISION", "ASSURANCE"],
      canDecide: false,
      canExport: false,
      reason: "Read-only grant",
    });
    const session = service.exchangeAtelierAccess(readOnly.token, NOW);
    assert.equal(session.view.canDecide, false);
    assert.equal(session.view.decisions.length, 0);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          session.sessionToken,
          {
            requestId: S04E_FIXTURE_IDS.decision,
            choice: "A short family blessing",
            expectedVersion: 1,
          },
          NOW,
        ),
      /cannot submit/i,
    );
    assert.throws(() => service.hostAttemptCoreMutation(), /cannot assign staff/i);
    assert.throws(
      () => service.getEventAtelierWorkspace(admin(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne),
      /permission|FORBIDDEN/i,
    );
  });

  it("denies expired, forged, revoked and cross-event links and refuses stale or duplicate decisions", () => {
    const { service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Publish",
    });
    const issued = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["TODAY", "DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Issue then revoke",
    });
    assert.throws(() => service.exchangeAtelierAccess("forged-atelier-token", NOW), /unavailable/i);
    const expired = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personFamily,
      hostRole: "FAMILY_REPRESENTATIVE",
      chapters: ["TODAY"],
      canDecide: false,
      canExport: false,
      reason: "Issue a short-lived link",
      ttlSeconds: 60,
    });
    assert.throws(() => service.exchangeAtelierAccess(expired.token, "2026-10-01T00:00:00.000Z"), /unavailable/i);
    const live = service.exchangeAtelierAccess(issued.token, NOW);
    service.revokeAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      grantId: issued.grant.id,
      expectedVersion: issued.grant.version,
      reason: "Revoke after exchange",
    });
    assert.throws(() => service.hostAtelierView(live.sessionToken, LATER), /unavailable/i);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          live.sessionToken,
          {
            requestId: S04E_FIXTURE_IDS.decision,
            choice: "A short family blessing",
            expectedVersion: 1,
          },
          LATER,
        ),
      /unavailable|no longer/i,
    );
    const fresh = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["TODAY", "DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Re-issue after revoke",
    });
    const freshSession = service.exchangeAtelierAccess(fresh.token, NOW);
    const first = service.submitHostAtelierDecision(
      freshSession.sessionToken,
      {
        requestId: S04E_FIXTURE_IDS.decision,
        choice: "A short family blessing",
        expectedVersion: 1,
        idempotencyKey: "welcome-1",
      },
      NOW,
    );
    const again = service.submitHostAtelierDecision(
      freshSession.sessionToken,
      {
        requestId: S04E_FIXTURE_IDS.decision,
        choice: "A short family blessing",
        expectedVersion: 1,
        idempotencyKey: "welcome-1",
      },
      NOW,
    );
    assert.equal(again.id, first.id);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          freshSession.sessionToken,
          {
            requestId: S04E_FIXTURE_IDS.decision,
            choice: "A quiet toast only",
            expectedVersion: 1,
          },
          NOW,
        ),
      /already submitted|IDEMPOTENCY|VERSION/i,
    );
    const stale = service.publishAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      kind: "REQUIRES_STAFF_REVIEW",
      title: "Arrival greeting",
      question: "How should the family be greeted on arrival?",
      consequence: "Maison Doclar will set the greeting. RSVP is unchanged.",
      options: ["At the door", "In the courtyard", "Talk this through"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      requiresReview: true,
      requiresStepUp: false,
      reason: "Publish a second decision for stale CAS",
    });
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          freshSession.sessionToken,
          {
            requestId: stale.id,
            choice: "At the door",
            expectedVersion: 99,
          },
          NOW,
        ),
      /changed|VERSION/i,
    );
  });

  it("preserves superseded narrative editions and hides unpublished drafts from hosts", () => {
    const { store, service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Publish first",
    });
    service.publishAtelierNarrative(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "A second telling of the same gathering.",
      atmosphere: "Still rooms.",
      pillars: ["Dignity", "Quiet"],
      culturalIntent: "Hospitality without spectacle.",
      designDirection: "Editorial stills.",
      provenance: "Second synthetic edition",
      reason: "Publish successor edition",
    });
    const editions = store.snapshot().eventNarrativeEditions.filter((item) => item.atelierId === S04E_FIXTURE_IDS.atelier);
    assert.ok(editions.some((item) => item.publicationState === "SUPERSEDED"));
    assert.ok(editions.some((item) => item.publicationState === "PUBLISHED"));
    const published = editions.filter((item) => item.publicationState === "PUBLISHED");
    assert.equal(published.length, 1);
    const issued = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["VISION", "EDITIONS"],
      canDecide: false,
      canExport: false,
      reason: "Issue after successor edition",
    });
    const view = service.exchangeAtelierAccess(issued.token, NOW).view;
    assert.ok(view.chapters.some((item) => item.body.includes("second telling")));
    assert.equal(view.chapters.some((item) => /internal|credential|probability/i.test(item.body)), false);
    const seed = editions.find((item) => item.id === S04E_FIXTURE_IDS.narrative);
    assert.equal(seed?.publicationState, "DRAFT");
  });

  it("does not publish narrative drafts in place on reveal and keeps first-publication lineage truthful", () => {
    const { store, service } = seeded();
    const seedBefore = store.snapshot().eventNarrativeEditions.find((item) => item.id === S04E_FIXTURE_IDS.narrative);
    assert.equal(seedBefore?.publicationState, "DRAFT");
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal without rewriting the seed draft",
    });
    const afterReveal = store.snapshot().eventNarrativeEditions;
    const genesisDraft = afterReveal.find((item) => item.id === S04E_FIXTURE_IDS.narrative);
    assert.equal(genesisDraft?.publicationState, "DRAFT");
    const published = afterReveal.filter((item) => item.atelierId === S04E_FIXTURE_IDS.atelier && item.publicationState === "PUBLISHED");
    assert.equal(published.length, 1);
    assert.notEqual(published[0]?.id, S04E_FIXTURE_IDS.narrative);
    assert.equal(published[0]?.story, genesisDraft?.story);
    assert.equal(published[0]?.supersedesEditionId, undefined);
    const workspace = service.getEventAtelierWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(workspace.narrative?.earlierPublishedCount, 0);
    assert.equal(workspace.narrative?.editionId, published[0]?.id);
  });

  it("hydrates every edition-owned field from one source and agrees with the host Vision", () => {
    const { service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal",
    });
    const published = service.publishAtelierNarrative(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "CLAUDE-S04E-A1 successor telling for field agreement.",
      atmosphere: "Cool stone and late light.",
      pillars: ["Restraint", "Names"],
      culturalIntent: "Hospitality held in the house, not on display.",
      designDirection: "Quiet crops and unused margins.",
      provenance: "CLAUDE-S04E-A2 — governed second edition",
      changeSummary: "Second synthetic edition derived from the first published telling.",
      reason: "Publish field-complete edition",
    });
    const draft = service.ensureAtelierNarrativeRevision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Open revision from published truth",
    });
    assert.equal(draft.publicationState, "DRAFT");
    assert.equal(draft.story, published.story);
    assert.equal(draft.atmosphere, published.atmosphere);
    assert.deepEqual([...draft.pillars], [...published.pillars]);
    assert.equal(draft.culturalIntent, published.culturalIntent);
    assert.equal(draft.designDirection, published.designDirection);
    assert.equal(draft.provenance, published.provenance);
    const workspace = service.getEventAtelierWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(workspace.editor?.source, "DRAFT");
    assert.equal(workspace.editor?.story, published.story);
    assert.equal(workspace.editor?.atmosphere, published.atmosphere);
    assert.deepEqual([...(workspace.editor?.pillars ?? [])], [...published.pillars]);
    assert.equal(workspace.editor?.culturalIntent, published.culturalIntent);
    assert.equal(workspace.editor?.designDirection, published.designDirection);
    assert.equal(workspace.editor?.provenance, published.provenance);
    const issued = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["VISION"],
      canDecide: false,
      canExport: false,
      reason: "Host vision agreement",
    });
    const vision = service.exchangeAtelierAccess(issued.token, NOW).view.vision;
    assert.ok(vision);
    assert.equal(vision?.story, published.story);
    assert.equal(vision?.atmosphere, published.atmosphere);
    assert.deepEqual([...(vision?.pillars ?? [])], [...published.pillars]);
    assert.equal(vision?.culturalIntent, published.culturalIntent);
    assert.equal(vision?.designDirection, published.designDirection);
    assert.equal(vision?.provenance, published.provenance);
    assert.equal(vision?.editionId, published.id);
    assert.ok(workspace.history.some((item) => item.id === published.id));
    assert.ok(workspace.narrative && workspace.narrative.earlierPublishedCount >= 1);
  });

  it("persists explicit canDecide and never infers it from Principal Host", () => {
    const { store, service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal",
    });
    const denied = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["TODAY", "DECISIONS"],
      canDecide: false,
      canExport: false,
      reason: "Principal without decision authority",
    });
    assert.equal(denied.grant.canDecide, false);
    assert.equal(denied.grant.hostRole, "PRINCIPAL_HOST");
    const deniedView = service.exchangeAtelierAccess(denied.token, NOW);
    assert.equal(deniedView.view.canDecide, false);
    assert.equal(deniedView.view.decisions.length, 0);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          deniedView.sessionToken,
          { requestId: S04E_FIXTURE_IDS.decision, choice: "A short family blessing", expectedVersion: 1 },
          NOW,
        ),
      /cannot submit/i,
    );
    const renewed = service.renewAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      grantId: denied.grant.id,
      expectedVersion: denied.grant.version,
      canDecide: true,
      canExport: false,
      reason: "Governed renewal granting decision authority",
    });
    assert.equal(renewed.grant.canDecide, true);
    assert.equal(renewed.priorGrant.id, denied.grant.id);
    const persistedPrior = store.snapshot().atelierAccessGrants.find((item) => item.id === denied.grant.id);
    assert.equal(persistedPrior?.status, "SUPERSEDED");
    assert.equal(persistedPrior?.canDecide, false);
    const capable = service.exchangeAtelierAccess(renewed.token, NOW);
    assert.equal(capable.view.canDecide, true);
    assert.ok(capable.view.decisions.length > 0);
    const receipt = service.submitHostAtelierDecision(
      capable.sessionToken,
      { requestId: S04E_FIXTURE_IDS.decision, choice: "A short family blessing", expectedVersion: 1 },
      NOW,
    );
    assert.equal(receipt.changedCanonicalData, false);
    assert.ok(receipt.correlationId);
    assert.throws(
      () =>
        service.renewAtelierAccess(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          grantId: denied.grant.id,
          expectedVersion: denied.grant.version,
          canDecide: true,
          canExport: false,
          reason: "Stale renewal must conflict",
        }),
      /changed|VERSION/i,
    );
  });

  it("enforces role privacy, assistant limits, step-up scope and edition concurrency", () => {
    const { store, service } = seeded();
    service.publishEventAtelier(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal",
    });
    const roles = [
      ["PRINCIPAL_HOST", S04E_FIXTURE_IDS.personPrincipal, true],
      ["CO_HOST", S04E_FIXTURE_IDS.personCoHost, true],
      ["READ_ONLY_HOST", S04E_FIXTURE_IDS.personReadOnly, false],
      ["EXECUTIVE_ASSISTANT", S04E_FIXTURE_IDS.personAssistant, false],
      ["FAMILY_REPRESENTATIVE", S04E_FIXTURE_IDS.personFamily, false],
    ] as const;
    for (const [hostRole, personId, canDecide] of roles) {
      const issued = service.issueAtelierAccess(director(), {
        organisationId: FIXTURE_IDS.orgMaison,
        eventId: FIXTURE_IDS.eventAlphaOne,
        personId,
        hostRole,
        chapters: ["TODAY", "VISION", "ASSURANCE", "DECISIONS"],
        canDecide,
        canExport: false,
        reason: `Issue ${hostRole}`,
      });
      const view = service.exchangeAtelierAccess(issued.token, NOW).view;
      assert.equal(view.hostRole, hostRole);
      assert.equal(view.canDecide, canDecide);
      const blob = JSON.stringify(view);
      assert.equal(/private guest note|medical|security tactic|credential|yesBand|PARAM-SET|vendor bank|commercial note|audit trail/i.test(blob), false);
      if (!canDecide) assert.equal(view.decisions.length, 0);
    }
    assert.throws(() => service.hostAttemptCoreMutation(), /cannot assign staff|RSVP|forecast/i);
    const stepUpDecision = service.publishAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      kind: "REQUIRES_STAFF_REVIEW",
      title: "Private family confirmation",
      question: "Should Maison Doclar confirm the reserved family wording with the principal host?",
      consequence: "This confirmation is recorded only as a receipt. RSVP and programme stay unchanged.",
      options: ["Confirm the reserved wording", "Talk this through"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      requiresReview: true,
      requiresStepUp: true,
      reason: "Sensitive confirmation requires step-up",
    });
    const principal = store.snapshot().atelierAccessGrants.find(
      (item) => item.personId === S04E_FIXTURE_IDS.personPrincipal && item.status === "ACTIVE",
    );
    assert.ok(principal);
    const stepUp = service.issueAtelierStepUp(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      grantId: principal!.id,
      expectedVersion: principal!.version,
      reason: "Issue step-up for reserved confirmation",
    });
    const expiredSession = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personCoHost,
      hostRole: "CO_HOST",
      chapters: ["DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Co-host for expired elevation",
    });
    const stale = service.exchangeAtelierAccess(expiredSession.token, NOW);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          stale.sessionToken,
          { requestId: stepUpDecision.id, choice: "Confirm the reserved wording", expectedVersion: 1 },
          AFTER_ELEVATION,
        ),
      /step-up|fresh confirmation/i,
    );
    const elevated = service.exchangeAtelierAccess(stepUp.token, AFTER_ELEVATION);
    const stepReceipt = service.submitHostAtelierDecision(
      elevated.sessionToken,
      { requestId: stepUpDecision.id, choice: "Confirm the reserved wording", expectedVersion: 1 },
      AFTER_ELEVATION,
    );
    assert.equal(stepReceipt.changedCanonicalData, false);
    assert.throws(() => service.exchangeAtelierAccess(stepUp.token, AFTER_ELEVATION), /unavailable/i);
    const firstEdition = service.publishAtelierNarrative(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "Concurrency first.",
      atmosphere: "Still.",
      pillars: ["One"],
      culturalIntent: "Held privately.",
      designDirection: "Sparse.",
      provenance: "Concurrency A",
      reason: "First concurrency edition",
    });
    const workspace = service.getEventAtelierWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.throws(
      () =>
        service.publishAtelierNarrative(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          story: "Stale tab.",
          atmosphere: "Still.",
          pillars: ["One"],
          culturalIntent: "Held privately.",
          designDirection: "Sparse.",
          provenance: "Stale tab",
          expectedAtelierVersion: workspace.atelier.version - 1,
          reason: "Stale publication must conflict",
        }),
      /changed|VERSION/i,
    );
    const afterConflict = store
      .snapshot()
      .eventNarrativeEditions.filter((item) => item.atelierId === S04E_FIXTURE_IDS.atelier && item.provenance === "Stale tab");
    assert.equal(afterConflict.length, 0);
    const second = service.publishAtelierNarrative(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "Concurrency second.",
      atmosphere: "Still.",
      pillars: ["One"],
      culturalIntent: "Held privately.",
      designDirection: "Sparse.",
      provenance: "Concurrency B",
      expectedAtelierVersion: store.snapshot().eventAteliers.find((item) => item.id === S04E_FIXTURE_IDS.atelier)?.version,
      reason: "Second concurrency edition",
    });
    assert.equal(second.supersedesEditionId, firstEdition.id);
    assert.equal(
      store.snapshot().eventNarrativeEditions.filter((item) => item.atelierId === S04E_FIXTURE_IDS.atelier && item.publicationState === "PUBLISHED")
        .length,
      1,
    );
    const host = service.issueAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["VISION", "DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Principal after edition change",
    });
    const hostSession = service.exchangeAtelierAccess(host.token, NOW);
    assert.equal(hostSession.view.vision?.provenance, "Concurrency B");
    const open = service.publishAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      kind: "REQUIRES_STAFF_REVIEW",
      title: "Arrival greeting",
      question: "How should the family be greeted?",
      consequence: "Maison Doclar will set the greeting. Canonical records stay unchanged.",
      options: ["At the door", "In the courtyard"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      requiresReview: true,
      requiresStepUp: false,
      reason: "Decision for duplicate and stale choice",
    });
    const firstChoice = service.submitHostAtelierDecision(
      hostSession.sessionToken,
      { requestId: open.id, choice: "At the door", expectedVersion: 1, idempotencyKey: "greet-1" },
      NOW,
    );
    const duplicate = service.submitHostAtelierDecision(
      hostSession.sessionToken,
      { requestId: open.id, choice: "At the door", expectedVersion: 1, idempotencyKey: "greet-1" },
      NOW,
    );
    assert.equal(duplicate.id, firstChoice.id);
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          hostSession.sessionToken,
          { requestId: open.id, choice: "In the courtyard", expectedVersion: 1 },
          NOW,
        ),
      /already submitted|IDEMPOTENCY/i,
    );
    service.revokeAtelierAccess(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      grantId: host.grant.id,
      expectedVersion: host.grant.version,
      reason: "Revoke racing a later submission",
    });
    const later = service.publishAtelierDecision(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      kind: "HOST_PREFERENCE",
      title: "After revocation",
      question: "Should this remain open?",
      consequence: "Nothing operational changes.",
      options: ["Leave it", "Talk this through"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      requiresReview: false,
      requiresStepUp: false,
      reason: "Decision after revoke",
    });
    assert.throws(
      () =>
        service.submitHostAtelierDecision(
          hostSession.sessionToken,
          { requestId: later.id, choice: "Leave it", expectedVersion: 1 },
          NOW,
        ),
      /unavailable|no longer/i,
    );
  });
});
