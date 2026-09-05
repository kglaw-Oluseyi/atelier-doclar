import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

test("guest can respond and staff can see the RSVP", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await page.getByLabel("Given name").fill("Amaka");
  await page.getByLabel("Family name").fill("Iroko");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByRole("heading", { name: "Amaka Iroko" })).toBeVisible();

  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/rsvp");
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare guest RSVP" }).click();
  await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Amaka Iroko" })).toBeVisible();

  await page.getByRole("link", { name: "Amaka Iroko" }).click();
  await page.getByRole("button", { name: "Issue guest access" }).click();
  await expect(page.getByRole("link", { name: "Open guest access" })).toBeVisible();
  await page.getByRole("link", { name: "Open guest access" }).click();

  await expect(page.getByRole("heading", { name: "Alpha One" })).toBeVisible();
  await expect(page.getByText("Amaka Iroko")).toBeVisible();
  await page.getByLabel("I will attend").check();
  await page.getByLabel("I understand these details will be used only to host this event").check();
  await page.getByRole("button", { name: "Send response" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  await expect(page.getByText("You will attend")).toBeVisible();
  await expect(page.getByText("not an admission decision")).toBeVisible();

  await page.getByRole("link", { name: "Update your response" }).click();
  await page.getByLabel("I will not attend").check();
  await page.getByRole("button", { name: "Send response" }).click();
  await expect(page.getByText("You will not attend")).toBeVisible();

  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests?rsvp=NOT_ATTENDING");
  await expect(page.getByRole("link", { name: "Amaka Iroko" })).toBeVisible();
  await page.getByRole("link", { name: "Amaka Iroko" }).click();
  await expect(page.locator(".md-status", { hasText: "NOT ATTENDING" })).toBeVisible();
  await expect(page.locator(".md-status", { hasText: "GUEST SELF SERVICE" })).toBeVisible();
});

test("invalid guest access and insufficient staff role are denied", async ({ page }) => {
  await page.goto("/rsvp/not-a-real-token");
  await expect(page.getByRole("heading", { name: "This link is no longer available" })).toBeVisible();
  await expect(page.locator(".guest-mark")).toHaveText("Maison Doclar");

  await login(page, "auditor@maison-doclar.test");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/rsvp");
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepare guest RSVP" })).toHaveCount(0);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/rsvp/policy");
  await expect(page.getByText("does not include RSVP policy")).toBeVisible();

  await login(page, "planner@maison-doclar.test");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000022/rsvp");
  await expect(page.getByText("not available in this assignment")).toBeVisible();
});

test("guest RSVP is accessible on desktop and mobile", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/rsvp");
  if (await page.getByRole("button", { name: "Prepare guest RSVP" }).count()) {
    await page.getByRole("button", { name: "Prepare guest RSVP" }).click();
  }
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await page.getByLabel("Given name").fill("Zainab");
  await page.getByLabel("Family name").fill("Lawal");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await page.getByRole("button", { name: "Issue guest access" }).click();
  await page.getByRole("link", { name: "Open guest access" }).click();
  await expect(page.getByRole("heading", { name: "Alpha One" })).toBeVisible();
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByLabel("I will attend")).toBeVisible();
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});
