import { expect, test } from "@playwright/test";
import { loginAs } from "./login";
import { expectFreshActionSuccess, readActionCorrelation } from "./s060-helpers";
import { ensureAlphaOneSeatingLayoutBinding } from "./s075-layout-binding";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 whole-slice planner freeze without stale banners", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await ensureAlphaOneSeatingLayoutBinding(browser);
  await loginAs(page, "planner");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021");
  await page.getByRole("link", { name: "Seating" }).click();
  await expect(page.getByTestId("seating-overview")).toBeVisible();
  const previous = await readActionCorrelation(page);
  const freeze = page.getByRole("button", { name: "Freeze new input edition" });
  if (await freeze.count()) {
    await freeze.click();
    await expectFreshActionSuccess(page, previous);
  }
  await expect(page.getByRole("heading", { name: /seating/i }).first()).toBeVisible();
  await expect(page.getByText("The solver recommends. Authorised people decide.").first()).toBeVisible();
});
