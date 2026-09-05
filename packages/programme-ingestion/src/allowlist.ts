import { AUTHORISED_BRANCH, AUTHORISED_REF, AUTHORISED_REPOSITORY } from "./constants.js";
import { IngestionError } from "./errors.js";

export function normaliseRef(ref: string): { branch: string; ref: string } {
  if (ref.startsWith("refs/heads/")) {
    return { branch: ref.slice("refs/heads/".length), ref };
  }
  return { branch: ref, ref: `refs/heads/${ref}` };
}

export function assertAuthorisedRepository(repository: string): void {
  const trimmed = repository.trim();
  if (!trimmed || trimmed.includes(" ") || !trimmed.includes("/")) {
    throw new IngestionError(
      "UNAUTHORISED_REPOSITORY",
      "malformed repository identity",
      "repository",
      trimmed,
    );
  }
  if (trimmed !== AUTHORISED_REPOSITORY) {
    throw new IngestionError(
      "UNAUTHORISED_REPOSITORY",
      "repository is not the authorised programme source",
      "repository",
      trimmed,
    );
  }
}

export function assertAuthorisedRef(refOrBranch: string): { branch: string; ref: string } {
  const normalised = normaliseRef(refOrBranch);
  if (normalised.branch !== AUTHORISED_BRANCH || normalised.ref !== AUTHORISED_REF) {
    throw new IngestionError(
      "UNAUTHORISED_REF",
      "ref is not the authorised programme branch",
      "ref",
      refOrBranch,
    );
  }
  return normalised;
}
