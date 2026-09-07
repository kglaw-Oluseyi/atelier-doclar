import { createHash, randomUUID } from "node:crypto";
import {
  DEFAULT_FALLBACK_LANGUAGE_TAG,
  LANGUAGE_REGISTER,
  LANGUAGE_TAGS,
  PROHIBITED_LANGUAGE_INFERENCE_KEYS,
  SCHEMA_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import { requireScopedGuest } from "./addressing-operations.js";
import { requireScopedEvent } from "./programme-operations.js";
import { accentInsensitiveSearchKey, canonicalDisplayText } from "./language-unicode.js";
import { assertPlaceholderSetsMatch, extractPlaceholderNames, renderPlaceholders } from "./language-placeholders.js";
import {
  AssembleRecipientContentInputSchema,
  ContentBlockSchema,
  ContentEditionSchema,
  ContentWorkSchema,
  CulturalSourceTextSchema,
  LanguagePreferenceHistorySchema,
  LanguageProfileSchema,
  RecipientAssemblySchema,
  RecipientEditionRuleSchema,
  ReviewAssignmentSchema,
  TerminologyEntrySchema,
  TranslationLinkSchema,
  type AssembleRecipientContentInput,
  type ContentBlock,
  type ContentEdition,
  type ContentWork,
  type CreateContentWorkInput,
  type CreateCulturalSourceTextInput,
  type CreateDependentEditionInput,
  type CreateTerminologyEntryInput,
  type CulturalSourceText,
  type DecideCulturalTextInput,
  type DecideTranslationInput,
  type LanguageProfile,
  type LanguageTag,
  type RecordLanguagePreferenceInput,
  type RecipientAssembly,
  type SupersedeSourceEditionInput,
  type TerminologyEntry,
} from "./language-schemas.js";
import { stableHash } from "./redaction.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, version: 1, createdAt: now, updatedAt: now } as const;
}

function assertVersion(current: number, expected?: number): void {
  if (expected !== undefined && current !== expected) {
    throw new PlatformError("VERSION_CONFLICT", "this language record changed while you were editing");
  }
}

export function languageRegisterEntry(tag: LanguageTag) {
  const entry = LANGUAGE_REGISTER.find((item) => item.tag === tag);
  if (!entry) throw new PlatformError("VALIDATION_FAILED", "unsupported language tag");
  return entry;
}

export function isSupportedLanguageTag(value: string): value is LanguageTag {
  return (LANGUAGE_TAGS as readonly string[]).includes(value);
}

export function prohibitedLanguageInferenceKey(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if ((PROHIBITED_LANGUAGE_INFERENCE_KEYS as readonly string[]).some((item) => lower === item.toLowerCase() || lower.includes(item.toLowerCase()))) {
      return key;
    }
  }
  return undefined;
}

export function assertNoLanguageInference(raw: unknown): void {
  const key = prohibitedLanguageInferenceKey(raw);
  if (key) {
    throw new PlatformError("VALIDATION_FAILED", "language must not be inferred from identity or proxy traits", {
      field: key,
    });
  }
}

function scopedOf(event: { organisationId: string; clientId: string; id: string }) {
  return { organisationId: event.organisationId, clientId: event.clientId, eventId: event.id };
}

function requireWork(snap: PlatformSnapshot, organisationId: string, eventId: string, workId: string): ContentWork {
  const work = snap.contentWorks.find((item) => item.id === workId);
  if (!work || work.organisationId !== organisationId || work.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "content work was not found");
  }
  return work;
}

function requireEdition(snap: PlatformSnapshot, workId: string, editionId: string): ContentEdition {
  const edition = snap.contentEditions.find((item) => item.id === editionId && item.workId === workId);
  if (!edition) throw new PlatformError("NOT_FOUND", "content edition was not found");
  return edition;
}

function blocksForEdition(snap: PlatformSnapshot, editionId: string): ContentBlock[] {
  return snap.contentBlocks.filter((item) => item.editionId === editionId).sort((left, right) => left.sortOrder - right.sortOrder);
}

function assertSameEvent(left: { eventId: string }, right: { eventId: string }, message: string): void {
  if (left.eventId !== right.eventId) throw new PlatformError("SCOPE_MISMATCH", message);
}

export function recordLanguagePreferenceOnSnap(
  snap: PlatformSnapshot,
  input: RecordLanguagePreferenceInput,
  now: string,
  actorPersonId: string,
): LanguageProfile {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
  if (guest.lifecycle === "WITHDRAWN") {
    throw new PlatformError("VALIDATION_FAILED", "withdrawn guests cannot receive a language preference");
  }
  const unknown = !input.preferredLanguageTag;
  if (unknown && input.source !== "UNKNOWN") {
    throw new PlatformError("VALIDATION_FAILED", "no preference supplied must be stored as unknown, not as English");
  }
  if (!unknown && input.source === "UNKNOWN") {
    throw new PlatformError("VALIDATION_FAILED", "an explicit language cannot use UNKNOWN source");
  }
  const existing = snap.languageProfiles.find(
    (item) => item.guestId === input.guestId && item.eventId === input.eventId && item.organisationId === input.organisationId,
  );
  if (existing) {
    assertVersion(existing.version, input.expectedVersion);
    snap.languagePreferenceHistories.push(
      LanguagePreferenceHistorySchema.parse({
        id: randomUUID(),
        ...scopedOf(event),
        guestId: input.guestId,
        profileId: existing.id,
        previousLanguageTag: existing.preferredLanguageTag,
        nextLanguageTag: input.preferredLanguageTag,
        previousUnknown: existing.unknown,
        nextUnknown: unknown,
        source: input.source,
        actorPersonId,
        reason: input.reason,
        ...stamp(now),
      }),
    );
    existing.preferredLanguageTag = input.preferredLanguageTag;
    existing.additionalUnderstoodLanguageTags = input.additionalUnderstoodLanguageTags ?? existing.additionalUnderstoodLanguageTags;
    existing.englishAcceptable = input.englishAcceptable;
    existing.translationRequired = input.translationRequired;
    existing.preferredPresentationMode = input.preferredPresentationMode;
    existing.source = input.source;
    existing.unknown = unknown;
    existing.confirmedAt = unknown ? undefined : now;
    existing.confirmedByPersonId = unknown ? undefined : actorPersonId;
    existing.recordedByPersonId = actorPersonId;
    existing.updatedAt = now;
    existing.version += 1;
    const parsed = LanguageProfileSchema.parse(existing);
    Object.assign(existing, parsed);
    for (const assembly of snap.recipientAssemblies.filter((item) => item.guestId === input.guestId && item.eventId === input.eventId && item.status === "READY_FOR_COMMS_REVIEW")) {
      assembly.status = "SUPERSEDED";
      assembly.updatedAt = now;
      assembly.version += 1;
    }
    return existing;
  }
  const profile = LanguageProfileSchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    guestId: input.guestId,
    preferredLanguageTag: input.preferredLanguageTag,
    additionalUnderstoodLanguageTags: input.additionalUnderstoodLanguageTags ?? [],
    englishAcceptable: input.englishAcceptable,
    translationRequired: input.translationRequired,
    preferredPresentationMode: input.preferredPresentationMode,
    source: input.source,
    unknown,
    confirmedAt: unknown ? undefined : now,
    confirmedByPersonId: unknown ? undefined : actorPersonId,
    recordedByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.languageProfiles.push(profile);
  snap.languagePreferenceHistories.push(
    LanguagePreferenceHistorySchema.parse({
      id: randomUUID(),
      ...scopedOf(event),
      guestId: input.guestId,
      profileId: profile.id,
      nextLanguageTag: profile.preferredLanguageTag,
      previousUnknown: true,
      nextUnknown: profile.unknown,
      source: profile.source,
      actorPersonId,
      reason: input.reason,
      ...stamp(now),
    }),
  );
  return profile;
}

export function createCulturalSourceTextOnSnap(
  snap: PlatformSnapshot,
  input: CreateCulturalSourceTextInput,
  now: string,
  actorPersonId: string,
): CulturalSourceText {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const record = CulturalSourceTextSchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    exactText: input.exactText,
    languageTag: input.languageTag,
    purpose: input.purpose,
    culturalMeaning: input.culturalMeaning,
    usageNote: input.usageNote,
    provenance: input.provenance,
    authorPersonId: actorPersonId,
    specialistReviewerPersonId: input.specialistReviewerPersonId,
    specialistValidated: false,
    status: "DRAFT",
    culturallyAuthoritative: false,
    syntheticUnvalidated: false,
    searchKey: accentInsensitiveSearchKey(input.exactText),
    ...stamp(now),
  });
  snap.culturalSourceTexts.push(record);
  return record;
}

export function decideCulturalTextOnSnap(
  snap: PlatformSnapshot,
  input: DecideCulturalTextInput,
  now: string,
  actorPersonId: string,
): CulturalSourceText {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const record = snap.culturalSourceTexts.find((item) => item.id === input.culturalSourceTextId);
  if (!record || record.eventId !== event.id) throw new PlatformError("NOT_FOUND", "cultural source text was not found");
  assertVersion(record.version, input.expectedVersion);
  if (record.authorPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "the cultural-text author cannot approve the same text");
  }
  if (record.status === "APPROVED" && input.decision === "APPROVED") {
    throw new PlatformError("TRANSITION_INVALID", "an approved cultural text is immutable");
  }
  if (record.status === "SUPERSEDED") {
    throw new PlatformError("TRANSITION_INVALID", "superseded cultural text cannot be approved");
  }
  record.status = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";
  record.reviewerPersonId = actorPersonId;
  record.approvedByPersonId = input.decision === "APPROVED" ? actorPersonId : undefined;
  record.approvedAt = input.decision === "APPROVED" ? now : undefined;
  record.specialistValidated = Boolean(record.specialistReviewerPersonId && record.specialistReviewerPersonId === actorPersonId);
  record.culturallyAuthoritative = Boolean(record.specialistValidated && !record.syntheticUnvalidated);
  record.updatedAt = now;
  record.version += 1;
  snap.reviewAssignments.push(
    ReviewAssignmentSchema.parse({
      id: randomUUID(),
      ...scopedOf(event),
      kind: "CULTURAL",
      subjectType: "CULTURAL_SOURCE_TEXT",
      subjectId: record.id,
      reviewerPersonId: actorPersonId,
      proposerPersonId: record.authorPersonId,
      decision: input.decision,
      decidedAt: now,
      notes: input.notes,
      ...stamp(now),
    }),
  );
  return CulturalSourceTextSchema.parse(record);
}

export function createContentWorkOnSnap(
  snap: PlatformSnapshot,
  input: CreateContentWorkInput,
  now: string,
  actorPersonId: string,
): ContentWork {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const workId = randomUUID();
  const editionId = randomUUID();
  const blockId = randomUUID();
  const placeholders = extractPlaceholderNames(input.primaryText);
  const work = ContentWorkSchema.parse({
    id: workId,
    ...scopedOf(event),
    title: input.title,
    purpose: input.purpose,
    englishConvention: input.englishConvention,
    primaryLanguageTag: input.primaryLanguageTag,
    primaryEditionId: editionId,
    currentEditionId: editionId,
    hostFacing: input.hostFacing ?? false,
    ownerPersonId: actorPersonId,
    ...stamp(now),
  });
  const edition = ContentEditionSchema.parse({
    id: editionId,
    ...scopedOf(event),
    workId,
    languageTag: input.primaryLanguageTag,
    kind: "PRIMARY",
    status: "APPROVED",
    authorPersonId: actorPersonId,
    approvedByPersonId: actorPersonId,
    approvedAt: now,
    reviewRequired: false,
    coverageStatus: "APPROVED",
    culturallyAuthoritative: false,
    syntheticUnvalidated: true,
    ...stamp(now),
  });
  const block = ContentBlockSchema.parse({
    id: blockId,
    ...scopedOf(event),
    workId,
    editionId,
    languageTag: input.primaryLanguageTag,
    purpose: "PRIMARY",
    sortOrder: 0,
    exactText: input.primaryText,
    placeholderNames: placeholders,
    ...stamp(now),
  });
  const rule = RecipientEditionRuleSchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    workId,
    fallbackLanguageTag: DEFAULT_FALLBACK_LANGUAGE_TAG,
    allowPartialFallback: true,
    explanation: "Deterministic terminal fallback is en-GB. Explicit guest preference is never overwritten.",
    ownerPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.contentWorks.push(work);
  snap.contentEditions.push(edition);
  snap.contentBlocks.push(block);
  snap.recipientEditionRules.push(rule);
  return work;
}

export function createDependentEditionOnSnap(
  snap: PlatformSnapshot,
  input: CreateDependentEditionInput,
  now: string,
  actorPersonId: string,
): ContentEdition {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const work = requireWork(snap, input.organisationId, input.eventId, input.workId);
  const source = requireEdition(snap, work.id, input.sourceEditionId);
  if (source.status !== "APPROVED") {
    throw new PlatformError("TRANSITION_INVALID", "translations may only be drafted from an approved source edition");
  }
  if (input.sourceType === "MACHINE_SUGGESTED" || input.sourceType === "AI_SUGGESTED") {
    // Machine/AI output remains draft-only; approval is a later distinct-human action.
  }
  const editionId = randomUUID();
  const sourceBlocks = blocksForEdition(snap, source.id);
  const createdBlocks: ContentBlock[] = [];
  for (const [index, item] of input.blocks.entries()) {
    const sourceBlock = sourceBlocks.find((block) => block.id === item.sourceBlockId);
    if (!sourceBlock) throw new PlatformError("NOT_FOUND", "source block was not found");
    assertPlaceholderSetsMatch(sourceBlock.exactText, item.exactText);
    const targetBlock = ContentBlockSchema.parse({
      id: randomUUID(),
      ...scopedOf(event),
      workId: work.id,
      editionId,
      languageTag: input.targetLanguageTag,
      purpose: item.purpose ?? sourceBlock.purpose,
      sortOrder: index,
      exactText: item.exactText,
      culturalSourceTextId: sourceBlock.culturalSourceTextId,
      placeholderNames: extractPlaceholderNames(item.exactText),
      ...stamp(now),
    });
    createdBlocks.push(targetBlock);
    snap.contentBlocks.push(targetBlock);
    snap.translationLinks.push(
      TranslationLinkSchema.parse({
        id: randomUUID(),
        ...scopedOf(event),
        workId: work.id,
        sourceEditionId: source.id,
        sourceBlockId: sourceBlock.id,
        sourceLanguageTag: source.languageTag,
        targetEditionId: editionId,
        targetBlockId: targetBlock.id,
        targetLanguageTag: input.targetLanguageTag,
        translatorPersonId: actorPersonId,
        sourceType: input.sourceType,
        reviewStatus: "NOT_REVIEWED",
        stale: false,
        ...stamp(now),
      }),
    );
  }
  const requiredCount = input.kind === "COMPLETE" || input.kind === "BILINGUAL" ? sourceBlocks.length : createdBlocks.length;
  const coverageStatus = createdBlocks.length >= requiredCount && input.kind === "COMPLETE" ? "COMPLETE" : createdBlocks.length === 0 ? "NOT_STARTED" : "PARTIAL";
  const edition = ContentEditionSchema.parse({
    id: editionId,
    ...scopedOf(event),
    workId: work.id,
    languageTag: input.targetLanguageTag,
    kind: input.kind,
    status: "DRAFT",
    sourceEditionId: source.id,
    authorPersonId: actorPersonId,
    reviewRequired: false,
    coverageStatus,
    culturallyAuthoritative: false,
    syntheticUnvalidated: input.sourceType === "SYNTHETIC_FIXTURE" || input.sourceType === "AI_SUGGESTED" || input.sourceType === "MACHINE_SUGGESTED",
    ...stamp(now),
  });
  snap.contentEditions.push(edition);
  return edition;
}

export function decideTranslationOnSnap(
  snap: PlatformSnapshot,
  input: DecideTranslationInput,
  now: string,
  actorPersonId: string,
): ContentEdition {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const edition = snap.contentEditions.find((item) => item.id === input.editionId);
  if (!edition || edition.eventId !== event.id) throw new PlatformError("NOT_FOUND", "translation edition was not found");
  assertVersion(edition.version, input.expectedVersion);
  if (edition.kind === "PRIMARY") {
    throw new PlatformError("TRANSITION_INVALID", "primary editions are approved at creation and are not re-approved here");
  }
  if (edition.authorPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "the translator cannot approve the same translation");
  }
  if (edition.status === "APPROVED") {
    throw new PlatformError("TRANSITION_INVALID", "an approved translation is immutable; correction creates a new edition");
  }
  if (edition.status === "SUPERSEDED" || edition.status === "WITHDRAWN") {
    throw new PlatformError("TRANSITION_INVALID", "withdrawn or superseded editions cannot be approved");
  }
  const links = snap.translationLinks.filter((item) => item.targetEditionId === edition.id);
  if (links.some((item) => item.stale)) {
    throw new PlatformError("TRANSITION_INVALID", "stale source invalidates this translation until it is re-drafted");
  }
  if (input.decision === "APPROVED" && (edition.syntheticUnvalidated && (links.some((item) => item.sourceType === "AI_SUGGESTED" || item.sourceType === "MACHINE_SUGGESTED")))) {
    // Approval is human and explicit; machine/AI remains labelled unvalidated.
  }
  edition.status = input.decision === "APPROVED" ? "APPROVED" : "DRAFT";
  if (input.decision === "REJECTED") edition.status = "DRAFT";
  edition.reviewerPersonId = actorPersonId;
  edition.approvedByPersonId = input.decision === "APPROVED" ? actorPersonId : undefined;
  edition.approvedAt = input.decision === "APPROVED" ? now : undefined;
  edition.coverageStatus = input.decision === "APPROVED" && edition.kind === "COMPLETE" ? "APPROVED" : edition.coverageStatus;
  edition.updatedAt = now;
  edition.version += 1;
  for (const link of links) {
    link.reviewStatus = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";
    link.reviewerPersonId = actorPersonId;
    link.approvedByPersonId = input.decision === "APPROVED" ? actorPersonId : undefined;
    link.approvedAt = input.decision === "APPROVED" ? now : undefined;
    link.updatedAt = now;
    link.version += 1;
  }
  snap.reviewAssignments.push(
    ReviewAssignmentSchema.parse({
      id: randomUUID(),
      ...scopedOf(event),
      kind: "LINGUISTIC",
      subjectType: "CONTENT_EDITION",
      subjectId: edition.id,
      reviewerPersonId: actorPersonId,
      proposerPersonId: edition.authorPersonId,
      decision: input.decision,
      decidedAt: now,
      notes: input.notes,
      ...stamp(now),
    }),
  );
  if (input.decision === "APPROVED") {
    for (const assembly of snap.recipientAssemblies.filter((item) => item.workId === edition.workId && item.status === "READY_FOR_COMMS_REVIEW")) {
      assembly.status = "SUPERSEDED";
      assembly.updatedAt = now;
      assembly.version += 1;
    }
  }
  return ContentEditionSchema.parse(edition);
}

export function supersedeSourceEditionOnSnap(
  snap: PlatformSnapshot,
  input: SupersedeSourceEditionInput,
  now: string,
  actorPersonId: string,
): ContentEdition {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const work = requireWork(snap, input.organisationId, input.eventId, input.workId);
  const source = requireEdition(snap, work.id, input.sourceEditionId);
  assertVersion(source.version, input.expectedVersion);
  if (source.status !== "APPROVED") {
    throw new PlatformError("TRANSITION_INVALID", "only an approved source can be superseded");
  }
  const placeholders = extractPlaceholderNames(input.primaryText);
  const editionId = randomUUID();
  const block = ContentBlockSchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    workId: work.id,
    editionId,
    languageTag: source.languageTag,
    purpose: "PRIMARY",
    sortOrder: 0,
    exactText: input.primaryText,
    placeholderNames: placeholders,
    ...stamp(now),
  });
  const next = ContentEditionSchema.parse({
    id: editionId,
    ...scopedOf(event),
    workId: work.id,
    languageTag: source.languageTag,
    kind: "PRIMARY",
    status: "APPROVED",
    authorPersonId: actorPersonId,
    approvedByPersonId: actorPersonId,
    approvedAt: now,
    supersedesEditionId: source.id,
    reviewRequired: false,
    coverageStatus: "APPROVED",
    culturallyAuthoritative: false,
    syntheticUnvalidated: true,
    ...stamp(now),
  });
  source.status = "SUPERSEDED";
  source.updatedAt = now;
  source.version += 1;
  for (const link of snap.translationLinks.filter((item) => item.sourceEditionId === source.id)) {
    link.stale = true;
    link.reviewStatus = "STALE";
    link.updatedAt = now;
    link.version += 1;
    const dependent = snap.contentEditions.find((item) => item.id === link.targetEditionId);
    if (dependent && dependent.status !== "SUPERSEDED" && dependent.status !== "WITHDRAWN") {
      dependent.reviewRequired = true;
      dependent.coverageStatus = "STALE";
      if (dependent.status === "APPROVED") dependent.status = "IN_REVIEW";
      dependent.updatedAt = now;
      dependent.version += 1;
    }
  }
  work.primaryEditionId = next.id;
  work.currentEditionId = next.id;
  work.updatedAt = now;
  work.version += 1;
  snap.contentEditions.push(next);
  snap.contentBlocks.push(block);
  for (const assembly of snap.recipientAssemblies.filter((item) => item.workId === work.id && item.status === "READY_FOR_COMMS_REVIEW")) {
    assembly.status = "SUPERSEDED";
    assembly.updatedAt = now;
    assembly.version += 1;
  }
  return next;
}

export function createTerminologyEntryOnSnap(
  snap: PlatformSnapshot,
  input: CreateTerminologyEntryInput,
  now: string,
  actorPersonId: string,
): TerminologyEntry {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const entry = TerminologyEntrySchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    term: input.term,
    languageTag: input.languageTag,
    approvedDisplayForm: input.approvedDisplayForm,
    searchKey: accentInsensitiveSearchKey(input.term),
    meaning: input.meaning,
    policy: input.policy,
    context: input.context,
    ownerPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.terminologyEntries.push(entry);
  return entry;
}

function displayNameForGuest(snap: PlatformSnapshot, guestId: string): string {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  const given = guest && "value" in guest.givenName && typeof guest.givenName.value === "string" ? guest.givenName.value : "";
  const family = guest && "value" in guest.familyName && typeof guest.familyName.value === "string" ? guest.familyName.value : "";
  const preferred = guest && guest.preferredName && "value" in guest.preferredName && typeof guest.preferredName.value === "string" ? guest.preferredName.value : "";
  const name = [preferred || given, family].filter(Boolean).join(" ").trim();
  return canonicalDisplayText(name || "Named guest");
}

export function assembleRecipientContentOnSnap(
  snap: PlatformSnapshot,
  input: AssembleRecipientContentInput,
  now: string,
  actorPersonId: string,
): RecipientAssembly {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
  assertSameEvent({ eventId: event.id }, { eventId: guest.eventId }, "cross-event recipient assembly is denied");
  if (guest.lifecycle === "WITHDRAWN") {
    throw new PlatformError("VALIDATION_FAILED", "withdrawn guests cannot assemble recipient content");
  }
  const unnamedAllowance = snap.companionEntitlements.some(
    (item) => item.id === input.guestId || (item.eventId === event.id && item.status === "AVAILABLE" && !item.nominatedGuestId && item.id === input.guestId),
  );
  if (unnamedAllowance || !guest.givenName.value || guest.givenName.quality === "NOT_SUPPLIED") {
    throw new PlatformError("VALIDATION_FAILED", "unnamed allowance is not a recipient");
  }
  const work = requireWork(snap, input.organisationId, input.eventId, input.workId);
  const profile = snap.languageProfiles.find((item) => item.guestId === guest.id && item.eventId === event.id);
  if (profile && profile.eventId !== event.id) {
    throw new PlatformError("SCOPE_MISMATCH", "language preference must not leak across events");
  }
  const requested = profile?.unknown ? undefined : profile?.preferredLanguageTag;
  const primary = snap.contentEditions.find((item) => item.id === work.primaryEditionId && item.status === "APPROVED");
  if (!primary) throw new PlatformError("DEPENDENCY_UNAVAILABLE", "an approved primary edition is required before assembly");
  const target = requested
    ? snap.contentEditions.find(
        (item) =>
          item.workId === work.id &&
          item.languageTag === requested &&
          item.status === "APPROVED" &&
          !item.reviewRequired &&
          item.coverageStatus !== "STALE",
      )
    : undefined;
  const selected = target ?? (primary.languageTag === DEFAULT_FALLBACK_LANGUAGE_TAG || primary.status === "APPROVED" ? primary : undefined);
  if (!selected || selected.status !== "APPROVED") {
    throw new PlatformError("VALIDATION_FAILED", "neither approved target content nor permitted approved fallback exists");
  }
  if (selected.eventId !== event.id) {
    throw new PlatformError("SCOPE_MISMATCH", "cross-event content cannot be assembled");
  }
  const rule = snap.recipientEditionRules.find((item) => item.workId === work.id);
  const sourceBlocks = blocksForEdition(snap, primary.id);
  const selectedBlocks = blocksForEdition(snap, selected.id);
  const units = sourceBlocks.map((sourceBlock) => {
    const linked = snap.translationLinks.find(
      (item) => item.sourceBlockId === sourceBlock.id && item.targetEditionId === selected.id && item.reviewStatus === "APPROVED" && !item.stale,
    );
    const targetBlock = linked
      ? selectedBlocks.find((item) => item.id === linked.targetBlockId)
      : selected.id === primary.id
        ? sourceBlock
        : undefined;
    const usedFallback = !targetBlock || targetBlock.languageTag !== (requested ?? selected.languageTag);
    const block = targetBlock ?? sourceBlock;
    if (block.editionId !== selected.id && block.editionId !== primary.id) {
      throw new PlatformError("SCOPE_MISMATCH", "cross-event content cannot be assembled");
    }
    if (usedFallback && sourceBlock.editionId !== primary.id && primary.status !== "APPROVED") {
      throw new PlatformError("VALIDATION_FAILED", "fallback to draft or unapproved text is not permitted");
    }
    if (usedFallback && primary.status !== "APPROVED") {
      throw new PlatformError("VALIDATION_FAILED", "fallback to draft or unapproved text is not permitted");
    }
    const rendered = renderPlaceholders(block.exactText, { guestName: displayNameForGuest(snap, guest.id) }, block.placeholderNames.length > 0 ? block.placeholderNames : ["guestName"]);
    return {
      blockId: sourceBlock.id,
      requestedLanguageTag: requested,
      selectedLanguageTag: block.languageTag,
      selectedEditionId: block.editionId,
      selectedBlockId: block.id,
      fallbackUsed: Boolean(requested && usedFallback),
      fallbackReason: requested && usedFallback ? (target ? "PARTIAL_COVERAGE" : "MISSING_APPROVED_TARGET") : requested ? undefined : "NO_PREFERENCE",
      approvalStatus: selected.status,
      renderedText: rendered,
    } as const;
  });
  if (units.some((unit) => unit.approvalStatus !== "APPROVED")) {
    throw new PlatformError("VALIDATION_FAILED", "unapproved translation cannot enter recipient output");
  }
  const assemblyHash = createHash("sha256")
    .update(stableHash({ guestId: guest.id, workId: work.id, requested, selected: selected.id, units, at: now }))
    .digest("hex");
  const existing = snap.recipientAssemblies.find(
    (item) => item.guestId === guest.id && item.workId === work.id && item.status === "READY_FOR_COMMS_REVIEW" && item.assemblyHash === assemblyHash,
  );
  if (existing) return existing;
  for (const prior of snap.recipientAssemblies.filter((item) => item.guestId === guest.id && item.workId === work.id && item.status === "READY_FOR_COMMS_REVIEW")) {
    prior.status = "SUPERSEDED";
    prior.updatedAt = now;
    prior.version += 1;
  }
  const parsedInput = AssembleRecipientContentInputSchema.parse(input);
  void parsedInput;
  void rule;
  const assembly = RecipientAssemblySchema.parse({
    id: randomUUID(),
    ...scopedOf(event),
    guestId: guest.id,
    workId: work.id,
    contentPurpose: work.purpose,
    requestedLanguageTag: requested,
    selectedLanguageTag: selected.languageTag,
    editionId: selected.id,
    units,
    addressingDisplayName: displayNameForGuest(snap, guest.id),
    assemblyHash,
    readyForCommsReview: true,
    dispatched: false,
    providerInvoked: false,
    status: "READY_FOR_COMMS_REVIEW",
    assembledByPersonId: actorPersonId,
    placeholdersValid: true,
    ...stamp(now),
  });
  snap.recipientAssemblies.push(assembly);
  return assembly;
}

export function findTerminologyDisplayForm(snap: PlatformSnapshot, eventId: string, query: string): string | undefined {
  const key = accentInsensitiveSearchKey(query);
  return snap.terminologyEntries.find((item) => item.eventId === eventId && item.searchKey === key)?.approvedDisplayForm;
}
