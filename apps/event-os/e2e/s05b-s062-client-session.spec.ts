import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_DOSSIER, assembleWorkingDraft, evaluateAlphaOne, expectActionOutcome, prepareApprovedRule, recoverRecordedFixtureAuthority } from "./s060-helpers";

test("S062 separate client grant session and revocation", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 360_000 : 240_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    const planner = await openStaffContext(browser, "planner");
    await evaluateAlphaOne(planner.page);
    await expect(planner.page.getByTestId("protection-effective-authorities")).toBeVisible({ timeout: 20_000 });
    await assembleWorkingDraft(planner.page);
    await planner.page.getByRole("button", { name: "Submit dossier" }).click();
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: 20_000 });
    await planner.context.close();
    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await director.page.getByRole("button", { name: "Approve dossier" }).click();
    await expectActionOutcome(director.page);
    await director.context.close();
    await loginAs(page, "ceo");
    await page.goto(ALPHA_DOSSIER);
    await page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectActionOutcome(page);
    await page.getByRole("button", { name: "Issue client dossier access" }).click();
    await expectActionOutcome(page);
    const tokenLine = page.getByTestId("issued-dossier-token");
    await expect(tokenLine).toBeVisible({ timeout: 20_000 });
    const tokenPath = ((await tokenLine.innerText()).match(/\/client-dossier\/[A-Za-z0-9_-]{16,}/) ?? [""])[0] ?? "";
    expect(tokenPath).toMatch(/\/client-dossier\/[A-Za-z0-9_-]{16,}/);
    const client = await browser.newContext();
    const clientPage = await client.newPage();
    await clientPage.goto(tokenPath);
    if (await clientPage.getByTestId("client-dossier-denied").count()) {
      await clientPage.reload();
    }
    await expect(clientPage.getByTestId("client-dossier-session")).toBeVisible({ timeout: 20_000 });
    await expect(clientPage.getByTestId("client-protection-dossier")).toBeVisible();
    await expect(clientPage.getByTestId("client-dossier-denied")).toHaveCount(0);
    await expect(clientPage.getByRole("navigation", { name: "Staff" })).toHaveCount(0);
    await expect(clientPage.getByText(/policy number|object key|staff evidence/i)).toHaveCount(0);
    const question = clientPage.getByLabel("Message", { exact: true });
    await expect(question).toBeVisible();
    await question.fill("Synthetic client acknowledgement for S062.");
    await clientPage.getByRole("button", { name: "Record client note" }).click();
    await client.close();
    await loginAs(page, "ceo");
    await page.goto(ALPHA_DOSSIER);
    await page.getByRole("button", { name: "Revoke client access" }).click();
    await expectActionOutcome(page);
    const revoked = await browser.newContext();
    const revokedPage = await revoked.newPage();
    await revokedPage.goto(tokenPath);
    await expect(revokedPage.getByTestId("client-dossier-denied")).toBeVisible({ timeout: 20_000 });
    await revokedPage.goto("/client-dossier/not-this-event");
    await expect(revokedPage.getByTestId("client-dossier-denied").or(revokedPage.getByText(/denied|not found/i))).toBeVisible({ timeout: 20_000 });
    await revoked.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
