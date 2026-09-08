import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { resolveScopedEvent } from "./guest-scope";

export function venuePermissions(person: Person, organisationId: string, eventId?: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "venue.registry.view", scope }).allow,
    create: authorize({ actor: actorSnap, permission: "venue.record.create", scope }).allow,
    update: authorize({ actor: actorSnap, permission: "venue.record.update", scope }).allow,
    recordFact: authorize({ actor: actorSnap, permission: "venue.fact.record", scope }).allow,
    verifyFact: authorize({ actor: actorSnap, permission: "venue.fact.verify", scope }).allow,
    adopt: authorize({ actor: actorSnap, permission: "venue.adopt", scope }).allow,
    override: authorize({ actor: actorSnap, permission: "venue.event.override", scope }).allow,
    viewLayout: authorize({ actor: actorSnap, permission: "layout.view", scope }).allow,
    createLayout: authorize({ actor: actorSnap, permission: "layout.create", scope }).allow,
    updateLayout: authorize({ actor: actorSnap, permission: "layout.update", scope }).allow,
  };
}

export function resolveVenueEvent(actor: ActorContext, eventId: string) {
  return resolveScopedEvent(actor, eventId);
}

export function resolveVenueOrganisation(actor: ActorContext) {
  return getRuntime().service.listOrganisations(actor)[0];
}
