import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";

test("S05 responsive and accessibility: 360, tablet, desktop and 200% zoom", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "director");

  for (const width of [360, 768, 720, 1440]) {
    await page.setViewportSize({ width, height: width === 720 ? 450 : 900 });
    await page.goto("/app/venues");
    await expect(page.getByTestId("venue-registry")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `horizontal overflow at ${width}px on venue registry`).toBeFalsy();

    await page.goto(`/app/events/${ALPHA}/venue`);
    await expect(page.getByTestId("event-venue-setup")).toBeVisible();
    const eventOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(eventOverflow, `horizontal overflow at ${width}px on event venue`).toBeFalsy();
  }

  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await page.goto("/app/venues");
  await expect(page.getByRole("heading", { name: "Venues" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app/venues");
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  await page.goto("/app/venues");
  await page.getByRole("link", { name: "Register venue" }).focus();
  await expect(page.getByRole("link", { name: "Register venue" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("venue-create-form")).toBeVisible();
  await page.getByLabel("Display name").focus();
  await expect(page.getByLabel("Display name")).toBeFocused();
});
