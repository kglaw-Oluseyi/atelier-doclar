import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

test("charts have accessible tables and unknown is not healthy", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Charts" }).click();
  await expect(page.getByRole("heading", { name: "Charts and freshness" })).toBeVisible();
  await expect(page.getByText(/Unknown is not green/)).toBeVisible();
  await expect(page.getByRole("table", { name: /Accessible equivalent for Gate matrix/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
});

test("chart outage does not break the roadmap", async ({ page }) => {
  await login(page);
  await page.goto("/programme/charts?charts=unavailable", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("DEGRADED")).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Programme roadmap" })).toBeVisible();
});

test("charts are accessible", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Charts" }).click();
  await expect(page.getByRole("heading", { name: "Charts and freshness" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
