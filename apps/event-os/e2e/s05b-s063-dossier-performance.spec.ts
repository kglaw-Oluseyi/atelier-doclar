import { expect, test, type Page } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_DOSSIER, ALPHA_PROTECTION, expectActionOutcome, prepareApprovedRule, recoverRecordedFixtureAuthority } from "./s060-helpers";

const ACTION = 30_000;

async function timedGoto(page: Page, path: string) {
  const started = Date.now();
  await page.goto(path);
  await expect(page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
  return Date.now() - started;
}

test("S063 focused dossier GET and assemble stay inside steady-state bounds", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 180_000 : 120_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    await page.goto(ALPHA_PROTECTION);
    await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: ACTION });
    await page.getByRole("button", { name: "Evaluate protection now" }).click();
    await expectActionOutcome(page);
    const planner = await openStaffContext(browser, "planner");
    const warm = await timedGoto(planner.page, ALPHA_DOSSIER);
    const started = Date.now();
    await planner.page.getByRole("button", { name: "Assemble dossier edition" }).click();
    await expectActionOutcome(planner.page);
    await expect(planner.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    const assembleMs = Date.now() - started;
    expect(warm).toBeLessThan(30_000);
    expect(assembleMs).toBeLessThan(30_000);
    await planner.page.evaluate((ms) => {
      (window as unknown as { __s063?: { warm: number } }).__s063 = { warm: ms };
    }, warm);
    await planner.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
