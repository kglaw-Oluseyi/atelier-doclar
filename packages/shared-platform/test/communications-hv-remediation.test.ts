import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { replyEligibilityPublicMessage, signSyntheticPayload } from "../src/communications-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";

function director() {
  return actor(people.personDirector, { now: NOW });
}

function planner() {
  return actor(people.personPlanner, { now: NOW });
}

function auditor() {
  return actor(people.personAuditor, { now: NOW });
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
  service.publishGuestSafeOccasion(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    expectedVersion: preparedComms.occasion.version,
    verifyWhen: true,
    verifyVenue: true,
    arrival: "Please arrive from 16:00",
    reason: "publish occasion",
  });
  const templates = service.listTemplates(director(), people.orgMaison, people.eventAlphaOne);
  const versions = service.listTemplateVersions(director(), people.orgMaison, people.eventAlphaOne, templates[0]!.id);
  service.approveTemplate(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    templateVersionId: versions[0]!.id,
    expectedVersion: versions[0]!.version,
    reason: "approve template",
  });
  return { guest, preparedComms };
}

function ingestUnmatched(service: ReturnType<typeof fixtureService>["service"]) {
  const body = "Who is this invitation for?";
  const providerMessageId = "in-unmatched-hv";
  return service.ingestInbound(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    channel: "EMAIL",
    providerMessageId,
    sender: "stranger@example.test",
    body,
    signature: signSyntheticPayload(`${providerMessageId}:stranger@example.test:${body}`),
    reason: "unmatched",
  });
}

function matchedThread(service: ReturnType<typeof fixtureService>["service"], guestEmail: string) {
  const body = "Please confirm arrival";
  const providerMessageId = "in-thread-hv";
  service.ingestInbound(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    channel: "EMAIL",
    providerMessageId,
    sender: guestEmail,
    body,
    signature: signSyntheticPayload(`${providerMessageId}:${guestEmail}:${body}`),
    reason: "inbound",
  });
  return service.listInbox(director(), people.orgMaison, people.eventAlphaOne)[0]!;
}

describe("EOS-S04 HV remediation", () => {
  describe("reply eligibility public messages", () => {
    it("maps safe public messages without leaking internal detail", () => {
      assert.equal(
        replyEligibilityPublicMessage(["QUIET_HOURS"]),
        "Reply blocked by the event channel quiet-hours policy.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["CHANNEL_DISABLED"]),
        "Reply blocked because this channel is disabled for the event.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["CONTACT_ABSENT"]),
        "Reply blocked because the guest does not have an eligible contact for this channel.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["SUPPRESSED"]),
        "Reply blocked by the guest communication restrictions.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["FREQUENCY_CAP"]),
        "Reply blocked because the event communication limit has been reached.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["CHANNEL_POLICY_UNPUBLISHED"]),
        "Reply blocked because the event channel policy is not published.",
      );
      assert.equal(
        replyEligibilityPublicMessage(["PURPOSE_NOT_ALLOWED"]),
        "You do not have permission to perform this action.",
      );
    });

    it("returns quiet-hours message on reply denial and allows reply outside quiet hours", () => {
      const { service } = fixtureService();
      prepared(service);
      const policy = service.getChannelPolicy(director(), people.orgMaison, people.eventAlphaOne)!;
      service.publishChannelPolicy(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        expectedVersion: policy.version,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
        reason: "quiet all day",
      });
      const thread = matchedThread(service, "amaka.iroko@example.test");
      assert.throws(
        () =>
          service.replyOnThread(director(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            threadId: thread.id,
            body: "We will reply later",
            reason: "quiet hours",
          }),
        (error: unknown) =>
          error instanceof PlatformError &&
          error.code === "FORBIDDEN" &&
          error.publicMessage === "Reply blocked by the event channel quiet-hours policy.",
      );
      const updatedPolicy = service.getChannelPolicy(director(), people.orgMaison, people.eventAlphaOne)!;
      service.publishChannelPolicy(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        expectedVersion: updatedPolicy.version,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        reason: "normal hours",
      });
      const reply = service.replyOnThread(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        threadId: thread.id,
        body: "Arrival is from four o'clock.",
        reason: "concierge reply",
      });
      assert.equal(reply.direction, "OUTBOUND");
    });

    it("keeps permission denial distinct from eligibility mapping", () => {
      const { service } = fixtureService();
      prepared(service);
      const thread = matchedThread(service, "amaka.iroko@example.test");
      assert.throws(
        () =>
          service.replyOnThread(auditor(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            threadId: thread.id,
            body: "Auditor cannot reply",
            reason: "permission",
          }),
        (error: unknown) =>
          error instanceof PlatformError &&
          error.code === "FORBIDDEN" &&
          error.publicMessage === "You do not have permission to perform this action.",
      );
    });
  });

  describe("unmatched reconciliation", () => {
    it("rejects LINK without guestId and leaves inbound unmatched", () => {
      const { service } = fixtureService();
      const { guest } = prepared(service);
      const unmatched = ingestUnmatched(service);
      assert.throws(
        () =>
          service.resolveUnmatchedInbound(director(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            inboundId: unmatched.id,
            expectedVersion: unmatched.version,
            action: "LINK",
            reason: "missing guest",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
      );
      const after = service.currentSnapshot().inboundMessages.find((item) => item.id === unmatched.id);
      assert.equal(after?.matchStatus, "UNMATCHED");
      assert.equal(after?.guestId, undefined);
      void guest;
    });

    it("rejects cross-event guest and succeeds with explicit valid guest", () => {
      const { service } = fixtureService();
      const { guest } = prepared(service);
      const otherGuest = service.intakeGuest(ceo(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaTwo,
        givenName: "Other",
        familyName: "Event",
        email: "other.event@example.test",
        reason: "other event guest",
      });
      const unmatched = ingestUnmatched(service);
      assert.throws(
        () =>
          service.resolveUnmatchedInbound(director(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            inboundId: unmatched.id,
            expectedVersion: unmatched.version,
            guestId: otherGuest.id,
            action: "LINK",
            reason: "wrong event",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
      );
      const linked = service.resolveUnmatchedInbound(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        inboundId: unmatched.id,
        expectedVersion: unmatched.version,
        guestId: guest.id,
        action: "LINK",
        reason: "explicit guest selected",
      });
      assert.equal(linked.matchStatus, "MATCHED");
      assert.equal(linked.guestId, guest.id);
    });

    it("denies unauthorised roles from resolving unmatched inbound", () => {
      const { service } = fixtureService();
      prepared(service);
      const unmatched = ingestUnmatched(service);
      assert.throws(
        () =>
          service.resolveUnmatchedInbound(planner(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            inboundId: unmatched.id,
            expectedVersion: unmatched.version,
            action: "DISMISS",
            reason: "planner cannot resolve",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
    });
  });

  describe("correction proposals", () => {
    it("requires explicit guest, channel, value and reason without changing canonical contact", () => {
      const { service } = fixtureService();
      const { guest } = prepared(service);
      const unmatched = ingestUnmatched(service);
      const before = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value;
      assert.throws(
        () =>
          service.proposeContactCorrection(director(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            guestId: "",
            channel: "EMAIL",
            proposedValue: "new@example.test",
            reason: "missing guest",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
      );
      const proposal = service.proposeContactCorrection(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        guestId: guest.id,
        channel: "EMAIL",
        proposedValue: "new.amaka@example.test",
        sourceMessageId: unmatched.id,
        reason: "guest wrote a new address",
      });
      assert.equal(
        service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value,
        before,
      );
      const listed = service.listContactCorrections(director(), people.orgMaison, people.eventAlphaOne);
      assert.ok(listed.some((item) => item.id === proposal.id));
      assert.equal(proposal.sourceMessageId, unmatched.id);
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
      service.decideContactCorrection(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        correctionId: proposal.id,
        expectedVersion: proposal.version,
        decision: "APPROVED",
        reason: "apply through S02 amend",
      });
      assert.equal(
        service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value,
        "new.amaka@example.test",
      );
    });

    it("rejects cross-organisation correction review and leaves contact unchanged on rejection", () => {
      const { service } = fixtureService();
      const { guest } = prepared(service);
      const proposal = service.proposeContactCorrection(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        guestId: guest.id,
        channel: "EMAIL",
        proposedValue: "reject.me@example.test",
        reason: "test rejection",
      });
      const before = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value;
      service.decideContactCorrection(director(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        correctionId: proposal.id,
        expectedVersion: proposal.version,
        decision: "REJECTED",
        reason: "not accepted",
      });
      assert.equal(service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, before);
      assert.throws(
        () => service.listContactCorrections(actor(people.personOtherOrg), people.orgMaison, people.eventAlphaOne),
        (error: unknown) =>
          error instanceof PlatformError &&
          (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "ACCESS_PENDING"),
      );
    });
  });

  describe("campaign author attribution", () => {
    it("stores author person id and blocks self-approval", () => {
      const { service } = fixtureService();
      const { guest, preparedComms } = prepared(service);
      const templates = service.listTemplates(director(), people.orgMaison, people.eventAlphaOne);
      const audiences = service.listAudiences(director(), people.orgMaison, people.eventAlphaOne);
      const campaign = service.createCampaign(planner(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        name: "Author attribution",
        purpose: "INVITATION",
        channel: "EMAIL",
        templateId: templates[0]!.id,
        audienceDefinitionId: audiences[0]!.id,
        testOnly: true,
        reason: "compose",
      });
      assert.equal(campaign.createdByPersonId, people.personPlanner);
      const author = service.resolveActor(campaign.createdByPersonId).person.displayName;
      assert.ok(author.length > 0);
      assert.doesNotMatch(author, /00000000/);
      const requested = service.requestCampaignApproval(planner(), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        campaignId: campaign.id,
        expectedVersion: campaign.version,
        reason: "request",
      });
      assert.throws(
        () =>
          service.decideCampaign(planner(), {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            campaignId: campaign.id,
            expectedVersion: requested.version,
            decision: "APPROVED",
            reason: "self approve",
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
      );
      void guest;
      void preparedComms;
    });
  });
});
