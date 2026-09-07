import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const LANGUAGE = `/app/events/${ALPHA}/language`;

test("S04F responsive and accessibility: 360, 768, desktop, diacritics and comparison", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "director");

  for (const width of [360, 768, 720, 1440]) {
    await page.setViewportSize({ width, height: width === 720 ? 450 : 900 });
    await page.goto(LANGUAGE);
    await expect(page.getByTestId("language-workspace")).toBeVisible();
    await expect(page.getByTestId("language-translations")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, `horizontal overflow at ${width}px`).toBeFalsy();
    await expect(page.locator('[lang="yo"]').first()).toBeVisible();
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(LANGUAGE);
  await expect(page.locator('[lang="de"]').filter({ hasText: "Willkommensveranstaltungseinladung" }).first()).toBeVisible();
  await expect(page.locator('[lang="zh-Hans"]').filter({ hasText: "欢迎光临" }).first()).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});
