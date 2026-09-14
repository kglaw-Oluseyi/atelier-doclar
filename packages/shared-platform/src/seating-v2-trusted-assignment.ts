import { CEO_RESERVED_ACTIONS, SYSTEM_ROLE_KEYS } from "./constants.js";
import { isCeoRole, isSystemAdministratorRole, permissionsForRole } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { assignmentIsActive, type ActorSnapshot } from "./policy.js";
import type { Assignment, EventRecord, PermissionKey } from "./schemas.js";

function rolePermissionKeys(key: string): readonly PermissionKey[] {
  if ((SYSTEM_ROLE_KEYS as readonly string[]).includes(key)) {
    return permissionsForRole(key as (typeof SYSTEM_ROLE_KEYS)[number]);
  }
  return [];
}

export function resolveTrustedSeatingAssignment(
  actor: ActorSnapshot,
  event: Pick<EventRecord, "id" | "organisationId" | "clientId">,
  now: string,
): Assignment {
  const active = actor.assignments.filter((item) => assignmentIsActive(item, now) && item.organisationId === event.organisationId);
  const exact = active.filter((item) => item.eventId === event.id);
  const client = active.filter((item) => !item.eventId && item.clientId === event.clientId);
  const orgWide = active.filter((item) => {
    if (item.eventId || item.clientId) return false;
    const role = actor.roles.find((entry) => entry.id === item.roleId);
    return role?.status === "ACTIVE" && role.organisationWide === true;
  });
  const band = exact.length ? exact : client.length ? client : orgWide;
  if (band.length !== 1) {
    throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
  }
  return band[0]!;
}

export function seatingAssignmentAllowsPermission(actor: ActorSnapshot, assignment: Assignment, permission: PermissionKey): boolean {
  if (permission === "support.impersonate") return false;
  const role = actor.roles.find((item) => item.id === assignment.roleId);
  if (!role || role.status !== "ACTIVE") return false;
  if (isSystemAdministratorRole(role.key) && CEO_RESERVED_ACTIONS.includes(permission)) return false;
  if (CEO_RESERVED_ACTIONS.includes(permission) && !isCeoRole(role.key)) return false;
  return rolePermissionKeys(role.key).includes(permission);
}
