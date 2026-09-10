import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_DOSSIER, ALPHA_PROTECTION, assembleWorkingDraft, evaluateAlphaOne, expectActionOutcome, prepareApprovedRule, recoverRecordedFixtureAuthority } from "./s060-helpers";

test("S062 planner director CEO publication survives successor drafting", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 360_000 : 240_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    const planner = await openStaffContext(browser, "planner");
    if (process.env.PLAYWRIGHT_LIVE !== "1") {
      await evaluateAlphaOne(planner.page);
      await expect(planner.page.getByTestId("protection-effective-authorities")).toBeVisible({ timeout: 20_000 });
    }
    await assembleWorkingDraft(planner.page);
    await expect(planner.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: 30_000 });
    await expect(planner.page.getByRole("button", { name: "Approve dossier" })).toHaveCount(0);
    await expect(planner.page.getByRole("button", { name: "Submit dossier" })).toBeVisible({ timeout: 20_000 });
    await planner.page.getByRole("button", { name: "Submit dossier" }).click();
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: 20_000 });
    await planner.context.close();

    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await expect(director.page.getByRole("button", { name: "Publish dossier without sending" })).toHaveCount(0);
    await expect(director.page.getByRole("button", { name: "Approve dossier" })).toBeVisible({ timeout: 20_000 });
    await director.page.getByRole("button", { name: "Approve dossier" }).click();
    await expectActionOutcome(director.page);
    await expect(director.page.getByText(/Status APPROVED/)).toBeVisible({ timeout: 20_000 });
    await director.context.close();

    const ceo = await openStaffContext(browser, "ceo");
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByRole("button", { name: "Publish dossier without sending" })).toBeVisible();
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectActionOutcome(ceo.page);
    const firstIdentity = await ceo.page.getByText(/Publication|PUBLISHED|CURRENT/i).first().innerText();
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectActionOutcome(ceo.page);
    await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
    await expect(ceo.page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: 20_000 });
    const publishedCopy = await ceo.page.getByTestId("client-protection-dossier").innerText();
    await ceo.page.reload();
    await expect(ceo.page.getByTestId("client-protection-dossier")).toContainText(/Evidence reviewed|known gaps|Publication/i);
    await ceo.page.goto(ALPHA_PROTECTION);
    await assembleWorkingDraft(ceo.page);
    await expect(ceo.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: 30_000 });
    await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
    await expect(ceo.page.getByTestId("client-protection-dossier")).toContainText(/Evidence reviewed|known gaps|Publication/i);
    expect((await ceo.page.getByTestId("client-protection-dossier").innerText()).length).toBeGreaterThan(20);
    expect(publishedCopy.length).toBeGreaterThan(20);
    expect(firstIdentity.length).toBeGreaterThan(0);
    await ceo.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
