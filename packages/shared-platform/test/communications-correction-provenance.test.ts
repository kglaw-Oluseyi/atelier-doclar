import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMA_VERSION } from "../src/constants.js";
import { PlatformError } from "../src/errors.js";
import { signSyntheticPayload } from "../src/communications-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";
const LATER = "2026-09-05T16:00:00.000Z";

function director() {
  return actor(people.personDirector, { now: NOW });
}

function planner() {
  return actor(people.personPlanner, { now: NOW });
}

function ceo() {
  return actor(people.personCeo, { now: NOW });
}

function prepared(service: ReturnType<typeof fixtureService>["service"], extras?: { email?: string }) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Amaka",
    familyName: "Iroko",
    email: extras?.email ?? "amaka.iroko@example.test",
    reason: "comms guest",
  });
  const preparedComms = service.prepareCommunications(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    reason: "prepare",
  });
  service.publishChannelPolicy(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    expectedVersion: preparedComms.policy.version,
    reason: "publish policy",
  });
  return { guest };
}

function ingestUnmatched(
  service: ReturnType<typeof fixtureService>["service"],
  extras?: { providerMessageId?: string; attachment?: boolean },
) {
  const body = "Please use my other email";
  const providerMessageId = extras?.providerMessageId ?? "in-unmatched-provenance";
  return service.ingestInbound(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    channel: "EMAIL",
    providerMessageId,
    sender: "stranger@example.test",
    body,
    ...(extras?.attachment ? { attachmentFileName: "note.pdf" } : {}),
    signature: signSyntheticPayload(`${providerMessageId}:stranger@example.test:${body}`),
    reason: "unmatched",
  });
}

function proposeFromDirector(
  service: ReturnType<typeof fixtureService>["service"],
  guestId: string,
  extras?: { sourceMessageId?: string; value?: string },
) {
  return service.proposeContactCorrection(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId,
    channel: "EMAIL",
    proposedValue: extras?.value ?? "new.amaka@example.test",
    ...(extras?.sourceMessageId ? { sourceMessageId: extras.sourceMessageId } : {}),
    reason: "guest wrote a new address",
  });
}

describe("contact correction maker-checker provenance", () => {
  it("lets the Event Director propose and the CEO approve/apply", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const before = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value;
    const proposal = proposeFromDirector(service, guest.id);
    assert.equal(proposal.proposedByPersonId, people.personDirector);
    assert.equal(proposal.proposedByRoleKey, "EVENT_DIRECTOR");
    assert.equal(proposal.createdAt, NOW);
    const applied = service.decideContactCorrection(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      correctionId: proposal.id,
      expectedVersion: proposal.version,
      decision: "APPROVED",
      reason: "apply through S02 amend",
    });
    assert.equal(applied.status, "APPLIED");
    assert.equal(applied.decidedByPersonId, people.personCeo);
    assert.equal(applied.proposedByPersonId, people.personDirector);
    assert.equal(service.getGuest(ceo(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "new.amaka@example.test");
    assert.notEqual(service.getGuest(ceo(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, before);
    const audit = service.searchAudit(ceo(), people.orgMaison);
    assert.ok(audit.some((item) => item.action === "msg.correction.decided" && item.actorPersonId === people.personCeo));
    assert.ok(audit.some((item) => item.action === "guest.record.amended" && item.resourceId === guest.id));
    const reviews = service.listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaOne);
    const review = reviews.find((item) => item.id === proposal.id);
    assert.ok(review);
    assert.equal(review.maker.state, "AVAILABLE");
    if (review.maker.state === "AVAILABLE") {
      assert.equal(review.maker.personId, people.personDirector);
      assert.equal(review.maker.displayName, "Event Director");
      assert.equal(review.maker.roleKey, "EVENT_DIRECTOR");
    }
    assert.equal(review.decision.state, "RECORDED");
    assert.ok(!("body" in review));
    assert.ok(!("audit" in review));
  });

  it("lets the CEO propose and the Event Director approve/apply", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = service.proposeContactCorrection(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      channel: "EMAIL",
      proposedValue: "ceo.proposed@example.test",
      reason: "ceo proposed",
    });
    assert.equal(proposal.proposedByPersonId, people.personCeo);
    assert.equal(proposal.proposedByRoleKey, "CEO");
    const applied = service.decideContactCorrection(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      correctionId: proposal.id,
      expectedVersion: proposal.version,
      decision: "APPROVED",
      reason: "director applies",
    });
    assert.equal(applied.status, "APPLIED");
    assert.equal(applied.decidedByPersonId, people.personDirector);
    assert.equal(
      service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value,
      "ceo.proposed@example.test",
    );
  });

  it("denies the proposer from approving or rejecting their own correction", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    assert.throws(
      () =>
        service.decideContactCorrection(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: proposal.id,
          expectedVersion: proposal.version,
          decision: "APPROVED",
          reason: "self apply",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.decideContactCorrection(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: proposal.id,
          expectedVersion: proposal.version,
          decision: "REJECTED",
          reason: "self reject",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.equal(service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "amaka.iroko@example.test");
    assert.equal(
      service.listContactCorrections(ceo(), people.orgMaison, people.eventAlphaOne).find((item) => item.id === proposal.id)
        ?.status,
      "PROPOSED",
    );
  });

  it("denies a different actor without review permission", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    assert.throws(
      () =>
        service.decideContactCorrection(planner(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: proposal.id,
          expectedVersion: proposal.version,
          decision: "APPROVED",
          reason: "planner cannot review",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("denies cross-event and cross-organisation review", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    assert.throws(
      () =>
        service.decideContactCorrection(ceo(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaTwo,
          correctionId: proposal.id,
          expectedVersion: proposal.version,
          decision: "APPROVED",
          reason: "wrong event",
        }),
      (error: unknown) =>
        error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN"),
    );
    assert.throws(
      () => service.listContactCorrectionReviews(actor(people.personOtherOrg), people.orgMaison, people.eventAlphaOne),
      (error: unknown) =>
        error instanceof PlatformError &&
        (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "ACCESS_PENDING"),
    );
    const foreign = service.listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaTwo);
    assert.equal(
      foreign.some((item) => item.id === proposal.id),
      false,
    );
  });

  it("preserves immutable role-at-time after a later assignment change", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    assert.equal(proposal.proposedByRoleKey, "EVENT_DIRECTOR");
    const assignment = service
      .listAssignments(ceo(), people.orgMaison)
      .find((item) => item.id === people.assignDirector);
    assert.ok(assignment);
    service.revokeAssignment(ceo(), {
      assignmentId: assignment.id,
      organisationId: people.orgMaison,
      expectedVersion: assignment.version,
      reason: "change director role after proposal",
    });
    service.grantAssignment(ceo(), {
      organisationId: people.orgMaison,
      personId: people.personDirector,
      roleKey: "PLANNER",
      eventId: people.eventAlphaOne,
      clientId: people.clientAlpha,
      reason: "later planner grant",
    });
    const review = service
      .listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaOne)
      .find((item) => item.id === proposal.id);
    assert.ok(review);
    assert.equal(review.maker.state, "AVAILABLE");
    if (review.maker.state === "AVAILABLE") {
      assert.equal(review.maker.roleKey, "EVENT_DIRECTOR");
    }
  });

  it("projects event-scoped source evidence states", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const unmatched = ingestUnmatched(service);
    const linked = proposeFromDirector(service, guest.id, { sourceMessageId: unmatched.id, value: "linked@example.test" });
    const unlinked = proposeFromDirector(service, guest.id, { value: "unlinked@example.test" });
    const missing = proposeFromDirector(service, guest.id, {
      sourceMessageId: "00000000-0000-4000-8000-0000000000aa",
      value: "missing@example.test",
    });
    const quarantined = ingestUnmatched(service, { providerMessageId: "in-quarantine", attachment: true });
    const redacted = proposeFromDirector(service, guest.id, {
      sourceMessageId: quarantined.id,
      value: "redacted@example.test",
    });
    const reviews = service.listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaOne);
    const linkedReview = reviews.find((item) => item.id === linked.id);
    const unlinkedReview = reviews.find((item) => item.id === unlinked.id);
    const missingReview = reviews.find((item) => item.id === missing.id);
    const redactedReview = reviews.find((item) => item.id === redacted.id);
    assert.ok(linkedReview && unlinkedReview && missingReview && redactedReview);
    assert.equal(linkedReview.sourceEvidence.state, "AVAILABLE");
    if (linkedReview.sourceEvidence.state === "AVAILABLE") {
      assert.equal(linkedReview.sourceEvidence.inboundMessageId, unmatched.id);
      assert.match(linkedReview.sourceEvidence.reviewPath, new RegExp(`/app/events/${people.eventAlphaOne}/`));
      assert.doesNotMatch(linkedReview.sourceEvidence.reviewPath, /eventAlphaTwo|00000000-0000-4000-8000-000000000022/);
    }
    assert.equal(unlinkedReview.sourceEvidence.state, "NOT_LINKED");
    assert.equal(missingReview.sourceEvidence.state, "UNAVAILABLE");
    assert.equal(redactedReview.sourceEvidence.state, "REDACTED");
    assert.ok(!("body" in linkedReview.sourceEvidence));
    assert.ok(!("senderNormalized" in linkedReview.sourceEvidence));
  });

  it("does not treat a cross-event inbound as available evidence", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const unmatched = ingestUnmatched(service);
    const proposal = proposeFromDirector(service, guest.id, { sourceMessageId: unmatched.id });
    const snap = service.currentSnapshot();
    const message = snap.inboundMessages.find((item) => item.id === unmatched.id);
    assert.ok(message);
    message.eventId = people.eventAlphaTwo;
    service.loadSnapshot(snap);
    const review = service
      .listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaOne)
      .find((item) => item.id === proposal.id);
    assert.ok(review);
    assert.equal(review.sourceEvidence.state, "UNAVAILABLE");
  });

  it("refuses to decide a historical record without maker attribution", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const snap = service.currentSnapshot();
    const legacyId = "00000000-0000-4000-8000-000000000099";
    snap.contactCorrections.push({
      id: legacyId,
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      channel: "EMAIL",
      existingValue: "amaka.iroko@example.test",
      proposedValue: "legacy@example.test",
      status: "PROPOSED",
      reason: "legacy proposal without maker",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    service.loadSnapshot(snap);
    const review = service
      .listContactCorrectionReviews(ceo(), people.orgMaison, people.eventAlphaOne)
      .find((item) => item.id === legacyId);
    assert.ok(review);
    assert.equal(review.maker.state, "UNAVAILABLE");
    assert.equal(review.proposedAt, NOW);
    assert.throws(
      () =>
        service.decideContactCorrection(ceo(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: legacyId,
          expectedVersion: 1,
          decision: "APPROVED",
          reason: "cannot guess maker",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.equal(service.getGuest(ceo(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "amaka.iroko@example.test");
  });

  it("rejects a stale correction version and a stale guest version without applying", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    assert.throws(
      () =>
        service.decideContactCorrection(ceo(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: proposal.id,
          expectedVersion: proposal.version + 1,
          decision: "APPROVED",
          reason: "stale correction",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    service.amendGuest(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      expectedVersion: guest.version,
      preferredName: "Amaka-preferred",
      reason: "bump guest version",
    });
    assert.throws(
      () =>
        service.decideContactCorrection(actor(people.personCeo, { now: LATER }), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          correctionId: proposal.id,
          expectedVersion: proposal.version,
          decision: "APPROVED",
          reason: "stale guest",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const current = service.listContactCorrections(ceo(), people.orgMaison, people.eventAlphaOne).find((item) => item.id === proposal.id);
    assert.equal(current?.status, "PROPOSED");
    assert.equal(service.getGuest(ceo(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "amaka.iroko@example.test");
  });

  it("rejects without changing canonical contact and records checker attribution", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    const proposal = proposeFromDirector(service, guest.id);
    const rejected = service.decideContactCorrection(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      correctionId: proposal.id,
      expectedVersion: proposal.version,
      decision: "REJECTED",
      reason: "not accepted",
    });
    assert.equal(rejected.status, "REJECTED");
    assert.equal(rejected.decidedByPersonId, people.personCeo);
    assert.equal(rejected.proposedByPersonId, people.personDirector);
    assert.equal(service.getGuest(ceo(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "amaka.iroko@example.test");
  });
});
