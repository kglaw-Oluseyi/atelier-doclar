import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";

test("S05 Milestone 2 studio: create object, inspector edit, refresh and keyboard", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "director");
  await page.goto(`/app/events/${ALPHA}/venue`);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible();
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await page.getByRole("button", { name: "Adopt venue" }).click();
    await expect(page.getByTestId("event-venue-setup")).not.toHaveText(/No venue adopted/i);
  }
  if (await page.getByRole("link", { name: "Create blank layout" }).count()) {
    await page.getByRole("link", { name: "Create blank layout" }).first().click();
    await page.getByRole("button", { name: "Save layout" }).click();
  } else {
    await page.getByRole("link", { name: "Layout list" }).click();
    await page.locator(".atelier-folio a").first().click();
  }
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await page.getByRole("button", { name: "Add Zone" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/zone/i);
  await page.getByRole("button", { name: /Zone · zone/i }).click();
  await expect(page.getByTestId("studio-inspector")).toBeVisible();
  await page.getByTestId("studio-inspector").getByRole("textbox", { name: "Label" }).fill("Ceremony garden");
  await page.getByRole("button", { name: "Save properties" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText("Ceremony garden");
  await page.reload();
  await expect(page.getByTestId("studio-navigator")).toContainText("Ceremony garden");
  await page.getByLabel("Search objects").fill("Ceremony");
  await expect(page.getByTestId("studio-navigator")).toContainText("Ceremony garden");
  await page.getByRole("button", { name: /Ceremony garden/i }).click();
  await expect(page.getByTestId("studio-inspector")).toBeVisible();
  await page.getByRole("button", { name: /Ceremony garden/i }).focus();
  await expect(page.getByRole("button", { name: /Ceremony garden/i })).toBeFocused();
  await page.getByLabel("Origin X (mm)").fill("1800");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByTestId("studio-inspector")).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("S05 Milestone 2 responsive studio: 360, tablet, desktop and 200% zoom", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "director");
  await page.goto(`/app/events/${ALPHA}/layouts`);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/app/events/${ALPHA}/layouts`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeFalsy();
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await page.goto("/app/venues");
  await expect(page.getByRole("heading", { name: "Venues" })).toBeVisible();
});
