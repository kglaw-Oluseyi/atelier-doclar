import type { GuestIntakeJob } from "@maison-doclar/shared-platform";

type GuestIntakeProgress = GuestIntakeJob["progress"];

export type ValidationCounterDisplay =
  | { mode: "counts"; valid: number; warnings: number; invalid: number }
  | { mode: "unavailable"; reason: string };

/**
 * Completed intakes recompute progress from candidate statuses after promotion.
 * READY/WARNING rows become PROMOTED, so Valid/Warnings/Invalid can read as 0
 * even when thousands of rows were validated. Do not invent replacement totals.
 */
export function validationCounterDisplay(
  progress: GuestIntakeProgress,
  status: GuestIntakeJob["status"],
): ValidationCounterDisplay {
  const terminal = status === "COMPLETED" || status === "COMPLETED_WITH_EXCEPTIONS";
  const settled =
    progress.rowsPromoted +
    progress.rowsUpdated +
    progress.rowsUnchanged +
    progress.rowsSkipped +
    progress.rowsFailed;
  const validationAllZero =
    progress.rowsValid === 0 && progress.rowsWarning === 0 && progress.rowsInvalid === 0;
  const misleading =
    terminal &&
    progress.rowsTotal > 0 &&
    validationAllZero &&
    (settled > 0 || progress.chunksCommitted > 0);

  if (misleading) {
    return {
      mode: "unavailable",
      reason:
        "Validation Valid/Warnings/Invalid counters are not retained after promotion. Use the reconciliation receipt for authoritative totals.",
    };
  }

  return {
    mode: "counts",
    valid: progress.rowsValid,
    warnings: progress.rowsWarning,
    invalid: progress.rowsInvalid,
  };
}
