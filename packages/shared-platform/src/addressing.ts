import { CHILD_AGE_BANDS } from "./constants.js";
import type {
  AgeBand,
  ChildReadiness,
  CompanionEntitlement,
  CompanionEntitlementStatus,
  GuestAddressing,
  GuestParty,
  GuestPartyMember,
} from "./addressing-schemas.js";
import type { OperationalGuest } from "./guest-schemas.js";
import { fieldValue } from "./guest-matching.js";

export type SalutationKind = "FORMAL" | "FAMILIAR" | "SAFE_FALLBACK";

export interface RenderedSalutation {
  kind: SalutationKind;
  text: string;
  usedPreferredFormal: boolean;
  inferredTitle: false;
}

const CONFIRMED_ADDRESSING = new Set(["GUEST_CONFIRMED", "HOST_CONFIRMED", "PROTOCOL_CONFIRMED"]);

const ENTITLEMENT_TRANSITIONS: Record<CompanionEntitlementStatus, readonly CompanionEntitlementStatus[]> = {
  AVAILABLE: ["NOMINATED", "DECLINED", "EXPIRED", "REVOKED", "EXCEPTION_REVIEW"],
  NOMINATED: ["CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED", "REVOKED", "EXCEPTION_REVIEW"],
  CONFIRMED: ["WITHDRAWN", "EXPIRED", "REVOKED", "EXCEPTION_REVIEW"],
  DECLINED: ["AVAILABLE", "EXCEPTION_REVIEW"],
  WITHDRAWN: ["AVAILABLE", "EXCEPTION_REVIEW"],
  EXPIRED: ["AVAILABLE", "EXCEPTION_REVIEW"],
  REVOKED: ["EXCEPTION_REVIEW"],
  EXCEPTION_REVIEW: ["AVAILABLE", "NOMINATED", "CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED", "REVOKED"],
};

export function requiresResponsibleAdult(ageBand: AgeBand | undefined): boolean {
  return ageBand !== undefined && (CHILD_AGE_BANDS as readonly string[]).includes(ageBand);
}

export function childReadinessFor(input: {
  ageBand?: AgeBand;
  hasActiveResponsibleAdult: boolean;
}): ChildReadiness | undefined {
  if (!requiresResponsibleAdult(input.ageBand)) return undefined;
  if (input.hasActiveResponsibleAdult) return "READY_FOR_EVENT";
  return "BLOCKED_MISSING_RESPONSIBLE_ADULT";
}

export function assertNoInferredTitle(addressing: GuestAddressing | undefined): void {
  if (!addressing) return;
  if (addressing.honorific && addressing.addressingSource === undefined) {
    throw new Error("titles must be explicit structured data");
  }
}

export function composeStoredName(input: {
  givenName?: string;
  middleNames?: string;
  familyName?: string;
  addressing?: GuestAddressing;
}): string {
  const parts = [
    input.addressing?.traditionalTitle?.trim(),
    input.addressing?.honorific,
    input.addressing?.professionalTitle?.trim(),
    input.givenName?.trim(),
    input.addressing?.middleNames?.trim(),
    input.familyName?.trim(),
    input.addressing?.postNominals?.join(" "),
  ].filter((part): part is string => Boolean(part && part.length > 0));
  return parts.join(" ");
}

export function renderGuestSalutation(guest: Pick<OperationalGuest, "givenName" | "familyName" | "preferredName" | "addressing">): RenderedSalutation {
  const addressing = guest.addressing;
  const preferredFormal = addressing?.preferredFormalSalutation?.trim();
  if (preferredFormal && addressing && CONFIRMED_ADDRESSING.has(addressing.addressingStatus)) {
    return {
      kind: "FORMAL",
      text: preferredFormal,
      usedPreferredFormal: true,
      inferredTitle: false,
    };
  }

  const given = fieldValue(guest.givenName);
  const family = fieldValue(guest.familyName);
  const preferred = fieldValue(guest.preferredName);
  const composed = composeStoredName({
    givenName: given,
    familyName: family,
    addressing,
  });
  if (composed) {
    return {
      kind: addressing && (addressing.honorific || addressing.traditionalTitle || addressing.professionalTitle)
        ? "FORMAL"
        : "SAFE_FALLBACK",
      text: composed,
      usedPreferredFormal: false,
      inferredTitle: false,
    };
  }

  const familiar = addressing?.preferredDisplayName?.trim() || preferred || given || family || "Guest";
  return {
    kind: "SAFE_FALLBACK",
    text: familiar,
    usedPreferredFormal: false,
    inferredTitle: false,
  };
}

export function renderFamiliarName(guest: Pick<OperationalGuest, "givenName" | "familyName" | "preferredName" | "addressing">): RenderedSalutation {
  const preferredDisplay = guest.addressing?.preferredDisplayName?.trim();
  const preferred = fieldValue(guest.preferredName);
  const given = fieldValue(guest.givenName);
  const family = fieldValue(guest.familyName);
  return {
    kind: "FAMILIAR",
    text: preferredDisplay || preferred || [given, family].filter(Boolean).join(" ") || "Guest",
    usedPreferredFormal: false,
    inferredTitle: false,
  };
}

export function unnamedAllowanceHasNoGuest(entitlement: CompanionEntitlement): boolean {
  if (entitlement.status === "AVAILABLE" || entitlement.status === "DECLINED" || entitlement.status === "EXPIRED") {
    return entitlement.nominatedGuestId === undefined;
  }
  return true;
}

export function partyIsNotIdentity(party: GuestParty, member: GuestPartyMember): boolean {
  return party.id !== member.guestId && member.partyId === party.id;
}

export function allowedEntitlementTransitions(
  from: CompanionEntitlementStatus,
): readonly CompanionEntitlementStatus[] {
  return ENTITLEMENT_TRANSITIONS[from] ?? [];
}

export function entitlementTransitionAllowed(
  from: CompanionEntitlementStatus,
  to: CompanionEntitlementStatus,
): boolean {
  return allowedEntitlementTransitions(from).includes(to);
}

export function allowanceExceedsAuthority(input: {
  requested: number;
  authorised: number;
}): boolean {
  return input.requested > input.authorised;
}

export function dateOfBirthForbidden(payload: Record<string, unknown>): boolean {
  return "dateOfBirth" in payload || "dob" in payload || "birthDate" in payload;
}
