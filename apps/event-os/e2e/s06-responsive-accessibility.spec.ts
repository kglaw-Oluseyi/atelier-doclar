import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

for (const width of [360, 768, 1440] as const) {
  test(`S06 seating does not overflow at ${width}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, "planner");
    await page.goto(SEATING);
    await expect(page.getByTestId("seating-overview")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBeFalsy();
  });
}

test("S06 seating axe and reduced motion", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAs(page, "planner");
  await page.goto(SEATING);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});
