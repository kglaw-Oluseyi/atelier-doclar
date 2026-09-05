import { guestPermissions, resolveScopedEvent } from "./guest-scope";
import { guardedActor } from "./guard";

export async function loadCommunicationsPage(eventId: string) {
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return { denied: "The requested event is not available in this assignment." as const, actor, person };
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  if (!permissions.msgView && !permissions.msgAnalytics && !permissions.msgCampaign) {
    return { denied: "Your assignment does not include communications visibility." as const, actor, person, scoped };
  }
  return { actor, person, scoped, permissions };
}
