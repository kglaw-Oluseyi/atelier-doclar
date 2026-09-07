import { authorize, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { resolveScopedEvent } from "./guest-scope";

export function languagePermissions(person: Person, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "language.preference.view", scope }).allow,
    managePreference: authorize({ actor: actorSnap, permission: "language.preference.manage", scope }).allow,
    createCultural: authorize({ actor: actorSnap, permission: "language.cultural.create", scope }).allow,
    approveCultural: authorize({ actor: actorSnap, permission: "language.cultural.approve", scope }).allow,
    createTranslation: authorize({ actor: actorSnap, permission: "language.translation.create", scope }).allow,
    approveTranslation: authorize({ actor: actorSnap, permission: "language.translation.approve", scope }).allow,
    manageEdition: authorize({ actor: actorSnap, permission: "language.edition.manage", scope }).allow,
    publishEdition: authorize({ actor: actorSnap, permission: "language.edition.publish", scope }).allow,
    previewAssembly: authorize({ actor: actorSnap, permission: "language.assembly.preview", scope }).allow,
    manageGlossary: authorize({ actor: actorSnap, permission: "language.glossary.manage", scope }).allow,
    audit: authorize({ actor: actorSnap, permission: "language.audit.view", scope }).allow,
  };
}

export function resolveLanguageEvent(actor: ActorContext, eventId: string) {
  return resolveScopedEvent(actor, eventId);
}
