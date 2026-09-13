import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectFreshActionSuccess } from "./s060-helpers";
import { ensureAlphaOneSeatingLayoutBinding } from "./s075-layout-binding";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 input readiness freeze", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await ensureAlphaOneSeatingLayoutBinding(browser);
  await loginAs(page, "planner");
  await page.goto(SEATING);
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  await expect(page.getByTestId("seating-inputs")).toBeVisible();
  const freeze = page.getByRole("button", { name: "Freeze new input edition" });
  if (await freeze.count()) {
    await freeze.click();
    await expectFreshActionSuccess(page);
    await page.reload();
    await expect(page.getByTestId("seating-freshness-badge")).toBeVisible();
  }
});
