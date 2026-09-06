import { SCHEMA_VERSION } from "./constants.js";
import type { CompanionEntitlement, GuestParty, GuestPartyMember, ResponsibleAdultLink } from "./addressing-schemas.js";
import { FIXTURE_IDS } from "./fixtures.js";
import type { GuestHousehold, OperationalGuest } from "./guest-schemas.js";
import type { RsvpEntitlement } from "./rsvp-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const AT = "2026-09-06T14:00:00.000Z";

export const S04A_FIXTURE_IDS = {
  householdAlakija: "00000000-0000-4000-8000-000000000071",
  guestEbunoluwa: "00000000-0000-4000-8000-000000000072",
  guestOlufemi: "00000000-0000-4000-8000-000000000073",
  guestTomi: "00000000-0000-4000-8000-000000000074",
  guestKemi: "00000000-0000-4000-8000-000000000075",
  /** Unrelated existing OperationalGuest — not a nomination or materialised companion. */
  guestAdesina: "00000000-0000-4000-8000-000000000076",
  partyAlakija: "00000000-0000-4000-8000-000000000077",
  entitlementPlusOne: "00000000-0000-4000-8000-000000000078",
  rsvpEntitlementPlusOne: "00000000-0000-4000-8000-000000000079",
  linkTomi: "00000000-0000-4000-8000-000000000080",
  linkKemi: "00000000-0000-4000-8000-000000000081",
} as const;

function stamp<T extends object>(value: T): T & { nonProductionFixture: true } {
  return { ...value, nonProductionFixture: true };
}

function versioned() {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  };
}

function provenance() {
  return {
    source: "MANUAL_STAFF" as const,
    recordedByPersonId: FIXTURE_IDS.personPlanner,
    recordedAt: AT,
    correlationId: "corr-s04a-fixture",
    reason: "EOS-S04A synthetic fixture",
  };
}

function blankField() {
  return { quality: "NOT_SUPPLIED" as const };
}

function nameField(value: string) {
  return { value, quality: "UNVERIFIED" as const };
}

export function fixtureS04AHousehold(): GuestHousehold {
  return stamp({
    id: S04A_FIXTURE_IDS.householdAlakija,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    key: "alakija",
    label: "Alákíjà household",
    ...versioned(),
  });
}

export function fixtureS04AGuests(): OperationalGuest[] {
  const shared = {
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    householdId: S04A_FIXTURE_IDS.householdAlakija,
    email: blankField(),
    phone: blankField(),
    dietaryRequirement: blankField(),
    accessibilityRequirement: blankField(),
    operationalNote: blankField(),
    lifecycle: "ACTIVE" as const,
    identityResolution: "UNRESOLVED" as const,
    intakeSource: "MANUAL_STAFF" as const,
    provenance: provenance(),
    attentionRequired: false,
    ...versioned(),
  };
  return [
    stamp({
      ...shared,
      id: S04A_FIXTURE_IDS.guestEbunoluwa,
      givenName: nameField("Ẹ̀bùnolúwa"),
      familyName: nameField("Alákíjà"),
      preferredName: nameField("Ẹ̀bùnolúwa"),
      addressing: {
        honorific: "Dr (Mrs)",
        addressingStatus: "HOST_CONFIRMED",
        addressingSource: "HOST",
      },
      ageBand: "ADULT",
    }),
    stamp({
      ...shared,
      id: S04A_FIXTURE_IDS.guestOlufemi,
      givenName: nameField("Olúfẹ́mi"),
      familyName: nameField("Alákíjà"),
      preferredName: nameField("Olúfẹ́mi"),
      addressing: {
        traditionalTitle: "Otunba",
        traditionalTitleSource: "PROTOCOL_TEAM",
        addressingStatus: "PROTOCOL_CONFIRMED",
        addressingSource: "PROTOCOL_TEAM",
      },
      ageBand: "ADULT",
    }),
    stamp({
      ...shared,
      id: S04A_FIXTURE_IDS.guestTomi,
      givenName: nameField("Tómiwà"),
      familyName: nameField("Alákíjà"),
      preferredName: blankField(),
      ageBand: "CHILD",
      childReadiness: "READY_FOR_EVENT",
    }),
    stamp({
      ...shared,
      id: S04A_FIXTURE_IDS.guestKemi,
      givenName: nameField("Kẹ́mi"),
      familyName: nameField("Alákíjà"),
      preferredName: blankField(),
      ageBand: "EARLY_CHILDHOOD",
      childReadiness: "READY_FOR_EVENT",
    }),
    stamp({
      ...shared,
      id: S04A_FIXTURE_IDS.guestAdesina,
      householdId: undefined,
      givenName: nameField("Adéṣínà"),
      familyName: nameField("Ọládàpọ̀"),
      preferredName: nameField("Adéṣínà"),
      ageBand: "ADULT",
    }),
  ];
}

export function fixtureS04AParty(): { party: GuestParty; members: GuestPartyMember[] } {
  const party: GuestParty = stamp({
    id: S04A_FIXTURE_IDS.partyAlakija,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    type: "HOUSEHOLD",
    principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
    label: "Alákíjà household",
    status: "ACTIVE",
    legacyHouseholdId: S04A_FIXTURE_IDS.householdAlakija,
    ...versioned(),
  });
  const members = [
    S04A_FIXTURE_IDS.guestEbunoluwa,
    S04A_FIXTURE_IDS.guestOlufemi,
    S04A_FIXTURE_IDS.guestTomi,
    S04A_FIXTURE_IDS.guestKemi,
  ].map((guestId, index) =>
    stamp({
      id: `00000000-0000-4000-8000-00000000008${index + 2}`,
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      partyId: party.id,
      guestId,
      role: guestId === S04A_FIXTURE_IDS.guestEbunoluwa ? ("PRINCIPAL" as const) : ("MEMBER" as const),
      joinedAt: AT,
      status: "ACTIVE" as const,
      ...versioned(),
    }),
  );
  return { party, members };
}

export function fixtureS04AResponsibleAdultLinks(): ResponsibleAdultLink[] {
  return [
    stamp({
      id: S04A_FIXTURE_IDS.linkTomi,
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      childGuestId: S04A_FIXTURE_IDS.guestTomi,
      responsibleAdultGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      scope: "EVENT",
      status: "ACTIVE",
      reason: "mother",
      ...versioned(),
    }),
    stamp({
      id: S04A_FIXTURE_IDS.linkKemi,
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientAlpha,
      eventId: FIXTURE_IDS.eventAlphaOne,
      childGuestId: S04A_FIXTURE_IDS.guestKemi,
      responsibleAdultGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
      scope: "EVENT",
      status: "ACTIVE",
      reason: "mother",
      ...versioned(),
    }),
  ];
}

export function fixtureS03CompanionEntitlement(): RsvpEntitlement {
  return stamp({
    id: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
    kind: "COMPANION",
    allowance: 1,
    status: "ACTIVE",
    reason: "S03 synthetic companion allowance for the S04A unnamed entitlement",
    ...versioned(),
  });
}

export function fixtureS04AUnnamedEntitlement(): CompanionEntitlement {
  return stamp({
    id: S04A_FIXTURE_IDS.entitlementPlusOne,
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
    principalGuestId: S04A_FIXTURE_IDS.guestEbunoluwa,
    allowance: 1,
    authority: { kind: "RSVP_ENTITLEMENT", rsvpEntitlementId: S04A_FIXTURE_IDS.rsvpEntitlementPlusOne },
    status: "AVAILABLE",
    reason: "S03 companion allowance — unnamed",
    ...versioned(),
  });
}

export function applyS04AFixtures(snap: PlatformSnapshot): PlatformSnapshot {
  const next = structuredClone(snap);
  next.guestHouseholds.push(fixtureS04AHousehold());
  next.operationalGuests.push(...fixtureS04AGuests());
  const { party, members } = fixtureS04AParty();
  next.guestParties.push(party);
  next.guestPartyMembers.push(...members);
  next.responsibleAdultLinks.push(...fixtureS04AResponsibleAdultLinks());
  next.rsvpEntitlements.push(fixtureS03CompanionEntitlement());
  next.companionEntitlements.push(fixtureS04AUnnamedEntitlement());
  return next;
}
