import type { Person } from "@maison-doclar/shared-platform";
import { getRuntime } from "./runtime";
import { projectStaffIdentity, type StaffIdentityPresentation } from "./staff-identity-projection";

export type { StaffIdentityPresentation } from "./staff-identity-projection";
export { projectStaffIdentity } from "./staff-identity-projection";

export function presentStaffIdentity(person: Person, eventId?: string): StaffIdentityPresentation {
  const runtime = getRuntime();
  const resolved = runtime.service.resolveActor(person.id);
  return projectStaffIdentity({
    displayName: person.displayName,
    assignments: resolved.assignments,
    roles: resolved.roles,
    events: runtime.service.currentSnapshot().events,
    ...(eventId ? { eventId } : {}),
    now: new Date().toISOString(),
  });
}
