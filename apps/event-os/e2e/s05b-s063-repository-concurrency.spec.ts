import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { ALPHA_DOSSIER, ALPHA_PROTECTION, expectActionOutcome, prepareApprovedRule, recoverRecordedFixtureAuthority } from "./s060-helpers";

const ACTION = 30_000;

test("S063 identical live publish replays instead of creating a second CURRENT", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 180_000 : 150_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    await page.goto(ALPHA_PROTECTION);
    await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: ACTION });
    await page.getByRole("button", { name: "Evaluate protection now" }).click();
    await expectActionOutcome(page);
    const planner = await openStaffContext(browser, "planner");
    await planner.page.goto(ALPHA_DOSSIER);
    await expect(planner.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    await planner.page.getByRole("button", { name: "Assemble dossier edition" }).click();
    await expectActionOutcome(planner.page);
    await expect(planner.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    await planner.page.getByRole("button", { name: "Submit dossier" }).click();
    await expectActionOutcome(planner.page);
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: ACTION });
    await planner.context.close();
    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await director.page.getByRole("button", { name: "Approve dossier" }).click();
    await expectActionOutcome(director.page);
    await director.context.close();
    const ceo = await openStaffContext(browser, "ceo");
    await ceo.page.goto(ALPHA_DOSSIER);
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectActionOutcome(ceo.page);
    const first = await ceo.page.getByTestId("focused-dossier-publication").innerText();
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectActionOutcome(ceo.page);
    const second = await ceo.page.getByTestId("focused-dossier-publication").innerText();
    expect(second).toContain(first.slice(0, 20));
    await ceo.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
