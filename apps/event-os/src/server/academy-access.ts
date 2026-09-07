import { assignmentIsActive, SYSTEM_ROLE_KEYS } from "@maison-doclar/shared-platform";
import {
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  assignAcaS04A,
  assignAcaS04C,
  preferredRoleKey,
  type AcademyAssignment,
  type AcademySystemRoleKey,
} from "@maison-doclar/academy";
import { getRuntime } from "./runtime";

export function academyAssignmentForPerson(
  personId: string,
  courseId: typeof ACA_S04A_COURSE_ID | typeof ACA_S04C_COURSE_ID = ACA_S04A_COURSE_ID,
): AcademyAssignment | undefined {
  const resolved = getRuntime().service.resolveActor(personId);
  const now = new Date().toISOString();
  const active = resolved.assignments.filter((item) => assignmentIsActive(item, now));
  const keys = active
    .map((item) => resolved.roles.find((role) => role.id === item.roleId && role.status === "ACTIVE")?.key)
    .filter((key): key is AcademySystemRoleKey => (SYSTEM_ROLE_KEYS as readonly string[]).includes(String(key)));
  const preferred = preferredRoleKey(keys);
  if (!preferred) return undefined;
  return courseId === ACA_S04C_COURSE_ID ? assignAcaS04C(preferred) : assignAcaS04A(preferred);
}
