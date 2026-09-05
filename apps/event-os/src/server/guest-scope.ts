import {
  authorize,
  type ActorContext,
  type EventRecord,
  type Organisation,
  type Person,
} from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function resolveScopedEvent(
  actor: ActorContext,
  eventId: string,
): { organisation: Organisation; event: EventRecord } | undefined {
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  for (const organisation of organisations) {
    const events = runtime.service.listEvents(actor, organisation.id);
    const event = events.find((item) => item.id === eventId);
    if (event) return { organisation, event };
  }
  return undefined;
}

export function guestPermissions(person: Person, actor: ActorContext, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "guest.directory.view", scope }).allow,
    intake: authorize({ actor: actorSnap, permission: "guest.intake.create", scope }).allow,
    amend: authorize({ actor: actorSnap, permission: "guest.record.amend", scope }).allow,
    resolveDuplicate: authorize({ actor: actorSnap, permission: "guest.duplicate.resolve", scope }).allow,
    linkPerson: authorize({ actor: actorSnap, permission: "guest.person.link", scope }).allow,
    rsvpView: authorize({ actor: actorSnap, permission: "rsvp.directory.view", scope }).allow,
    rsvpManage: authorize({ actor: actorSnap, permission: "rsvp.policy.manage", scope }).allow,
    rsvpInvite: authorize({ actor: actorSnap, permission: "rsvp.invitation.manage", scope }).allow,
    rsvpAmend: authorize({ actor: actorSnap, permission: "rsvp.response.amend", scope }).allow,
    rsvpReview: authorize({ actor: actorSnap, permission: "rsvp.exception.review", scope }).allow,
  };
  void actor;
}
