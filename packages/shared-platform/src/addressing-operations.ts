import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import {
  allowanceExceedsAuthority,
  entitlementTransitionAllowed,
  partyIsNotIdentity,
  requiresResponsibleAdult,
  unnamedAllowanceHasNoGuest,
} from "./addressing.js";
import {
  CompanionEntitlementSchema,
  CompanionNominationSchema,
  GuestAddressingSchema,
  GuestPartyMemberSchema,
  GuestPartySchema,
  GuestRelationshipSchema,
  ResponsibleAdultLinkSchema,
  type AddPartyMemberInput,
  type AddressingReconciliationItem,
  type AdministerCompanionEntitlementInput,
  type AdministerRelationshipInput,
  type CompanionAuthority,
  type CompanionEntitlement,
  type CompanionNomination,
  type CreatePartyInput,
  type CreateRelationshipInput,
  type CreateResponsibleAdultLinkInput,
  type EndResponsibleAdultLinkInput,
  type GuestParty,
  type GuestPartyMember,
  type GuestRelationship,
  type NominateCompanionInput,
  type ReconcileCompanionNamesInput,
  type RemovePartyMemberInput,
  type ResponsibleAdultLink,
  type UpdateGuestAddressingInput,
} from "./addressing-schemas.js";
import { refreshGuestChildReadiness } from "./addressing-projections.js";
import {
  addressingTitles,
  detectSalutationTitleMismatch,
  proposedAddressingTitles,
} from "./addressing-salutation.js";
import { buildOperationalGuest, recordDuplicateCandidates } from "./guest-operations.js";
import type { IntakeGuestInput, OperationalGuest } from "./guest-schemas.js";
import { companionAllowance, eventPolicy } from "./rsvp-operations.js";
import type { PlatformSnapshot } from "./store.js";

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function requireScopedGuest(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  guestId: string,
): OperationalGuest {
  const record = snap.operationalGuests.find((item) => item.id === guestId);
  if (!record) {
    throw new PlatformError("NOT_FOUND", "guest record was not found");
  }
  if (record.organisationId !== organisationId || record.eventId !== eventId) {
    throw new PlatformError("SCOPE_MISMATCH", "guest is not in this event");
  }
  return record;
}

function requireEventLineage(snap: PlatformSnapshot, organisationId: string, eventId: string) {
  const event = snap.events.find((item) => item.id === eventId);
  if (!event || event.organisationId !== organisationId) {
    throw new PlatformError("NOT_FOUND", "event was not found");
  }
  return event;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function applyGuestAddressing(
  guest: OperationalGuest,
  input: UpdateGuestAddressingInput,
  now: string,
): OperationalGuest {
  const previous = guest.addressing;
  const honorific = input.clearHonorific ? undefined : (input.honorific ?? previous?.honorific);
  const professionalTitle =
    input.professionalTitle !== undefined ? optionalText(input.professionalTitle) : previous?.professionalTitle;
  const traditionalTitle =
    input.traditionalTitle !== undefined ? optionalText(input.traditionalTitle) : previous?.traditionalTitle;
  const middleNames = input.middleNames !== undefined ? optionalText(input.middleNames) : previous?.middleNames;
  const postNominals = input.postNominals !== undefined ? input.postNominals.filter((item) => item.trim()) : previous?.postNominals;
  const preferredDisplayName =
    input.preferredDisplayName !== undefined ? optionalText(input.preferredDisplayName) : previous?.preferredDisplayName;
  const preferredFormalSalutation =
    input.preferredFormalSalutation !== undefined
      ? optionalText(input.preferredFormalSalutation)
      : previous?.preferredFormalSalutation;
  const mismatch = detectSalutationTitleMismatch({
    previousTitles: addressingTitles(previous),
    nextTitles: proposedAddressingTitles(previous, input),
    salutation: previous?.preferredFormalSalutation,
  });
  const previousSalutation = previous?.preferredFormalSalutation;
  const salutationTextChanged = (preferredFormalSalutation ?? "") !== (previousSalutation ?? "");
  let preferredFormalSalutationGovernance = previous?.preferredFormalSalutationGovernance;
  if (mismatch) {
    if (input.salutationDecision === "UPDATE" && salutationTextChanged) {
      preferredFormalSalutationGovernance = {
        decision: "UPDATED",
        formerTitles: mismatch.formerTitles,
        recordedAt: now,
      };
    } else if (input.salutationDecision === "RETAIN" && !salutationTextChanged) {
      preferredFormalSalutationGovernance = {
        decision: "RETAINED",
        formerTitles: mismatch.formerTitles,
        recordedAt: now,
      };
    } else {
      throw new PlatformError(
        "VALIDATION_FAILED",
        "preferred formal salutation still contains the former title and will not be changed automatically",
        {
          field: "preferredFormalSalutation",
          publicMessage:
            "The preferred formal salutation still contains the former title. It will not be changed automatically. Update the salutation or explicitly retain it.",
        },
      );
    }
  }
  const jointAddressForm =
    input.jointAddressForm !== undefined ? optionalText(input.jointAddressForm) : previous?.jointAddressForm;
  const pronunciationNote =
    input.pronunciationNote !== undefined ? optionalText(input.pronunciationNote) : previous?.pronunciationNote;
  const addressing = GuestAddressingSchema.parse({
    ...(honorific ? { honorific } : {}),
    ...(professionalTitle
      ? {
          professionalTitle,
          professionalTitleSource: previous?.professionalTitleSource ?? input.addressingSource,
        }
      : {}),
    ...(traditionalTitle
      ? {
          traditionalTitle,
          traditionalTitleSource: previous?.traditionalTitleSource ?? input.addressingSource,
        }
      : {}),
    ...(middleNames ? { middleNames } : {}),
    ...(postNominals?.length ? { postNominals } : {}),
    ...(preferredDisplayName ? { preferredDisplayName } : {}),
    ...(preferredFormalSalutation ? { preferredFormalSalutation } : {}),
    ...(preferredFormalSalutationGovernance ? { preferredFormalSalutationGovernance } : {}),
    ...(jointAddressForm ? { jointAddressForm } : {}),
    ...(pronunciationNote ? { pronunciationNote } : {}),
    addressingStatus: input.addressingStatus ?? previous?.addressingStatus ?? "UNVERIFIED",
    addressingSource: input.addressingSource,
  });
  guest.addressing = addressing;
  if (input.ageBand) guest.ageBand = input.ageBand;
  guest.version += 1;
  guest.updatedAt = now;
  return guest;
}

export function createPartyOnSnap(snap: PlatformSnapshot, input: CreatePartyInput, now: string): GuestParty {
  const event = requireEventLineage(snap, input.organisationId, input.eventId);
  if (input.principalGuestId) {
    requireScopedGuest(snap, input.organisationId, input.eventId, input.principalGuestId);
  }
  if (input.legacyHouseholdId) {
    const household = snap.guestHouseholds.find((item) => item.id === input.legacyHouseholdId);
    if (
      !household ||
      household.organisationId !== input.organisationId ||
      household.eventId !== input.eventId ||
      household.clientId !== event.clientId
    ) {
      throw new PlatformError("SCOPE_MISMATCH", "legacy household is not in this event");
    }
  }
  const record = GuestPartySchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    type: input.type,
    ...(input.principalGuestId ? { principalGuestId: input.principalGuestId } : {}),
    label: input.label,
    status: "ACTIVE",
    ...(input.legacyHouseholdId ? { legacyHouseholdId: input.legacyHouseholdId } : {}),
    ...versioned(now),
  });
  snap.guestParties.push(record);
  return record;
}

export function addPartyMemberOnSnap(snap: PlatformSnapshot, input: AddPartyMemberInput, now: string): GuestPartyMember {
  const party = snap.guestParties.find((item) => item.id === input.partyId);
  if (!party || party.organisationId !== input.organisationId || party.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "party was not found");
  }
  if (party.version !== input.expectedPartyVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedPartyVersion} but found ${party.version}`);
  }
  const guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
  if (guest.clientId !== party.clientId) {
    throw new PlatformError("SCOPE_MISMATCH", "guest is not in this client");
  }
  if (party.id === guest.id) {
    throw new PlatformError("VALIDATION_FAILED", "a party cannot substitute for guest identity");
  }
  const duplicate = snap.guestPartyMembers.find(
    (item) => item.partyId === party.id && item.guestId === guest.id && item.status === "ACTIVE",
  );
  if (duplicate) {
    return duplicate;
  }
  const record = GuestPartyMemberSchema.parse({
    id: randomUUID(),
    organisationId: party.organisationId,
    clientId: party.clientId,
    eventId: party.eventId,
    partyId: party.id,
    guestId: guest.id,
    role: input.role,
    joinedAt: now,
    status: "ACTIVE",
    ...versioned(now),
  });
  if (!partyIsNotIdentity(party, record)) {
    throw new PlatformError("VALIDATION_FAILED", "a party cannot substitute for guest identity");
  }
  snap.guestPartyMembers.push(record);
  party.version += 1;
  party.updatedAt = now;
  if (input.role === "PRINCIPAL") party.principalGuestId = guest.id;
  return record;
}

export function removePartyMemberOnSnap(snap: PlatformSnapshot, input: RemovePartyMemberInput, now: string): GuestPartyMember {
  const record = snap.guestPartyMembers.find((item) => item.id === input.partyMemberId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "party member was not found");
  }
  if (record.status === "LEFT") {
    return record;
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${record.version}`);
  }
  record.status = "LEFT";
  record.leftAt = now;
  record.version += 1;
  record.updatedAt = now;
  const party = snap.guestParties.find((item) => item.id === record.partyId);
  if (party) {
    party.version += 1;
    party.updatedAt = now;
  }
  return record;
}

export function createRelationshipOnSnap(
  snap: PlatformSnapshot,
  input: CreateRelationshipInput,
  now: string,
): GuestRelationship {
  const from = requireScopedGuest(snap, input.organisationId, input.eventId, input.fromGuestId);
  const to = requireScopedGuest(snap, input.organisationId, input.eventId, input.toGuestId);
  if (from.clientId !== to.clientId) {
    throw new PlatformError("SCOPE_MISMATCH", "relationship guests are not in the same client");
  }
  const record = GuestRelationshipSchema.parse({
    id: randomUUID(),
    organisationId: from.organisationId,
    clientId: from.clientId,
    eventId: from.eventId,
    fromGuestId: from.id,
    toGuestId: to.id,
    type: input.type,
    direction: input.direction,
    source: input.source,
    visibility: input.visibility,
    status: "ACTIVE",
    reason: input.reason,
    ...versioned(now),
  });
  snap.guestRelationships.push(record);
  return record;
}

export function administerRelationshipOnSnap(
  snap: PlatformSnapshot,
  input: AdministerRelationshipInput,
  now: string,
): GuestRelationship {
  const record = snap.guestRelationships.find((item) => item.id === input.relationshipId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "relationship was not found");
  }
  if (
    (!input.type || record.type === input.type) &&
    (!input.source || record.source === input.source) &&
    (!input.visibility || record.visibility === input.visibility) &&
    (!input.status || record.status === input.status)
  ) {
    if (record.version !== input.expectedVersion) {
      return record;
    }
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${record.version}`);
  }
  if (input.type) record.type = input.type;
  if (input.source) record.source = input.source;
  if (input.visibility) record.visibility = input.visibility;
  if (input.status) record.status = input.status;
  record.reason = input.reason;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

function hasActiveResponsibleAdult(snap: PlatformSnapshot, childGuestId: string, eventId: string): boolean {
  return snap.responsibleAdultLinks.some(
    (item) => item.childGuestId === childGuestId && item.eventId === eventId && item.status === "ACTIVE",
  );
}

export function syncChildReadiness(snap: PlatformSnapshot, guest: OperationalGuest): void {
  refreshGuestChildReadiness(guest, hasActiveResponsibleAdult(snap, guest.id, guest.eventId));
}

export function createResponsibleAdultLinkOnSnap(
  snap: PlatformSnapshot,
  input: CreateResponsibleAdultLinkInput,
  now: string,
): ResponsibleAdultLink {
  const child = requireScopedGuest(snap, input.organisationId, input.eventId, input.childGuestId);
  const adult = requireScopedGuest(snap, input.organisationId, input.eventId, input.responsibleAdultGuestId);
  if (child.clientId !== adult.clientId) {
    throw new PlatformError("SCOPE_MISMATCH", "responsible-adult link guests are not in the same client");
  }
  if (!requiresResponsibleAdult(child.ageBand)) {
    throw new PlatformError("VALIDATION_FAILED", "a responsible-adult link requires a child age band");
  }
  if (requiresResponsibleAdult(adult.ageBand)) {
    throw new PlatformError("VALIDATION_FAILED", "the responsible adult must not themselves require a responsible adult");
  }
  const existing = snap.responsibleAdultLinks.find(
    (item) =>
      item.childGuestId === child.id &&
      item.responsibleAdultGuestId === adult.id &&
      item.eventId === child.eventId &&
      item.status === "ACTIVE",
  );
  if (existing) {
    return existing;
  }
  const record = ResponsibleAdultLinkSchema.parse({
    id: randomUUID(),
    organisationId: child.organisationId,
    clientId: child.clientId,
    eventId: child.eventId,
    childGuestId: child.id,
    responsibleAdultGuestId: adult.id,
    scope: input.scope,
    status: "ACTIVE",
    reason: input.reason,
    ...versioned(now),
  });
  snap.responsibleAdultLinks.push(record);
  syncChildReadiness(snap, child);
  child.version += 1;
  child.updatedAt = now;
  return record;
}

export function endResponsibleAdultLinkOnSnap(
  snap: PlatformSnapshot,
  input: EndResponsibleAdultLinkInput,
  now: string,
): ResponsibleAdultLink {
  const record = snap.responsibleAdultLinks.find((item) => item.id === input.linkId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "responsible-adult link was not found");
  }
  if (record.status === "ENDED") {
    return record;
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${record.version}`);
  }
  if (record.status !== "ACTIVE") {
    throw new PlatformError("TRANSITION_INVALID", "only an active responsible-adult link can be ended");
  }
  record.status = "ENDED";
  record.version += 1;
  record.updatedAt = now;
  const child = requireScopedGuest(snap, input.organisationId, input.eventId, record.childGuestId);
  syncChildReadiness(snap, child);
  child.version += 1;
  child.updatedAt = now;
  return record;
}

export function authorisedCompanionAllowance(
  snap: PlatformSnapshot,
  authority: CompanionAuthority,
  principalGuestId: string,
  eventId: string,
): number {
  if (authority.kind === "RSVP_ENTITLEMENT") {
    const entitlement = snap.rsvpEntitlements.find((item) => item.id === authority.rsvpEntitlementId);
    if (
      !entitlement ||
      entitlement.eventId !== eventId ||
      entitlement.guestId !== principalGuestId ||
      entitlement.kind !== "COMPANION" ||
      entitlement.status !== "ACTIVE"
    ) {
      throw new PlatformError("VALIDATION_FAILED", "S03 companion entitlement authority is not valid for this guest");
    }
    return entitlement.allowance ?? 0;
  }
  const policy = snap.rsvpPolicies.find((item) => item.id === authority.rsvpPolicyId && item.eventId === eventId);
  if (!policy) {
    throw new PlatformError("VALIDATION_FAILED", "S03 RSVP policy authority is not valid for this event");
  }
  const fallback = eventPolicy(snap, eventId);
  if (!fallback) {
    throw new PlatformError("VALIDATION_FAILED", "S03 RSVP policy authority is not valid for this event");
  }
  return companionAllowance(snap, principalGuestId, policy);
}

export function administerCompanionEntitlementOnSnap(
  snap: PlatformSnapshot,
  input: AdministerCompanionEntitlementInput,
  now: string,
): CompanionEntitlement {
  const principal = requireScopedGuest(snap, input.organisationId, input.eventId, input.principalGuestId);
  const authorised = authorisedCompanionAllowance(snap, input.authority, principal.id, principal.eventId);
  if (allowanceExceedsAuthority({ requested: input.allowance, authorised })) {
    throw new PlatformError("VALIDATION_FAILED", "S04A cannot expand the S03 companion allowance");
  }
  if (input.invitationId) {
    const invitation = snap.rsvpInvitations.find((item) => item.id === input.invitationId);
    if (
      !invitation ||
      invitation.eventId !== principal.eventId ||
      invitation.guestId !== principal.id ||
      invitation.organisationId !== principal.organisationId
    ) {
      throw new PlatformError("SCOPE_MISMATCH", "invitation is not in this event for this guest");
    }
  }
  const existing = snap.companionEntitlements.find((item) => {
    if (item.principalGuestId !== principal.id || item.eventId !== principal.eventId) return false;
    if (item.authority.kind !== input.authority.kind) return false;
    if (item.authority.kind === "RSVP_ENTITLEMENT" && input.authority.kind === "RSVP_ENTITLEMENT") {
      return item.authority.rsvpEntitlementId === input.authority.rsvpEntitlementId;
    }
    if (item.authority.kind === "RSVP_POLICY_DEFAULT" && input.authority.kind === "RSVP_POLICY_DEFAULT") {
      return item.authority.rsvpPolicyId === input.authority.rsvpPolicyId;
    }
    return false;
  });
  const nextStatus = input.status ?? existing?.status ?? "AVAILABLE";
  if (existing) {
    if (existing.allowance === input.allowance && existing.status === nextStatus) {
      return existing;
    }
    if (input.expectedVersion !== undefined && existing.version !== input.expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${existing.version}`);
    }
    if (!entitlementTransitionAllowed(existing.status, nextStatus) && existing.status !== nextStatus) {
      throw new PlatformError("TRANSITION_INVALID", "companion entitlement transition is not permitted");
    }
    existing.allowance = input.allowance;
    existing.status = nextStatus;
    existing.reason = input.reason;
    if (input.invitationId) existing.invitationId = input.invitationId;
    if (nextStatus === "AVAILABLE" || nextStatus === "DECLINED" || nextStatus === "EXPIRED") {
      delete existing.nominatedGuestId;
    }
    if (!unnamedAllowanceHasNoGuest(existing)) {
      throw new PlatformError("VALIDATION_FAILED", "an unnamed allowance must not carry a fabricated guestId");
    }
    existing.version += 1;
    existing.updatedAt = now;
    return existing;
  }
  const record = CompanionEntitlementSchema.parse({
    id: randomUUID(),
    organisationId: principal.organisationId,
    clientId: principal.clientId,
    eventId: principal.eventId,
    ...(input.invitationId ? { invitationId: input.invitationId } : {}),
    principalGuestId: principal.id,
    allowance: input.allowance,
    authority: input.authority,
    status: nextStatus,
    reason: input.reason,
    ...versioned(now),
  });
  snap.companionEntitlements.push(record);
  return record;
}

export function nominateCompanionOnSnap(
  snap: PlatformSnapshot,
  input: NominateCompanionInput,
  actorPersonId: string,
  correlationId: string,
  now: string,
): { entitlement: CompanionEntitlement; nomination: CompanionNomination; guest?: OperationalGuest } {
  const entitlement = snap.companionEntitlements.find((item) => item.id === input.entitlementId);
  if (!entitlement || entitlement.organisationId !== input.organisationId || entitlement.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "companion entitlement was not found");
  }
  if (entitlement.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", `expected version ${input.expectedVersion} but found ${entitlement.version}`);
  }
  requireScopedGuest(snap, input.organisationId, input.eventId, entitlement.principalGuestId);
  const hasGuest = Boolean(input.guestId);
  const hasNames = Boolean(
    optionalText(input.suppliedGivenName) ||
      optionalText(input.suppliedFamilyName) ||
      optionalText(input.suppliedEmail) ||
      optionalText(input.suppliedPhone),
  );
  if (!hasGuest && !hasNames) {
    throw new PlatformError("VALIDATION_FAILED", "nomination requires an existing guest or supplied companion identity");
  }
  if (entitlement.status === "NOMINATED" || entitlement.status === "CONFIRMED") {
    throw new PlatformError("TRANSITION_INVALID", "companion entitlement is already nominated");
  }
  if (!entitlementTransitionAllowed(entitlement.status, "NOMINATED")) {
    throw new PlatformError("TRANSITION_INVALID", "companion entitlement cannot be nominated from this status");
  }

  let guest: OperationalGuest | undefined;
  if (input.guestId) {
    guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
    if (guest.id === entitlement.principalGuestId) {
      throw new PlatformError("VALIDATION_FAILED", "a principal cannot be nominated as their own companion");
    }
    if (guest.clientId !== entitlement.clientId) {
      throw new PlatformError("SCOPE_MISMATCH", "nominated guest is not in this client");
    }
  } else {
    const email = optionalText(input.suppliedEmail);
    const phone = optionalText(input.suppliedPhone);
    if (email) {
      const match = snap.operationalGuests.find(
        (item) =>
          item.eventId === entitlement.eventId &&
          item.email.value?.toLowerCase() === email.toLowerCase(),
      );
      if (match) {
        throw new PlatformError(
          "VALIDATION_FAILED",
          "companion already exists as a guest; nominate by guestId",
        );
      }
    }
    if (phone) {
      const match = snap.operationalGuests.find(
        (item) => item.eventId === entitlement.eventId && item.phone.value === phone,
      );
      if (match) {
        throw new PlatformError(
          "VALIDATION_FAILED",
          "companion already exists as a guest; nominate by guestId",
        );
      }
    }
    const fields: IntakeGuestInput = {
      organisationId: entitlement.organisationId,
      eventId: entitlement.eventId,
      givenName: optionalText(input.suppliedGivenName),
      familyName: optionalText(input.suppliedFamilyName),
      email,
      phone,
      reason: input.reason,
    };
    guest = buildOperationalGuest({
      organisationId: entitlement.organisationId,
      clientId: entitlement.clientId,
      eventId: entitlement.eventId,
      fields,
      source: "MANUAL_STAFF",
      actorPersonId,
      correlationId,
      now,
    });
    snap.operationalGuests.push(guest);
    recordDuplicateCandidates(snap, guest, snap.persons, now);
  }

  entitlement.nominatedGuestId = guest.id;
  entitlement.status = "NOMINATED";
  entitlement.reason = input.reason;
  entitlement.version += 1;
  entitlement.updatedAt = now;
  if (!unnamedAllowanceHasNoGuest(entitlement)) {
    throw new PlatformError("VALIDATION_FAILED", "an unnamed allowance must not carry a fabricated guestId");
  }

  const nomination = CompanionNominationSchema.parse({
    id: randomUUID(),
    organisationId: entitlement.organisationId,
    clientId: entitlement.clientId,
    eventId: entitlement.eventId,
    entitlementId: entitlement.id,
    guestId: guest.id,
    ...(optionalText(input.suppliedGivenName) ? { suppliedGivenName: optionalText(input.suppliedGivenName) } : {}),
    ...(optionalText(input.suppliedFamilyName) ? { suppliedFamilyName: optionalText(input.suppliedFamilyName) } : {}),
    ...(optionalText(input.suppliedEmail) ? { suppliedEmail: optionalText(input.suppliedEmail) } : {}),
    ...(optionalText(input.suppliedPhone) ? { suppliedPhone: optionalText(input.suppliedPhone) } : {}),
    state: "MATERIALISED",
    reason: input.reason,
    ...versioned(now),
  });
  snap.companionNominations.push(nomination);
  return { entitlement, nomination, guest };
}

export function reconcileCompanionNamesOnSnap(
  snap: PlatformSnapshot,
  input: ReconcileCompanionNamesInput,
  now: string,
): AddressingReconciliationItem[] {
  const guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
  const response = snap.rsvpResponses.find((item) => item.guestId === guest.id && item.eventId === guest.eventId);
  const names = response?.answers.companionNames ?? [];
  const created: AddressingReconciliationItem[] = [];
  for (const name of names) {
    const exists = snap.addressingReconciliationItems.some(
      (item) =>
        item.guestId === guest.id &&
        item.eventId === guest.eventId &&
        item.legacyDisplayText.toLowerCase() === name.toLowerCase(),
    );
    if (exists) continue;
    const record: AddressingReconciliationItem = {
      id: randomUUID(),
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId: guest.eventId,
      guestId: guest.id,
      legacyDisplayText: name,
      status: "OPEN",
      reason: input.reason,
      ...versioned(now),
    };
    snap.addressingReconciliationItems.push(record);
    created.push(record);
  }
  return created;
}

export function amendHasAddressingFields(input: {
  honorific?: unknown;
  clearHonorific?: unknown;
  professionalTitle?: unknown;
  traditionalTitle?: unknown;
  middleNames?: unknown;
  postNominals?: unknown;
  preferredDisplayName?: unknown;
  preferredFormalSalutation?: unknown;
  jointAddressForm?: unknown;
  ageBand?: unknown;
}): boolean {
  return (
    input.honorific !== undefined ||
    input.clearHonorific !== undefined ||
    input.professionalTitle !== undefined ||
    input.traditionalTitle !== undefined ||
    input.middleNames !== undefined ||
    input.postNominals !== undefined ||
    input.preferredDisplayName !== undefined ||
    input.preferredFormalSalutation !== undefined ||
    input.jointAddressForm !== undefined ||
    input.ageBand !== undefined
  );
}
