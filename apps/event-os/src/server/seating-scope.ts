import { authorize, type Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function preferredSeatingAssignment(personId: string, organisationId: string, eventId: string) {
  const assignments = getRuntime()
    .service.resolveActor(personId)
    .assignments.filter((item) => item.status === "ACTIVE" && item.organisationId === organisationId);
  return assignments.find((item) => item.eventId === eventId) ?? assignments.find((item) => !item.eventId);
}

export function seatingPermissions(person: Person, organisationId: string, eventId: string) {
  const actorSnap = getRuntime().service.resolveActor(person.id);
  const scope = { organisationId, eventId };
  const allow = (permission: Parameters<typeof authorize>[0]["permission"]) =>
    authorize({ actor: actorSnap, permission, scope }).allow;
  return {
    view: allow("seating.view"),
    prepare: allow("seating.input.prepare"),
    constraintManage: allow("seating.constraint.manage"),
    ruleActivate: allow("seating.rule.activate"),
    reservationManage: allow("seating.reservation.manage"),
    run: allow("seating.run.execute"),
    edit: allow("seating.plan.edit"),
    submit: allow("seating.plan.submit"),
    approve: allow("seating.plan.approve"),
    publish: allow("seating.plan.publish"),
    exportJob: allow("seating.export"),
    evaluate: allow("seating.evaluate"),
    reviewProtocol: allow("seating.plan.review.protocol"),
    reviewAccessibility: allow("seating.plan.review.accessibility"),
    reviewSecurity: allow("seating.plan.review.security"),
  };
}
