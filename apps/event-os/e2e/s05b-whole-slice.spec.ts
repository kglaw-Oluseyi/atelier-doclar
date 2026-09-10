import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B whole slice: protection command, event workspace and role denials", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "ceo");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Protection" }).click();
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Protection Command" })).toBeVisible();
  await page.getByRole("button", { name: "Create organisation policy draft" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });

  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("protection-why-not-ready")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Prepare continuity plan" }).click();
  await page.getByRole("button", { name: "Generate checkpoint instances" }).click();
  await page.getByRole("button", { name: "Request reserve allocation projection" }).click();
  await expect(page.getByText("Protection command applied.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Unknowns remain unquantified/)).toBeVisible();

  await loginAs(page, "admin");
  await page.goto("/app/protection");
  await expect(page.getByText(/cannot open Protection Command/i)).toBeVisible({ timeout: 20_000 });
});

test("S05B auditor is read-only and 360px does not clip the workspace", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "auditor");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Create organisation policy draft" })).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByTestId("protection-command")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
});
