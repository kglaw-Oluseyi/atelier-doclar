import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B keyboard and zoom authoring remains labelled", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("Tab");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("protection-create-policy").getByLabel("Policy type")).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.getByTestId("protection-command")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("protection-command")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
  expect(overflow).toBeFalsy();
});
