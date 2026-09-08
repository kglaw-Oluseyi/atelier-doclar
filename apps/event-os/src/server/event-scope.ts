import type { ActorContext, Person } from "@maison-doclar/shared-platform";
import { eventPermissionsFromActor } from "./event-permissions";
import { getRuntime } from "./runtime";

export { eventPermissionsFromActor } from "./event-permissions";

export function eventPermissions(
  person: Person,
  organisationId: string,
  options?: { clientId?: string; eventId?: string },
) {
  return eventPermissionsFromActor(getRuntime().service.resolveActor(person.id), organisationId, options);
}

export function actorCanCreateEvent(person: Person, actor: ActorContext, organisationId: string, clientId?: string) {
  return eventPermissions(person, organisationId, { clientId }).create;
  void actor;
}
