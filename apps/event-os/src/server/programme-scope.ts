import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { resolveScopedEvent } from "./guest-scope";

export function programmePermissions(person: Person, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "programme.view", scope }).allow,
    managePhase: authorize({ actor: actorSnap, permission: "programme.phase.manage", scope }).allow,
    manageRoute: authorize({ actor: actorSnap, permission: "programme.route.manage", scope }).allow,
    manageCheckpoint: authorize({ actor: actorSnap, permission: "programme.checkpoint.manage", scope }).allow,
    manageEntitlement: authorize({ actor: actorSnap, permission: "programme.entitlement.manage", scope }).allow,
    grantProtected: authorize({ actor: actorSnap, permission: "programme.protectedAccess.grant", scope }).allow,
    manageVehicle: authorize({ actor: actorSnap, permission: "programme.vehicle.manage", scope }).allow,
    publish: authorize({ actor: actorSnap, permission: "programme.accessPlan.publish", scope }).allow,
    reviewException: authorize({ actor: actorSnap, permission: "programme.exception.review", scope }).allow,
  };
}

export function resolveProgrammeEvent(actor: ActorContext, eventId: string) {
  return resolveScopedEvent(actor, eventId);
}
