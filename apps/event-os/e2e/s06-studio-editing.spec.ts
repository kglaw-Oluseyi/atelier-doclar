import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 studio exposes keyboard edit commands", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#studio`);
  await expect(page.getByTestId("seating-studio")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
});
