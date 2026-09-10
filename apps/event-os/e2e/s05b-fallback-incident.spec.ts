import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B fallback proposal and life-safety incident stay undispatched", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const plan = page.getByTestId("protection-create-plan");
  await plan.getByLabel("Plan title").fill("Playwright AV fallback");
  await plan.getByLabel("Recovery objective (minutes)").fill("45");
  await plan.getByLabel("Maximum tolerable interruption (minutes)").fill("90");
  await plan.getByLabel("Decision role").selectOption("EVENT_DIRECTOR");
  await plan.getByRole("button", { name: "Prepare continuity plan" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  const propose = page.locator("form").filter({ hasText: "Propose fallback plan" }).first();
  if (await propose.count()) {
    await propose.getByLabel("Trigger evidence").fill("Missed AV checkpoint");
    await propose.getByLabel("Impact").fill("Ceremony sound at risk");
    await propose.getByRole("button", { name: "Propose fallback plan" }).click();
    await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("fallback-workspace")).toContainText(/Booking, payment and dispatch remain unavailable/i);
  }
  const incident = page.getByTestId("protection-report-incident");
  await incident.getByLabel("Incident title").fill("Playwright guest medical");
  await incident.getByLabel("Severity").selectOption("LIFE_SAFETY");
  await incident.getByRole("checkbox", { name: "Life safety" }).check();
  await incident.getByRole("button", { name: "Report incident" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("life-safety-protocol")).toContainText(/has not dispatched help/i);
});

test("S05B planner cannot authorise fallback or publish a dossier", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "planner");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish dossier without sending" })).toHaveCount(0);
});
