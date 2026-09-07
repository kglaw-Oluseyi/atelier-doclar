import { randomUUID } from "node:crypto";
import {
  PROHIBITED_CORE_AUTHORITY_KEYS,
  PROHIBITED_MEASUREMENT_KEYS,
  PROHIBITED_PAYMENT_KEYS,
  SCHEMA_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import {
  CapMeasurementSchema,
  ExternalContactLinkSchema,
  FulfilmentSchema,
  GuestOfferSchema,
  GuestParticipationSchema,
  HostOfferRuleSchema,
  ItemVariantSchema,
  MerchandiseCohortMemberSchema,
  MerchandiseCohortSchema,
  MerchandiseCollectionSchema,
  MerchandiseExceptionSchema,
  MerchandiseGuestGrantSchema,
  MerchandiseItemSchema,
  VendorAssignmentSchema,
  VendorUpdateSchema,
  type CaptureCapMeasurementInput,
  type CreateExternalContactLinkInput,
  type CreateHostOfferRuleInput,
  type CreateMerchandiseCohortInput,
  type CreateMerchandiseCollectionInput,
  type CreateMerchandiseItemInput,
  type CreateVendorAssignmentInput,
  type IssueHostOfferRuleInput,
  type IssueMerchandiseGuestAccessInput,
  type PreviewMerchandiseAudienceInput,
  type RaiseMerchandiseExceptionInput,
  type RecordGuestParticipationInput,
  type RenewMerchandiseGuestAccessInput,
  type RenewVendorAssignmentInput,
  type ReviewVendorUpdateInput,
  type RevokeMerchandiseGuestAccessInput,
  type RevokeVendorAssignmentInput,
  type SubmitVendorUpdateInput,
  type UpdateMerchandiseCollectionInput,
  type UpdateMerchandiseItemInput,
  type WithdrawCapMeasurementInput,
  type WithdrawGuestOfferInput,
  type WithdrawHostOfferRuleInput,
} from "./merchandise-schemas.js";
import { hashVendorAssignmentToken, vendorTokenPrefix, type VendorAccessConfig } from "./merchandise-vendor-access.js";
import {
  hashMerchandiseGuestGrantToken,
  merchandiseGuestTokenPrefix,
  type MerchandiseGuestAccessConfig,
} from "./merchandise-guest-access.js";
import { requireScopedEvent } from "./programme-operations.js";
import { operationalDisplayName } from "./guest-matching.js";
import type { PlatformSnapshot } from "./store.js";

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function vendorReference(guestId: string, itemId: string): string {
  return `VR-${guestId.slice(0, 8)}-${itemId.slice(0, 6)}`.toUpperCase();
}

export function prohibitedMerchandisePayload(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const keys = Object.keys(raw as Record<string, unknown>);
  for (const key of keys) {
    const lower = key.toLowerCase();
    if ((PROHIBITED_MEASUREMENT_KEYS as readonly string[]).some((item) => lower.includes(item.toLowerCase()))) {
      return key;
    }
    if ((PROHIBITED_PAYMENT_KEYS as readonly string[]).some((item) => lower.includes(item.toLowerCase()))) {
      return key;
    }
    if ((PROHIBITED_CORE_AUTHORITY_KEYS as readonly string[]).some((item) => lower.includes(item.toLowerCase()))) {
      return key;
    }
  }
  return undefined;
}

export function assertNoProhibitedMerchandiseFields(raw: unknown): void {
  const key = prohibitedMerchandisePayload(raw);
  if (key) {
    throw new PlatformError("VALIDATION_FAILED", "prohibited merchandise field was rejected", {
      field: key,
      publicMessage: "That information is not collected by Maison Doclar.",
    });
  }
}

export function assertCapCircumferenceRaw(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const value = (raw as Record<string, unknown>).headCircumferenceInches;
  if (typeof value === "string" && /cm|centimetre|centimeter/i.test(value)) {
    throw new PlatformError("VALIDATION_FAILED", "cap circumference must be recorded in inches, not centimetres");
  }
}

function requireScopedGuest(snap: PlatformSnapshot, organisationId: string, eventId: string, guestId: string) {
  if (snap.guestHouseholds.some((item) => item.id === guestId) || snap.guestParties.some((item) => item.id === guestId)) {
    throw new PlatformError("VALIDATION_FAILED", "household or party identifiers cannot substitute for a guest");
  }
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  if (!guest || guest.organisationId !== organisationId || guest.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "guest was not found");
  }
  return guest;
}

function requireCollection(snap: PlatformSnapshot, organisationId: string, eventId: string, collectionId: string) {
  const collection = snap.merchandiseCollections.find((item) => item.id === collectionId);
  if (!collection || collection.organisationId !== organisationId || collection.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "merchandise collection was not found");
  }
  return collection;
}

function requireItem(snap: PlatformSnapshot, organisationId: string, eventId: string, itemId: string) {
  const item = snap.merchandiseItems.find((record) => record.id === itemId);
  if (!item || item.organisationId !== organisationId || item.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "merchandise item was not found");
  }
  return item;
}

function bump<T extends { version: number; updatedAt: string }>(record: T, now: string, expected?: number): T {
  if (expected !== undefined && record.version !== expected) {
    throw new PlatformError("VERSION_CONFLICT", "this merchandise record changed while you were editing");
  }
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function resolveOfferAudience(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  input: CreateHostOfferRuleInput,
): string[] {
  if (input.audienceKind === "NAMED_GUESTS") {
    if (input.audienceGuestIds.length === 0) {
      throw new PlatformError("VALIDATION_FAILED", "named-guest offers require explicit guest identifiers");
    }
    const unique = [...new Set(input.audienceGuestIds)];
    for (const guestId of unique) requireScopedGuest(snap, organisationId, eventId, guestId);
    return unique;
  }
  if (input.audienceKind === "EXPLICIT_COHORT") {
    if (!input.cohortId) {
      throw new PlatformError("VALIDATION_FAILED", "cohort offers require an explicit host-assigned cohort");
    }
    const cohort = snap.merchandiseCohorts.find((item) => item.id === input.cohortId);
    if (!cohort || cohort.organisationId !== organisationId || cohort.eventId !== eventId || cohort.inferred) {
      throw new PlatformError("NOT_FOUND", "host-assigned cohort was not found");
    }
    return snap.merchandiseCohortMembers
      .filter((item) => item.cohortId === cohort.id && item.eventId === eventId)
      .map((item) => item.guestId);
  }
  if (!input.phaseId) {
    throw new PlatformError("VALIDATION_FAILED", "phase offers require a programme phase");
  }
  const phase = snap.programmePhases.find(
    (item) => item.id === input.phaseId && item.organisationId === organisationId && item.eventId === eventId,
  );
  if (!phase) throw new PlatformError("NOT_FOUND", "programme phase was not found");
  return snap.phaseEntitlements
    .filter(
      (item) =>
        item.phaseId === phase.id &&
        item.subjectType === "GUEST" &&
        item.status === "ACTIVE" &&
        item.eventId === eventId,
    )
    .map((item) => item.subjectId);
}

export function previewOfferAudience(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  input: PreviewMerchandiseAudienceInput,
) {
  requireScopedEvent(snap, organisationId, eventId);
  const guestIds = resolveOfferAudience(snap, organisationId, eventId, {
    organisationId,
    eventId,
    reason: "preview",
    collectionId: "00000000-0000-4000-8000-000000000001",
    itemId: "00000000-0000-4000-8000-000000000001",
    variantIds: ["00000000-0000-4000-8000-000000000001"],
    audienceKind: input.audienceKind,
    audienceGuestIds: input.audienceGuestIds,
    cohortId: input.cohortId,
    phaseId: input.phaseId,
    hostSponsored: false,
    priority: 0,
    issueImmediately: false,
    expectedCollectionVersion: 1,
  });
  return [...new Set(guestIds)].map((guestId) => {
    requireScopedGuest(snap, organisationId, eventId, guestId);
    const guest = snap.operationalGuests.find((item) => item.id === guestId);
    return {
      guestId,
      displayName: guest ? operationalDisplayName(guest) : "Guest",
    };
  });
}

export function createMerchandiseCollectionOnSnap(
  snap: PlatformSnapshot,
  input: CreateMerchandiseCollectionInput,
  now: string,
) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  for (const phaseId of input.phaseIds) {
    const phase = snap.programmePhases.find((item) => item.id === phaseId);
    if (!phase || phase.eventId !== event.id) {
      throw new PlatformError("NOT_FOUND", "programme phase was not found");
    }
  }
  const record = MerchandiseCollectionSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    name: input.name,
    hostOwnerLabel: input.hostOwnerLabel,
    phaseIds: input.phaseIds,
    windowStartsAt: input.windowStartsAt,
    windowEndsAt: input.windowEndsAt,
    status: "ACTIVE",
    ...versioned(now),
  });
  snap.merchandiseCollections.push(record);
  return record;
}

export function createMerchandiseItemOnSnap(snap: PlatformSnapshot, input: CreateMerchandiseItemInput, now: string) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const collection = requireCollection(snap, event.organisationId, event.id, input.collectionId);
  if (input.madeToMeasureCap !== (input.type === "MADE_TO_MEASURE_CAP")) {
    throw new PlatformError("VALIDATION_FAILED", "only made-to-measure cap items may request cap circumference");
  }
  const item = MerchandiseItemSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    collectionId: collection.id,
    type: input.type,
    name: input.name,
    description: input.description,
    madeToMeasureCap: input.madeToMeasureCap,
    status: "ACTIVE",
    ...versioned(now),
  });
  const variant = ItemVariantSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    itemId: item.id,
    label: input.variantLabel,
    ...versioned(now),
  });
  snap.merchandiseItems.push(item);
  snap.merchandiseItemVariants.push(variant);
  return { item, variant };
}

export function updateMerchandiseCollectionOnSnap(
  snap: PlatformSnapshot,
  input: UpdateMerchandiseCollectionInput,
  now: string,
) {
  const collection = requireCollection(snap, input.organisationId, input.eventId, input.collectionId);
  bump(collection, now, input.expectedVersion);
  if (input.phaseIds) {
    for (const phaseId of input.phaseIds) {
      const phase = snap.programmePhases.find((item) => item.id === phaseId);
      if (!phase || phase.eventId !== collection.eventId) {
        throw new PlatformError("NOT_FOUND", "programme phase was not found");
      }
    }
    collection.phaseIds = input.phaseIds;
  }
  if (input.name) collection.name = input.name;
  return collection;
}

export function updateMerchandiseItemOnSnap(snap: PlatformSnapshot, input: UpdateMerchandiseItemInput, now: string) {
  const item = requireItem(snap, input.organisationId, input.eventId, input.itemId);
  bump(item, now, input.expectedVersion);
  if (input.name) item.name = input.name;
  if (input.description) item.description = input.description;
  return item;
}

export function createMerchandiseCohortOnSnap(snap: PlatformSnapshot, input: CreateMerchandiseCohortInput, now: string) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  for (const guestId of input.guestIds) {
    requireScopedGuest(snap, event.organisationId, event.id, guestId);
  }
  const cohort = MerchandiseCohortSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    label: input.label,
    hostAssigned: true,
    inferred: false,
    ...versioned(now),
  });
  snap.merchandiseCohorts.push(cohort);
  const members = input.guestIds.map((guestId) =>
    MerchandiseCohortMemberSchema.parse({
      id: randomUUID(),
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId: event.id,
      cohortId: cohort.id,
      guestId,
      ...versioned(now),
    }),
  );
  snap.merchandiseCohortMembers.push(...members);
  return { cohort, members };
}

function conflictWithExisting(snap: PlatformSnapshot, guestId: string, itemId: string, eventId: string): boolean {
  return snap.guestOffers.some(
    (item) =>
      item.guestId === guestId &&
      item.itemId === itemId &&
      item.eventId === eventId &&
      item.state !== "WITHDRAWN" &&
      item.state !== "CONFLICT_HOLD",
  );
}

export function materialiseOffersForRule(snap: PlatformSnapshot, rule: ReturnType<typeof HostOfferRuleSchema.parse>, now: string) {
  const guestIds =
    rule.audienceKind === "NAMED_GUESTS"
      ? rule.audienceGuestIds
      : resolveOfferAudience(snap, rule.organisationId, rule.eventId, {
          organisationId: rule.organisationId,
          eventId: rule.eventId,
          reason: "materialise",
          collectionId: rule.collectionId,
          itemId: rule.itemId,
          variantIds: rule.variantIds,
          audienceKind: rule.audienceKind,
          audienceGuestIds: rule.audienceGuestIds,
          cohortId: rule.cohortId,
          phaseId: rule.phaseId,
          hostSponsored: rule.hostSponsored,
          priority: rule.priority,
          issueImmediately: false,
          expectedCollectionVersion: 1,
        });
  const created: Array<{ offer: ReturnType<typeof GuestOfferSchema.parse>; fulfilment: ReturnType<typeof FulfilmentSchema.parse> }> = [];
  let conflicted = false;
  for (const guestId of guestIds) {
    requireScopedGuest(snap, rule.organisationId, rule.eventId, guestId);
    if (conflictWithExisting(snap, guestId, rule.itemId, rule.eventId)) {
      conflicted = true;
      continue;
    }
    const offer = GuestOfferSchema.parse({
      id: randomUUID(),
      organisationId: rule.organisationId,
      clientId: rule.clientId,
      eventId: rule.eventId,
      guestId,
      collectionId: rule.collectionId,
      itemId: rule.itemId,
      variantIds: rule.variantIds,
      sourceRuleId: rule.id,
      individualOverride: rule.audienceKind === "NAMED_GUESTS" && rule.audienceGuestIds.length === 1,
      hostSponsored: rule.hostSponsored,
      state: "ISSUED",
      ...versioned(now),
    });
    const fulfilment = FulfilmentSchema.parse({
      id: randomUUID(),
      organisationId: rule.organisationId,
      clientId: rule.clientId,
      eventId: rule.eventId,
      guestId,
      guestOfferId: offer.id,
      itemId: rule.itemId,
      variantId: rule.variantIds[0],
      vendorReference: vendorReference(guestId, rule.itemId),
      milestoneStatus: "OFFERED",
      commercialStatus: rule.hostSponsored ? "WAIVED_OR_HOST_SPONSORED" : "NOT_REQUIRED",
      commercialAttributed: false,
      ...versioned(now),
    });
    snap.guestOffers.push(offer);
    snap.merchandiseFulfilments.push(fulfilment);
    created.push({ offer, fulfilment });
  }
  if (conflicted) {
    rule.status = "CONFLICT_REVIEW";
    rule.conflictReason = "Conflicting issued offers held for review; the broadest offer was not granted.";
    snap.merchandiseExceptions.push(
      MerchandiseExceptionSchema.parse({
        id: randomUUID(),
        organisationId: rule.organisationId,
        clientId: rule.clientId,
        eventId: rule.eventId,
        type: "CONFLICTING_OFFERS",
        ownerLabel: "Merchandise coordination",
        reason: rule.conflictReason,
        status: "OPEN",
        ...versioned(now),
      }),
    );
  }
  return created;
}

export function createHostOfferRuleOnSnap(
  snap: PlatformSnapshot,
  input: CreateHostOfferRuleInput,
  now: string,
  options: { allowSponsor: boolean },
) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  const collection = requireCollection(snap, event.organisationId, event.id, input.collectionId);
  if (collection.version !== input.expectedCollectionVersion) {
    throw new PlatformError("VERSION_CONFLICT", "this merchandise record changed while you were editing");
  }
  const item = requireItem(snap, event.organisationId, event.id, input.itemId);
  if (item.collectionId !== collection.id) {
    throw new PlatformError("SCOPE_MISMATCH", "item is not in this collection");
  }
  if (input.hostSponsored && !options.allowSponsor) {
    throw new PlatformError("FORBIDDEN", "this assignment cannot grant host sponsorship");
  }
  for (const variantId of input.variantIds) {
    const variant = snap.merchandiseItemVariants.find((record) => record.id === variantId);
    if (!variant || variant.itemId !== item.id || variant.eventId !== event.id) {
      throw new PlatformError("NOT_FOUND", "item variant was not found");
    }
  }
  const audience = resolveOfferAudience(snap, event.organisationId, event.id, input);
  if (audience.length === 0) {
    throw new PlatformError("VALIDATION_FAILED", "offer audience resolved to no independent guests");
  }
  const rule = HostOfferRuleSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    collectionId: collection.id,
    itemId: item.id,
    variantIds: input.variantIds,
    audienceKind: input.audienceKind,
    audienceGuestIds: input.audienceKind === "NAMED_GUESTS" ? input.audienceGuestIds : [],
    cohortId: input.cohortId,
    phaseId: input.phaseId,
    hostSponsored: input.hostSponsored,
    priority: input.priority,
    status: input.issueImmediately ? "ISSUED" : "DRAFT",
    ...versioned(now),
  });
  snap.hostOfferRules.push(rule);
  if (input.issueImmediately) materialiseOffersForRule(snap, rule, now);
  return rule;
}

export function issueHostOfferRuleOnSnap(snap: PlatformSnapshot, input: IssueHostOfferRuleInput, now: string) {
  requireScopedEvent(snap, input.organisationId, input.eventId);
  const rule = snap.hostOfferRules.find((item) => item.id === input.ruleId);
  if (!rule || rule.organisationId !== input.organisationId || rule.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "host offer rule was not found");
  }
  bump(rule, now, input.expectedRuleVersion);
  rule.status = "ISSUED";
  materialiseOffersForRule(snap, rule, now);
  return rule;
}

export function withdrawHostOfferRuleOnSnap(snap: PlatformSnapshot, input: WithdrawHostOfferRuleInput, now: string) {
  requireScopedEvent(snap, input.organisationId, input.eventId);
  const rule = snap.hostOfferRules.find((item) => item.id === input.ruleId);
  if (!rule || rule.organisationId !== input.organisationId || rule.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "host offer rule was not found");
  }
  bump(rule, now, input.expectedVersion);
  rule.status = "WITHDRAWN";
  for (const offer of snap.guestOffers.filter((item) => item.sourceRuleId === rule.id && item.state !== "WITHDRAWN")) {
    offer.state = "WITHDRAWN";
    offer.version += 1;
    offer.updatedAt = now;
    const fulfilment = snap.merchandiseFulfilments.find((item) => item.guestOfferId === offer.id);
    if (fulfilment && fulfilment.milestoneStatus !== "CANCELLED") {
      fulfilment.milestoneStatus = "CANCELLED";
      fulfilment.version += 1;
      fulfilment.updatedAt = now;
    }
  }
  return rule;
}

export function withdrawGuestOfferOnSnap(snap: PlatformSnapshot, input: WithdrawGuestOfferInput, now: string) {
  const offer = snap.guestOffers.find((item) => item.id === input.offerId);
  if (!offer || offer.organisationId !== input.organisationId || offer.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "guest offer was not found");
  }
  bump(offer, now, input.expectedVersion);
  offer.state = "WITHDRAWN";
  const fulfilment = snap.merchandiseFulfilments.find((item) => item.guestOfferId === offer.id);
  if (fulfilment) {
    fulfilment.milestoneStatus = "CANCELLED";
    fulfilment.version += 1;
    fulfilment.updatedAt = now;
  }
  return offer;
}

export function recordGuestParticipationOnSnap(snap: PlatformSnapshot, input: RecordGuestParticipationInput, now: string) {
  const offer = snap.guestOffers.find((item) => item.id === input.guestOfferId);
  if (!offer || offer.organisationId !== input.organisationId || offer.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "guest offer was not found");
  }
  if (offer.guestId !== input.guestId) {
    throw new PlatformError("FORBIDDEN", "a guest may only record their own merchandise choice");
  }
  bump(offer, now, input.expectedOfferVersion);
  if (input.selectedVariantId && !offer.variantIds.includes(input.selectedVariantId)) {
    throw new PlatformError("VALIDATION_FAILED", "selected variant is not part of this offer");
  }
  const existing = snap.guestParticipations.find(
    (item) => item.guestOfferId === offer.id && item.status === "RECORDED",
  );
  if (existing && existing.choice === input.choice && existing.selectedVariantId === input.selectedVariantId) {
    return existing;
  }
  if (existing) {
    existing.status = "AMENDED";
    existing.updatedAt = now;
    existing.version += 1;
  }
  const participation = GuestParticipationSchema.parse({
    id: randomUUID(),
    organisationId: offer.organisationId,
    clientId: offer.clientId,
    eventId: offer.eventId,
    guestOfferId: offer.id,
    guestId: offer.guestId,
    choice: input.choice,
    selectedVariantId: input.selectedVariantId,
    status: "RECORDED",
    private: true,
    ...versioned(now),
  });
  snap.guestParticipations.push(participation);
  const fulfilment = snap.merchandiseFulfilments.find((item) => item.guestOfferId === offer.id);
  if (fulfilment) {
    fulfilment.milestoneStatus = input.choice === "DECLINE_GRACEFULLY" ? "DECLINED" : "GUEST_SELECTED";
    fulfilment.variantId = input.selectedVariantId ?? fulfilment.variantId;
    fulfilment.version += 1;
    fulfilment.updatedAt = now;
  }
  return participation;
}

export function captureCapMeasurementOnSnap(snap: PlatformSnapshot, input: CaptureCapMeasurementInput, now: string) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  requireScopedGuest(snap, event.organisationId, event.id, input.guestId);
  const item = requireItem(snap, event.organisationId, event.id, input.itemId);
  if (!item.madeToMeasureCap || item.type !== "MADE_TO_MEASURE_CAP") {
    throw new PlatformError("VALIDATION_FAILED", "cap circumference is only permitted for a made-to-measure cap");
  }
  const existing = snap.capMeasurements.find(
    (record) => record.guestId === input.guestId && record.itemId === item.id && record.status === "ACTIVE",
  );
  if (existing && existing.headCircumferenceInches === input.headCircumferenceInches) {
    return existing;
  }
  if (existing) {
    if (input.expectedVersion === undefined) {
      throw new PlatformError("VERSION_CONFLICT", "this merchandise record changed while you were editing");
    }
    bump(existing, now, input.expectedVersion);
    existing.status = "CORRECTED";
  }
  const measurement = CapMeasurementSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    guestId: input.guestId,
    itemId: item.id,
    headCircumferenceInches: input.headCircumferenceInches,
    consentGiven: true,
    consentRecordedAt: now,
    source: input.source,
    status: "ACTIVE",
    purpose: "NAMED_CAP_MANUFACTURE",
    ...versioned(now),
  });
  snap.capMeasurements.push(measurement);
  return measurement;
}

export function withdrawCapMeasurementOnSnap(snap: PlatformSnapshot, input: WithdrawCapMeasurementInput, now: string) {
  const measurement = snap.capMeasurements.find((item) => item.id === input.measurementId);
  if (!measurement || measurement.organisationId !== input.organisationId || measurement.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "cap measurement was not found");
  }
  bump(measurement, now, input.expectedVersion);
  measurement.status = "WITHDRAWN";
  measurement.consentWithdrawnAt = now;
  return measurement;
}

export function createVendorAssignmentOnSnap(
  snap: PlatformSnapshot,
  input: CreateVendorAssignmentInput,
  now: string,
  token: string,
  config: VendorAccessConfig,
) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  for (const collectionId of input.collectionIds) {
    requireCollection(snap, event.organisationId, event.id, collectionId);
  }
  for (const itemId of input.itemIds) {
    requireItem(snap, event.organisationId, event.id, itemId);
  }
  const assignment = VendorAssignmentSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    vendorId: input.vendorId,
    vendorDisplayName: input.vendorDisplayName,
    collectionIds: input.collectionIds,
    itemIds: input.itemIds,
    tokenHash: hashVendorAssignmentToken(token, config),
    tokenPrefix: vendorTokenPrefix(token),
    status: "ACTIVE",
    expiresAt: input.expiresAt,
    issuedAt: now,
    failedExchangeCount: 0,
    portalPermissions: ["fulfilment.view", "fulfilment.update", "exception.report"],
    ...versioned(now),
  });
  snap.vendorAssignments.push(assignment);
  return assignment;
}

export function revokeVendorAssignmentOnSnap(snap: PlatformSnapshot, input: RevokeVendorAssignmentInput, now: string) {
  const assignment = snap.vendorAssignments.find((item) => item.id === input.assignmentId);
  if (!assignment || assignment.organisationId !== input.organisationId || assignment.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "vendor assignment was not found");
  }
  bump(assignment, now, input.expectedVersion);
  assignment.status = "REVOKED";
  assignment.revokedAt = now;
  for (const session of snap.vendorSessions.filter((item) => item.assignmentId === assignment.id && !item.revokedAt)) {
    session.revokedAt = now;
    session.updatedAt = now;
    session.version += 1;
  }
  return assignment;
}

export function renewVendorAssignmentOnSnap(
  snap: PlatformSnapshot,
  input: RenewVendorAssignmentInput,
  now: string,
  token: string,
  config: VendorAccessConfig,
) {
  const assignment = snap.vendorAssignments.find((item) => item.id === input.assignmentId);
  if (!assignment || assignment.organisationId !== input.organisationId || assignment.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "vendor assignment was not found");
  }
  if (assignment.status === "REVOKED") {
    throw new PlatformError("FORBIDDEN", "a revoked vendor assignment cannot be renewed");
  }
  bump(assignment, now, input.expectedVersion);
  assignment.tokenHash = hashVendorAssignmentToken(token, config);
  assignment.tokenPrefix = vendorTokenPrefix(token);
  assignment.status = "ACTIVE";
  assignment.expiresAt = input.expiresAt;
  assignment.renewedAt = now;
  assignment.issuedAt = now;
  assignment.failedExchangeCount = 0;
  assignment.revokedAt = undefined;
  for (const session of snap.vendorSessions.filter((item) => item.assignmentId === assignment.id && !item.revokedAt)) {
    session.revokedAt = now;
    session.updatedAt = now;
    session.version += 1;
  }
  return assignment;
}

export function issueMerchandiseGuestGrantOnSnap(
  snap: PlatformSnapshot,
  input: IssueMerchandiseGuestAccessInput,
  now: string,
  token: string,
  config: MerchandiseGuestAccessConfig,
): { grant: ReturnType<typeof MerchandiseGuestGrantSchema.parse>; replayed: boolean } {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  requireScopedGuest(snap, event.organisationId, event.id, input.guestId);
  const permitted = snap.guestOffers.some(
    (item) =>
      item.guestId === input.guestId &&
      item.eventId === event.id &&
      item.state !== "WITHDRAWN" &&
      item.state !== "CONFLICT_HOLD",
  );
  if (!permitted) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "private guest access requires an issued merchandise offer for this guest",
    );
  }
  const active = snap.merchandiseGuestGrants.find(
    (item) => item.guestId === input.guestId && item.eventId === event.id && item.status === "ACTIVE",
  );
  if (active) {
    return { grant: active, replayed: true };
  }
  const grant = MerchandiseGuestGrantSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    guestId: input.guestId,
    tokenHash: hashMerchandiseGuestGrantToken(token, config),
    tokenPrefix: merchandiseGuestTokenPrefix(token),
    status: "ACTIVE",
    expiresAt: input.expiresAt,
    issuedAt: now,
    failedExchangeCount: 0,
    ...versioned(now),
  });
  snap.merchandiseGuestGrants.push(grant);
  return { grant, replayed: false };
}

export function renewMerchandiseGuestGrantOnSnap(
  snap: PlatformSnapshot,
  input: RenewMerchandiseGuestAccessInput,
  now: string,
  token: string,
  config: MerchandiseGuestAccessConfig,
) {
  const previous = snap.merchandiseGuestGrants.find((item) => item.id === input.grantId);
  if (!previous || previous.organisationId !== input.organisationId || previous.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "merchandise guest access was not found");
  }
  if (previous.status === "REVOKED") {
    throw new PlatformError("FORBIDDEN", "revoked merchandise guest access cannot be renewed");
  }
  bump(previous, now, input.expectedVersion);
  previous.status = "SUPERSEDED";
  previous.renewedAt = now;
  for (const session of snap.merchandiseGuestSessions.filter((item) => item.grantId === previous.id && !item.revokedAt)) {
    session.revokedAt = now;
    session.updatedAt = now;
    session.version += 1;
  }
  const grant = MerchandiseGuestGrantSchema.parse({
    id: randomUUID(),
    organisationId: previous.organisationId,
    clientId: previous.clientId,
    eventId: previous.eventId,
    guestId: previous.guestId,
    tokenHash: hashMerchandiseGuestGrantToken(token, config),
    tokenPrefix: merchandiseGuestTokenPrefix(token),
    status: "ACTIVE",
    expiresAt: input.expiresAt,
    issuedAt: now,
    renewedAt: now,
    failedExchangeCount: 0,
    ...versioned(now),
  });
  previous.supersededById = grant.id;
  snap.merchandiseGuestGrants.push(grant);
  return grant;
}

export function revokeMerchandiseGuestGrantOnSnap(
  snap: PlatformSnapshot,
  input: RevokeMerchandiseGuestAccessInput,
  now: string,
) {
  const grant = snap.merchandiseGuestGrants.find((item) => item.id === input.grantId);
  if (!grant || grant.organisationId !== input.organisationId || grant.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "merchandise guest access was not found");
  }
  bump(grant, now, input.expectedVersion);
  grant.status = "REVOKED";
  grant.revokedAt = now;
  for (const session of snap.merchandiseGuestSessions.filter((item) => item.grantId === grant.id && !item.revokedAt)) {
    session.revokedAt = now;
    session.updatedAt = now;
    session.version += 1;
  }
  return grant;
}

export function assignmentCoversFulfilment(
  assignment: ReturnType<typeof VendorAssignmentSchema.parse>,
  fulfilment: ReturnType<typeof FulfilmentSchema.parse>,
): boolean {
  return (
    assignment.eventId === fulfilment.eventId &&
    assignment.organisationId === fulfilment.organisationId &&
    assignment.itemIds.includes(fulfilment.itemId)
  );
}

export function submitVendorUpdateOnSnap(
  snap: PlatformSnapshot,
  input: SubmitVendorUpdateInput,
  now: string,
  actor: { assignmentId: string; vendorId: string; organisationId: string; eventId: string },
) {
  if (actor.assignmentId !== input.assignmentId) {
    throw new PlatformError("FORBIDDEN", "vendor assignment does not match this session");
  }
  const assignment = snap.vendorAssignments.find((item) => item.id === input.assignmentId);
  if (
    !assignment ||
    assignment.status !== "ACTIVE" ||
    assignment.vendorId !== actor.vendorId ||
    assignment.eventId !== actor.eventId ||
    assignment.organisationId !== actor.organisationId ||
    Date.parse(assignment.expiresAt) <= Date.parse(now)
  ) {
    throw new PlatformError("FORBIDDEN", "vendor assignment is not active for this event");
  }
  const fulfilment = snap.merchandiseFulfilments.find((item) => item.id === input.fulfilmentId);
  if (!fulfilment || fulfilment.eventId !== actor.eventId) {
    throw new PlatformError("NOT_FOUND", "fulfilment was not found");
  }
  if (!assignmentCoversFulfilment(assignment, fulfilment)) {
    throw new PlatformError("FORBIDDEN", "this fulfilment is not in the vendor assignment");
  }
  if (fulfilment.version !== input.expectedFulfilmentVersion) {
    throw new PlatformError("VERSION_CONFLICT", "this merchandise record changed while you were editing");
  }
  const replay = snap.vendorUpdates.find(
    (item) =>
      item.assignmentId === assignment.id &&
      item.fulfilmentId === fulfilment.id &&
      item.reportedState === input.reportedState &&
      item.reviewState === "PENDING_REVIEW",
  );
  if (replay) return replay;
  const update = VendorUpdateSchema.parse({
    id: randomUUID(),
    organisationId: fulfilment.organisationId,
    clientId: fulfilment.clientId,
    eventId: fulfilment.eventId,
    assignmentId: assignment.id,
    fulfilmentId: fulfilment.id,
    reportedState: input.reportedState,
    commercialStatus: input.commercialStatus,
    evidenceReference: input.evidenceReference,
    reviewState: "PENDING_REVIEW",
    vendorActorLabel: assignment.vendorDisplayName,
    reportedAt: now,
    ...versioned(now),
  });
  snap.vendorUpdates.push(update);
  return update;
}

export function reviewVendorUpdateOnSnap(snap: PlatformSnapshot, input: ReviewVendorUpdateInput, now: string) {
  const update = snap.vendorUpdates.find((item) => item.id === input.updateId);
  if (!update || update.organisationId !== input.organisationId || update.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "vendor update was not found");
  }
  bump(update, now, input.expectedUpdateVersion);
  update.reviewState = input.accept ? "ACCEPTED" : "REJECTED";
  if (input.accept) {
    const fulfilment = snap.merchandiseFulfilments.find((item) => item.id === update.fulfilmentId);
    if (fulfilment) {
      fulfilment.milestoneStatus = update.reportedState;
      if (update.commercialStatus) {
        fulfilment.commercialStatus = update.commercialStatus;
        fulfilment.commercialAttributed = true;
      }
      fulfilment.version += 1;
      fulfilment.updatedAt = now;
    }
  }
  return update;
}

export function raiseMerchandiseExceptionOnSnap(
  snap: PlatformSnapshot,
  input: RaiseMerchandiseExceptionInput,
  now: string,
) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  if (input.guestId) requireScopedGuest(snap, event.organisationId, event.id, input.guestId);
  const record = MerchandiseExceptionSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    type: input.type,
    guestId: input.guestId,
    fulfilmentId: input.fulfilmentId,
    ownerLabel: input.ownerLabel,
    reason: input.reason,
    guestSafeMessage: input.guestSafeMessage,
    status: "OPEN",
    ...versioned(now),
  });
  snap.merchandiseExceptions.push(record);
  if (input.fulfilmentId) {
    const fulfilment = snap.merchandiseFulfilments.find((item) => item.id === input.fulfilmentId);
    if (fulfilment && fulfilment.eventId === event.id) {
      if (input.type === "DELAY") fulfilment.milestoneStatus = "DELAYED";
      if (input.type === "DAMAGE") fulfilment.milestoneStatus = "DAMAGED";
      if (input.type === "REPLACEMENT") fulfilment.milestoneStatus = "REPLACEMENT_REQUIRED";
      if (input.type === "NON_COLLECTION") fulfilment.milestoneStatus = "UNCOLLECTED";
      if (input.type === "DISPUTE") {
        fulfilment.milestoneStatus = "DISPUTED";
        fulfilment.commercialStatus = "DISPUTED_WITH_VENDOR";
        fulfilment.commercialAttributed = true;
      }
      fulfilment.version += 1;
      fulfilment.updatedAt = now;
    }
  }
  return record;
}

export function createExternalContactLinkOnSnap(
  snap: PlatformSnapshot,
  input: CreateExternalContactLinkInput,
  now: string,
) {
  const event = requireScopedEvent(snap, input.organisationId, input.eventId);
  requireCollection(snap, event.organisationId, event.id, input.collectionId);
  if (input.urlTemplate.includes("http") && /[?&](guest|email|phone|token|card)=/i.test(input.urlTemplate)) {
    throw new PlatformError("VALIDATION_FAILED", "vendor contact links must not carry guest, payment or secret fields");
  }
  const link = ExternalContactLinkSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    collectionId: input.collectionId,
    itemId: input.itemId,
    channel: input.channel,
    label: input.label,
    urlTemplate: input.urlTemplate,
    published: true,
    ...versioned(now),
  });
  snap.externalContactLinks.push(link);
  return link;
}

export function safeVendorContactUrl(template: string, vendorReference: string, itemLabel: string): string {
  return template
    .replaceAll("{vendorReference}", encodeURIComponent(vendorReference))
    .replaceAll("{itemLabel}", encodeURIComponent(itemLabel));
}
