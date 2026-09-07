import { assignmentIsActive, SYSTEM_ROLE_KEYS } from "@maison-doclar/shared-platform";
import {
  ACA_S04A_COURSE_ID,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  assignAcaS04A,
  assignAcaS04C,
  assignAcaS04D,
  preferredRoleKey,
  type AcademyAssignment,
  type AcademySystemRoleKey,
} from "@maison-doclar/academy";
import { getRuntime } from "./runtime";

export function academyAssignmentForPerson(
  personId: string,
  courseId: typeof ACA_S04A_COURSE_ID | typeof ACA_S04C_COURSE_ID | typeof ACA_S04D_COURSE_ID = ACA_S04A_COURSE_ID,
): AcademyAssignment | undefined {
  const resolved = getRuntime().service.resolveActor(personId);
  const now = new Date().toISOString();
  const active = resolved.assignments.filter((item) => assignmentIsActive(item, now));
  const keys = active
    .map((item) => resolved.roles.find((role) => role.id === item.roleId && role.status === "ACTIVE")?.key)
    .filter((key): key is AcademySystemRoleKey => (SYSTEM_ROLE_KEYS as readonly string[]).includes(String(key)));
  const preferred = preferredRoleKey(keys);
  if (!preferred) return undefined;
  if (courseId === ACA_S04C_COURSE_ID) return assignAcaS04C(preferred);
  if (courseId === ACA_S04D_COURSE_ID) return assignAcaS04D(preferred);
  return assignAcaS04A(preferred);
}
