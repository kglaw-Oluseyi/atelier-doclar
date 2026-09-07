import { PlatformError } from "./errors.js";

export const RETAINED_SALUTATION_INVARIANT = "RETAINED_SALUTATION_INVARIANT";

export function assertRetainedSalutationInvariant(input: {
  decision?: "RETAIN" | "UPDATE";
  persisted?: string;
  previous?: string;
}): void {
  if (input.decision !== "RETAIN") return;
  if (input.persisted !== input.previous) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "retained preferred formal salutation changed after RETAIN",
      {
        field: "preferredFormalSalutation",
        publicMessage:
          "The preferred formal salutation could not be retained unchanged. Canonical data was not changed.",
        details: [RETAINED_SALUTATION_INVARIANT],
      },
    );
  }
}

export const retainedSalutationInvariant = {
  assert: assertRetainedSalutationInvariant,
};
