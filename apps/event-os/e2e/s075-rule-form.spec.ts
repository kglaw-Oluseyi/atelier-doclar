import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

async function openRuleForm(page: Page) {
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  const form = page.getByTestId("seating-constraint-form");
  await expect(form).toBeVisible();
  return form;
}

test("S075 rule form is predicate-specific, keyboard operable and readable at 360/768/1440", async ({ page }) => {
  test.setTimeout(90_000);
  const form = await openRuleForm(page);
  await expect(form.getByTestId("seating-rule-predicate")).toBeVisible();
  await expect(form.locator('select[name="guestIdA"]')).toBeVisible();
  await expect(form.locator('select[name="guestIdB"]')).toBeVisible();
  await expect(form.locator('select[name="tableId"]')).toHaveCount(0);
  await expect(form.getByTestId("seating-rule-effect")).toContainText(/must be seated at the same table/i);

  await form.getByTestId("seating-rule-predicate").selectOption("REQUIRE_TABLE");
  await expect(form.locator('select[name="guestIdA"]')).toBeVisible();
  await expect(form.locator('select[name="tableId"]')).toBeVisible();
  await expect(form.locator('select[name="tableId"]')).toHaveAttribute("required", "");
  await expect(form.getByRole("combobox", { name: "First guest" })).toHaveCount(0);
  await expect(form.getByTestId("seating-rule-effect")).toContainText(/must be seated at/i);

  await form.getByTestId("seating-rule-predicate").focus();
  await page.keyboard.press("Tab");
  await expect(form.locator('select[name="guestIdA"]')).toBeFocused();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(form).toBeVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX, `overflow at ${viewport.width}`).toBeLessThanOrEqual(8);
  }
});
