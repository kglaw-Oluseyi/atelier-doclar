import { CEO_RESERVED_ACTIONS, SYSTEM_ROLE_KEYS } from "./constants.js";
import { isCeoRole, isSystemAdministratorRole, permissionsForRole } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { permissionPolicy } from "./permission-registry.js";
import type { Assignment, EventRecord, PermissionKey, Person, Role, SystemRoleKey } from "./schemas.js";

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
  | "DEPARTMENT_SCOPE_UNAVAILABLE"
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
  let departmentBlocked = false;
  let lineageDenied = false;
  for (const grant of covering) {
    const role = input.actor.roles.find((item) => item.id === grant.roleId);
    if (!role || role.status !== "ACTIVE") continue;
    const keys = rolePermissionKeys(role.key);
    if (role.key === "DEPARTMENT_LEAD") {
      if (keys.includes(input.permission)) departmentBlocked = true;
      continue;
    }
    if (!assignmentAuthorizesRole(role, grant, input.scope, input.context, input.permission)) {
      if (role.key === "CLIENT_LEAD" && keys.includes(input.permission) && input.scope.eventId) lineageDenied = true;
      continue;
    }
    if (isSystemAdministratorRole(role.key) && CEO_RESERVED_ACTIONS.includes(input.permission)) {
      denied = true;
      continue;
    }
    if (CEO_RESERVED_ACTIONS.includes(input.permission) && !isCeoRole(role.key)) {
      continue;
    }
    if (keys.includes(input.permission)) {
      matchedRoleKeys.push(role.key);
    }
  }

  if (denied && matchedRoleKeys.length === 0) return { allow: false, reason: "RESERVED_TO_CEO" };
  if (matchedRoleKeys.length === 0 && departmentBlocked) return { allow: false, reason: "DEPARTMENT_SCOPE_UNAVAILABLE" };
  if (matchedRoleKeys.length === 0 && lineageDenied) return { allow: false, reason: "LINEAGE_UNVERIFIED" };
  if (matchedRoleKeys.length === 0) return { allow: false, reason: "PERMISSION_ABSENT" };
  return { allow: true, matchedRoleKeys };
}

function assignmentAuthorizesRole(
  role: Role,
  assignment: Assignment,
  scope: PolicyScope,
  context: PolicyContext | undefined,
  permission: PermissionKey,
): boolean {
  if (isCeoRole(role.key)) {
    return Boolean(role.organisationWide && !assignment.clientId && !assignment.eventId);
  }
  if (isSystemAdministratorRole(role.key) || role.key === "READ_ONLY_AUDITOR") {
    return !assignment.clientId && !assignment.eventId;
  }
  if (role.key === "PLANNER" || role.key === "EVENT_DIRECTOR") {
    if (!assignment.eventId) return false;
    if (scope.eventId && assignment.eventId !== scope.eventId) return false;
    const policy = permissionPolicy(permission);
    if ((policy.requiredScope === "EVENT" || policy.requiredScope === "DEPARTMENT") && scope.eventId && assignment.eventId !== scope.eventId) {
      return false;
    }
    return true;
  }
  if (role.key === "CLIENT_LEAD") {
    if (!assignment.clientId || assignment.eventId) return false;
    if (scope.clientId && assignment.clientId !== scope.clientId) return false;
    if (scope.eventId) {
      const event = context?.event;
      if (!event || event.id !== scope.eventId || event.organisationId !== scope.organisationId) return false;
      return event.clientId === assignment.clientId;
    }
    return true;
  }
  if (role.key === "RISK_GOVERNANCE_REVIEWER") {
    if (!assignment.clientId && !assignment.eventId) return false;
    if (assignment.eventId && scope.eventId && assignment.eventId !== scope.eventId) return false;
    if (assignment.clientId && scope.clientId && assignment.clientId !== scope.clientId) return false;
    if (scope.eventId && assignment.clientId && !assignment.eventId) {
      const event = context?.event;
      if (!event || event.id !== scope.eventId || event.clientId !== assignment.clientId) return false;
    }
    return true;
  }
  return false;
}

function isSystemRoleKey(key: string): key is SystemRoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key);
}

function assignmentSpecificity(assignment: Assignment): number {
  if (assignment.eventId) return 3;
  if (assignment.clientId) return 2;
  return 1;
}

/** Role taken from the single most specific covering assignment, not privilege rank. */
export function singleCoveringRoleKey(
  actor: ActorSnapshot,
  permission: PermissionKey,
  scope: PolicyScope,
  now: string,
): SystemRoleKey {
  const decision = authorize({ actor, permission, scope, context: { now } });
  if (!decision.allow) {
    throw new PlatformError("FORBIDDEN", decision.reason);
  }
  const covering = actor.assignments.filter((item) => assignmentIsActive(item, now) && assignmentCoversScope(item, scope));
  const scored: { key: SystemRoleKey; specificity: number }[] = [];
  for (const grant of covering) {
    const role = actor.roles.find((item) => item.id === grant.roleId);
    if (!role || role.status !== "ACTIVE" || !isSystemRoleKey(role.key)) continue;
    if (!rolePermissionKeys(role.key).includes(permission)) continue;
    scored.push({ key: role.key, specificity: assignmentSpecificity(grant) });
  }
  const highest = Math.max(0, ...scored.map((item) => item.specificity));
  const unique = [...new Set(scored.filter((item) => item.specificity === highest).map((item) => item.key))];
  const only = unique.length === 1 ? unique[0] : undefined;
  if (!only) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "a single event assignment is required to propose a contact correction",
    );
  }
  return only;
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
