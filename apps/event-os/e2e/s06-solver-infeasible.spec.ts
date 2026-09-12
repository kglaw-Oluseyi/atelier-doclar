import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 infeasible copy is explicit", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#runs`);
  await expect(page.getByTestId("seating-runs")).toBeVisible();
  await expect(page.getByTestId("seating-runs").getByText("The solver recommends. Authorised people decide.")).toBeVisible();
});
