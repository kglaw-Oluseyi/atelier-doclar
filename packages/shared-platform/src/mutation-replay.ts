import { fieldValue } from "./guest-matching.js";
import type { AmendGuestInput, OperationalGuest } from "./guest-schemas.js";
import type {
  AddPartyMemberInput,
  AdministerCompanionEntitlementInput,
  AdministerRelationshipInput,
  EndResponsibleAdultLinkInput,
  NominateCompanionInput,
  RemovePartyMemberInput,
  UpdateGuestAddressingInput,
} from "./addressing-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function sameText(left: string | undefined, right: string | undefined): boolean {
  return (left?.trim() || undefined) === (right?.trim() || undefined);
}

export function guestAmendmentAlreadyApplied(guest: OperationalGuest, input: AmendGuestInput): boolean {
  const fields = [
    [guest.givenName, input.givenName],
    [guest.familyName, input.familyName],
    [guest.preferredName, input.preferredName],
    [guest.email, input.email],
    [guest.phone, input.phone],
    [guest.dietaryRequirement, input.dietaryRequirement],
    [guest.accessibilityRequirement, input.accessibilityRequirement],
    [guest.operationalNote, input.operationalNote],
  ] as const;
  for (const [current, incoming] of fields) {
    if (incoming === undefined) continue;
    if (!sameText(fieldValue(current), incoming)) return false;
  }
  if (input.lifecycle && guest.lifecycle !== input.lifecycle) return false;
  return true;
}

export function addressingAlreadyApplied(guest: OperationalGuest, input: UpdateGuestAddressingInput): boolean {
  const addressing = guest.addressing;
  if (!addressing) return false;
  if (input.honorific !== undefined && addressing.honorific !== input.honorific) return false;
  if (input.clearHonorific && addressing.honorific) return false;
  if (input.professionalTitle !== undefined && !sameText(addressing.professionalTitle, input.professionalTitle)) {
    return false;
  }
  if (input.traditionalTitle !== undefined && !sameText(addressing.traditionalTitle, input.traditionalTitle)) {
    return false;
  }
  if (input.middleNames !== undefined && !sameText(addressing.middleNames, input.middleNames)) return false;
  if (input.preferredDisplayName !== undefined && !sameText(addressing.preferredDisplayName, input.preferredDisplayName)) {
    return false;
  }
  if (
    input.preferredFormalSalutation !== undefined &&
    !sameText(addressing.preferredFormalSalutation, input.preferredFormalSalutation)
  ) {
    return false;
  }
  if (input.jointAddressForm !== undefined && !sameText(addressing.jointAddressForm, input.jointAddressForm)) return false;
  if (input.pronunciationNote !== undefined && !sameText(addressing.pronunciationNote, input.pronunciationNote)) {
    return false;
  }
  if (input.addressingStatus && addressing.addressingStatus !== input.addressingStatus) return false;
  if (input.ageBand && guest.ageBand !== input.ageBand) return false;
  if (input.postNominals) {
    const current = addressing.postNominals ?? [];
    if (current.length !== input.postNominals.length) return false;
    if (current.some((item, index) => item !== input.postNominals?.[index])) return false;
  }
  return true;
}

export function findAlreadyAppliedPartyMember(snap: PlatformSnapshot, input: AddPartyMemberInput) {
  return snap.guestPartyMembers.find(
    (item) =>
      item.partyId === input.partyId &&
      item.guestId === input.guestId &&
      item.eventId === input.eventId &&
      item.status === "ACTIVE" &&
      item.role === input.role,
  );
}

export function findAlreadyRemovedPartyMember(snap: PlatformSnapshot, input: RemovePartyMemberInput) {
  const record = snap.guestPartyMembers.find((item) => item.id === input.partyMemberId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) return undefined;
  return record.status === "LEFT" ? record : undefined;
}

export function relationshipAlreadyApplied(
  snap: PlatformSnapshot,
  input: AdministerRelationshipInput,
) {
  const record = snap.guestRelationships.find((item) => item.id === input.relationshipId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) return undefined;
  if (input.type && record.type !== input.type) return undefined;
  if (input.source && record.source !== input.source) return undefined;
  if (input.visibility && record.visibility !== input.visibility) return undefined;
  if (input.status && record.status !== input.status) return undefined;
  return record;
}

export function findAlreadyAppliedResponsibleAdultLink(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; childGuestId: string; responsibleAdultGuestId: string; scope: string },
) {
  return snap.responsibleAdultLinks.find(
    (item) =>
      item.organisationId === input.organisationId &&
      item.eventId === input.eventId &&
      item.childGuestId === input.childGuestId &&
      item.responsibleAdultGuestId === input.responsibleAdultGuestId &&
      item.scope === input.scope &&
      item.status === "ACTIVE",
  );
}

export function findAlreadyEndedResponsibleAdultLink(snap: PlatformSnapshot, input: EndResponsibleAdultLinkInput) {
  const record = snap.responsibleAdultLinks.find((item) => item.id === input.linkId);
  if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) return undefined;
  return record.status === "ENDED" ? record : undefined;
}

export function entitlementAlreadyApplied(snap: PlatformSnapshot, input: AdministerCompanionEntitlementInput) {
  return snap.companionEntitlements.find((item) => {
    if (item.principalGuestId !== input.principalGuestId || item.eventId !== input.eventId) return false;
    if (item.authority.kind !== input.authority.kind) return false;
    if (item.authority.kind === "RSVP_ENTITLEMENT" && input.authority.kind === "RSVP_ENTITLEMENT") {
      if (item.authority.rsvpEntitlementId !== input.authority.rsvpEntitlementId) return false;
    }
    if (item.authority.kind === "RSVP_POLICY_DEFAULT" && input.authority.kind === "RSVP_POLICY_DEFAULT") {
      if (item.authority.rsvpPolicyId !== input.authority.rsvpPolicyId) return false;
    }
    if (item.allowance !== input.allowance) return false;
    if ((input.status ?? item.status) !== item.status) return false;
    return true;
  });
}

export function nominationAlreadyApplied(snap: PlatformSnapshot, input: NominateCompanionInput) {
  const entitlement = snap.companionEntitlements.find((item) => item.id === input.entitlementId);
  if (!entitlement || entitlement.organisationId !== input.organisationId || entitlement.eventId !== input.eventId) {
    return undefined;
  }
  if (input.guestId && entitlement.nominatedGuestId === input.guestId) return entitlement;
  if (!input.guestId && entitlement.nominatedGuestId) {
    const guest = snap.operationalGuests.find((item) => item.id === entitlement.nominatedGuestId);
    if (!guest) return undefined;
    const given = input.suppliedGivenName?.trim();
    const family = input.suppliedFamilyName?.trim();
    if (given && fieldValue(guest.givenName) !== given) return undefined;
    if (family && fieldValue(guest.familyName) !== family) return undefined;
    return entitlement;
  }
  return undefined;
}
