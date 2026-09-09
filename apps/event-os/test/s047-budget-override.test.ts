import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBudgetCalculateFormData } from "@maison-doclar/shared-platform";
import { resultHref } from "../src/server/action-result.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("S047 Budget Studio command and focus contracts", () => {
  it("parses typed 350 from FormData into the service command", () => {
    const formData = new FormData();
    formData.set("organisationId", "00000000-0000-4000-8000-000000000001");
    formData.set("engagementId", "00000000-0000-4000-8000-000000000002");
    formData.set("guestCountOverride", "350");
    formData.set("guestCountOverrideReason", "Synthetic planning reduction");
    formData.set("purpose", "PROTECT_PRIORITIES");
    formData.set("archetype", "WEDDING");
    formData.set("idempotencyKey", "action-350");
    const command = parseBudgetCalculateFormData(formData);
    assert.equal(command.guestCountOverride, 350);
    assert.equal(command.guestCountOverrideReason, "Synthetic planning reduction");
  });

  it("redirects with the persisted scenario and calculation identifiers", () => {
    const href = resultHref("/app/discovery/00000000-0000-4000-8000-000000000002", "ffffffff-ffff-4fff-8fff-ffffffffffff", {
      section: "budget-studio",
      scenarioEditionId: "11111111-1111-4111-8111-111111111111",
      calculationResultId: "11111111-1111-4111-8111-111111111111",
    });
    assert.match(href, /scenarioEditionId=11111111-1111-4111-8111-111111111111/);
    assert.match(href, /calculationResultId=11111111-1111-4111-8111-111111111111/);
    assert.match(href, /#budget-studio$/);
    assert.equal(href.includes("ok="), false);
  });

  it("marks the resolved contradiction heading as the focus target", () => {
    const source = readFileSync(join(root, "src/components/discovery-workspace.tsx"), "utf8");
    assert.match(source, /id="resolved-contradiction-heading"/);
    assert.match(source, /tabIndex=\{-1\}/);
    assert.match(source, /targetId="resolved-contradiction-heading"/);
    assert.match(source, /presented\.actionType === "discovery.conflict"/);
  });
});
