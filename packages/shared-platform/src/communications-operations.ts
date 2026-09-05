import { createHash, timingSafeEqual } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { normalizeEmail, normalizePhone } from "./guest-matching.js";
import type { OperationalGuest } from "./guest-schemas.js";
import type { ConsentRecord, EventRecord } from "./schemas.js";
import type { RsvpInvitation, RsvpResponse } from "./rsvp-schemas.js";
import type { PlatformSnapshot } from "./store.js";
import type {
  AudienceDefinition,
  AudienceFilter,
  AudienceMember,
  AudienceSnapshot,
  Campaign,
  ChannelPolicy,
  ContactProjection,
  GuestSafeOccasion,
  GuestSafeOccasionView,
  MessageTemplateVersion,
  MsgChannel,
  MsgPurpose,
  SuppressionEntry,
} from "./communications-schemas.js";

export const ALLOWED_TEMPLATE_VARIABLES = [
  "guest.name",
  "event.name",
  "occasion.when",
  "occasion.venue",
  "occasion.arrival",
  "occasion.dress",
  "occasion.context",
] as const;

export const SYNTHETIC_WEBHOOK_SECRET = "not-for-production-comms-webhook";

export function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifySyntheticSignature(payload: string, signature: string): boolean {
  const expected = contentHash(`${SYNTHETIC_WEBHOOK_SECRET}:${payload}`);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signSyntheticPayload(payload: string): string {
  return contentHash(`${SYNTHETIC_WEBHOOK_SECRET}:${payload}`);
}

export function eventChannelPolicy(snap: PlatformSnapshot, eventId: string): ChannelPolicy | undefined {
  return snap.channelPolicies.find((item) => item.eventId === eventId);
}

export function eventOccasion(snap: PlatformSnapshot, eventId: string): GuestSafeOccasion | undefined {
  return snap.guestSafeOccasions.find((item) => item.eventId === eventId);
}

export function projectGuestSafeOccasion(occasion: GuestSafeOccasion | undefined): GuestSafeOccasionView {
  if (!occasion || occasion.status !== "PUBLISHED") {
    return { published: false };
  }
  const pick = (field?: GuestSafeOccasion["eventName"]) =>
    field && field.quality === "VERIFIED" ? field.value : undefined;
  return {
    published: true,
    ...(pick(occasion.eventName) ? { eventName: pick(occasion.eventName) } : {}),
    ...(pick(occasion.when) ? { when: pick(occasion.when) } : {}),
    ...(pick(occasion.timezone) ? { timezone: pick(occasion.timezone) } : {}),
    ...(pick(occasion.venue) ? { venue: pick(occasion.venue) } : {}),
    ...(pick(occasion.arrival) ? { arrival: pick(occasion.arrival) } : {}),
    ...(pick(occasion.dress) ? { dress: pick(occasion.dress) } : {}),
    ...(pick(occasion.context) ? { context: pick(occasion.context) } : {}),
  };
}

export function formatEventWhen(event: EventRecord): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: event.timezone,
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(event.startsAt));
  } catch {
    return event.startsAt;
  }
}

export function rebuildContactProjections(input: {
  guest: OperationalGuest;
  existing: ContactProjection[];
  now: string;
}): ContactProjection[] {
  const { guest, now } = input;
  const next: ContactProjection[] = [];
  const email = guest.email.value?.trim();
  if (email) {
    next.push({
      id: existingId(input.existing, guest.id, "EMAIL") ?? cryptoRandom(guest.id, "EMAIL"),
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId: guest.eventId,
      guestId: guest.id,
      channel: "EMAIL",
      displayValue: email,
      normalizedValue: normalizeEmail(email) ?? email.toLowerCase(),
      preferred: true,
      quality: guest.email.quality,
      valid: Boolean(normalizeEmail(email)),
      source: "INTAKE_FIELD",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  const phone = guest.phone.value?.trim();
  if (phone) {
    const normalized = normalizePhone(phone) ?? phone;
    for (const channel of ["SMS", "WHATSAPP"] as const) {
      next.push({
        id: existingId(input.existing, guest.id, channel) ?? cryptoRandom(guest.id, channel),
        organisationId: guest.organisationId,
        clientId: guest.clientId,
        eventId: guest.eventId,
        guestId: guest.id,
        channel,
        displayValue: phone,
        normalizedValue: normalized,
        preferred: channel === "SMS",
        quality: guest.phone.quality,
        valid: normalized.startsWith("+") || /^\d{8,15}$/.test(normalized.replace(/\s/g, "")),
        source: "INTAKE_FIELD",
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return next;
}

function existingId(existing: ContactProjection[], guestId: string, channel: MsgChannel): string | undefined {
  return existing.find((item) => item.guestId === guestId && item.channel === channel)?.id;
}

function cryptoRandom(guestId: string, channel: string): string {
  const hex = contentHash(`${guestId}:${channel}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function isSuppressed(
  entries: SuppressionEntry[],
  input: { guestId: string; eventId: string; organisationId: string; channel: MsgChannel; purpose: MsgPurpose; now: string },
): SuppressionEntry | undefined {
  return entries.find((item) => {
    if (item.releasedAt) return false;
    if (Date.parse(item.effectiveAt) > Date.parse(input.now)) return false;
    if (item.expiresAt && Date.parse(item.expiresAt) <= Date.parse(input.now)) return false;
    if (item.organisationId !== input.organisationId) return false;
    if (item.eventId && item.eventId !== input.eventId) return false;
    if (item.guestId && item.guestId !== input.guestId) return false;
    if (item.channel && item.channel !== input.channel) return false;
    if (item.purpose && item.purpose !== input.purpose) return false;
    return true;
  });
}

const OPERATIONAL_PURPOSES: readonly MsgPurpose[] = [
  "INVITATION",
  "RSVP_ACKNOWLEDGEMENT",
  "CONFIRMATION",
  "PRE_EVENT_INFO",
  "REMINDER",
  "ARRIVAL_SUPPORT",
  "CONCIERGE",
  "SERVICE_RECOVERY",
];

export function evaluateEligibility(input: {
  policy?: ChannelPolicy;
  guest: OperationalGuest;
  projections: ContactProjection[];
  suppressions: SuppressionEntry[];
  consents: ConsentRecord[];
  channel: MsgChannel;
  purpose: MsgPurpose;
  now: string;
  recentSends: number;
}): { status: "ALLOW" | "DENY" | "UNKNOWN"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.policy || input.policy.status !== "PUBLISHED") {
    return { status: "UNKNOWN", reasons: ["CHANNEL_POLICY_UNPUBLISHED"] };
  }
  if (!input.policy.enabledChannels.includes(input.channel)) {
    return { status: "DENY", reasons: ["CHANNEL_DISABLED"] };
  }
  if (!input.policy.allowedPurposes.includes(input.purpose)) {
    return { status: "DENY", reasons: ["PURPOSE_NOT_ALLOWED"] };
  }
  if (input.guest.lifecycle !== "ACTIVE") {
    return { status: "DENY", reasons: ["GUEST_NOT_ACTIVE"] };
  }
  const suppression = isSuppressed(input.suppressions, {
    guestId: input.guest.id,
    eventId: input.guest.eventId,
    organisationId: input.guest.organisationId,
    channel: input.channel,
    purpose: input.purpose,
    now: input.now,
  });
  if (suppression) {
    return { status: "DENY", reasons: ["SUPPRESSED"] };
  }
  if (!OPERATIONAL_PURPOSES.includes(input.purpose)) {
    const consent = input.consents.find(
      (item) =>
        item.personId === input.guest.personId &&
        item.status === "RECORDED" &&
        item.purpose === input.purpose &&
        (!item.eventId || item.eventId === input.guest.eventId),
    );
    if (!consent) {
      return { status: "DENY", reasons: ["CONSENT_REQUIRED"] };
    }
  }
  const contact = input.projections.find((item) => item.guestId === input.guest.id && item.channel === input.channel);
  if (!contact || !contact.valid) {
    return { status: "DENY", reasons: ["CONTACT_INVALID"] };
  }
  if (contact.quality === "MISSING" || contact.quality === "NOT_SUPPLIED") {
    return { status: "DENY", reasons: ["CONTACT_ABSENT"] };
  }
  if (inQuietHours(input.policy, input.now)) {
    reasons.push("QUIET_HOURS");
    return { status: "DENY", reasons };
  }
  if (input.recentSends >= input.policy.frequencyCapPerDay) {
    return { status: "DENY", reasons: ["FREQUENCY_CAP"] };
  }
  return { status: "ALLOW", reasons: ["ELIGIBLE"] };
}

export function inQuietHours(policy: ChannelPolicy, nowIso: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: policy.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(nowIso));
    const hour = parts.find((item) => item.type === "hour")?.value ?? "00";
    const minute = parts.find((item) => item.type === "minute")?.value ?? "00";
    const current = `${hour}:${minute}`;
    const { quietHoursStart: start, quietHoursEnd: end } = policy;
    if (start === end) return false;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  } catch {
    return false;
  }
}

export function nextFallbackChannel(input: {
  policy: ChannelPolicy;
  current: MsgChannel;
  evaluate: (channel: MsgChannel) => { status: "ALLOW" | "DENY" | "UNKNOWN" };
}): MsgChannel | undefined {
  const order = input.policy.fallbackOrder;
  const start = order.indexOf(input.current);
  const remaining = start >= 0 ? order.slice(start + 1) : order;
  return remaining.find((channel) => input.evaluate(channel).status === "ALLOW");
}

export function extractVariables(body: string): string[] {
  return [...body.matchAll(/\{\{([a-z.]+)\}\}/g)].map((match) => match[1] ?? "").filter(Boolean);
}

export function renderTemplate(input: {
  version: MessageTemplateVersion;
  variables: Record<string, string | undefined>;
}): { subject?: string; body: string; variablesHash: string; contentHash: string } {
  const used = extractVariables(`${input.version.subject ?? ""}\n${input.version.body}`);
  const unknown = used.filter((name) => !ALLOWED_TEMPLATE_VARIABLES.includes(name as (typeof ALLOWED_TEMPLATE_VARIABLES)[number]));
  if (unknown.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", `unknown template variables: ${unknown.join(", ")}`);
  }
  const missing = input.version.requiredVariables.filter((name) => !input.variables[name]?.trim());
  if (missing.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", `required guest-safe facts are unresolved: ${missing.join(", ")}`);
  }
  const replace = (text: string) =>
    text.replace(/\{\{([a-z.]+)\}\}/g, (_all, name: string) => escapeText(input.variables[name] ?? ""));
  const body = replace(input.version.body);
  const subject = input.version.subject ? replace(input.version.subject) : undefined;
  const rendered = `${subject ?? ""}\n${body}`;
  return {
    ...(subject ? { subject } : {}),
    body,
    variablesHash: contentHash(JSON.stringify(input.variables)),
    contentHash: contentHash(rendered),
  };
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function templateVariablesFor(input: {
  guest: OperationalGuest;
  occasion: GuestSafeOccasionView;
  event: EventRecord;
}): Record<string, string | undefined> {
  return {
    "guest.name": input.guest.preferredName.value ?? input.guest.givenName.value ?? input.guest.familyName.value,
    "event.name": input.occasion.eventName ?? input.event.name,
    "occasion.when": input.occasion.when,
    "occasion.venue": input.occasion.venue,
    "occasion.arrival": input.occasion.arrival,
    "occasion.dress": input.occasion.dress,
    "occasion.context": input.occasion.context,
  };
}

export function evaluateAudienceMember(input: {
  guest: OperationalGuest;
  response?: RsvpResponse;
  invitation?: RsvpInvitation;
  filters: AudienceFilter[];
}): { include: boolean; exclusionCodes: string[] } {
  const codes: string[] = [];
  for (const filter of input.filters) {
    if (filter.predicate === "SEATING") {
      return { include: false, exclusionCodes: ["SEATING_UNAVAILABLE"] };
    }
    if (filter.predicate === "LIFECYCLE" && input.guest.lifecycle !== filter.value) {
      codes.push("LIFECYCLE_MISMATCH");
    }
    if (filter.predicate === "IDENTITY" && input.guest.identityResolution !== filter.value) {
      codes.push("IDENTITY_MISMATCH");
    }
    if (filter.predicate === "HAS_EMAIL" && filter.value === "YES" && !input.guest.email.value) {
      codes.push("EMAIL_ABSENT");
    }
    if (filter.predicate === "HAS_PHONE" && filter.value === "YES" && !input.guest.phone.value) {
      codes.push("PHONE_ABSENT");
    }
    if (filter.predicate === "ATTENDANCE" && (input.response?.attendanceIntent ?? "NOT_SUPPLIED") !== filter.value) {
      codes.push("ATTENDANCE_MISMATCH");
    }
    if (filter.predicate === "RSVP_STATUS" && (input.response?.status ?? "NOT_STARTED") !== filter.value) {
      codes.push("RSVP_STATUS_MISMATCH");
    }
  }
  return { include: codes.length === 0, exclusionCodes: codes };
}

export function buildAudienceSnapshot(input: {
  definition: AudienceDefinition;
  guests: OperationalGuest[];
  responses: RsvpResponse[];
  eligibility: Array<{ guestId: string; channel: MsgChannel; status: "ALLOW" | "DENY" | "UNKNOWN"; reasons: string[]; contactProjectionId?: string }>;
  now: string;
}): AudienceSnapshot {
  const members: AudienceMember[] = [];
  let excluded = 0;
  for (const guest of input.guests) {
    const response = input.responses.find((item) => item.guestId === guest.id);
    const selection = evaluateAudienceMember({ guest, response, filters: input.definition.filters });
    const eligible = input.eligibility.find((item) => item.guestId === guest.id);
    const exclusion = [...selection.exclusionCodes, ...(eligible && eligible.status !== "ALLOW" ? eligible.reasons : [])];
    if (!selection.include || !eligible || eligible.status !== "ALLOW") {
      excluded += 1;
      members.push({
        guestId: guest.id,
        channel: eligible?.channel ?? "EMAIL",
        eligibility: eligible?.status ?? "DENY",
        exclusionCodes: exclusion.length > 0 ? exclusion : ["NOT_ELIGIBLE"],
        ...(eligible?.contactProjectionId ? { contactProjectionId: eligible.contactProjectionId } : {}),
      });
      continue;
    }
    members.push({
      guestId: guest.id,
      channel: eligible.channel,
      eligibility: "ALLOW",
      exclusionCodes: [],
      ...(eligible.contactProjectionId ? { contactProjectionId: eligible.contactProjectionId } : {}),
    });
  }
  const included = members.filter((item) => item.eligibility === "ALLOW");
  return {
    id: cryptoRandom(input.definition.id, input.now),
    organisationId: input.definition.organisationId,
    clientId: input.definition.clientId,
    eventId: input.definition.eventId,
    definitionId: input.definition.id,
    definitionHash: contentHash(JSON.stringify(input.definition.filters)),
    memberCount: included.length,
    excludedCount: excluded,
    members,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function legalCampaignTransition(from: Campaign["status"], to: Campaign["status"]): boolean {
  const allowed: Record<Campaign["status"], Campaign["status"][]> = {
    DRAFT: ["AWAITING_APPROVAL", "CANCELLED"],
    AWAITING_APPROVAL: ["APPROVED", "DRAFT", "CANCELLED"],
    APPROVED: ["SCHEDULED", "DISPATCHING", "CANCELLED", "DRAFT"],
    SCHEDULED: ["DISPATCHING", "PAUSED", "CANCELLED"],
    DISPATCHING: ["COMPLETED", "PAUSED", "FAILED", "CANCELLED"],
    PAUSED: ["SCHEDULED", "DISPATCHING", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    FAILED: ["DRAFT"],
  };
  return allowed[from].includes(to);
}

export function nextMessageStatus(current: string, eventType: string): string {
  const rank = ["PLANNED", "QUEUED", "SUBMITTED", "ACCEPTED", "DELIVERED", "FAILED", "DEAD_LETTER", "CANCELLED"];
  const map: Record<string, string> = {
    SUBMITTED: "SUBMITTED",
    ACCEPTED: "ACCEPTED",
    DELIVERED: "DELIVERED",
    TEMPORARY_FAILURE: "RETRYING",
    PERMANENT_FAILURE: "FAILED",
  };
  const next = map[eventType] ?? current;
  const currentRank = rank.indexOf(current);
  const nextRank = rank.indexOf(next);
  if (current === "DEAD_LETTER" || current === "CANCELLED" || current === "DELIVERED") return current;
  if (next === "RETRYING") return next;
  if (currentRank >= 0 && nextRank >= 0 && nextRank < currentRank) return current;
  return next;
}

export function defaultChannelPolicy(event: EventRecord, now: string): Omit<ChannelPolicy, "id"> {
  return {
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    status: "DRAFT",
    enabledChannels: ["EMAIL", "WHATSAPP", "SMS"],
    allowedPurposes: [...OPERATIONAL_PURPOSES],
    fallbackOrder: ["EMAIL", "SMS", "WHATSAPP"],
    timezone: event.timezone,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    frequencyCapPerDay: 4,
    sandboxDispatchEnabled: true,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function draftOccasionFromEvent(event: EventRecord, now: string): Omit<GuestSafeOccasion, "id"> {
  return {
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    status: "DRAFT",
    eventName: { value: event.name, quality: "VERIFIED" },
    when: { value: formatEventWhen(event), quality: "UNVERIFIED" },
    timezone: { value: event.timezone, quality: "UNVERIFIED" },
    ...(event.venueSummary ? { venue: { value: event.venueSummary, quality: "UNVERIFIED" } } : {}),
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultInvitationBody(): string {
  return "Dear {{guest.name}}, you are invited to {{event.name}}. {{occasion.when}} {{occasion.venue}} Please respond through your guest access. This is not admission.";
}

export function evaluateIntelligence(input: {
  awaitingApproval: number;
  deadLetters: number;
  unmatched: number;
  openTasks: number;
  overdueTasks: number;
}): Array<{ ruleId: string; severity: "LOW" | "MEDIUM" | "HIGH"; summary: string; evidence: string; recommendedAction: string }> {
  const alerts = [];
  if (input.awaitingApproval > 0) {
    alerts.push({
      ruleId: "approval-ageing",
      severity: "MEDIUM" as const,
      summary: "Campaigns are waiting for approval",
      evidence: `${input.awaitingApproval} campaign(s) awaiting approval`,
      recommendedAction: "Review the approval inbox",
    });
  }
  if (input.deadLetters > 0) {
    alerts.push({
      ruleId: "dead-letter",
      severity: "HIGH" as const,
      summary: "Delivery work is in dead letter",
      evidence: `${input.deadLetters} dead-lettered message(s)`,
      recommendedAction: "Inspect failures and decide retry or correction",
    });
  }
  if (input.unmatched > 0) {
    alerts.push({
      ruleId: "unmatched-inbound",
      severity: "MEDIUM" as const,
      summary: "Inbound messages are unmatched",
      evidence: `${input.unmatched} unmatched inbound message(s)`,
      recommendedAction: "Resolve the unmatched inbox",
    });
  }
  if (input.overdueTasks > 0) {
    alerts.push({
      ruleId: "sla-risk",
      severity: "HIGH" as const,
      summary: "Concierge tasks are overdue against the event SLA",
      evidence: `${input.overdueTasks} overdue of ${input.openTasks} open tasks`,
      recommendedAction: "Assign or escalate overdue tasks",
    });
  }
  return alerts;
}

export function presentationLabel(state: string): string {
  if (state === "UNRESOLVED") return "Identity not yet linked";
  if (state === "UNVERIFIED") return "Not yet verified";
  return state.replaceAll("_", " ").toLowerCase();
}
