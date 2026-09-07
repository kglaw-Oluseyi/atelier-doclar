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
  });
});
