import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import type { GuestParty, GuestPartyMember } from "./addressing-schemas.js";
import { emptySnapshot, normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04A_MIGRATION_ID = "EOS-S04A-ADDRESSING-PARTIES-V1" as const;

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04A_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function migrateEosS04A(input: PlatformSnapshot, now: string): PlatformSnapshot {
  const snap = normalizeSnapshot(structuredClone(input));
  for (const household of snap.guestHouseholds) {
    const existing = snap.guestParties.find((item) => item.legacyHouseholdId === household.id);
    const party: GuestParty = existing ?? {
      id: deterministicUuid(`party:${household.id}`),
      organisationId: household.organisationId,
      clientId: household.clientId,
      eventId: household.eventId,
      type: "HOUSEHOLD",
      label: household.label,
      status: "ACTIVE",
      legacyHouseholdId: household.id,
      ...versioned(now),
    };
    if (!existing) snap.guestParties.push(party);
    const members = snap.operationalGuests.filter(
      (guest) => guest.eventId === household.eventId && guest.householdId === household.id,
    );
    for (const guest of members) {
      const already = snap.guestPartyMembers.some(
        (item) => item.partyId === party.id && item.guestId === guest.id && item.status === "ACTIVE",
      );
      if (already) continue;
      const member: GuestPartyMember = {
        id: deterministicUuid(`member:${party.id}:${guest.id}`),
        organisationId: guest.organisationId,
        clientId: guest.clientId,
        eventId: guest.eventId,
        partyId: party.id,
        guestId: guest.id,
        role: "MEMBER",
        joinedAt: now,
        status: "ACTIVE",
        ...versioned(now),
      };
      snap.guestPartyMembers.push(member);
    }
  }
  return snap;
}

export function rollbackEosS04A(input: PlatformSnapshot): PlatformSnapshot {
  const snap = normalizeSnapshot(structuredClone(input));
  snap.guestParties = [];
  snap.guestPartyMembers = [];
  snap.guestRelationships = [];
  snap.companionEntitlements = [];
  snap.companionNominations = [];
  snap.responsibleAdultLinks = [];
  snap.eventSeries = [];
  snap.eventSeriesMembers = [];
  snap.addressingReconciliationItems = [];
  return snap;
}

export function compatibleLegacySnapshot(input: Partial<PlatformSnapshot>): PlatformSnapshot {
  return normalizeSnapshot({
    ...emptySnapshot(),
    ...input,
  });
}
