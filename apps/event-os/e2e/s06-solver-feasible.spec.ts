import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectFreshActionSuccess } from "./s060-helpers";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 solver feasible launch", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "planner");
  await page.goto(`${SEATING}#inputs`);
  const freeze = page.getByRole("button", { name: "Freeze new input edition" });
  if (await freeze.count()) {
    await freeze.click();
    await expectFreshActionSuccess(page);
  }
  await page.goto(`${SEATING}#runs`);
  const launch = page.getByRole("button", { name: "Launch seating run" });
  if (await launch.count()) {
    await launch.click();
    await expectFreshActionSuccess(page);
    await expect(page.getByTestId("seating-runs")).toContainText(/FEASIBLE|INFEASIBLE|ERROR|QUEUED|RUNNING/);
  }
});
