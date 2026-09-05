import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

test("unauthenticated visitors are sent to login", async ({ page }) => {
  await page.goto("/programme");
  await expect(page.getByRole("heading", { name: "Control Tower access" })).toBeVisible();
});

test("wrong token is denied", async ({ page }) => {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Access token").fill("wrong-token");
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
  await expect(page.getByText("Access denied. Check the named actor, role and access token.")).toBeVisible();
});

test("authenticated portfolio shows evidence-derived counts and unsigned gates", async ({ page }) => {
  await login(page);
  await expect(page.getByText(/Percentage\s+UNAVAILABLE/)).toBeVisible();
  await expect(page.getByText(/Accepted 3/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Now / next / later" })).toBeVisible();
  await expect(page.getByText("UNKNOWN — this is not healthy")).toBeVisible();
  await expect(page.getByText("cannot sign CEO", { exact: false })).toBeVisible();
});

test("stale, degraded, empty, error and recovery fixtures render", async ({ page }) => {
  await login(page);
  for (const state of ["stale", "degraded", "empty", "error", "recovery", "conflict"]) {
    await page.goto(`/programme?fixture=${state}`);
    await expect(page.getByText(state.toUpperCase(), { exact: true })).toBeVisible();
  }
});

test("portfolio is accessible and usable at a mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
