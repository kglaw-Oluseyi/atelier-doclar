/**
 * V2 authoring is enabled after local gates (Phase 11 step 6).
 * Set EVENT_OS_SEATING_V2_REPLACEMENT=0 to roll back to reading the legacy publication only.
 */
export function seatingV2ReplacementEnabled(): boolean {
  return process.env.EVENT_OS_SEATING_V2_REPLACEMENT !== "0";
}
