import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 verify-as is hidden unless the triple gate is on", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  await page.goto(SEATING);
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  if (process.env.EVENT_OS_VERIFY_AS === "1") {
    await expect(page.getByTestId("seating-verify-as")).toBeVisible();
    await expect(page.getByText("Access Administration")).toHaveCount(0);
  } else {
    await expect(page.getByTestId("seating-verify-as")).toHaveCount(0);
  }
});
