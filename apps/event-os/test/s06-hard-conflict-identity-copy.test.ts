import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hardRuleConflictPlatformError } from "@maison-doclar/shared-platform";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("EOS-S06 HARD conflict identity copy", () => {
  it("labels conflictingEditionId as a rule edition, not a content hash", () => {
    const error = hardRuleConflictPlatformError({
      draftEditionId: "11111111-1111-4111-8111-111111111111",
      conflictingEditionId: "e0dc270a-c57d-49fb-8dd9-c62544de3d2b",
      draftKind: "KEEP_APART",
      conflictingKind: "KEEP_TOGETHER",
      subjectKey: "a|b",
      reason: "HARD_RULE_CONTRADICTION",
    });
    assert.match(error.publicMessage ?? "", /rule edition e0dc270a/i);
    assert.doesNotMatch(error.publicMessage ?? "", /hash e0dc270a/i);
    assert.ok((error.details ?? []).some((item) => item === "conflictingEditionId:e0dc270a-c57d-49fb-8dd9-c62544de3d2b"));

    const page = readFileSync(
      fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url)),
      "utf8",
    );
    assert.match(page, /rule\s+edition \{item\.hardConflictEditionId/);
    assert.match(page, /content hash \$\{item\.hardConflictContentHashPrefix\}/);
  });
});
