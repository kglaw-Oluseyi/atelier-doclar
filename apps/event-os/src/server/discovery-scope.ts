import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function discoveryPermissions(person: Person, organisationId: string) {
  const actorSnap = getRuntime().service.resolveActor(person.id);
  const scope = { organisationId };
  return {
    view: authorize({ actor: actorSnap, permission: "engagement.view", scope }).allow,
    create: authorize({ actor: actorSnap, permission: "engagement.create", scope }).allow,
    update: authorize({ actor: actorSnap, permission: "engagement.update", scope }).allow,
    manageSession: authorize({ actor: actorSnap, permission: "discovery.session.manage", scope }).allow,
    manageSource: authorize({ actor: actorSnap, permission: "discovery.source.manage", scope }).allow,
    review: authorize({ actor: actorSnap, permission: "discovery.assertion.review", scope }).allow,
  };
}

export function resolveDiscoveryOrganisation(actor: ActorContext) {
  return getRuntime().service.listOrganisations(actor)[0];
}
