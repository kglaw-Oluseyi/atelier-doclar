import { CEO_RESERVED_ACTIONS, SYSTEM_ROLE_KEYS } from "./constants.js";
import { isCeoRole, isSystemAdministratorRole, permissionsForRole } from "./catalog.js";
import type { Assignment, EventRecord, PermissionKey, Person, Role } from "./schemas.js";

function rolePermissionKeys(key: string): readonly PermissionKey[] {
  if ((SYSTEM_ROLE_KEYS as readonly string[]).includes(key)) {
    return permissionsForRole(key as (typeof SYSTEM_ROLE_KEYS)[number]);
  }
  return [];
}

export type DenyReason =
  | "UNAUTHENTICATED"
  | "PERSON_INACTIVE"
  | "NO_ASSIGNMENT"
  | "ASSIGNMENT_INACTIVE"
  | "ASSIGNMENT_EXPIRED"
  | "PERMISSION_ABSENT"
  | "DENY_OVERRIDE"
  | "SCOPE_MISMATCH"
  | "LINEAGE_UNVERIFIED"
  | "RESERVED_TO_CEO"
  | "IMPERSONATION_FORBIDDEN"
  | "AI_AUTHORITY_FORBIDDEN"
  | "DEFAULT_DENY";

export interface ActorSnapshot {
  person: Person;
  assignments: readonly Assignment[];
  roles: readonly Role[];
}

export interface PolicyScope {
  organisationId: string;
  clientId?: string;
  eventId?: string;
}

export interface PolicyResource {
  type: string;
  id?: string;
  organisationId: string;
  clientId?: string;
  eventId?: string;
}

export interface PolicyContext {
  now?: string;
  event?: EventRecord;
  allowScaffoldedTransitions?: boolean;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
}

export type PolicyDecision =
  | { allow: true; matchedRoleKeys: string[] }
  | { allow: false; reason: DenyReason };

export function assignmentIsActive(assignment: Assignment, now: string): boolean {
  if (assignment.status !== "ACTIVE") return false;
  if (assignment.startsAt && Date.parse(assignment.startsAt) > Date.parse(now)) return false;
  if (assignment.endsAt && Date.parse(assignment.endsAt) <= Date.parse(now)) return false;
  return true;
}

export function assignmentCoversScope(assignment: Assignment, scope: PolicyScope): boolean {
  if (assignment.organisationId !== scope.organisationId) return false;
  if (!scope.clientId && !scope.eventId) return true;
  if (assignment.eventId) {
    if (scope.eventId) return assignment.eventId === scope.eventId;
    if (scope.clientId) return !assignment.clientId || assignment.clientId === scope.clientId;
    return true;
  }
  if (assignment.clientId) {
    if (scope.clientId && assignment.clientId !== scope.clientId) return false;
    return true;
  }
  return true;
}

export function authorize(input: {
  actor?: ActorSnapshot;
  permission: PermissionKey;
  scope: PolicyScope;
  resource?: PolicyResource;
  context?: PolicyContext;
}): PolicyDecision {
  const now = input.context?.now ?? new Date().toISOString();
  if (input.permission === "support.impersonate") {
    return { allow: false, reason: "IMPERSONATION_FORBIDDEN" };
  }
  if (input.context?.actorKind === "AI") {
    return { allow: false, reason: "AI_AUTHORITY_FORBIDDEN" };
  }
  if (!input.actor) return { allow: false, reason: "UNAUTHENTICATED" };
  if (input.actor.person.status !== "ACTIVE") return { allow: false, reason: "PERSON_INACTIVE" };

  if (input.resource) {
    if (input.resource.organisationId !== input.scope.organisationId) {
      return { allow: false, reason: "LINEAGE_UNVERIFIED" };
    }
    if (input.scope.clientId && input.resource.clientId && input.resource.clientId !== input.scope.clientId) {
      return { allow: false, reason: "LINEAGE_UNVERIFIED" };
    }
    if (input.scope.eventId && input.resource.eventId && input.resource.eventId !== input.scope.eventId) {
      return { allow: false, reason: "LINEAGE_UNVERIFIED" };
    }
  }

  const active = input.actor.assignments.filter((item) => assignmentIsActive(item, now));
  if (active.length === 0) return { allow: false, reason: "NO_ASSIGNMENT" };

  const covering = active.filter((item) => assignmentCoversScope(item, input.scope));
  if (covering.length === 0) return { allow: false, reason: "SCOPE_MISMATCH" };

  const matchedRoleKeys: string[] = [];
  let denied = false;
  for (const grant of covering) {
    const role = input.actor.roles.find((item) => item.id === grant.roleId);
    if (!role || role.status !== "ACTIVE") continue;
    if (isSystemAdministratorRole(role.key) && CEO_RESERVED_ACTIONS.includes(input.permission)) {
      denied = true;
      continue;
    }
    if (CEO_RESERVED_ACTIONS.includes(input.permission) && !isCeoRole(role.key)) {
      continue;
    }
    const keys = rolePermissionKeys(role.key);
    if (keys.includes(input.permission)) {
      matchedRoleKeys.push(role.key);
    }
  }

  if (denied && matchedRoleKeys.length === 0) return { allow: false, reason: "RESERVED_TO_CEO" };
  if (matchedRoleKeys.length === 0) return { allow: false, reason: "PERMISSION_ABSENT" };
  return { allow: true, matchedRoleKeys };
}

export function canSeeClient(actor: ActorSnapshot, organisationId: string, clientId: string, now: string): boolean {
  return actor.assignments.some((assignment) => {
    if (!assignmentIsActive(assignment, now) || assignment.organisationId !== organisationId) return false;
    const role = actor.roles.find((item) => item.id === assignment.roleId);
    if (!role) return false;
    if (role.organisationWide) return true;
    if (assignment.clientId) return assignment.clientId === clientId;
    return false;
  });
}

export function canSeeEvent(
  actor: ActorSnapshot,
  event: Pick<EventRecord, "organisationId" | "clientId" | "id">,
  now: string,
): boolean {
  return actor.assignments.some((assignment) => {
    if (!assignmentIsActive(assignment, now) || assignment.organisationId !== event.organisationId) return false;
    const role = actor.roles.find((item) => item.id === assignment.roleId);
    if (!role) return false;
    if (role.organisationWide) return true;
    if (assignment.eventId) return assignment.eventId === event.id;
    if (assignment.clientId) return assignment.clientId === event.clientId;
    return false;
  });
}
