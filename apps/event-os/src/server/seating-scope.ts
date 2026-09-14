import {
  authorize,
  resolveTrustedSeatingAssignment,
  seatingAssignmentAllowsPermission,
  type Person,
} from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";

export function preferredSeatingAssignment(personId: string, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const event = runtime.store.loadEventById(eventId);
  if (!event || event.organisationId !== organisationId) return undefined;
  const people = runtime.service.resolveActor(personId);
  try {
    return resolveTrustedSeatingAssignment(people, event, new Date().toISOString());
  } catch {
    return undefined;
  }
}

export function seatingPermissions(person: Person, organisationId: string, eventId: string) {
  const runtime = getRuntime();
  const event = runtime.store.loadEventById(eventId);
  const actorSnap = runtime.service.resolveActor(person.id);
  const now = new Date().toISOString();
  const allow = (permission: Parameters<typeof authorize>[0]["permission"]) => {
    if (!event || event.organisationId !== organisationId) return false;
    try {
      const assignment = resolveTrustedSeatingAssignment(actorSnap, event, now);
      return seatingAssignmentAllowsPermission(actorSnap, assignment, permission);
    } catch {
      return false;
    }
  };
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
    fixtureVerifyAs: allow("seating.fixture_verify_as"),
  };
}
