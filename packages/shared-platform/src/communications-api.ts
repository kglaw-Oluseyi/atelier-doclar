import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { normalizeEmail, normalizePhone } from "./guest-matching.js";
import {
  buildAudienceSnapshot,
  contentHash,
  defaultChannelPolicy,
  defaultInvitationBody,
  draftOccasionFromEvent,
  evaluateAudienceMember,
  evaluateEligibility,
  evaluateIntelligence,
  eventChannelPolicy,
  eventOccasion,
  extractVariables,
  legalCampaignTransition,
  nextFallbackChannel,
  nextMessageStatus,
  projectGuestSafeOccasion,
  rebuildContactProjections,
  renderTemplate,
  signSyntheticPayload,
  templateVariablesFor,
  verifySyntheticSignature,
} from "./communications-operations.js";
import type {
  AudienceDefinition,
  Campaign,
  CampaignApproval,
  ChannelPolicy,
  CommsMessage,
  FollowUpTask,
  GuestSafeOccasion,
  InboundMessage,
  MessageTemplate,
  MessageTemplateVersion,
  MsgChannel,
  MsgPurpose,
} from "./communications-schemas.js";
import type { EventRecord } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

function requirePolicy(snap: PlatformSnapshot, eventId: string): ChannelPolicy {
  const policy = eventChannelPolicy(snap, eventId);
  if (!policy) throw new PlatformError("NOT_FOUND", "communications have not been prepared for this event");
  return policy;
}

export function syncContactProjections(snap: PlatformSnapshot, eventId: string, now: string): void {
  const guests = snap.operationalGuests.filter((item) => item.eventId === eventId);
  const kept = snap.contactProjections.filter((item) => item.eventId !== eventId);
  const rebuilt = guests.flatMap((guest) =>
    rebuildContactProjections({
      guest,
      existing: snap.contactProjections.filter((item) => item.guestId === guest.id),
      now,
    }),
  );
  snap.contactProjections = [...kept, ...rebuilt];
}

export function prepareCommunicationsOnSnap(snap: PlatformSnapshot, event: EventRecord, now: string): {
  policy: ChannelPolicy;
  occasion: GuestSafeOccasion;
} {
  let policy = eventChannelPolicy(snap, event.id);
  if (!policy) {
    policy = { id: randomUUID(), ...defaultChannelPolicy(event, now) };
    snap.channelPolicies.push(policy);
  }
  let occasion = eventOccasion(snap, event.id);
  if (!occasion) {
    occasion = { id: randomUUID(), ...draftOccasionFromEvent(event, now) };
    snap.guestSafeOccasions.push(occasion);
  }
  if (!snap.audienceDefinitions.some((item) => item.eventId === event.id)) {
    snap.audienceDefinitions.push({
      id: randomUUID(),
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId: event.id,
      name: "Active guests with email",
      filters: [
        { predicate: "LIFECYCLE", value: "ACTIVE" },
        { predicate: "HAS_EMAIL", value: "YES" },
      ],
      status: "ACTIVE",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (!snap.messageTemplates.some((item) => item.eventId === event.id && item.key === "invitation-email")) {
    const template: MessageTemplate = {
      id: randomUUID(),
      organisationId: event.organisationId,
      eventId: event.id,
      clientId: event.clientId,
      key: "invitation-email",
      purpose: "INVITATION",
      channel: "EMAIL",
      status: "DRAFT",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const body = defaultInvitationBody();
    const version: MessageTemplateVersion = {
      id: randomUUID(),
      templateId: template.id,
      organisationId: event.organisationId,
      versionNumber: 1,
      locale: "en",
      subject: "An invitation from Maison Doclar",
      body,
      requiredVariables: extractVariables(body).filter((name) => name === "guest.name" || name === "event.name"),
      contentHash: contentHash(body),
      status: "DRAFT",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    template.activeVersionId = version.id;
    snap.messageTemplates.push(template);
    snap.messageTemplateVersions.push(version);
  }
  syncContactProjections(snap, event.id, now);
  return { policy, occasion };
}

export function guestEligibility(snap: PlatformSnapshot, guestId: string, channel: MsgChannel, purpose: MsgPurpose, now: string) {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  if (!guest) throw new PlatformError("NOT_FOUND", "guest was not found");
  const policy = eventChannelPolicy(snap, guest.eventId);
  const recentSends = snap.commsMessages.filter(
    (item) => item.guestId === guestId && item.channel === channel && item.direction === "OUTBOUND" && item.status !== "CANCELLED" && item.status !== "BLOCKED",
  ).length;
  return evaluateEligibility({
    policy,
    guest,
    projections: snap.contactProjections,
    suppressions: snap.suppressionEntries,
    consents: snap.consents,
    channel,
    purpose,
    now,
    recentSends,
  });
}

export function previewAudienceOnSnap(
  snap: PlatformSnapshot,
  definition: AudienceDefinition,
  channel: MsgChannel,
  purpose: MsgPurpose,
  now: string,
) {
  const guests = snap.operationalGuests.filter((item) => item.eventId === definition.eventId);
  const responses = snap.rsvpResponses.filter((item) => item.eventId === definition.eventId);
  const eligibility = guests.map((guest) => {
    const result = guestEligibility(snap, guest.id, channel, purpose, now);
    const contact = snap.contactProjections.find((item) => item.guestId === guest.id && item.channel === channel);
    return {
      guestId: guest.id,
      channel,
      status: result.status,
      reasons: result.reasons,
      ...(contact ? { contactProjectionId: contact.id } : {}),
    };
  });
  const snapshot = buildAudienceSnapshot({ definition, guests, responses, eligibility, now });
  const unknownSeating = definition.filters.some((item) => item.predicate === "SEATING");
  return {
    snapshot,
    unknownPredicates: unknownSeating ? (["SEATING"] as const) : [],
    included: snapshot.members.filter((item) => item.eligibility === "ALLOW").length,
    excluded: snapshot.excludedCount,
  };
}

export function requestCampaignApprovalOnSnap(
  snap: PlatformSnapshot,
  campaign: Campaign,
  actorPersonId: string,
  now: string,
): Campaign {
  if (!legalCampaignTransition(campaign.status, "AWAITING_APPROVAL")) {
    throw new PlatformError("TRANSITION_INVALID", `campaign cannot leave ${campaign.status}`);
  }
  const definition = snap.audienceDefinitions.find((item) => item.id === campaign.audienceDefinitionId);
  const version = snap.messageTemplateVersions.find((item) => item.id === campaign.templateVersionId);
  if (!definition || !version) throw new PlatformError("NOT_FOUND", "campaign references are missing");
  if (version.status !== "APPROVED") throw new PlatformError("VALIDATION_FAILED", "template version is not approved");
  const preview = previewAudienceOnSnap(snap, definition, campaign.channel, campaign.purpose, now);
  snap.audienceSnapshots.push(preview.snapshot);
  campaign.audienceSnapshotId = preview.snapshot.id;
  campaign.status = "AWAITING_APPROVAL";
  campaign.updatedAt = now;
  campaign.version += 1;
  snap.commsNotifications.push({
    id: randomUUID(),
    organisationId: campaign.organisationId,
    clientId: campaign.clientId,
    eventId: campaign.eventId,
    kind: "APPROVAL",
    title: "Campaign awaiting approval",
    body: campaign.name,
    href: `/communications/campaigns/${campaign.id}`,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  void actorPersonId;
  return campaign;
}

export function decideCampaignOnSnap(
  snap: PlatformSnapshot,
  campaign: Campaign,
  input: { decision: "APPROVED" | "REJECTED"; comment?: string; personId: string; now: string },
): CampaignApproval {
  if (campaign.status !== "AWAITING_APPROVAL") {
    throw new PlatformError("TRANSITION_INVALID", "campaign is not awaiting approval");
  }
  if (!campaign.audienceSnapshotId) throw new PlatformError("VALIDATION_FAILED", "audience snapshot is missing");
  const snapshot = snap.audienceSnapshots.find((item) => item.id === campaign.audienceSnapshotId);
  const version = snap.messageTemplateVersions.find((item) => item.id === campaign.templateVersionId);
  if (!snapshot || !version) throw new PlatformError("NOT_FOUND", "approval evidence is missing");
  const approval: CampaignApproval = {
    id: randomUUID(),
    organisationId: campaign.organisationId,
    clientId: campaign.clientId,
    eventId: campaign.eventId,
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    snapshotId: snapshot.id,
    contentHash: version.contentHash,
    audienceHash: snapshot.definitionHash,
    decision: input.decision,
    decidedByPersonId: input.personId,
    decidedAt: input.now,
    ...(input.comment ? { comment: input.comment } : {}),
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  snap.campaignApprovals.push(approval);
  campaign.status = input.decision === "APPROVED" ? (campaign.scheduledAt ? "SCHEDULED" : "APPROVED") : "DRAFT";
  campaign.updatedAt = input.now;
  campaign.version += 1;
  return approval;
}

function renderForGuest(snap: PlatformSnapshot, campaign: Campaign, guestId: string) {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  const event = snap.events.find((item) => item.id === campaign.eventId);
  const version = snap.messageTemplateVersions.find((item) => item.id === campaign.templateVersionId);
  if (!guest || !event || !version) throw new PlatformError("NOT_FOUND", "render inputs are missing");
  const occasion = projectGuestSafeOccasion(eventOccasion(snap, campaign.eventId));
  return renderTemplate({ version, variables: templateVariablesFor({ guest, occasion, event }) });
}

export function expandCampaignOnSnap(snap: PlatformSnapshot, campaign: Campaign, now: string): CommsMessage[] {
  const policy = requirePolicy(snap, campaign.eventId);
  if (policy.status !== "PUBLISHED") {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", `published sandbox dispatch is required (policy is ${policy.status})`);
  }
  if (!policy.sandboxDispatchEnabled) {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", "published sandbox dispatch is required (sandbox is off)");
  }
  if (!campaign.audienceSnapshotId) throw new PlatformError("VALIDATION_FAILED", "approved snapshot is required");
  const snapshot = snap.audienceSnapshots.find((item) => item.id === campaign.audienceSnapshotId);
  if (!snapshot) throw new PlatformError("NOT_FOUND", "audience snapshot was not found");
  const created: CommsMessage[] = [];
  for (const member of snapshot.members) {
    const eligibility =
      member.eligibility === "ALLOW"
        ? guestEligibility(snap, member.guestId, campaign.channel, campaign.purpose, now)
        : { status: member.eligibility, reasons: member.exclusionCodes };
    const idempotencyKey = `msg:${campaign.id}:${member.guestId}:${campaign.channel}`;
    if (snap.commsMessages.some((item) => item.idempotencyKey === idempotencyKey)) continue;
    if (eligibility.status !== "ALLOW") {
      const blocked: CommsMessage = {
        id: randomUUID(),
        organisationId: campaign.organisationId,
        clientId: campaign.clientId,
        eventId: campaign.eventId,
        guestId: member.guestId,
        campaignId: campaign.id,
        purpose: campaign.purpose,
        channel: campaign.channel,
        direction: "OUTBOUND",
        status: "BLOCKED",
        idempotencyKey,
        testWatermark: campaign.testOnly,
        blockedReason: eligibility.reasons.join(","),
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      snap.commsMessages.push(blocked);
      created.push(blocked);
      continue;
    }
    const rendered = renderForGuest(snap, campaign, member.guestId);
    const message: CommsMessage = {
      id: randomUUID(),
      organisationId: campaign.organisationId,
      clientId: campaign.clientId,
      eventId: campaign.eventId,
      guestId: member.guestId,
      campaignId: campaign.id,
      purpose: campaign.purpose,
      channel: campaign.channel,
      direction: "OUTBOUND",
      status: "QUEUED",
      idempotencyKey,
      testWatermark: campaign.testOnly,
      ...(member.contactProjectionId ? { contactProjectionId: member.contactProjectionId } : {}),
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const content = {
      id: randomUUID(),
      messageId: message.id,
      templateVersionId: campaign.templateVersionId,
      ...(rendered.subject ? { subject: rendered.subject } : {}),
      body: rendered.body,
      variablesHash: rendered.variablesHash,
      contentHash: rendered.contentHash,
      createdAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    message.contentSnapshotId = content.id;
    snap.commsMessages.push(message);
    snap.messageContentSnapshots.push(content);
    snap.commsOutbox.push({
      id: randomUUID(),
      organisationId: campaign.organisationId,
      clientId: campaign.clientId,
      eventId: campaign.eventId,
      campaignId: campaign.id,
      messageId: message.id,
      status: "PENDING",
      nextAttemptAt: now,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    created.push(message);
  }
  campaign.status = "DISPATCHING";
  campaign.updatedAt = now;
  campaign.version += 1;
  return created;
}

export function dispatchOutboxOnSnap(snap: PlatformSnapshot, eventId: string, now: string, failMode?: "TRANSIENT" | "PERMANENT"): number {
  const policy = requirePolicy(snap, eventId);
  if (policy.status !== "PUBLISHED") {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", `published sandbox dispatch is required (policy is ${policy.status})`);
  }
  if (!policy.sandboxDispatchEnabled) {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", "published sandbox dispatch is required (sandbox is off)");
  }
  let submitted = 0;
  for (const item of snap.commsOutbox.filter((row) => row.eventId === eventId && row.status === "PENDING")) {
    const message = snap.commsMessages.find((row) => row.id === item.messageId);
    if (!message || message.status === "CANCELLED" || message.status === "BLOCKED") {
      item.status = "DONE";
      continue;
    }
    const attemptNo = snap.messageAttempts.filter((row) => row.messageId === message.id).length + 1;
    const requestKey = `synth:${message.idempotencyKey}:${attemptNo}`;
    if (snap.messageAttempts.some((row) => row.providerRequestKey === requestKey)) {
      item.status = "DONE";
      continue;
    }
    if (failMode === "PERMANENT") {
      message.status = "FAILED";
      item.status = "FAILED";
      item.version += 1;
      snap.messageAttempts.push({
        id: randomUUID(),
        messageId: message.id,
        attemptNo,
        status: "FAILED",
        retryClass: "PERMANENT",
        providerRequestKey: requestKey,
        submittedAt: now,
        responseCode: "SYNTHETIC_PERMANENT",
        schemaVersion: SCHEMA_VERSION,
      });
      continue;
    }
    if (failMode === "TRANSIENT") {
      message.status = "RETRYING";
      item.status = "PENDING";
      item.nextAttemptAt = now;
      item.version += 1;
      snap.messageAttempts.push({
        id: randomUUID(),
        messageId: message.id,
        attemptNo,
        status: "FAILED",
        retryClass: "TRANSIENT",
        providerRequestKey: requestKey,
        submittedAt: now,
        responseCode: "SYNTHETIC_TRANSIENT",
        schemaVersion: SCHEMA_VERSION,
      });
      continue;
    }
    const attempt = {
      id: randomUUID(),
      messageId: message.id,
      attemptNo,
      status: "ACCEPTED" as const,
      providerRequestKey: requestKey,
      providerRef: `sandbox:${message.channel}:${message.id}`,
      submittedAt: now,
      responseCode: "SYNTHETIC_ACCEPTED",
      schemaVersion: SCHEMA_VERSION,
    };
    snap.messageAttempts.push(attempt);
    snap.deliveryEvents.push({
      id: randomUUID(),
      messageAttemptId: attempt.id,
      type: "ACCEPTED",
      occurredAt: now,
      receivedAt: now,
      providerEventId: `evt:${requestKey}`,
      payloadHash: contentHash(requestKey),
      authenticated: true,
      schemaVersion: SCHEMA_VERSION,
    });
    message.status = "ACCEPTED";
    message.updatedAt = now;
    item.status = "DONE";
    item.updatedAt = now;
    submitted += 1;
  }
  const remaining = snap.commsOutbox.some((row) => row.eventId === eventId && row.status === "PENDING");
  const campaign = snap.campaigns.find((item) => item.eventId === eventId && item.status === "DISPATCHING");
  if (campaign && !remaining) {
    campaign.status = "COMPLETED";
    campaign.updatedAt = now;
    campaign.version += 1;
  }
  return submitted;
}

export function applySyntheticCallbackOnSnap(
  snap: PlatformSnapshot,
  input: { providerRequestKey: string; providerEventId: string; type: "ACCEPTED" | "DELIVERED" | "TEMPORARY_FAILURE" | "PERMANENT_FAILURE"; signature: string; now: string },
) {
  const payload = `${input.providerRequestKey}:${input.type}:${input.providerEventId}`;
  if (!verifySyntheticSignature(payload, input.signature)) {
    throw new PlatformError("VALIDATION_FAILED", "synthetic webhook signature is invalid");
  }
  if (snap.deliveryEvents.some((item) => item.providerEventId === input.providerEventId)) {
    return snap.deliveryEvents.find((item) => item.providerEventId === input.providerEventId);
  }
  const attempt = snap.messageAttempts.find((item) => item.providerRequestKey === input.providerRequestKey);
  if (!attempt) throw new PlatformError("NOT_FOUND", "provider request was not found");
  const message = snap.commsMessages.find((item) => item.id === attempt.messageId);
  if (!message) throw new PlatformError("NOT_FOUND", "message was not found");
  const event = {
    id: randomUUID(),
    messageAttemptId: attempt.id,
    type: input.type,
    occurredAt: input.now,
    receivedAt: input.now,
    providerEventId: input.providerEventId,
    payloadHash: contentHash(payload),
    authenticated: true,
    schemaVersion: SCHEMA_VERSION,
  };
  snap.deliveryEvents.push(event);
  message.status = nextMessageStatus(message.status, input.type) as CommsMessage["status"];
  if (input.type === "PERMANENT_FAILURE") {
    message.status = "DEAD_LETTER";
    snap.commsNotifications.push({
      id: randomUUID(),
      organisationId: message.organisationId,
      clientId: message.clientId,
      eventId: message.eventId,
      kind: "FAILURE",
      title: "Message dead-lettered",
      body: "A permanent synthetic delivery failure was recorded",
      href: `/communications/failures`,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    });
    const policy = eventChannelPolicy(snap, message.eventId);
    if (policy && message.guestId) {
      const fallback = nextFallbackChannel({
        policy,
        current: message.channel,
        evaluate: (channel) => guestEligibility(snap, message.guestId!, channel, message.purpose, input.now),
      });
      void fallback;
    }
  }
  message.updatedAt = input.now;
  return event;
}

export function ingestInboundOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    channel: MsgChannel;
    providerMessageId: string;
    sender: string;
    body: string;
    attachmentFileName?: string;
    signature: string;
    now: string;
  },
): InboundMessage {
  const payload = `${input.providerMessageId}:${input.sender}:${input.body}`;
  if (!verifySyntheticSignature(payload, input.signature)) {
    throw new PlatformError("VALIDATION_FAILED", "inbound signature is invalid");
  }
  const existing = snap.inboundMessages.find((item) => item.providerMessageId === input.providerMessageId);
  if (existing) return existing;
  const normalized = normalizeEmail(input.sender) ?? normalizePhone(input.sender) ?? input.sender.toLowerCase();
  const matches = snap.contactProjections.filter((item) => item.normalizedValue === normalized && (!input.eventId || item.eventId === input.eventId));
  const uniqueGuests = new Set(matches.map((item) => item.guestId));
  let matchStatus: InboundMessage["matchStatus"] = "UNMATCHED";
  let confidence: InboundMessage["matchConfidence"] = "NONE";
  let guestId: string | undefined;
  let eventId = input.eventId;
  if (uniqueGuests.size === 1) {
    matchStatus = "MATCHED";
    confidence = "HIGH";
    guestId = [...uniqueGuests][0];
    eventId = matches[0]?.eventId ?? eventId;
  } else if (uniqueGuests.size > 1) {
    matchStatus = "AMBIGUOUS";
    confidence = "LOW";
  }
  const guest = guestId ? snap.operationalGuests.find((item) => item.id === guestId) : undefined;
  const inbound: InboundMessage = {
    id: randomUUID(),
    organisationId: guest?.organisationId ?? input.organisationId,
    ...(eventId ? { eventId } : {}),
    ...(guest ? { clientId: guest.clientId, guestId: guest.id } : {}),
    channel: input.channel,
    providerMessageId: input.providerMessageId,
    senderNormalized: normalized,
    body: input.body,
    receivedAt: input.now,
    matchStatus,
    matchConfidence: confidence,
    ...(input.attachmentFileName
      ? { attachmentFileName: input.attachmentFileName, attachmentQuarantined: true }
      : {}),
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  if (matchStatus === "MATCHED" && guest && eventId) {
    let thread = snap.conversationThreads.find((item) => item.guestId === guest.id && item.eventId === eventId && item.channel === input.channel);
    if (!thread) {
      const policy = eventChannelPolicy(snap, eventId);
      thread = {
        id: randomUUID(),
        organisationId: guest.organisationId,
        clientId: guest.clientId,
        eventId,
        guestId: guest.id,
        channel: input.channel,
        status: "OPEN",
        lastMessageAt: input.now,
        ...(policy?.acknowledgementMinutes
          ? { slaDueAt: new Date(Date.parse(input.now) + policy.acknowledgementMinutes * 60_000).toISOString() }
          : {}),
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: input.now,
        updatedAt: input.now,
      };
      snap.conversationThreads.push(thread);
    }
    inbound.threadId = thread.id;
    thread.lastMessageAt = input.now;
    thread.status = "OPEN";
    const task: FollowUpTask = {
      id: randomUUID(),
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId,
      threadId: thread.id,
      inboundMessageId: inbound.id,
      category: "ENQUIRY",
      status: "OPEN",
      escalationLevel: 0,
      ...(thread.slaDueAt ? { dueAt: thread.slaDueAt } : {}),
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    };
    snap.followUpTasks.push(task);
  } else {
    const scopedEvent = snap.events.find((item) => item.id === eventId && item.organisationId === (guest?.organisationId ?? input.organisationId));
    if (scopedEvent) {
      snap.commsNotifications.push({
        id: randomUUID(),
        organisationId: scopedEvent.organisationId,
        clientId: scopedEvent.clientId,
        eventId: scopedEvent.id,
        kind: "UNMATCHED",
        title: "Unmatched inbound message",
        body: "An inbound message could not be attached to a guest",
        href: "/communications/unmatched",
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: input.now,
        updatedAt: input.now,
      });
    }
  }
  snap.inboundMessages.push(inbound);
  return inbound;
}

export function openAssistanceTask(snap: PlatformSnapshot, input: {
  organisationId: string;
  clientId: string;
  eventId: string;
  guestId: string;
  note: string;
  now: string;
}): FollowUpTask | undefined {
  const existing = snap.followUpTasks.find(
    (item) => item.eventId === input.eventId && item.category === "ASSISTANCE" && item.status === "OPEN" && snap.conversationThreads.find((thread) => thread.id === item.threadId)?.guestId === input.guestId,
  );
  if (existing) return existing;
  if (!eventChannelPolicy(snap, input.eventId)) return undefined;
  let thread = snap.conversationThreads.find((item) => item.guestId === input.guestId && item.eventId === input.eventId);
  if (!thread) {
    thread = {
      id: randomUUID(),
      organisationId: input.organisationId,
      clientId: input.clientId,
      eventId: input.eventId,
      guestId: input.guestId,
      channel: "EMAIL",
      status: "OPEN",
      lastMessageAt: input.now,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    };
    snap.conversationThreads.push(thread);
  }
  const task: FollowUpTask = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: input.clientId,
    eventId: input.eventId,
    threadId: thread.id,
    category: "ASSISTANCE",
    status: "OPEN",
    escalationLevel: 0,
    privateNote: input.note,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  snap.followUpTasks.push(task);
  return task;
}

export function refreshIntelligence(snap: PlatformSnapshot, eventId: string, now: string): void {
  const event = snap.events.find((item) => item.id === eventId);
  if (!event) return;
  snap.commsIntelligenceAlerts = snap.commsIntelligenceAlerts.filter((item) => item.eventId !== eventId || item.status !== "OPEN");
  const alerts = evaluateIntelligence({
    awaitingApproval: snap.campaigns.filter((item) => item.eventId === eventId && item.status === "AWAITING_APPROVAL").length,
    deadLetters: snap.commsMessages.filter((item) => item.eventId === eventId && item.status === "DEAD_LETTER").length,
    unmatched: snap.inboundMessages.filter((item) => item.eventId === eventId && (item.matchStatus === "UNMATCHED" || item.matchStatus === "AMBIGUOUS")).length,
    openTasks: snap.followUpTasks.filter((item) => item.eventId === eventId && item.status !== "RESOLVED" && item.status !== "CLOSED" && item.status !== "CANCELLED").length,
    overdueTasks: snap.followUpTasks.filter((item) => item.eventId === eventId && item.dueAt && Date.parse(item.dueAt) < Date.parse(now) && item.status !== "RESOLVED" && item.status !== "CLOSED").length,
  });
  for (const alert of alerts) {
    snap.commsIntelligenceAlerts.push({
      id: randomUUID(),
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId,
      ruleId: alert.ruleId,
      ruleVersion: "1",
      severity: alert.severity,
      summary: alert.summary,
      evidence: alert.evidence,
      recommendedAction: alert.recommendedAction,
      status: "OPEN",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function communicationsOverview(snap: PlatformSnapshot, eventId: string, now: string) {
  refreshIntelligence(snap, eventId, now);
  return {
    campaignsDraft: snap.campaigns.filter((item) => item.eventId === eventId && item.status === "DRAFT").length,
    awaitingApproval: snap.campaigns.filter((item) => item.eventId === eventId && item.status === "AWAITING_APPROVAL").length,
    scheduled: snap.campaigns.filter((item) => item.eventId === eventId && item.status === "SCHEDULED").length,
    delivered: snap.commsMessages.filter((item) => item.eventId === eventId && item.status === "DELIVERED").length,
    failed: snap.commsMessages.filter((item) => item.eventId === eventId && (item.status === "FAILED" || item.status === "DEAD_LETTER")).length,
    unmatched: snap.inboundMessages.filter((item) => item.eventId === eventId && (item.matchStatus === "UNMATCHED" || item.matchStatus === "AMBIGUOUS")).length,
    openTasks: snap.followUpTasks.filter((item) => item.eventId === eventId && item.status !== "RESOLVED" && item.status !== "CLOSED" && item.status !== "CANCELLED").length,
    suppressions: snap.suppressionEntries.filter((item) => item.eventId === eventId && !item.releasedAt).length,
    alerts: snap.commsIntelligenceAlerts.filter((item) => item.eventId === eventId && item.status === "OPEN"),
    notifications: snap.commsNotifications.filter((item) => item.eventId === eventId && !item.readAt),
    generatedAt: now,
  };
}

export { signSyntheticPayload, projectGuestSafeOccasion, evaluateAudienceMember, legalCampaignTransition };
