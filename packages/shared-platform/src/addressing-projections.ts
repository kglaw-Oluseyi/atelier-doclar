import {
  allowedEntitlementTransitions,
  childReadinessFor,
  renderFamiliarName,
  renderGuestSalutation,
  requiresResponsibleAdult,
  unnamedAllowanceHasNoGuest,
  type RenderedSalutation,
} from "./addressing.js";
import type {
  AddressingSource,
  AddressingStatus,
  AgeBand,
  ChildReadiness,
  CompanionAuthority,
  CompanionEntitlement,
  CompanionEntitlementStatus,
  GuestAddressing,
  Honorific,
} from "./addressing-schemas.js";
import { fieldValue } from "./guest-matching.js";
import type { OperationalGuest } from "./guest-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface GuestAddressingCapabilities {
  canViewAddressing: boolean;
  canManageAddressing: boolean;
  canConfirmAddressing: boolean;
  canViewProtocolNote: boolean;
  canViewRelationship: boolean;
  canManageRelationship: boolean;
  canViewEntitlement: boolean;
  canManageEntitlement: boolean;
  canReviewEntitlementException: boolean;
  canViewChild: boolean;
  canManageChild: boolean;
}

export interface GuestAddressingProjection {
  guestId: string;
  eventId: string;
  organisationId: string;
  version: number;
  givenName?: string;
  familyName?: string;
  preferredName?: string;
  formalSalutation: RenderedSalutation;
  familiarName: RenderedSalutation;
  addressingStatus?: AddressingStatus;
  addressingSource?: AddressingSource;
  honorific?: Honorific;
  professionalTitle?: string;
  middleNames?: string;
  postNominals?: string[];
  preferredDisplayName?: string;
  preferredFormalSalutation?: string;
  jointAddressForm?: string;
  traditionalTitle?: string;
  pronunciationNote?: string;
}

export interface GuestChildProjection {
  ageBand?: AgeBand;
  childReadiness?: ChildReadiness;
  requiresResponsibleAdult: boolean;
  responsibleAdult?: {
    linkId: string;
    adultGuestId: string;
    adultFamiliarName: string;
    scope: string;
    status: string;
    version: number;
  };
}

export interface GuestPartyMemberProjection {
  membershipId: string;
  guestId: string;
  displayName: string;
  role: string;
  status: string;
  version: number;
}

export interface GuestPartyProjection {
  id: string;
  type: string;
  label: string;
  status: string;
  version: number;
  memberCount: number;
  members: GuestPartyMemberProjection[];
  principalGuestId?: string;
  principalDisplayName?: string;
}

export interface GuestRelationshipProjection {
  id: string;
  type: string;
  fromGuestId: string;
  toGuestId: string;
  fromDisplayName: string;
  toDisplayName: string;
  direction: string;
  visibility: string;
  status: string;
  source: string;
}

export interface CompanionEntitlementProjection {
  id: string;
  status: string;
  allowance: number;
  nominatedGuestId?: string;
  nominatedDisplayName?: string;
  authorityKind: string;
  authority: CompanionAuthority;
  unnamed: boolean;
  version: number;
  allowedTransitions: CompanionEntitlementStatus[];
  authorisedAllowance?: number;
}

export interface CompanionNameReconciliationProjection {
  id: string;
  legacyDisplayText: string;
  status: string;
  fabricatedGuest: false;
}

export interface GuestAddressingWorkspace {
  id: string;
  guest: GuestAddressingProjection;
  child?: GuestChildProjection;
  parties: GuestPartyProjection[];
  relationships: GuestRelationshipProjection[];
  entitlements: CompanionEntitlementProjection[];
  companionNameReconciliations: CompanionNameReconciliationProjection[];
  pendingCompanionNames: string[];
  capabilities: GuestAddressingCapabilities;
}

const CONFIRMED_ADDRESSING = new Set<AddressingStatus>([
  "GUEST_CONFIRMED",
  "HOST_CONFIRMED",
  "PROTOCOL_CONFIRMED",
]);

export function addressingStatusRequiresConfirm(status: AddressingStatus | undefined): boolean {
  return status !== undefined && CONFIRMED_ADDRESSING.has(status);
}

export function communicationsSalutation(guest: OperationalGuest): string {
  return renderGuestSalutation(guest).text;
}

export function projectAddressingFields(
  addressing: GuestAddressing | undefined,
  capabilities: GuestAddressingCapabilities,
): Pick<
  GuestAddressingProjection,
  | "addressingStatus"
  | "addressingSource"
  | "honorific"
  | "professionalTitle"
  | "middleNames"
  | "postNominals"
  | "preferredDisplayName"
  | "preferredFormalSalutation"
  | "jointAddressForm"
  | "traditionalTitle"
  | "pronunciationNote"
> {
  if (!addressing || !capabilities.canViewAddressing) return {};
  return {
    addressingStatus: addressing.addressingStatus,
    addressingSource: addressing.addressingSource,
    ...(addressing.honorific ? { honorific: addressing.honorific } : {}),
    ...(addressing.professionalTitle ? { professionalTitle: addressing.professionalTitle } : {}),
    ...(addressing.middleNames ? { middleNames: addressing.middleNames } : {}),
    ...(addressing.postNominals?.length ? { postNominals: addressing.postNominals } : {}),
    ...(addressing.preferredDisplayName ? { preferredDisplayName: addressing.preferredDisplayName } : {}),
    ...(addressing.preferredFormalSalutation ? { preferredFormalSalutation: addressing.preferredFormalSalutation } : {}),
    ...(addressing.jointAddressForm ? { jointAddressForm: addressing.jointAddressForm } : {}),
    ...(capabilities.canViewProtocolNote && addressing.traditionalTitle
      ? { traditionalTitle: addressing.traditionalTitle }
      : {}),
    ...(capabilities.canViewProtocolNote && addressing.pronunciationNote
      ? { pronunciationNote: addressing.pronunciationNote }
      : {}),
  };
}

export function projectGuestAddressing(
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): GuestAddressingProjection {
  const formal = renderGuestSalutation(guest);
  const familiar = renderFamiliarName(guest);
  return {
    guestId: guest.id,
    eventId: guest.eventId,
    organisationId: guest.organisationId,
    version: guest.version,
    ...(fieldValue(guest.givenName) ? { givenName: fieldValue(guest.givenName) } : {}),
    ...(fieldValue(guest.familyName) ? { familyName: fieldValue(guest.familyName) } : {}),
    ...(fieldValue(guest.preferredName) ? { preferredName: fieldValue(guest.preferredName) } : {}),
    formalSalutation: formal,
    familiarName: familiar,
    ...projectAddressingFields(guest.addressing, capabilities),
  };
}

export function projectOperationalGuest(
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): OperationalGuest {
  const next: OperationalGuest = { ...guest };
  if (!capabilities.canViewAddressing) {
    delete next.addressing;
  } else if (next.addressing && !capabilities.canViewProtocolNote) {
    const { pronunciationNote: _note, traditionalTitle: _title, ...rest } = next.addressing;
    next.addressing = rest;
  }
  if (!capabilities.canViewChild) {
    delete next.ageBand;
    delete next.childReadiness;
  }
  return next;
}

function displayNameFor(snap: PlatformSnapshot, guestId: string): string {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  return guest ? renderFamiliarName(guest).text : "Guest";
}

export function projectGuestChild(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): GuestChildProjection | undefined {
  if (!capabilities.canViewChild) return undefined;
  const link = snap.responsibleAdultLinks.find(
    (item) =>
      item.childGuestId === guest.id &&
      item.eventId === guest.eventId &&
      item.status === "ACTIVE",
  );
  return {
    ...(guest.ageBand ? { ageBand: guest.ageBand } : {}),
    ...(guest.childReadiness ? { childReadiness: guest.childReadiness } : {}),
    requiresResponsibleAdult: requiresResponsibleAdult(guest.ageBand),
    ...(link
      ? {
          responsibleAdult: {
            linkId: link.id,
            adultGuestId: link.responsibleAdultGuestId,
            adultFamiliarName: displayNameFor(snap, link.responsibleAdultGuestId),
            scope: link.scope,
            status: link.status,
            version: link.version,
          },
        }
      : {}),
  };
}

export function projectGuestParties(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): GuestPartyProjection[] {
  if (!capabilities.canViewRelationship) return [];
  const memberships = snap.guestPartyMembers.filter(
    (item) => item.guestId === guest.id && item.eventId === guest.eventId && item.status === "ACTIVE",
  );
  return memberships
    .map((membership) => snap.guestParties.find((party) => party.id === membership.partyId))
    .filter((party): party is NonNullable<typeof party> => {
      if (!party || party.eventId !== guest.eventId) return false;
      return capabilities.canViewProtocolNote || party.type !== "PROTECTION_PARTY";
    })
    .map((party) => {
      const members = snap.guestPartyMembers.filter(
        (item) => item.partyId === party.id && item.status === "ACTIVE" && item.eventId === party.eventId,
      );
      return {
        id: party.id,
        type: party.type,
        label: party.label,
        status: party.status,
        version: party.version,
        memberCount: members.length,
        members: members.map((item) => ({
          membershipId: item.id,
          guestId: item.guestId,
          displayName: displayNameFor(snap, item.guestId),
          role: item.role,
          status: item.status,
          version: item.version,
        })),
        ...(party.principalGuestId
          ? {
              principalGuestId: party.principalGuestId,
              principalDisplayName: displayNameFor(snap, party.principalGuestId),
            }
          : {}),
      };
    });
}

export function projectGuestRelationships(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): GuestRelationshipProjection[] {
  if (!capabilities.canViewRelationship) return [];
  return snap.guestRelationships
    .filter(
      (item) =>
        item.eventId === guest.eventId &&
        (item.fromGuestId === guest.id || item.toGuestId === guest.id) &&
        item.status === "ACTIVE",
    )
    .filter((item) => capabilities.canViewProtocolNote || item.visibility === "STAFF")
    .map((item) => ({
      id: item.id,
      type: item.type,
      fromGuestId: item.fromGuestId,
      toGuestId: item.toGuestId,
      fromDisplayName: displayNameFor(snap, item.fromGuestId),
      toDisplayName: displayNameFor(snap, item.toGuestId),
      direction: item.direction,
      visibility: item.visibility,
      status: item.status,
      source: item.source,
    }));
}

export function projectCompanionEntitlements(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): CompanionEntitlementProjection[] {
  if (!capabilities.canViewEntitlement) return [];
  return snap.companionEntitlements
    .filter((item) => item.eventId === guest.eventId && item.principalGuestId === guest.id)
    .map((item) => projectCompanionEntitlement(snap, item));
}

function authorisedAllowanceFor(snap: PlatformSnapshot, item: CompanionEntitlement): number | undefined {
  if (item.authority.kind !== "RSVP_ENTITLEMENT") return undefined;
  const authorityId = item.authority.rsvpEntitlementId;
  const authority = snap.rsvpEntitlements.find((record) => record.id === authorityId);
  return authority?.allowance;
}

export function projectCompanionEntitlement(
  snap: PlatformSnapshot,
  item: CompanionEntitlement,
): CompanionEntitlementProjection {
  const authorisedAllowance = authorisedAllowanceFor(snap, item);
  return {
    id: item.id,
    status: item.status,
    allowance: item.allowance,
    ...(item.nominatedGuestId ? { nominatedGuestId: item.nominatedGuestId } : {}),
    ...(item.nominatedGuestId ? { nominatedDisplayName: displayNameFor(snap, item.nominatedGuestId) } : {}),
    authorityKind: item.authority.kind,
    authority: item.authority,
    unnamed: unnamedAllowanceHasNoGuest(item) && item.nominatedGuestId === undefined,
    version: item.version,
    allowedTransitions: [...allowedEntitlementTransitions(item.status)],
    ...(authorisedAllowance !== undefined ? { authorisedAllowance } : {}),
  };
}

export function projectCompanionNameReconciliations(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): CompanionNameReconciliationProjection[] {
  if (!capabilities.canViewEntitlement) return [];
  return snap.addressingReconciliationItems
    .filter((item) => item.eventId === guest.eventId && item.guestId === guest.id)
    .map((item) => ({
      id: item.id,
      legacyDisplayText: item.legacyDisplayText,
      status: item.status,
      fabricatedGuest: false as const,
    }));
}

export function pendingCompanionNamesFromRsvp(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): string[] {
  if (!capabilities.canViewEntitlement) return [];
  const response = snap.rsvpResponses.find((item) => item.guestId === guest.id && item.eventId === guest.eventId);
  const names = response?.answers.companionNames ?? [];
  const recorded = new Set(
    snap.addressingReconciliationItems
      .filter((item) => item.guestId === guest.id && item.eventId === guest.eventId)
      .map((item) => item.legacyDisplayText.toLowerCase()),
  );
  return names.filter((name) => !recorded.has(name.toLowerCase()));
}

export function buildGuestAddressingWorkspace(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  capabilities: GuestAddressingCapabilities,
): GuestAddressingWorkspace {
  return {
    id: guest.id,
    guest: projectGuestAddressing(guest, capabilities),
    ...(capabilities.canViewChild ? { child: projectGuestChild(snap, guest, capabilities) } : {}),
    parties: projectGuestParties(snap, guest, capabilities),
    relationships: projectGuestRelationships(snap, guest, capabilities),
    entitlements: projectCompanionEntitlements(snap, guest, capabilities),
    companionNameReconciliations: projectCompanionNameReconciliations(snap, guest, capabilities),
    pendingCompanionNames: pendingCompanionNamesFromRsvp(snap, guest, capabilities),
    capabilities,
  };
}

export function refreshGuestChildReadiness(guest: OperationalGuest, hasActiveResponsibleAdult: boolean): void {
  const next = childReadinessFor({ ageBand: guest.ageBand, hasActiveResponsibleAdult });
  if (next) guest.childReadiness = next;
  else delete guest.childReadiness;
}
