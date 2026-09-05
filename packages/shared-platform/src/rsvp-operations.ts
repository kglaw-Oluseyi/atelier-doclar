import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { operationalDisplayName } from "./guest-matching.js";
import { stableHash } from "./redaction.js";
import type { OperationalGuest } from "./guest-schemas.js";
import type { EventRecord } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";
import type {
  RsvpAnswers,
  RsvpAssistanceRequest,
  RsvpAttendanceIntent,
  RsvpEntitlement,
  RsvpEventProjection,
  RsvpException,
  RsvpInvitation,
  RsvpKeyRing,
  RsvpPolicy,
  RsvpQuestionnaire,
  RsvpReceipt,
  RsvpResponse,
  RsvpResponseProvenance,
  RsvpSection,
} from "./rsvp-schemas.js";

export function canonicalQuestionnaireSections(): RsvpSection[] {
  return [
    {
      key: "attendance",
      title: "Will you join us?",
      lede: "A response is required. If you are still deciding, you may say you are uncertain.",
      questions: [
        {
          key: "ATTENDANCE",
          label: "Your response",
          required: true,
          sensitive: false,
          enabled: true,
          visibleWhenAttendance: "ANY",
        },
      ],
    },
    {
      key: "household",
      title: "Your household",
      lede: "You may respond only for people you have been asked to answer for.",
      questions: [
        {
          key: "HOUSEHOLD",
          label: "Household responses",
          required: false,
          sensitive: false,
          enabled: true,
          visibleWhenAttendance: "ANY",
        },
      ],
    },
    {
      key: "companion",
      title: "Companion",
      questions: [
        {
          key: "COMPANION",
          label: "Companion names",
          help: "Only if a companion place has been offered.",
          required: false,
          sensitive: false,
          enabled: true,
          visibleWhenAttendance: "ATTENDING",
        },
      ],
    },
    {
      key: "needs",
      title: "How we can look after you",
      questions: [
        {
          key: "DIETARY",
          label: "Dietary requirement",
          required: false,
          sensitive: true,
          enabled: true,
          visibleWhenAttendance: "ATTENDING",
        },
        {
          key: "ACCESSIBILITY",
          label: "Accessibility requirement",
          required: false,
          sensitive: true,
          enabled: true,
          visibleWhenAttendance: "ATTENDING",
        },
        {
          key: "SENSITIVE_CONSENT",
          label: "I understand these details will be used only to host this event",
          required: false,
          sensitive: false,
          enabled: true,
          visibleWhenAttendance: "ATTENDING",
        },
      ],
    },
    {
      key: "assistance",
      title: "Need help responding?",
      questions: [
        {
          key: "ASSISTANCE",
          label: "Ask the host team for help",
          required: false,
          sensitive: false,
          enabled: true,
          visibleWhenAttendance: "ANY",
        },
      ],
    },
  ];
}

export function defaultRsvpPolicy(input: {
  organisationId: string;
  clientId: string;
  eventId: string;
  hostDisplayName: string;
  eventDisplayName: string;
  now: string;
}): RsvpPolicy {
  return {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: input.clientId,
    eventId: input.eventId,
    hostDisplayName: input.hostDisplayName,
    eventDisplayName: input.eventDisplayName,
    privacyNotice:
      "Your answers are used only to host this event. They are not an admission decision and are not shared beyond the host team.",
    amendmentsPermitted: true,
    companionsPermitted: false,
    defaultCompanionAllowance: 0,
    householdRespondentExplicit: true,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function policyIsOpen(policy: RsvpPolicy | undefined, now: string): boolean {
  if (!policy) return false;
  if (policy.closedAt && Date.parse(policy.closedAt) <= Date.parse(now)) return false;
  return true;
}

export function amendmentsAllowed(policy: RsvpPolicy, now: string, status: RsvpResponse["status"]): boolean {
  if (!policyIsOpen(policy, now)) return false;
  if (status === "NOT_STARTED" || status === "IN_PROGRESS") return true;
  if (!policy.amendmentsPermitted) return false;
  if (policy.amendmentUntil && Date.parse(policy.amendmentUntil) <= Date.parse(now)) return false;
  return status === "SUBMITTED" || status === "AMENDED";
}

export function ensureRsvpKeyRing(
  snap: PlatformSnapshot,
  organisationId: string,
  keyId: string,
  now: string,
): RsvpKeyRing {
  const existing = snap.rsvpKeyRings.find((item) => item.organisationId === organisationId);
  if (existing) return existing;
  const record: RsvpKeyRing = {
    id: randomUUID(),
    organisationId,
    currentKeyId: keyId,
    keys: [{ id: keyId, status: "ACTIVE", createdAt: now }],
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.rsvpKeyRings.push(record);
  return record;
}

export function publishedQuestionnaire(
  snap: PlatformSnapshot,
  eventId: string,
): RsvpQuestionnaire | undefined {
  return snap.rsvpQuestionnaires.find((item) => item.eventId === eventId && item.status === "PUBLISHED");
}

export function eventPolicy(snap: PlatformSnapshot, eventId: string): RsvpPolicy | undefined {
  return snap.rsvpPolicies.find((item) => item.eventId === eventId);
}

export function responseForGuest(snap: PlatformSnapshot, guestId: string): RsvpResponse | undefined {
  return snap.rsvpResponses.find((item) => item.guestId === guestId);
}

export function activeInvitationForGuest(snap: PlatformSnapshot, guestId: string): RsvpInvitation | undefined {
  return snap.rsvpInvitations.find((item) => item.guestId === guestId && item.status === "ISSUED");
}

export function activeEntitlements(snap: PlatformSnapshot, guestId: string): RsvpEntitlement[] {
  return snap.rsvpEntitlements.filter((item) => item.guestId === guestId && item.status === "ACTIVE");
}

export function companionAllowance(snap: PlatformSnapshot, guestId: string, policy: RsvpPolicy): number {
  const granted = activeEntitlements(snap, guestId).find((item) => item.kind === "COMPANION");
  if (granted?.allowance !== undefined) return granted.allowance;
  return policy.companionsPermitted ? policy.defaultCompanionAllowance : 0;
}

export function householdSubjects(snap: PlatformSnapshot, guestId: string): string[] {
  const granted = activeEntitlements(snap, guestId).find((item) => item.kind === "HOUSEHOLD_RESPONDENT");
  return granted?.subjectGuestIds ?? [];
}

export function emptyAnswers(): RsvpAnswers {
  return { attendanceIntent: "NOT_SUPPLIED" };
}

export function ensureResponse(input: {
  snap: PlatformSnapshot;
  guest: OperationalGuest;
  questionnaireId: string;
  now: string;
}): RsvpResponse {
  const existing = responseForGuest(input.snap, input.guest.id);
  if (existing) return existing;
  const record: RsvpResponse = {
    id: randomUUID(),
    organisationId: input.guest.organisationId,
    clientId: input.guest.clientId,
    eventId: input.guest.eventId,
    guestId: input.guest.id,
    questionnaireId: input.questionnaireId,
    attendanceIntent: "NOT_SUPPLIED",
    status: "NOT_STARTED",
    provenance: "GUEST_SELF_SERVICE",
    answers: emptyAnswers(),
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  input.snap.rsvpResponses.push(record);
  return record;
}

export function compileVisibleQuestions(
  questionnaire: RsvpQuestionnaire,
  attendance: RsvpAttendanceIntent,
  options: { household: boolean; companion: boolean },
): RsvpSection[] {
  return questionnaire.sections
    .map((section) => ({
      ...section,
      questions: section.questions.filter((question) => {
        if (!question.enabled) return false;
        if (question.key === "HOUSEHOLD" && !options.household) return false;
        if (question.key === "COMPANION" && !options.companion) return false;
        if (question.visibleWhenAttendance === "ANY") return true;
        return question.visibleWhenAttendance === attendance;
      }),
    }))
    .filter((section) => section.questions.length > 0);
}

export function validateAnswers(
  answers: RsvpAnswers,
  input: {
    questionnaire: RsvpQuestionnaire;
    householdSubjects: string[];
    companionAllowance: number;
    submit: boolean;
  },
): RsvpAttendanceIntent {
  const attendance = answers.attendanceIntent ?? "NOT_SUPPLIED";
  if (input.submit && attendance === "NOT_SUPPLIED") {
    throw new PlatformError("VALIDATION_FAILED", "an attendance response is required", {
      field: "attendanceIntent",
    });
  }
  if (answers.householdResponses) {
    for (const member of answers.householdResponses) {
      if (!input.householdSubjects.includes(member.guestId)) {
        throw new PlatformError("FORBIDDEN", "household respondent authority is not granted");
      }
    }
  }
  const companionCount = answers.companionCount ?? answers.companionNames?.length ?? 0;
  if (companionCount > input.companionAllowance) {
    throw new PlatformError("VALIDATION_FAILED", "companion allowance exceeded", { field: "companionCount" });
  }
  if ((answers.dietary || answers.accessibility) && answers.sensitiveConsent !== true && input.submit) {
    const needs = compileVisibleQuestions(input.questionnaire, attendance, {
      household: input.householdSubjects.length > 0,
      companion: input.companionAllowance > 0,
    });
    const requiresConsent = needs.some((section) =>
      section.questions.some((question) => question.key === "SENSITIVE_CONSENT" && question.enabled),
    );
    if (requiresConsent) {
      throw new PlatformError("VALIDATION_FAILED", "sensitive-answer consent is required", {
        field: "sensitiveConsent",
      });
    }
  }
  return attendance;
}

export function applyVerifiedFieldConflict(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  fieldKey: "dietaryRequirement" | "accessibilityRequirement",
  submitted: string | undefined,
  now: string,
): void {
  if (!submitted?.trim()) return;
  const current = guest[fieldKey];
  if (current.quality !== "VERIFIED") {
    current.value = submitted.trim();
    current.quality = "UNVERIFIED";
    guest.version += 1;
    guest.updatedAt = now;
    guest.attentionRequired = true;
    return;
  }
  if ((current.value ?? "").trim().toLowerCase() === submitted.trim().toLowerCase()) return;
  const open = snap.rsvpExceptions.find(
    (item) =>
      item.guestId === guest.id &&
      item.kind === "VERIFIED_FIELD_CONFLICT" &&
      item.fieldKey === fieldKey &&
      item.status === "OPEN",
  );
  if (!open) {
    snap.rsvpExceptions.push({
      id: randomUUID(),
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId: guest.eventId,
      guestId: guest.id,
      kind: "VERIFIED_FIELD_CONFLICT",
      status: "OPEN",
      fieldKey,
      existingValue: current.value,
      submittedValue: submitted.trim(),
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  current.quality = "CONFLICTING";
  guest.attentionRequired = true;
  guest.version += 1;
  guest.updatedAt = now;
}

export function openHeadcountException(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  submitted: string,
  now: string,
): void {
  const existing = snap.rsvpExceptions.find(
    (item) => item.guestId === guest.id && item.kind === "HEADCOUNT_EXCEEDED" && item.status === "OPEN",
  );
  if (existing) return;
  snap.rsvpExceptions.push({
    id: randomUUID(),
    organisationId: guest.organisationId,
    clientId: guest.clientId,
    eventId: guest.eventId,
    guestId: guest.id,
    kind: "HEADCOUNT_EXCEEDED",
    status: "OPEN",
    submittedValue: submitted,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  guest.attentionRequired = true;
}

export function applyResponseAnswers(input: {
  snap: PlatformSnapshot;
  guest: OperationalGuest;
  response: RsvpResponse;
  answers: RsvpAnswers;
  provenance: RsvpResponseProvenance;
  questionnaire: RsvpQuestionnaire;
  policy: RsvpPolicy;
  submit: boolean;
  now: string;
  actorPersonId?: string;
  invitationId?: string;
}): { receipt?: RsvpReceipt; assistance?: RsvpAssistanceRequest } {
  const allowance = companionAllowance(input.snap, input.guest.id, input.policy);
  const subjects = householdSubjects(input.snap, input.guest.id);
  const attendance = validateAnswers(input.answers, {
    questionnaire: input.questionnaire,
    householdSubjects: subjects,
    companionAllowance: allowance,
    submit: input.submit,
  });
  if (input.submit && (input.answers.companionCount ?? 0) > allowance) {
    openHeadcountException(input.snap, input.guest, String(input.answers.companionCount), input.now);
  }
  applyVerifiedFieldConflict(input.snap, input.guest, "dietaryRequirement", input.answers.dietary, input.now);
  applyVerifiedFieldConflict(
    input.snap,
    input.guest,
    "accessibilityRequirement",
    input.answers.accessibility,
    input.now,
  );
  input.response.answers = input.answers;
  input.response.attendanceIntent = attendance;
  input.response.provenance = input.provenance;
  input.response.questionnaireId = input.questionnaire.id;
  input.response.updatedAt = input.now;
  input.response.version += 1;
  if (input.actorPersonId) input.response.lastActorPersonId = input.actorPersonId;
  if (input.invitationId) input.response.lastInvitationId = input.invitationId;
  let assistance: RsvpAssistanceRequest | undefined;
  if (input.answers.assistanceRequested && input.answers.assistanceNote?.trim()) {
    assistance = {
      id: randomUUID(),
      organisationId: input.guest.organisationId,
      clientId: input.guest.clientId,
      eventId: input.guest.eventId,
      guestId: input.guest.id,
      note: input.answers.assistanceNote.trim(),
      status: "OPEN",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    };
    input.snap.rsvpAssistanceRequests.push(assistance);
    input.guest.attentionRequired = true;
  }
  if (!input.submit) {
    input.response.status = "IN_PROGRESS";
    return { assistance };
  }
  input.response.respondedAt = input.now;
  input.response.status =
    input.response.status === "SUBMITTED" || input.response.status === "AMENDED" ? "AMENDED" : "SUBMITTED";
  const receipt: RsvpReceipt = {
    id: randomUUID(),
    organisationId: input.guest.organisationId,
    clientId: input.guest.clientId,
    eventId: input.guest.eventId,
    guestId: input.guest.id,
    responseId: input.response.id,
    responseVersion: input.response.version,
    attendanceIntent: attendance,
    payloadHash: stableHash({
      guestId: input.guest.id,
      attendanceIntent: attendance,
      answers: input.answers,
      version: input.response.version,
    }),
    submittedAt: input.now,
    provenance: input.provenance,
    schemaVersion: SCHEMA_VERSION,
  };
  input.response.receiptId = receipt.id;
  input.snap.rsvpReceipts.push(receipt);
  return { receipt, assistance };
}

export function withdrawResponse(response: RsvpResponse, now: string): void {
  response.status = "WITHDRAWN";
  response.attendanceIntent = "NOT_SUPPLIED";
  response.updatedAt = now;
  response.version += 1;
}

export function expireInvitations(snap: PlatformSnapshot, now: string): number {
  let count = 0;
  for (const invitation of snap.rsvpInvitations) {
    if (invitation.status === "ISSUED" && Date.parse(invitation.expiresAt) <= Date.parse(now)) {
      invitation.status = "EXPIRED";
      invitation.updatedAt = now;
      invitation.version += 1;
      count += 1;
    }
  }
  return count;
}

export function reconcileEventProjection(
  snap: PlatformSnapshot,
  event: EventRecord,
  now: string,
): RsvpEventProjection {
  const guests = snap.operationalGuests.filter(
    (item) => item.eventId === event.id && item.lifecycle === "ACTIVE",
  );
  const counts = { notSupplied: 0, attending: 0, notAttending: 0, uncertain: 0, submitted: 0 };
  for (const guest of guests) {
    const response = responseForGuest(snap, guest.id);
    const intent = response?.attendanceIntent ?? "NOT_SUPPLIED";
    if (intent === "ATTENDING") counts.attending += 1;
    else if (intent === "NOT_ATTENDING") counts.notAttending += 1;
    else if (intent === "UNCERTAIN") counts.uncertain += 1;
    else counts.notSupplied += 1;
    if (response?.status === "SUBMITTED" || response?.status === "AMENDED") counts.submitted += 1;
  }
  const next: Omit<RsvpEventProjection, "id" | "version" | "createdAt"> & {
    id?: string;
    version?: number;
    createdAt?: string;
  } = {
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    notSupplied: counts.notSupplied,
    attending: counts.attending,
    notAttending: counts.notAttending,
    uncertain: counts.uncertain,
    submitted: counts.submitted,
    exceptionsOpen: snap.rsvpExceptions.filter((item) => item.eventId === event.id && item.status === "OPEN").length,
    assistanceOpen: snap.rsvpAssistanceRequests.filter((item) => item.eventId === event.id && item.status === "OPEN")
      .length,
    reconciledAt: now,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
  };
  const existing = snap.rsvpEventProjections.find((item) => item.eventId === event.id);
  if (existing) {
    Object.assign(existing, next, { version: existing.version + 1 });
    return existing;
  }
  const created: RsvpEventProjection = {
    id: randomUUID(),
    version: 1,
    createdAt: now,
    ...next,
  };
  snap.rsvpEventProjections.push(created);
  return created;
}

export function guestVisibleName(guest: OperationalGuest): string {
  return guest.preferredName.value?.trim() || operationalDisplayName(guest);
}

export function rsvpAttention(input: {
  response?: RsvpResponse;
  exceptions: RsvpException[];
  assistance: RsvpAssistanceRequest[];
}): boolean {
  if (input.exceptions.some((item) => item.status === "OPEN")) return true;
  if (input.assistance.some((item) => item.status === "OPEN")) return true;
  return input.response?.attendanceIntent === "UNCERTAIN";
}
