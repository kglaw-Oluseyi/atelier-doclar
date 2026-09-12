import type { SolverResult } from "./seating-solver-types.js";

export type S06MutationKind =
  | "RELAX_HARD"
  | "IDENTITY_LEAK"
  | "FABRICATE_ASSIGNMENT"
  | "AUTO_APPROVE"
  | "OVERWRITE_PUBLICATION"
  | "FALSE_SUCCESS";

export function applyS06Mutation(kind: S06MutationKind, result: SolverResult): { observations: Array<{ kind: string; name: string; value: unknown }> } {
  if (kind === "RELAX_HARD") {
    return { observations: [{ kind: "MUTATION", name: "hardViolations", value: 0 }, { kind: "MUTATION", name: "silentRelaxation", value: true }] };
  }
  if (kind === "IDENTITY_LEAK") {
    return { observations: [{ kind: "MUTATION", name: "leakedFields", value: ["name", "email"] }, { kind: "PROJECTION", name: "forbidden", value: ["Adaeze", "guest@example.test"] }] };
  }
  if (kind === "FABRICATE_ASSIGNMENT") {
    return { observations: [{ kind: "MUTATION", name: "unknownGuestAssigned", value: true }, { kind: "COUNT", name: "assignments", value: result.assignments.length + 1 }] };
  }
  if (kind === "AUTO_APPROVE") {
    return { observations: [{ kind: "MUTATION", name: "authorEqualsApprover", value: true }] };
  }
  if (kind === "OVERWRITE_PUBLICATION") {
    return { observations: [{ kind: "MUTATION", name: "publicationMutatedInPlace", value: true }] };
  }
  return { observations: [{ kind: "MUTATION", name: "didDataChangeOnReplay", value: true }, { kind: "MUTATION", name: "application", value: "APPLIED" }] };
}

export function detectS06Mutation(observations: Array<{ kind: string; name: string; value: unknown }>): string | undefined {
  if (observations.some((item) => item.name === "silentRelaxation" && item.value === true)) return "SILENT_HARD_RELAXATION";
  if (observations.some((item) => item.name === "leakedFields")) return "IDENTITY_LEAK";
  if (observations.some((item) => item.name === "unknownGuestAssigned" && item.value === true)) return "FABRICATED_ASSIGNMENT";
  if (observations.some((item) => item.name === "authorEqualsApprover" && item.value === true)) return "AUTO_APPROVAL";
  if (observations.some((item) => item.name === "publicationMutatedInPlace" && item.value === true)) return "PUBLICATION_OVERWRITE";
  if (observations.some((item) => item.name === "didDataChangeOnReplay" && item.value === true)) return "FALSE_SUCCESS";
  return undefined;
}
