import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { resolveScopedEvent } from "./guest-scope";

export function merchandisePermissions(person: Person, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "merch.collection.view", scope }).allow,
    manageCollection: authorize({ actor: actorSnap, permission: "merch.collection.manage", scope }).allow,
    manageOffer: authorize({ actor: actorSnap, permission: "merch.offer.manage", scope }).allow,
    sponsor: authorize({ actor: actorSnap, permission: "merch.offer.sponsor", scope }).allow,
    manageParticipation: authorize({ actor: actorSnap, permission: "merch.participation.manage", scope }).allow,
    manageCap: authorize({ actor: actorSnap, permission: "merch.capMeasurement.manage", scope }).allow,
    viewFulfilment: authorize({ actor: actorSnap, permission: "merch.fulfilment.view", scope }).allow,
    manageVendor: authorize({ actor: actorSnap, permission: "merch.vendorAssignment.manage", scope }).allow,
    review: authorize({ actor: actorSnap, permission: "merch.exception.review", scope }).allow,
  };
}

export function resolveMerchandiseEvent(actor: ActorContext, eventId: string) {
  return resolveScopedEvent(actor, eventId);
}
