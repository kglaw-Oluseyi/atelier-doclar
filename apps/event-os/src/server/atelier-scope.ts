import type { ActorContext } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function resolveAtelierEvent(actor: ActorContext, eventId: string) {
  const organisations = getRuntime().service.listOrganisations(actor);
  for (const organisation of organisations) {
    const event = getRuntime().service.listEvents(actor, organisation.id).find((item) => item.id === eventId);
    if (event) return { organisation, event };
  }
  return undefined;
}
