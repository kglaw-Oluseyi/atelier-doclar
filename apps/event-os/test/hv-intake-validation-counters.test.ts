import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validationCounterDisplay } from "../src/server/hv-intake-validation-counters.ts";
import type { GuestIntakeJob } from "@maison-doclar/shared-platform";

type GuestIntakeProgress = GuestIntakeJob["progress"];

function progress(partial: Partial<GuestIntakeProgress>): GuestIntakeProgress {
  return {
    phase: "COMPLETED",
    rowsTotal: 1000,
    rowsParsed: 1000,
    rowsValid: 0,
    rowsWarning: 0,
    rowsInvalid: 0,
    rowsDuplicate: 0,
    rowsConflict: 0,
    rowsReady: 0,
    rowsPromoted: 1000,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsSkipped: 0,
    rowsFailed: 0,
    chunksCommitted: 4,
    lastProgressAt: "2026-09-16T21:00:00.000Z",
    startedAt: "2026-09-16T20:59:00.000Z",
    elapsedMs: 2248,
    ...partial,
  };
}

describe("validationCounterDisplay", () => {
  it("does not show misleading zeros on completed intake after promotion", () => {
    const display = validationCounterDisplay(progress({}), "COMPLETED");
    assert.equal(display.mode, "unavailable");
    if (display.mode === "unavailable") {
      assert.match(display.reason, /not retained/i);
    }
  });

  it("shows live counts while validating", () => {
    const display = validationCounterDisplay(
      progress({
        phase: "VALIDATING",
        rowsValid: 980,
        rowsWarning: 15,
        rowsInvalid: 5,
        rowsPromoted: 0,
        chunksCommitted: 0,
      }),
      "NEEDS_REVIEW",
    );
    assert.deepEqual(display, { mode: "counts", valid: 980, warnings: 15, invalid: 5 });
  });

  it("shows truthful zeros when an empty completed job truly had no rows", () => {
    const display = validationCounterDisplay(
      progress({
        rowsTotal: 0,
        rowsParsed: 0,
        rowsPromoted: 0,
        chunksCommitted: 0,
      }),
      "COMPLETED",
    );
    assert.deepEqual(display, { mode: "counts", valid: 0, warnings: 0, invalid: 0 });
  });
});
