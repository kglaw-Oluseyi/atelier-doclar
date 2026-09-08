import { authorize, type ActorSnapshot } from "@maison-doclar/shared-platform";

export function eventPermissionsFromActor(
  actorSnap: ActorSnapshot,
  organisationId: string,
  options?: { clientId?: string; eventId?: string },
) {
  const scope = {
    organisationId,
    clientId: options?.clientId,
    eventId: options?.eventId,
  };
  return {
    list: authorize({ actor: actorSnap, permission: "event.list", scope }).allow,
    view: authorize({ actor: actorSnap, permission: "event.view", scope }).allow,
    create: authorize({ actor: actorSnap, permission: "event.create", scope }).allow,
    update: authorize({ actor: actorSnap, permission: "event.update", scope }).allow,
    transition: authorize({ actor: actorSnap, permission: "event.phase.transition", scope }).allow,
  };
}
