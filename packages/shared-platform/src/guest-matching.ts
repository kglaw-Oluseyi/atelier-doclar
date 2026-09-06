import type { DuplicateMatchKind } from "./guest-schemas.js";
import type { OperationalGuest, QualifiedField } from "./guest-schemas.js";
import type { Person } from "./schemas.js";

export function normalizeEmail(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

export function normalizePhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : undefined;
}

export function normalizeName(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, " ");
  return trimmed ? trimmed : undefined;
}

export function fieldValue(field: QualifiedField): string | undefined {
  return field.value?.trim() || undefined;
}

export function operationalDisplayName(guest: Pick<OperationalGuest, "givenName" | "familyName" | "preferredName">): string {
  const preferred = fieldValue(guest.preferredName);
  if (preferred) return preferred;
  const given = fieldValue(guest.givenName);
  const family = fieldValue(guest.familyName);
  if (given && family) return `${given} ${family}`;
  if (family) return family;
  if (given) return given;
  return "Name not supplied";
}

export const ATTENTION_FIELD_KEYS = [
  "givenName",
  "familyName",
  "preferredName",
  "email",
  "phone",
  "dietaryRequirement",
  "accessibilityRequirement",
  "operationalNote",
] as const;

export type AttentionFieldKey = (typeof ATTENTION_FIELD_KEYS)[number];

export interface GuestAttentionProjection {
  required: boolean;
  fieldKeys: AttentionFieldKey[];
}

function attentionFieldsOf(
  guest: Pick<OperationalGuest, AttentionFieldKey>,
): { key: AttentionFieldKey; field: QualifiedField }[] {
  return ATTENTION_FIELD_KEYS.map((key) => ({ key, field: guest[key] }));
}

export function attentionFieldKeysFor(
  guest: Pick<OperationalGuest, AttentionFieldKey | "identityResolution">,
): AttentionFieldKey[] {
  return attentionFieldsOf(guest)
    .filter((item) => item.field.quality === "CONFLICTING" || item.field.quality === "PENDING_VERIFICATION")
    .map((item) => item.key);
}

export function attentionRequiredFor(
  guest: Pick<OperationalGuest, AttentionFieldKey | "identityResolution">,
): boolean {
  if (guest.identityResolution === "DUPLICATE_RISK" || guest.identityResolution === "CONFLICTING") return true;
  return attentionFieldKeysFor(guest).length > 0;
}

export function projectGuestAttention(
  guest: Pick<OperationalGuest, AttentionFieldKey | "identityResolution">,
): GuestAttentionProjection {
  return {
    required: attentionRequiredFor(guest),
    fieldKeys: attentionFieldKeysFor(guest),
  };
}

export interface DuplicateMatch {
  kind: DuplicateMatchKind;
  otherGuestId?: string;
  otherPersonId?: string;
}

function namesSimilar(left: OperationalGuest, right: OperationalGuest): boolean {
  const leftGiven = normalizeName(fieldValue(left.givenName));
  const leftFamily = normalizeName(fieldValue(left.familyName));
  const rightGiven = normalizeName(fieldValue(right.givenName));
  const rightFamily = normalizeName(fieldValue(right.familyName));
  if (!leftGiven || !leftFamily || !rightGiven || !rightFamily) return false;
  return leftGiven === rightGiven && leftFamily === rightFamily;
}

export function findDuplicateMatches(input: {
  candidate: Pick<OperationalGuest, "id" | "eventId" | "givenName" | "familyName" | "email" | "phone">;
  guests: readonly OperationalGuest[];
  persons: readonly Person[];
}): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const email = normalizeEmail(fieldValue(input.candidate.email));
  const phone = normalizePhone(fieldValue(input.candidate.phone));

  for (const guest of input.guests) {
    if (guest.id === input.candidate.id || guest.eventId !== input.candidate.eventId) continue;
    if (guest.lifecycle === "ARCHIVED") continue;
    const otherEmail = normalizeEmail(fieldValue(guest.email));
    const otherPhone = normalizePhone(fieldValue(guest.phone));
    if (email && otherEmail && email === otherEmail) {
      matches.push({ kind: "EXACT_EMAIL", otherGuestId: guest.id });
      continue;
    }
    if (phone && otherPhone && phone === otherPhone) {
      matches.push({ kind: "EXACT_PHONE", otherGuestId: guest.id });
      continue;
    }
    if (namesSimilar(input.candidate as OperationalGuest, guest)) {
      matches.push({ kind: "FUZZY_NAME", otherGuestId: guest.id });
    }
  }

  if (email) {
    for (const person of input.persons) {
      if (normalizeEmail(person.email) === email) {
        matches.push({ kind: "PERSON_EMAIL", otherPersonId: person.id });
      }
    }
  }

  return matches;
}

export function identityResolutionFromMatches(matches: readonly DuplicateMatch[]): OperationalGuest["identityResolution"] {
  const exact = matches.some((item) => item.kind === "EXACT_EMAIL" || item.kind === "EXACT_PHONE");
  if (exact) return "DUPLICATE_RISK";
  if (matches.some((item) => item.kind === "PERSON_EMAIL")) return "UNRESOLVED";
  return "UNRESOLVED";
}
