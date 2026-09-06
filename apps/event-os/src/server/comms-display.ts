import type { ActorContext, PlatformService } from "@maison-doclar/shared-platform";
import { fieldValue, operationalDisplayName } from "@maison-doclar/shared-platform";
import type { UnmatchedGuestOption } from "../components/unmatched-resolution-form";

/** Human-readable staff name without exposing person ids or external subjects. */
export function staffDisplayName(service: PlatformService, personId: string | undefined): string {
  if (!personId) return "Author unavailable";
  try {
    return service.resolveActor(personId).person.displayName;
  } catch {
    return "Author unavailable";
  }
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
    const contactHint = projection?.displayValue ?? email ?? phone ?? "Contact not supplied";
    return {
      id: guest.id,
      displayName: operationalDisplayName(guest),
      contactHint,
    };
  });
}
