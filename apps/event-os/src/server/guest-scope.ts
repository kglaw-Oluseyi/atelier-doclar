import {
  authorize,
  type ActorContext,
  type EventRecord,
  type Organisation,
  type Person,
} from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function resolveScopedEvent(
  actor: ActorContext,
  eventId: string,
): { organisation: Organisation; event: EventRecord } | undefined {
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  for (const organisation of organisations) {
    const events = runtime.service.listEvents(actor, organisation.id);
    const event = events.find((item) => item.id === eventId);
    if (event) return { organisation, event };
  }
  return undefined;
}

export function guestPermissions(person: Person, actor: ActorContext, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  return {
    view: authorize({ actor: actorSnap, permission: "guest.directory.view", scope }).allow,
    intake: authorize({ actor: actorSnap, permission: "guest.intake.create", scope }).allow,
    amend: authorize({ actor: actorSnap, permission: "guest.record.amend", scope }).allow,
    resolveDuplicate: authorize({ actor: actorSnap, permission: "guest.duplicate.resolve", scope }).allow,
    linkPerson: authorize({ actor: actorSnap, permission: "guest.person.link", scope }).allow,
    rsvpView: authorize({ actor: actorSnap, permission: "rsvp.directory.view", scope }).allow,
    rsvpManage: authorize({ actor: actorSnap, permission: "rsvp.policy.manage", scope }).allow,
    rsvpInvite: authorize({ actor: actorSnap, permission: "rsvp.invitation.manage", scope }).allow,
    rsvpAmend: authorize({ actor: actorSnap, permission: "rsvp.response.amend", scope }).allow,
    rsvpReview: authorize({ actor: actorSnap, permission: "rsvp.exception.review", scope }).allow,
    msgView: authorize({ actor: actorSnap, permission: "msg.inbox.view", scope }).allow,
    msgPolicy: authorize({ actor: actorSnap, permission: "msg.policy.manage", scope }).allow,
    msgTemplate: authorize({ actor: actorSnap, permission: "msg.template.manage", scope }).allow,
    msgTemplatePublish: authorize({ actor: actorSnap, permission: "msg.template.publish", scope }).allow,
    msgAudience: authorize({ actor: actorSnap, permission: "msg.audience.manage", scope }).allow,
    msgCampaign: authorize({ actor: actorSnap, permission: "msg.campaign.manage", scope }).allow,
    msgApprove: authorize({ actor: actorSnap, permission: "msg.campaign.approve", scope }).allow,
    msgRun: authorize({ actor: actorSnap, permission: "msg.campaign.run", scope }).allow,
    msgRespond: authorize({ actor: actorSnap, permission: "msg.inbox.respond", scope }).allow,
    msgAssign: authorize({ actor: actorSnap, permission: "msg.inbox.assign", scope }).allow,
    msgUnmatched: authorize({ actor: actorSnap, permission: "msg.inbound.unmatched.resolve", scope }).allow,
    msgTask: authorize({ actor: actorSnap, permission: "msg.task.manage", scope }).allow,
    msgCorrection: authorize({ actor: actorSnap, permission: "msg.contactCorrection.review", scope }).allow,
    msgAnalytics: authorize({ actor: actorSnap, permission: "msg.analytics.view", scope }).allow,
  };
  void actor;
}
