import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B event coverage, residual, continuity and incident journeys", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("protection-why-not-ready")).toBeVisible();
  const fact = page.getByTestId("protection-record-fact");
  await fact.getByLabel("Fact").selectOption("jurisdiction");
  await fact.getByLabel("Value").fill("NG");
  await fact.getByRole("button", { name: "Record event fact" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Coverage" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const plan = page.getByTestId("protection-create-plan");
  await plan.getByLabel("Plan title").fill("Critical services fallback");
  await plan.getByLabel("Recovery objective (minutes)").fill("60");
  await plan.getByLabel("Maximum tolerable interruption (minutes)").fill("120");
  await plan.getByLabel("Decision role").selectOption("EVENT_DIRECTOR");
  await plan.getByRole("button", { name: "Prepare continuity plan" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  const incident = page.getByTestId("protection-report-incident");
  await incident.getByLabel("Incident title").fill("Guest medical");
  await incident.getByLabel("Severity").selectOption("HIGH");
  await incident.getByRole("button", { name: "Report incident" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});

test("S05B Budget Intelligence successor request", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Continuity" }).click();
  const budget = page.getByTestId("protection-budget");
  await budget.getByLabel("Driver").selectOption("UNQUANTIFIED_EXPOSURE");
  await budget.getByLabel("Reason or assumption label").fill("No sourced replacement quote is on file.");
  await budget.getByRole("button", { name: "Request Budget Intelligence successor" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("protection-budget-result")).toContainText(/Unknowns remain unquantified|quantified/i);
});
