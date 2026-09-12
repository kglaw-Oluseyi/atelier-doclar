import { FIXTURE_IDS } from "./fixtures.js";

export const S06_VERIFY_AS_ROLES = ["ceo", "director", "planner", "auditor", "admin", "reviewer"] as const;
export type S06VerifyAsRole = (typeof S06_VERIFY_AS_ROLES)[number];

export const S06_VERIFY_AS_ALLOWLIST: Record<S06VerifyAsRole, { email: string; assignmentId: string; personId: string }> = {
  ceo: { email: "ceo@maison-doclar.test", assignmentId: FIXTURE_IDS.assignCeo, personId: FIXTURE_IDS.personCeo },
  director: { email: "director@maison-doclar.test", assignmentId: FIXTURE_IDS.assignDirector, personId: FIXTURE_IDS.personDirector },
  planner: { email: "planner@maison-doclar.test", assignmentId: FIXTURE_IDS.assignPlanner, personId: FIXTURE_IDS.personPlanner },
  auditor: { email: "auditor@maison-doclar.test", assignmentId: FIXTURE_IDS.assignAuditor, personId: FIXTURE_IDS.personAuditor },
  admin: { email: "admin@maison-doclar.test", assignmentId: FIXTURE_IDS.assignAdmin, personId: FIXTURE_IDS.personAdmin },
  reviewer: { email: "reviewer@maison-doclar.test", assignmentId: FIXTURE_IDS.assignRiskReviewer, personId: FIXTURE_IDS.personRiskReviewer },
};

export function seatingVerifyAsAllowed(input: { productionAuthorised: boolean; fixturesAllowed: boolean; flag: boolean }): boolean {
  return input.productionAuthorised === false && input.fixturesAllowed && input.flag;
}

export function resolveVerifyAsRole(value: string): S06VerifyAsRole | undefined {
  return S06_VERIFY_AS_ROLES.find((item) => item === value);
}
