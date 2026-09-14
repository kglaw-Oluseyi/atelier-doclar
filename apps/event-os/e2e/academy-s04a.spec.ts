import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

test("ACA-S04A assignment, assessment and authority disclaimer", async ({ page }) => {
  await login(page);
  await page.goto("/app/academy");
  await expect(page.getByRole("heading", { name: "Assigned training" })).toBeVisible();
  await expect(page.getByText(/does not grant Event OS permissions/i)).toBeVisible();
  await page.getByRole("link", { name: "Open ACA-S04A" }).click();
  await expect(page.getByRole("heading", { name: /Guest addressing/ })).toBeVisible();
  await page.getByRole("button", { name: /Assessment/ }).click();
  const fieldsets = page.locator("form.atelier-intake fieldset");
  const count = await fieldsets.count();
  expect(count).toBeGreaterThan(7);
  for (let index = 0; index < count; index += 1) {
    await fieldsets.nth(index).locator("input[type=radio]").first().check();
  }
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/training evidence was recorded|does not grant Event OS authority/i).first()).toBeVisible();
  await expect(page.getByText(/DISTINCTION|PASS|RETAKE/).first()).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("Planner Academy path remains assigned and unauthenticated academy fails closed", async ({ page }) => {
  await page.goto("/app/academy/aca-s04a");
  await expect(page).toHaveURL(/sign-in/);
  await loginAs(page, "planner");
  await page.goto("/app/academy/aca-s04a");
  await expect(page.getByText(/Academy · ACA-S04A · .+ · PLANNER/)).toBeVisible();
  await expect(page.getByText(/Assigned path:\s*PLANNER/i)).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
});
