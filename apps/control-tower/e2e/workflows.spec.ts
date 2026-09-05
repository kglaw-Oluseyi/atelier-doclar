import { expect, test } from "@playwright/test";
import { SYNTHETIC_ACCESS_TOKEN } from "@maison-doclar/programme-tower";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Access token").fill(SYNTHETIC_ACCESS_TOKEN);
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
}

test("open items and unsigned release gates cannot be self-approved", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Open items" }).click();
  await expect(page.getByRole("heading", { name: "Open items" })).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Releases" }).click();
  await expect(page.getByText("Production authorised: false")).toBeVisible();
  await page.getByRole("button", { name: "Attempt approve" }).first().click();
  await expect(page.getByText(/approval rejected/)).toBeVisible({ timeout: 45_000 });
});
