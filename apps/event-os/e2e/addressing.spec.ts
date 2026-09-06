import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

test("titled Yorùbá adult addressing journey with permissions and fallback", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await page.getByLabel("Given name").fill("Ọmọ́wùnmí");
  await page.getByLabel("Family name").fill("Adéyẹmí");
  await page.getByLabel("Honorific").selectOption("Dr (Mrs)");
  await page.getByLabel("Preferred formal salutation").fill("Dr (Mrs) Ọmọ́wùnmí Adéyẹmí");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByTestId("formal-salutation")).toHaveText("Dr (Mrs) Ọmọ́wùnmí Adéyẹmí");
  await expect(page.getByTestId("familiar-name")).toContainText("Ọmọ́wùnmí");
  await page.locator("#addressing-heading").locator("..").getByLabel("Reason").fill("Host confirmed titled adult");
  await page.getByRole("button", { name: "Confirm addressing" }).click();
  await expect(page.getByText("HOST CONFIRMED")).toBeVisible();
  const guestUrl = page.url();

  await loginAs(page, "planner");
  await page.goto(guestUrl);
  await expect(page.getByRole("button", { name: "Save addressing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm addressing" })).toHaveCount(0);

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByTestId("formal-salutation")).toBeVisible();
  const box = await page.getByTestId("formal-salutation").boundingBox();
  expect(box?.width).toBeLessThanOrEqual(360);

  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();

  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { name: "Addressing" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1";
  });

  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});

test("blank title uses a safe fallback and material failure is visible", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await page.getByLabel("Given name").fill("Títílayọ̀");
  await page.getByLabel("Family name").fill("Ọlátúnjí");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByTestId("formal-salutation")).toHaveText("Títílayọ̀ Ọlátúnjí");
  await expect(page.getByText("Blank — safe fallback, no inferred title")).toBeVisible();

  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/00000000-0000-4000-8000-000000000072");
  await page.locator("form").filter({ hasText: "Materialise companion" }).getByRole("button", { name: "Materialise companion" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
