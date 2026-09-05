import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SYNTHETIC_ACCESS_TOKEN } from "@maison-doclar/programme-tower";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Role").selectOption("reader");
  await page.getByLabel("Access token").fill(SYNTHETIC_ACCESS_TOKEN);
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
}

test("roadmap table and slice deep link work", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Programme roadmap" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("MD-CT4");
  await page.getByRole("table").getByRole("link", { name: "MD-CT4" }).click();
  await expect(page.getByRole("heading", { name: "MD-CT4" })).toBeVisible();
  await expect(page.getByText(/cannot approve/)).toBeVisible();
});

test("product, commits and evidence routes render", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Event OS" }).click();
  await expect(page.getByRole("heading", { name: "Event OS" })).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Commits" }).click();
  await expect(page.getByRole("heading", { name: "Commits" })).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Evidence" }).click();
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
});

test("roadmap is accessible", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Programme roadmap" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
