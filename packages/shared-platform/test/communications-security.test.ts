import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";
const director = () => actor(people.personDirector, { now: NOW });
const planner = () => actor(people.personPlanner, { now: NOW });
const auditor = () => actor(people.personAuditor, { now: NOW });
const other = () => actor(people.personOtherOrg, { now: NOW });

function ready(service: ReturnType<typeof fixtureService>["service"]) {
  service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Ife",
    familyName: "Banjo",
    email: "ife.banjo@example.test",
    reason: "security guest",
  });
  const prepared = service.prepareCommunications(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    reason: "prepare",
  });
  service.publishChannelPolicy(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    expectedVersion: prepared.policy.version,
    reason: "publish",
  });
  const templates = service.listTemplates(director(), people.orgMaison, people.eventAlphaOne);
  const versions = service.listTemplateVersions(director(), people.orgMaison, people.eventAlphaOne, templates[0]!.id);
  service.approveTemplate(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    templateVersionId: versions[0]!.id,
    expectedVersion: versions[0]!.version,
    reason: "approve",
  });
  return { template: templates[0]!, audience: service.listAudiences(director(), people.orgMaison, people.eventAlphaOne)[0]! };
}

describe("communications security", () => {
  it("conceals other organisations and events", () => {
    const { service } = fixtureService();
    ready(service);
    assert.throws(
      () => service.getCommunicationsOverview(other(), people.orgMaison, people.eventAlphaOne),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "ACCESS_PENDING"),
    );
    assert.throws(
      () => service.listInbox(planner(), people.orgMaison, people.eventAlphaTwo),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
  });

  it("enforces approval permission and author-approver separation", () => {
    const { service } = fixtureService();
    const { template, audience } = ready(service);
    const campaign = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "SoD",
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
          reason: "planner cannot approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const ceoCampaign = service.createCampaign(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Self approve",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      testOnly: true,
      reason: "author",
    });
    const ceoRequested = service.requestCampaignApproval(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: ceoCampaign.id,
      expectedVersion: ceoCampaign.version,
      reason: "request self",
    });
    assert.throws(
      () =>
        service.decideCampaign(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          campaignId: ceoCampaign.id,
          expectedVersion: ceoRequested.version,
          decision: "APPROVED",
          reason: "same person",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("is idempotent on approval request and rejects stale versions", () => {
    const { service } = fixtureService();
    const { template, audience } = ready(service);
    const campaign = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Idempotent",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      testOnly: true,
      reason: "compose",
      idempotencyKey: "create-1",
    });
    const again = service.createCampaign(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      name: "Idempotent",
      purpose: "INVITATION",
      channel: "EMAIL",
      templateId: template.id,
      audienceDefinitionId: audience.id,
      testOnly: true,
      reason: "compose",
      idempotencyKey: "create-1",
    });
    assert.equal(again.id, campaign.id);
    const requested = service.requestCampaignApproval(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: campaign.version,
      reason: "request",
      idempotencyKey: "req-1",
    });
    const replay = service.requestCampaignApproval(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      campaignId: campaign.id,
      expectedVersion: campaign.version,
      reason: "request",
      idempotencyKey: "req-1",
    });
    assert.equal(replay.id, requested.id);
    assert.throws(
      () =>
        service.requestCampaignApproval(planner(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          campaignId: campaign.id,
          expectedVersion: campaign.version,
          reason: "stale",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "TRANSITION_INVALID"),
    );
  });

  it("does not let an auditor compose or dispatch", () => {
    const { service } = fixtureService();
    ready(service);
    assert.throws(
      () =>
        service.prepareCommunications(auditor(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          reason: "auditor",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const overview = service.getCommunicationsOverview(auditor(), people.orgMaison, people.eventAlphaOne);
    assert.ok(overview.generatedAt);
  });

  it("does not expose unpublished occasion facts to guests", () => {
    const { service } = fixtureService();
    const guest = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Chioma",
      familyName: "Ade",
      reason: "guest view",
    });
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      reason: "rsvp",
    });
    service.prepareCommunications(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      reason: "draft occasion",
    });
    const invitation = service.issueRsvpInvitation(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const view = service.exchangeGuestAccess(invitation.token).view;
    assert.equal(view.occasion?.published, false);
    assert.equal(view.occasion?.venue, undefined);
  });
});
