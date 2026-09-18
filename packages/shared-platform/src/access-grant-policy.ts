import { isSystemAdministratorRole } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { assignmentIsActive, type ActorSnapshot } from "./policy.js";
import { DEPARTMENT_SCOPE_BLOCKER } from "./permission-registry.js";
import { actorHasCeoOrganisationWide } from "./risk-command.js";
import type { PermissionKey, SystemRoleKey } from "./schemas.js";

const ORGANISATION_WIDE_ROLES = new Set<SystemRoleKey>(["CEO", "SYSTEM_ADMINISTRATOR", "READ_ONLY_AUDITOR"]);

export function assertAssignmentScopeForRole(input: {
  roleKey: SystemRoleKey;
  clientId?: string;
  eventId?: string;
}): void {
  if (input.roleKey === "DEPARTMENT_LEAD") {
    throw new PlatformError(
      "VALIDATION_FAILED",
      `Department Lead cannot become operational. Missing ${DEPARTMENT_SCOPE_BLOCKER.missingFields.join(", ")}.`,
      { publicMessage: "Department Lead assignments are blocked until a real department identifier exists." },
    );
  }
  if (ORGANISATION_WIDE_ROLES.has(input.roleKey) && (input.clientId || input.eventId)) {
    throw new PlatformError("VALIDATION_FAILED", `${input.roleKey} assignments must be organisation-wide`, {
      publicMessage: "This role cannot be limited to a client or event.",
    });
  }
  if ((input.roleKey === "PLANNER" || input.roleKey === "EVENT_DIRECTOR") && !input.eventId) {
    throw new PlatformError("VALIDATION_FAILED", `${input.roleKey} assignments must be event-scoped`);
  }
  if (input.roleKey === "CLIENT_LEAD" && (!input.clientId || input.eventId)) {
    throw new PlatformError("VALIDATION_FAILED", "Client Lead assignments must be client-scoped");
  }
  if (input.roleKey === "RISK_GOVERNANCE_REVIEWER" && !input.clientId && !input.eventId) {
    throw new PlatformError("VALIDATION_FAILED", "Risk Governance Reviewer requires a client, event or governance mandate");
  }
}

function activeRole(
  actor: ActorSnapshot,
  organisationId: string,
  now: string,
  match: (roleKey: string, assignment: ActorSnapshot["assignments"][number]) => boolean,
): boolean {
  return actor.assignments.some((assignment) => {
    if (!assignmentIsActive(assignment, now) || assignment.organisationId !== organisationId) return false;
    const role = actor.roles.find((item) => item.id === assignment.roleId);
    if (!role || role.status !== "ACTIVE") return false;
    return match(role.key, assignment);
  });
}

/** Permission that must already be held before a grant or revocation is attempted. */
export function grantPermissionFor(input: {
  actor: ActorSnapshot;
  roleKey: SystemRoleKey;
  organisationId: string;
  clientId?: string;
  eventId?: string;
  now: string;
}): PermissionKey {
  assertAssignmentScopeForRole(input);
  const ceo = actorHasCeoOrganisationWide(input.actor, input.organisationId, input.now);
  if (input.roleKey === "CEO" || input.roleKey === "SYSTEM_ADMINISTRATOR" || input.roleKey === "EVENT_DIRECTOR") {
    if (!ceo) throw new PlatformError("FORBIDDEN", "only an active organisation-wide CEO may grant this role");
    return "platform.access.administer";
  }
  if (ceo) return "platform.access.administer";
  const admin = activeRole(input.actor, input.organisationId, input.now, (key, assignment) =>
    isSystemAdministratorRole(key) && !assignment.clientId && !assignment.eventId,
  );
  if (admin) return "platform.access.administer";
  const director =
    input.roleKey === "PLANNER" &&
    input.eventId &&
    activeRole(
      input.actor,
      input.organisationId,
      input.now,
      (key, assignment) => key === "EVENT_DIRECTOR" && assignment.eventId === input.eventId,
    );
  if (director) return "event.update";
  throw new PlatformError("FORBIDDEN", "this assignment cannot grant access");
}

export function revokePermissionFor(input: {
  actor: ActorSnapshot;
  targetRoleKey: SystemRoleKey | undefined;
  targetEventId?: string;
  organisationId: string;
  now: string;
}): PermissionKey {
  if (!input.targetRoleKey) return "platform.access.administer";
  if (input.targetRoleKey === "CEO" || input.targetRoleKey === "SYSTEM_ADMINISTRATOR" || input.targetRoleKey === "EVENT_DIRECTOR") {
    if (!actorHasCeoOrganisationWide(input.actor, input.organisationId, input.now)) {
      throw new PlatformError("FORBIDDEN", "only an active organisation-wide CEO may revoke this role");
    }
    return "platform.access.administer";
  }
  if (actorHasCeoOrganisationWide(input.actor, input.organisationId, input.now)) return "platform.access.administer";
  const admin = activeRole(input.actor, input.organisationId, input.now, (key, assignment) =>
    isSystemAdministratorRole(key) && !assignment.clientId && !assignment.eventId,
  );
  if (admin) return "platform.access.administer";
  if (
    input.targetRoleKey === "PLANNER" &&
    input.targetEventId &&
    activeRole(
      input.actor,
      input.organisationId,
      input.now,
      (key, assignment) => key === "EVENT_DIRECTOR" && assignment.eventId === input.targetEventId,
    )
  ) {
    return "event.update";
  }
  throw new PlatformError("FORBIDDEN", "this assignment cannot revoke access");
}
