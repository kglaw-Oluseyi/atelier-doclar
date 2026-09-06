import {
  assignmentCoversScope,
  assignmentIsActive,
  SYSTEM_ROLE_KEYS,
  type Assignment,
  type EventRecord,
  type Role,
} from "@maison-doclar/shared-platform";
import { governedRoleLabel } from "./comms-display";

type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export type StaffIdentityPresentation = {
  displayName: string;
  roleLabel: string;
};

export function projectStaffIdentity(input: {
  displayName: string;
  assignments: readonly Assignment[];
  roles: readonly Role[];
  events: readonly EventRecord[];
  eventId?: string;
  now: string;
}): StaffIdentityPresentation {
  const active = input.assignments.filter((item) => assignmentIsActive(item, input.now));
  const event = input.eventId ? input.events.find((record) => record.id === input.eventId) : undefined;
  const scoped = event
    ? active.filter((item) => assignmentCoversScope(item, { organisationId: event.organisationId, eventId: event.id }))
    : active;
  const keys = uniqueRoleKeys(
    scoped
      .map((item) => input.roles.find((role) => role.id === item.roleId && role.status === "ACTIVE")?.key)
      .filter((key): key is SystemRoleKey => (SYSTEM_ROLE_KEYS as readonly string[]).includes(String(key))),
  );
  if (input.eventId && keys.length === 0) {
    return { displayName: input.displayName, roleLabel: "No event assignment in this scope" };
  }
  if (keys.length === 0) {
    return { displayName: input.displayName, roleLabel: "No assignment in this scope" };
  }
  return {
    displayName: input.displayName,
    roleLabel: keys.map((key) => governedRoleLabel(key)).join(" · "),
  };
}

function uniqueRoleKeys(keys: SystemRoleKey[]): SystemRoleKey[] {
  const seen = new Set<SystemRoleKey>();
  const ordered: SystemRoleKey[] = [];
  for (const key of SYSTEM_ROLE_KEYS) {
    if (keys.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}
