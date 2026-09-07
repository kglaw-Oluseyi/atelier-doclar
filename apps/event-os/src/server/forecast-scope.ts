import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { resolveScopedEvent } from "./guest-scope";

export function forecastPermissions(person: Person, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "forecast.detail.view", scope }).allow,
    run: authorize({ actor: actorSnap, permission: "forecast.run", scope }).allow,
    host: authorize({ actor: actorSnap, permission: "forecast.hostProjection.view", scope }).allow,
    proposeOverride: authorize({ actor: actorSnap, permission: "forecast.override.propose", scope }).allow,
    approveOverride: authorize({ actor: actorSnap, permission: "forecast.override.approve", scope }).allow,
    proposeProvision: authorize({ actor: actorSnap, permission: "provision.propose", scope }).allow,
    approveProvision: authorize({ actor: actorSnap, permission: "provision.approve", scope }).allow,
    manageParameters: authorize({ actor: actorSnap, permission: "model.parameters.manage", scope }).allow,
    evaluate: authorize({ actor: actorSnap, permission: "model.evaluate", scope }).allow,
    audit: authorize({ actor: actorSnap, permission: "forecast.audit.view", scope }).allow,
  };
}

export function resolveForecastEvent(actor: ActorContext, eventId: string) {
  return resolveScopedEvent(actor, eventId);
}
