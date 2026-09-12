import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 auditor and admin cannot mutate seating", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "auditor");
  await page.goto(SEATING);
  await expect(page.getByRole("button", { name: "Freeze new input edition" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish seating plan" })).toHaveCount(0);
  await loginAs(page, "admin");
  await page.goto(SEATING);
  await expect(page.getByText("This assignment cannot perform this seating action.")).toBeVisible();
});
