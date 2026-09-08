import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const GUESTS = "/app/events/00000000-0000-4000-8000-000000000021/guests";
const EVENT = "/app/events/00000000-0000-4000-8000-000000000021";

async function noDocumentOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("guest directory remains usable at 360px, tablet and desktop without document overflow", async ({ page }) => {
  await loginAs(page, "ceo");
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(GUESTS);
    await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
    await expect(page.getByLabel("Search")).toBeVisible();
    await noDocumentOverflow(page);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(EVENT);
  await expect(page.getByRole("heading", { name: "Alpha One" })).toBeVisible();
  await expect(page.getByText(/Event brief readiness/i)).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("representative pages remain usable at 200% zoom and keep visible focus", async ({ page }) => {
  await loginAs(page, "ceo");
  await page.setViewportSize({ width: 640, height: 360 });
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("link", { name: "Open event" }).first()).toBeVisible();
  await noDocumentOverflow(page);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "My Work" }).click();
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await expect(page.getByText("Your current assignments and the destinations they open.")).toBeVisible();
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
});
