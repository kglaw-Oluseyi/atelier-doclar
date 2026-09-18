import { PERMISSION_REGISTRY, type PermissionKey, type RoleKey } from "./permissions";

export interface AssignmentGrant {
  id: string;
  organisationId: string;
  clientId: string | null;
  eventId: string | null;
  departmentId: string | null;
  workstreamId: string | null;
  roleKey: RoleKey;
  scopeKind: "ORGANISATION" | "CLIENT" | "EVENT" | "WORKSTREAM" | "GOVERNANCE";
  governanceMandate: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";
  startsAt: string | null;
  endsAt: string | null;
  departmentStatus?: "ACTIVE" | "INACTIVE" | null;
  workstreamStatus?: "ACTIVE" | "INACTIVE" | null;
  eventClientId?: string | null;
}

export interface ActorState {
  userId: string;
  userStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  organisationId: string;
  membershipStatus: "ACTIVE" | "SUSPENDED" | "NONE";
  assignments: AssignmentGrant[];
  now: string;
}

export interface ResourceScope {
  organisationId: string;
  clientId?: string | null;
  eventId?: string | null;
  departmentId?: string | null;
  workstreamId?: string | null;
  eventClientId?: string | null;
}

export type Decision =
  { outcome: "ALLOW"; roleKey: RoleKey; assignmentId: string } | { outcome: "DENY"; code: string };

const ORG_WIDE: ReadonlySet<RoleKey> = new Set([
  "CEO",
  "SYSTEM_ADMINISTRATOR",
  "READ_ONLY_AUDITOR",
]);

export function assignmentIsActive(grant: AssignmentGrant, now: string): boolean {
  if (grant.status !== "ACTIVE") return false;
  if (grant.startsAt && grant.startsAt > now) return false;
  if (grant.endsAt && grant.endsAt <= now) return false;
  if (
    grant.roleKey === "CEO" &&
    (grant.clientId || grant.eventId || grant.departmentId || grant.workstreamId)
  ) {
    return false;
  }
  if (grant.roleKey === "CEO" && grant.scopeKind !== "ORGANISATION") return false;
  if (grant.roleKey === "DEPARTMENT_LEAD") {
    if (!grant.eventId || !grant.departmentId || !grant.workstreamId) return false;
    if (grant.departmentStatus === "INACTIVE" || grant.workstreamStatus === "INACTIVE")
      return false;
  }
  if (ORG_WIDE.has(grant.roleKey) && (grant.clientId || grant.eventId)) return false;
  return true;
}

function covers(grant: AssignmentGrant, resource: ResourceScope): boolean {
  if (grant.organisationId !== resource.organisationId) return false;
  if (
    grant.roleKey === "CEO" ||
    grant.roleKey === "SYSTEM_ADMINISTRATOR" ||
    grant.roleKey === "READ_ONLY_AUDITOR"
  ) {
    return grant.scopeKind === "ORGANISATION";
  }
  if (grant.roleKey === "CLIENT_LEAD") {
    if (!grant.clientId) return false;
    if (!resource.clientId && !resource.eventId) return true;
    if (resource.eventId && resource.eventClientId && resource.eventClientId !== grant.clientId)
      return false;
    if (resource.clientId && resource.clientId !== grant.clientId) return false;
    return resource.clientId === grant.clientId || resource.eventClientId === grant.clientId;
  }
  if (grant.roleKey === "EVENT_DIRECTOR" || grant.roleKey === "PLANNER") {
    if (!grant.eventId) return false;
    if (resource.eventId) return resource.eventId === grant.eventId;
    if (resource.clientId) return grant.clientId === resource.clientId;
    return true;
  }
  if (grant.roleKey === "DEPARTMENT_LEAD") {
    if (!resource.eventId || resource.eventId !== grant.eventId) return false;
    if (resource.workstreamId && resource.workstreamId !== grant.workstreamId) return false;
    if (resource.departmentId && resource.departmentId !== grant.departmentId) return false;
    return true;
  }
  if (grant.roleKey === "RISK_GOVERNANCE_REVIEWER") {
    if (!grant.governanceMandate) {
      return !resource.eventId && !resource.clientId && !resource.workstreamId;
    }
    if (resource.eventId && grant.eventId) return resource.eventId === grant.eventId;
    if (resource.clientId && grant.clientId) return resource.clientId === grant.clientId;
    if (resource.eventId || resource.clientId || resource.workstreamId) return false;
    return true;
  }
  return false;
}

export function authorize(
  actor: ActorState,
  permission: PermissionKey,
  resource: ResourceScope,
): Decision {
  if (actor.userStatus !== "ACTIVE") return { outcome: "DENY", code: "USER_INACTIVE" };
  if (actor.membershipStatus !== "ACTIVE") return { outcome: "DENY", code: "MEMBERSHIP_INACTIVE" };
  if (resource.organisationId !== actor.organisationId)
    return { outcome: "DENY", code: "ORGANISATION_MISMATCH" };
  if (permission === "support.impersonate")
    return { outcome: "DENY", code: "IMPERSONATION_DENIED" };

  const definition = PERMISSION_REGISTRY[permission];
  const active = actor.assignments.filter((grant) => assignmentIsActive(grant, actor.now));
  let allowed: { roleKey: RoleKey; assignmentId: string } | null = null;
  let denied = false;

  for (const grant of active) {
    if (!covers(grant, resource)) continue;
    const rolePermitted = (definition.permittedRoles as readonly RoleKey[]).includes(grant.roleKey);
    if (!rolePermitted) continue;
    if (grant.roleKey === "READ_ONLY_AUDITOR" && definition.mutates) {
      denied = true;
      continue;
    }
    if (
      grant.roleKey === "SYSTEM_ADMINISTRATOR" &&
      definition.mutates &&
      !definition.technicalOnly
    ) {
      denied = true;
      continue;
    }
    if (
      grant.roleKey === "RISK_GOVERNANCE_REVIEWER" &&
      definition.mutates &&
      permission !== "approval.request" &&
      permission !== "approval.decide"
    ) {
      denied = true;
      continue;
    }
    if (
      grant.roleKey === "RISK_GOVERNANCE_REVIEWER" &&
      grant.scopeKind === "ORGANISATION" &&
      !grant.governanceMandate
    ) {
      if (resource.eventId || resource.clientId || definition.mutates) {
        denied = true;
        continue;
      }
    }
    allowed = { roleKey: grant.roleKey, assignmentId: grant.id };
  }

  if (denied && !allowed) return { outcome: "DENY", code: "ROLE_INVARIANT" };
  if (!allowed) return { outcome: "DENY", code: "NO_GRANT" };
  return { outcome: "ALLOW", ...allowed };
}

export function isOrgWideCeo(actor: ActorState): boolean {
  return actor.assignments.some(
    (grant) =>
      assignmentIsActive(grant, actor.now) &&
      grant.roleKey === "CEO" &&
      grant.scopeKind === "ORGANISATION" &&
      !grant.clientId &&
      !grant.eventId,
  );
}

export const PHASE_EDGES: Record<string, readonly string[]> = {
  DISCOVER: ["DESIGN", "CANCELLED"],
  DESIGN: ["PREPARE", "DISCOVER", "CANCELLED"],
  PREPARE: ["READY", "DESIGN", "CANCELLED"],
  READY: ["LIVE", "PREPARE"],
  LIVE: ["CLOSE"],
  CLOSE: ["LEARN"],
  LEARN: ["ARCHIVED"],
};

export const S01_ENABLED_TARGETS = new Set([
  "DESIGN",
  "PREPARE",
  "DISCOVER",
  "CANCELLED",
  "CLOSE",
  "LEARN",
  "ARCHIVED",
]);
export const S01_DISABLED_TARGETS = new Set(["READY", "LIVE"]);

export function plannerMayTransition(from: string, to: string): boolean {
  if (
    to === "DISCOVER" ||
    to === "CANCELLED" ||
    to === "ARCHIVED" ||
    to === "READY" ||
    to === "LIVE"
  )
    return false;
  return to === "DESIGN" || to === "PREPARE" || to === "CLOSE" || to === "LEARN";
}
