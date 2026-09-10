import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { ALPHA_PROTECTION, expectActionOutcome } from "./s060-helpers";

test("S060 checkpoints and structured incident learning are visible without dispatch", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto(ALPHA_PROTECTION);
  await page.getByRole("link", { name: "Continuity" }).click();
  const plan = page.getByTestId("protection-create-plan");
  await plan.getByLabel("Plan title").fill("S060 power readiness");
  await plan.getByLabel("Recovery objective (minutes)").fill("60");
  await plan.getByLabel("Maximum tolerable interruption (minutes)").fill("120");
  await plan.getByLabel("Decision role").selectOption("EVENT_DIRECTOR");
  await plan.getByRole("button", { name: "Prepare continuity plan" }).click();
  await expectActionOutcome(page);
  await page.getByRole("button", { name: "Generate checkpoint instances" }).click();
  await expectActionOutcome(page);
  await expect(page.getByText(/Communications are inactive|No external reminder was dispatched/i).first()).toBeVisible();
  await expect(page.getByTestId("checkpoint-instances")).toBeVisible();
  await page.getByTestId("protection-report-incident").getByLabel("Incident title").fill("Structured power loss");
  await page.getByTestId("protection-report-incident").getByLabel("Severity").selectOption("HIGH");
  await page.getByTestId("protection-report-incident").getByRole("button", { name: "Report incident" }).click();
  await expectActionOutcome(page);
  await page.getByRole("link", { name: "Continuity" }).click();
  const incident = page.getByTestId("incident-detail").filter({ hasText: "Structured power loss" });
  await expect(incident).toBeVisible({ timeout: 20_000 });
  await expect(incident.getByText("This platform has not dispatched help.")).toBeVisible();
  if (await page.getByLabel("Entry kind").count()) {
    await page.getByLabel("Entry kind").selectOption("OBSERVED_FACT");
    await page.getByLabel("Entry", { exact: true }).fill("Guest reported chest pain at 21:14.");
    await page.getByRole("button", { name: "Add structured entry" }).click();
    await expectActionOutcome(page);
  }
});
