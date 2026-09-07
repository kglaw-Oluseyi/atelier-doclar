export const ACADEMY_PACKAGE = "@maison-doclar/academy" as const;

export const ACADEMY_PASS_THRESHOLD = 80 as const;
export const ACADEMY_DISTINCTION_THRESHOLD = 90 as const;

export const ACADEMY_OUTCOMES = ["DISTINCTION", "PASS", "RETAKE_REQUIRED"] as const;
export const ACADEMY_LEARNING_PATHS = [
  "CEO_OVERSIGHT",
  "EVENT_DIRECTOR",
  "PLANNER",
  "OPERATIONAL_AWARENESS",
  "AUDITOR_READ_ONLY",
] as const;

export const ACADEMY_SYSTEM_ROLE_KEYS = [
  "CEO",
  "EVENT_DIRECTOR",
  "CLIENT_LEAD",
  "DEPARTMENT_LEAD",
  "PLANNER",
  "SYSTEM_ADMINISTRATOR",
  "READ_ONLY_AUDITOR",
] as const;

export const ACA_S04A_COURSE_ID = "ACA-S04A" as const;
export const ACA_S04C_COURSE_ID = "ACA-S04C" as const;
export const ACA_S04D_COURSE_ID = "ACA-S04D" as const;
export const ACA_S04E_COURSE_ID = "ACA-S04E" as const;
export const ACADEMY_COURSE_IDS = [ACA_S04A_COURSE_ID, ACA_S04C_COURSE_ID, ACA_S04D_COURSE_ID, ACA_S04E_COURSE_ID] as const;

export const AUTHORITY_DISCLAIMER =
  "Course completion, a pass or a distinction records training evidence only. It does not grant Event OS permissions, assign a role, sign a protected gate, authorise production or replace an event briefing.";

export const AUTHORITY_NEVER_GRANTED = {
  operationalAuthorisation: false,
  roleAssignment: false,
  protectedGateSignature: false,
  productionApproval: false,
  specialistApproval: false,
} as const;
