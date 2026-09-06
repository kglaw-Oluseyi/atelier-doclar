import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { evaluateIntelligence, renderTemplate, signSyntheticPayload } from "../src/communications-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";

function director() {
  return actor(people.personDirector, { now: NOW });
}

function planner() {
  return actor(people.personPlanner, { now: NOW });
}

function prepared(service: ReturnType<typeof fixtureService>["service"], extras?: { email?: string; seatingAudience?: boolean }) {
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
  const approved = service.approveTemplate(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    templateVersionId: versions[0]!.id,
    expectedVersion: versions[0]!.version,
    reason: "approve template",
  });
  const audiences = service.listAudiences(director(), people.orgMaison, people.eventAlphaOne);
  return { guest, template: templates[0]!, version: approved, audience: audiences[0]! };
}

describe("communications lifecycle", () => {
  it("evaluates eligibility, freezes audience, and projects synthetic delivery", () => {
    const { service } = fixtureService();
    const { guest, template, audience } = prepared(service);
    const allow = service.evaluateGuestEligibility(director(), people.orgMaison, people.eventAlphaOne, guest.id, "EMAIL", "INVITATION");
    assert.equal(allow.status, "ALLOW");
    service.suppressContact(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      channel: "EMAIL",
      reason: "guest asked not to be emailed",
    });
    const denied = service.evaluateGuestEligibility(director(), people.orgMaison, people.eventAlphaOne, guest.id, "EMAIL", "INVITATION");
    assert.equal(denied.status, "DENY");
    assert.ok(denied.reasons.includes("SUPPRESSED"));

    const campaign = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Invitation rehearsal",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      testOnly: true,
      reason: "compose",
    });
    const requested = service.requestCampaignApproval(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: campaign.version,
      reason: "request approval",
    });
    assert.equal(requested.status, "AWAITING_APPROVAL");
    assert.ok(requested.audienceSnapshotId);
    const snapshotId = requested.audienceSnapshotId;
    service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Later",
      familyName: "Guest",
      email: "later@example.test",
      reason: "after freeze",
    });
    const approval = service.decideCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: requested.version,
      decision: "APPROVED",
      reason: "approve",
    });
    assert.equal(approval.decision, "APPROVED");
    const approved = service.getCampaign(director(), people.orgMaison, people.eventAlphaOne, campaign.id);
    assert.equal(approved.audienceSnapshotId, snapshotId);
    const ran = service.actOnCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: approved.version,
      action: "TEST_SEND",
      reason: "synthetic send",
    });
    assert.ok(ran.status === "COMPLETED" || ran.status === "DISPATCHING");
    const snap = service.currentSnapshot();
    const messages = snap.commsMessages.filter((item) => item.campaignId === campaign.id);
    assert.ok(messages.length >= 1);
    assert.equal(messages.every((item) => item.testWatermark), true);
    const blocked = messages.find((item) => item.guestId === guest.id);
    assert.ok(blocked);
    assert.equal(blocked.status, "BLOCKED");
  });

  it("retries, dead-letters, and rejects unauthenticated callbacks", () => {
    const { service } = fixtureService();
    const { guest, template, audience } = prepared(service, { email: "retry@example.test" });
    const campaign = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Retry rehearsal",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      testOnly: true,
      reason: "compose retry",
    });
    const requested = service.requestCampaignApproval(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: campaign.version,
      reason: "request",
    });
    service.decideCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: requested.version,
      decision: "APPROVED",
      reason: "approve retry",
    });
    const latest = service.getCampaign(director(), people.orgMaison, people.eventAlphaOne, campaign.id);
    service.actOnCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: latest.version,
      action: "RUN",
      failMode: "TRANSIENT",
      reason: "transient",
    });
    const afterTransient = service.currentSnapshot().commsMessages.find((item) => item.guestId === guest.id && item.campaignId === campaign.id);
    assert.equal(afterTransient?.status, "RETRYING");
    const again = service.getCampaign(director(), people.orgMaison, people.eventAlphaOne, campaign.id);
    service.actOnCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: again.version,
      action: "DISPATCH",
      failMode: "PERMANENT",
      reason: "permanent",
    });
    const failed = service.currentSnapshot().commsMessages.find((item) => item.guestId === guest.id && item.campaignId === campaign.id);
    assert.ok(failed);
    const attempt = service.currentSnapshot().messageAttempts.find((item) => item.messageId === failed.id && item.retryClass === "PERMANENT");
    assert.ok(attempt);
    assert.throws(
      () =>
        service.applySyntheticCallback(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          providerRequestKey: attempt.providerRequestKey,
          providerEventId: "forged-event",
          type: "DELIVERED",
          signature: "not-a-signature",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const eventId = "evt-dead-letter";
    const payload = `${attempt.providerRequestKey}:PERMANENT_FAILURE:${eventId}`;
    service.applySyntheticCallback(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      providerRequestKey: attempt.providerRequestKey,
      providerEventId: eventId,
      type: "PERMANENT_FAILURE",
      signature: signSyntheticPayload(payload),
    });
    const dead = service.currentSnapshot().commsMessages.find((item) => item.id === failed.id);
    assert.equal(dead?.status, "DEAD_LETTER");
    const replay = service.applySyntheticCallback(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      providerRequestKey: attempt.providerRequestKey,
      providerEventId: eventId,
      type: "PERMANENT_FAILURE",
      signature: signSyntheticPayload(payload),
    });
    assert.equal(replay?.providerEventId, eventId);
  });

  it("matches inbound, keeps unmatched unmatched, and applies corrections only through amend", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service, { email: "match.me@example.test" });
    const body = "Please use my other email";
    const providerMessageId = "in-1";
    const matched = service.ingestInbound(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      channel: "EMAIL",
      providerMessageId,
      sender: "match.me@example.test",
      body,
      signature: signSyntheticPayload(`${providerMessageId}:match.me@example.test:${body}`),
      reason: "inbound",
    });
    assert.equal(matched.matchStatus, "MATCHED");
    assert.equal(matched.guestId, guest.id);
    const replay = service.ingestInbound(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      channel: "EMAIL",
      providerMessageId,
      sender: "match.me@example.test",
      body,
      signature: signSyntheticPayload(`${providerMessageId}:match.me@example.test:${body}`),
      reason: "inbound",
    });
    assert.equal(replay.id, matched.id);
    const unknown = service.ingestInbound(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      channel: "EMAIL",
      providerMessageId: "in-2",
      sender: "stranger@example.test",
      body: "Who is this for?",
      attachmentFileName: "note.pdf",
      signature: signSyntheticPayload("in-2:stranger@example.test:Who is this for?"),
      reason: "unmatched",
    });
    assert.equal(unknown.matchStatus, "UNMATCHED");
    assert.equal(unknown.guestId, undefined);
    assert.equal(unknown.attachmentQuarantined, true);
    const before = service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value;
    const correction = service.proposeContactCorrection(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      channel: "EMAIL",
      proposedValue: "new.amaka@example.test",
      reason: "guest wrote a new address",
    });
    assert.equal(service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, before);
    service.decideContactCorrection(actor(people.personCeo), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      correctionId: correction.id,
      expectedVersion: correction.version,
      decision: "APPROVED",
      reason: "apply through S02 amend",
    });
    assert.equal(service.getGuest(director(), people.orgMaison, people.eventAlphaOne, guest.id).email.value, "new.amaka@example.test");
  });

  it("refuses unresolved required facts and seating predicates", () => {
    const { service } = fixtureService();
    prepared(service);
    assert.throws(
      () =>
        renderTemplate({
          version: {
            id: "00000000-0000-4000-8000-000000000099",
            templateId: "00000000-0000-4000-8000-000000000098",
            organisationId: people.orgMaison,
            versionNumber: 1,
            locale: "en",
            body: "See you at {{occasion.venue}}",
            requiredVariables: ["occasion.venue"],
            contentHash: "x",
            status: "APPROVED",
            schemaVersion: 1,
            version: 1,
            createdAt: NOW,
            updatedAt: NOW,
          },
          variables: { "occasion.venue": undefined },
        }),
      (error: unknown) => error instanceof PlatformError && /unresolved/.test(error.message),
    );
    assert.throws(
      () =>
        service.upsertAudience(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          name: "Seated guests",
          filters: [{ predicate: "SEATING", value: "TABLE_1" }],
          reason: "unavailable",
        }),
      (error: unknown) => error instanceof PlatformError && /seating/.test(error.message),
    );
    const alerts = evaluateIntelligence({
      awaitingApproval: 0,
      deadLetters: 0,
      unmatched: 0,
      openTasks: 2,
      overdueTasks: 0,
    });
    assert.equal(alerts.some((item) => item.ruleId.includes("rsvp")), false);
  });

  it("does not mint RSVP invitations from a campaign", () => {
    const { service } = fixtureService();
    const { guest, template, audience } = prepared(service);
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      reason: "prepare rsvp",
    });
    const issued = service.issueRsvpInvitation(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const campaign = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Deliver issued invitation",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      linkedInvitationId: issued.invitation.id,
      testOnly: true,
      reason: "link issued invitation",
    });
    assert.equal(campaign.linkedInvitationId, issued.invitation.id);
    assert.equal(service.currentSnapshot().rsvpInvitations.filter((item) => item.guestId === guest.id).length, 1);
  });
});
