import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectFreshActionSuccess } from "./s060-helpers";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 rules and reservations use governed selectors", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#rules`);
  await expect(page.getByTestId("seating-rules")).toBeVisible();
  await expect(page.locator("textarea, [name='payload']")).toHaveCount(0);
  const guest = page.locator('select[name="guestIdA"] option').nth(1);
  if (await guest.count()) {
    await page.getByRole("button", { name: "Save rule" }).click();
    await expectFreshActionSuccess(page);
  }
  await page.goto(`${SEATING}#reservations`);
  await expect(page.getByTestId("seating-capacity-ledger")).toBeVisible();
  await expect(page.getByText("Reserved does not mean seated.").or(page.getByText("reserved does not mean seated", { exact: false }))).toBeVisible();
});
