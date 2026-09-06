import { ACA_S04A_COURSE_ID } from "./constants.js";
import {
  AcademyAssignmentSchema,
  AcademySystemRoleKeySchema,
  type AcademyAssignment,
  type AcademyLearningPath,
  type AcademySystemRoleKey,
} from "./schemas.js";

const PATH_BY_ROLE: Record<AcademySystemRoleKey, AcademyLearningPath> = {
  CEO: "CEO_OVERSIGHT",
  EVENT_DIRECTOR: "EVENT_DIRECTOR",
  CLIENT_LEAD: "OPERATIONAL_AWARENESS",
  DEPARTMENT_LEAD: "OPERATIONAL_AWARENESS",
  PLANNER: "PLANNER",
  SYSTEM_ADMINISTRATOR: "OPERATIONAL_AWARENESS",
  READ_ONLY_AUDITOR: "AUDITOR_READ_ONLY",
};

export function learningPathForRole(roleKey: string): AcademyLearningPath {
  const parsed = AcademySystemRoleKeySchema.parse(roleKey);
  return PATH_BY_ROLE[parsed];
}

export function assignAcaS04A(roleKey: string): AcademyAssignment {
  return AcademyAssignmentSchema.parse({
    courseId: ACA_S04A_COURSE_ID,
    learningPath: learningPathForRole(roleKey),
    roleKey,
    assigned: true,
    grantsOperationalAuthority: false,
  });
}

export function preferredRoleKey(roleKeys: readonly string[]): AcademySystemRoleKey | undefined {
  const order: AcademySystemRoleKey[] = [
    "CEO",
    "EVENT_DIRECTOR",
    "PLANNER",
    "READ_ONLY_AUDITOR",
    "CLIENT_LEAD",
    "DEPARTMENT_LEAD",
    "SYSTEM_ADMINISTRATOR",
  ];
  for (const key of order) {
    if (roleKeys.includes(key)) return key;
  }
  return undefined;
}
