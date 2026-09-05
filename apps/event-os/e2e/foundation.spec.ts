import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

test("unauthenticated visitors are sent to sign-in", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Event OS" })).toBeVisible();
});

test("CEO can create a client and event", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Clients" }).first().click();
  await page.getByRole("link", { name: "Create client" }).click();
  const suffix = String(Date.now()).slice(-6);
  await page.getByLabel("Code").fill(`EP${suffix}`);
  await page.getByLabel("Display name").fill("Epsilon House");
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(page.getByRole("heading", { name: "Epsilon House" })).toBeVisible();
  await page.getByRole("link", { name: "Create event" }).click();
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible();
  await page.getByLabel("Client").selectOption({ label: `Epsilon House (EP${suffix})` });
  await page.getByLabel("Code").fill(`E${suffix}`);
  await page.getByLabel("Name").fill("Epsilon First");
  await page.getByRole("button", { name: "Create event in Discover" }).click();
  await page.waitForURL(/\/app\/events\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Epsilon First" })).toBeVisible();
  await expect(page.getByText("DISCOVER")).toBeVisible();
});

test("planner cannot open another event by URL", async ({ page }) => {
  await login(page, "planner@maison-doclar.test");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000022");
  await expect(page.getByText("Alpha Two")).toHaveCount(0);
});

test("desktop and mobile journeys are accessible", async ({ page }) => {
  await login(page);
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/events");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});
