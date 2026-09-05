import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SYNTHETIC_ACCESS_TOKEN } from "@maison-doclar/programme-tower";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Role").selectOption("reader");
  await page.getByLabel("Access token").fill(SYNTHETIC_ACCESS_TOKEN);
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
  await expect(page.getByRole("heading", { name: "Executive portfolio" })).toBeVisible();
}

test("operations pack keeps production unauthorised and Event OS unimplied", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Operations" }).click();
  await expect(page.getByRole("heading", { name: "Operations and evidence pack" })).toBeVisible();
  await expect(page.getByText("PRODUCTION APPROVED: no")).toBeVisible();
  await expect(page.getByText("Event OS implied failed: false")).toBeVisible();
  await expect(page.getByText("GATE-INDEPENDENT")).toBeVisible();
  await page.goto("/programme/ops?fail=rag-unavailable", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("DEGRADED")).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Programme roadmap" })).toBeVisible();
});

test("operations is accessible", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Operations" }).click();
  await expect(page.getByRole("heading", { name: "Operations and evidence pack" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
