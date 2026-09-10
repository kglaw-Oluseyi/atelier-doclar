import type { ActorContext, MsgChannel, PlatformService } from "@maison-doclar/shared-platform";
import { DEFAULT_TIMEZONE, SYSTEM_ROLE_KEYS, fieldValue, renderFamiliarName } from "@maison-doclar/shared-platform";
import type { UnmatchedGuestOption } from "../components/unmatched-resolution-form";

type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

const OPERATIONAL_TIME_ZONE = DEFAULT_TIMEZONE;

/** Human-readable governed role label. Never return a raw role key. */
export function governedRoleLabel(roleKey: SystemRoleKey): string {
  switch (roleKey) {
    case "CEO":
      return "CEO";
    case "EVENT_DIRECTOR":
      return "Event Director";
    case "CLIENT_LEAD":
      return "Client Lead";
    case "DEPARTMENT_LEAD":
      return "Department Lead";
    case "PLANNER":
      return "Planner";
    case "SYSTEM_ADMINISTRATOR":
      return "System Administrator";
    case "READ_ONLY_AUDITOR":
      return "Read-only Auditor";
    case "RISK_GOVERNANCE_REVIEWER":
      return "Risk Governance Reviewer";
    default: {
      const _exhaustive: never = roleKey;
      return _exhaustive;
    }
  }
}

/** Locale- and time-zone-safe operational timestamp. Africa/Lagos, en-GB. */
export function formatOperationalTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: OPERATIONAL_TIME_ZONE,
  }).format(parsed);
}

export function channelLabel(channel: MsgChannel): string {
  switch (channel) {
    case "EMAIL":
      return "Email";
    case "SMS":
      return "SMS";
    case "WHATSAPP":
      return "WhatsApp";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/** Human-readable staff name without exposing person ids or external subjects. */
export function staffDisplayName(service: PlatformService, personId: string | undefined): string {
  if (!personId) return "Author unavailable";
  try {
    return service.resolveActor(personId).person.displayName;
  } catch {
    return "Author unavailable";
  }
}

/** Mask an email for operator identification without revealing the full address. */
export function maskedEmail(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "Email on file";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  return `${local.charAt(0) || "*"}***${domain}`;
}

/** Mask a phone number for operator identification without revealing the full number. */
export function maskedPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "Phone on file";
  return `***${digits.slice(-4)}`;
}

/** Choose a safely masked contact hint from guest or projection values. */
export function maskedContactHint(input: {
  email?: string;
  phone?: string;
  projectionDisplay?: string;
}): string | undefined {
  if (input.email) return maskedEmail(input.email);
  if (input.phone) return maskedPhone(input.phone);
  if (input.projectionDisplay) {
    return input.projectionDisplay.includes("@")
      ? maskedEmail(input.projectionDisplay)
      : maskedPhone(input.projectionDisplay);
  }
  return undefined;
}

/** Event-scoped guest choices for unmatched linking and correction proposals. */
export function eventGuestOptions(
  service: PlatformService,
  actor: ActorContext,
  organisationId: string,
  eventId: string,
): UnmatchedGuestOption[] {
  const guests = service.listGuests(actor, { organisationId, eventId, lifecycle: "ACTIVE" });
  const snap = service.currentSnapshot();
  return guests.map((guest) => {
    const email = fieldValue(guest.email);
    const phone = fieldValue(guest.phone);
    const projection = snap.contactProjections.find((item) => item.guestId === guest.id && item.channel === "EMAIL");
    const contactHint =
      maskedContactHint({
        email,
        phone,
        projectionDisplay: projection?.displayValue,
      }) ?? "Contact not supplied";
    return {
      id: guest.id,
      displayName: renderFamiliarName(guest).text,
      contactHint,
    };
  });
}
