import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { merchandiseWorkspacePresentation } from "../src/server/operational-state.ts";

const FLASH = {
  code: "VERSION_CONFLICT" as const,
  message: "This record changed while you were editing. Reload before saving.",
};

describe("EOS-S04C guest-renewal conflict presentation", () => {
  it("does not present success or a new access link while a stale renewal is in conflict", () => {
    const presented = merchandiseWorkspacePresentation({
      flash: FLASH,
      queryState: "VERSION_CONFLICT",
      queryOk: "guest-access",
      issued: { kind: "guest" as const, token: "issued-token-must-not-render", subjectId: "grant-b" },
    });
    assert.equal(presented.showConflict, true);
    assert.equal(presented.mutationLocked, true);
    assert.equal(presented.showSuccess, false);
    assert.equal(presented.issued, undefined);
  });

  it("unlocks after reload even if the conflict query string is still present", () => {
    const recovered = merchandiseWorkspacePresentation({
      refreshed: true,
      queryState: "VERSION_CONFLICT",
    });
    assert.equal(recovered.showConflict, false);
    assert.equal(recovered.mutationLocked, false);
    assert.equal(recovered.showSuccess, false);
    assert.equal(recovered.issued, undefined);
  });

  it("keeps a leftover success query from masking a new conflict flash after reload", () => {
    const presented = merchandiseWorkspacePresentation({
      flash: FLASH,
      refreshed: true,
      queryOk: "guest-renew",
      issued: { kind: "guest" as const, token: "stale-token", subjectId: "grant-a" },
    });
    assert.equal(presented.showConflict, true);
    assert.equal(presented.mutationLocked, true);
    assert.equal(presented.showSuccess, false);
    assert.equal(presented.issued, undefined);
  });
});
