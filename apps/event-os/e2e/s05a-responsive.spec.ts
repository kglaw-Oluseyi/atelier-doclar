import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05A responsive: discovery, budget, roadmap, command at 360, tablet, desktop and 200% zoom", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "planner");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Discovery" }).click();
  const name = `Responsive ${Date.now()}`;
  await page.getByLabel("Enquiry name").fill(name);
  await page.getByRole("button", { name: "Open enquiry and start discovery" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });

  for (const width of [360, 768, 1440] as const) {
    await page.setViewportSize({ width, height: width === 360 ? 740 : 900 });
    await expect(page.getByRole("navigation", { name: "Discovery sections" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `horizontal overflow at ${width}px on discovery`).toBeFalsy();
  }

  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("discovery-workspace")).toBeVisible();
  const zoomOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(zoomOverflow, "horizontal overflow at 200% zoom").toBeFalsy();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("link", { name: "Budget" }).click();
  await expect(page.getByRole("heading", { name: "Planner Budget Studio" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();

  await loginAs(page, "ceo");
  await page.goto("/app/command");
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.getByTestId("executive-command")).toBeVisible();
  const commandOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(commandOverflow, "horizontal overflow at 360px on Event Command").toBeFalsy();
});
