import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import {
  attentionRequiredFor,
  fieldValue,
  findDuplicateMatches,
  identityResolutionFromMatches,
  normalizeEmail,
  normalizeName,
} from "./guest-matching.js";
import type {
  AmendGuestInput,
  GuestDuplicateCandidate,
  GuestHousehold,
  IntakeGuestInput,
  OperationalGuest,
  QualifiedField,
} from "./guest-schemas.js";
import type { Person } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

export function qualityForSupplied(value: string | undefined): QualifiedField {
  const trimmed = value?.trim();
  if (!trimmed) return { quality: "NOT_SUPPLIED" };
  return { value: trimmed, quality: "UNVERIFIED" };
}

export function computeAttention(guest: OperationalGuest): OperationalGuest {
  return { ...guest, attentionRequired: attentionRequiredFor(guest) };
}

export function upsertHousehold(
  snap: PlatformSnapshot,
  input: { organisationId: string; clientId: string; eventId: string; key: string; now: string },
): GuestHousehold {
  const existing = snap.guestHouseholds.find(
    (item) => item.eventId === input.eventId && item.key.toLowerCase() === input.key.toLowerCase(),
  );
  if (existing) return existing;
  const record: GuestHousehold = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: input.clientId,
    eventId: input.eventId,
    key: input.key,
    label: input.key,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  snap.guestHouseholds.push(record);
  return record;
}

export function buildOperationalGuest(input: {
  organisationId: string;
  clientId: string;
  eventId: string;
  fields: IntakeGuestInput;
  source: OperationalGuest["intakeSource"];
  actorPersonId: string;
  correlationId: string;
  now: string;
  householdId?: string;
}): OperationalGuest {
  return computeAttention({
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: input.clientId,
    eventId: input.eventId,
    ...(input.householdId ? { householdId: input.householdId } : {}),
    givenName: qualityForSupplied(input.fields.givenName),
    familyName: qualityForSupplied(input.fields.familyName),
    preferredName: qualityForSupplied(input.fields.preferredName),
    email: qualityForSupplied(input.fields.email),
    phone: qualityForSupplied(input.fields.phone),
    dietaryRequirement: qualityForSupplied(input.fields.dietaryRequirement),
    accessibilityRequirement: qualityForSupplied(input.fields.accessibilityRequirement),
    operationalNote: qualityForSupplied(input.fields.operationalNote),
    lifecycle: "ACTIVE",
    identityResolution: "UNRESOLVED",
    intakeSource: input.source,
    provenance: {
      source: input.source,
      recordedByPersonId: input.actorPersonId,
      recordedAt: input.now,
      correlationId: input.correlationId,
      reason: input.fields.reason,
    },
    attentionRequired: false,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function recordDuplicateCandidates(
  snap: PlatformSnapshot,
  guest: OperationalGuest,
  persons: readonly Person[],
  now: string,
): OperationalGuest {
  const matches = findDuplicateMatches({ candidate: guest, guests: snap.operationalGuests, persons });
  for (const match of matches) {
    const already = snap.guestDuplicateCandidates.some(
      (item) =>
        item.eventId === guest.eventId &&
        item.status === "OPEN" &&
        item.subjectGuestId === guest.id &&
        item.kind === match.kind &&
        item.otherGuestId === match.otherGuestId &&
        item.otherPersonId === match.otherPersonId,
    );
    if (already) continue;
    const record: GuestDuplicateCandidate = {
      id: randomUUID(),
      organisationId: guest.organisationId,
      clientId: guest.clientId,
      eventId: guest.eventId,
      subjectGuestId: guest.id,
      ...(match.otherGuestId ? { otherGuestId: match.otherGuestId } : {}),
      ...(match.otherPersonId ? { otherPersonId: match.otherPersonId } : {}),
      kind: match.kind,
      status: "OPEN",
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    snap.guestDuplicateCandidates.push(record);
  }
  guest.identityResolution = identityResolutionFromMatches(matches);
  return computeAttention(guest);
}

function replaceField(
  current: QualifiedField,
  nextValue: string | undefined,
  replaceVerified: boolean | undefined,
  field: string,
): QualifiedField {
  if (nextValue === undefined) return current;
  const next = qualityForSupplied(nextValue);
  const currentValue = fieldValue(current);
  const incoming = fieldValue(next);
  if (currentValue && incoming && currentValue !== incoming) {
    if (current.quality === "VERIFIED" && !replaceVerified) {
      throw new PlatformError("VALIDATION_FAILED", "verified field cannot be overwritten without an explicit replace", {
        field,
      });
    }
    if (current.quality === "VERIFIED" && replaceVerified) {
      return { value: incoming, quality: "PENDING_VERIFICATION" };
    }
    if (currentValue.toLowerCase() !== incoming.toLowerCase()) {
      return { value: incoming, quality: "CONFLICTING" };
    }
  }
  return next;
}

export function applyGuestAmendment(guest: OperationalGuest, input: AmendGuestInput, now: string): OperationalGuest {
  guest.givenName = replaceField(guest.givenName, input.givenName, input.replaceVerifiedField, "givenName");
  guest.familyName = replaceField(guest.familyName, input.familyName, input.replaceVerifiedField, "familyName");
  guest.preferredName = replaceField(guest.preferredName, input.preferredName, input.replaceVerifiedField, "preferredName");
  guest.email = replaceField(guest.email, input.email, input.replaceVerifiedField, "email");
  guest.phone = replaceField(guest.phone, input.phone, input.replaceVerifiedField, "phone");
  guest.dietaryRequirement = replaceField(
    guest.dietaryRequirement,
    input.dietaryRequirement,
    input.replaceVerifiedField,
    "dietaryRequirement",
  );
  guest.accessibilityRequirement = replaceField(
    guest.accessibilityRequirement,
    input.accessibilityRequirement,
    input.replaceVerifiedField,
    "accessibilityRequirement",
  );
  guest.operationalNote = replaceField(
    guest.operationalNote,
    input.operationalNote,
    input.replaceVerifiedField,
    "operationalNote",
  );
  if (input.lifecycle) guest.lifecycle = input.lifecycle;
  guest.version += 1;
  guest.updatedAt = now;
  return computeAttention(guest);
}

export function compareGuests(left: OperationalGuest, right: OperationalGuest, sort: "FAMILY_NAME" | "CREATED_AT"): number {
  if (sort === "CREATED_AT") {
    return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  }
  const family = (normalizeName(fieldValue(left.familyName)) ?? "").localeCompare(normalizeName(fieldValue(right.familyName)) ?? "");
  if (family !== 0) return family;
  const given = (normalizeName(fieldValue(left.givenName)) ?? "").localeCompare(normalizeName(fieldValue(right.givenName)) ?? "");
  if (given !== 0) return given;
  return left.id.localeCompare(right.id);
}

export function guestMatchesQuery(guest: OperationalGuest, query: string | undefined): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    fieldValue(guest.givenName),
    fieldValue(guest.familyName),
    fieldValue(guest.preferredName),
    normalizeEmail(fieldValue(guest.email)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}
