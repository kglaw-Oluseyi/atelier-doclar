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
    convert: authorize({ actor: actorSnap, permission: "engagement.convert", scope }).allow,
    briefAuthor: authorize({ actor: actorSnap, permission: "brief.author", scope }).allow,
    briefSubmit: authorize({ actor: actorSnap, permission: "brief.submit", scope }).allow,
    briefDecide: authorize({ actor: actorSnap, permission: "brief.decide", scope }).allow,
    briefPublish: authorize({ actor: actorSnap, permission: "brief.publish", scope }).allow,
    budgetCalculate: authorize({ actor: actorSnap, permission: "budget.calculate", scope }).allow,
    budgetDecide: authorize({ actor: actorSnap, permission: "budget.decide", scope }).allow,
    roadmapAuthor: authorize({ actor: actorSnap, permission: "roadmap.author", scope }).allow,
    changeTriage: authorize({ actor: actorSnap, permission: "change.triage", scope }).allow,
    changeDecide: authorize({ actor: actorSnap, permission: "change.decide", scope }).allow,
    command: authorize({ actor: actorSnap, permission: "executiveCommand.view", scope }).allow,
  };
}

export function resolveDiscoveryOrganisation(actor: ActorContext) {
  return getRuntime().service.listOrganisations(actor)[0];
}
