import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import {
  ALPHA_DOSSIER,
  ALPHA_PROTECTION,
  clickOnceNamed,
  expectActionOutcome,
  expectFreshActionSuccess,
  expectFreshResultQuery,
  prepareApprovedRule,
  readActionCorrelation,
  recoverRecordedFixtureAuthority,
} from "./s060-helpers";

const ACTION = 30_000;

test("S063 identical live publish replays instead of creating a second CURRENT", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 180_000 : 150_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    await page.goto(ALPHA_PROTECTION);
    await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: ACTION });
    await clickOnceNamed(page, "Evaluate protection now");
    await expectActionOutcome(page);
    const planner = await openStaffContext(browser, "planner");
    await planner.page.goto(ALPHA_DOSSIER);
    await expect(planner.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    await clickOnceNamed(planner.page, "Assemble dossier edition");
    await expectActionOutcome(planner.page);
    await expect(planner.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    const beforeSubmit = await readActionCorrelation(planner.page);
    await clickOnceNamed(planner.page, "Submit dossier");
    await expectFreshActionSuccess(planner.page, beforeSubmit);
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: ACTION });
    await planner.context.close();
    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await clickOnceNamed(director.page, "Approve dossier");
    await expectActionOutcome(director.page);
    await director.context.close();
    const ceo = await openStaffContext(browser, "ceo");
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    const beforePublish = await readActionCorrelation(ceo.page);
    const previousResult = new URL(ceo.page.url()).searchParams.get("result") ?? "";
    await clickOnceNamed(ceo.page, "Publish dossier without sending");
    await expectFreshResultQuery(ceo.page, previousResult);
    await expectFreshActionSuccess(ceo.page, beforePublish);
    const first = await ceo.page.getByTestId("focused-dossier-publication").innerText();
    const firstCorrelation = await readActionCorrelation(ceo.page);
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    await expect(ceo.page.getByRole("button", { name: "Publish dossier without sending" })).toBeVisible({ timeout: ACTION });
    const beforeReplay = await readActionCorrelation(ceo.page);
    await clickOnceNamed(ceo.page, "Publish dossier without sending");
    await expectFreshResultQuery(ceo.page, firstCorrelation);
    await expectFreshActionSuccess(ceo.page, firstCorrelation || beforeReplay);
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/No change|already applied/i);
    const second = await ceo.page.getByTestId("focused-dossier-publication").innerText();
    expect(second).toContain(first.slice(0, 20));
    await ceo.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
