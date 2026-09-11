import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import {
  ALPHA_DOSSIER,
  ALPHA_PROTECTION,
  expectActionOutcome,
  expectFreshActionSuccess,
  prepareApprovedRule,
  readActionCorrelation,
  recoverRecordedFixtureAuthority,
} from "./s060-helpers";

const ACTION = 30_000;

test("S063 planner director CEO publication, last-known-good and separate client revocation", async ({ page, browser }) => {
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
    await expect(planner.page.getByRole("button", { name: "Approve dossier" })).toHaveCount(0);
    await planner.page.getByRole("button", { name: "Submit dossier" }).click();
    await expectActionOutcome(planner.page);
    await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: ACTION });
    await planner.context.close();

    const director = await openStaffContext(browser, "director");
    await director.page.goto(ALPHA_DOSSIER);
    await expect(director.page.getByRole("button", { name: "Publish dossier without sending" })).toHaveCount(0);
    await director.page.getByRole("button", { name: "Approve dossier" }).click();
    await expectActionOutcome(director.page);
    await expect(director.page.getByText(/Status APPROVED/)).toBeVisible({ timeout: ACTION });
    await director.context.close();

    const ceo = await openStaffContext(browser, "ceo");
    await ceo.page.goto(ALPHA_DOSSIER);
    const beforePublish = await readActionCorrelation(ceo.page);
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectFreshActionSuccess(ceo.page, beforePublish);
    const published = await ceo.page.getByTestId("focused-dossier-publication").innerText();
    const firstPublishCorrelation = await readActionCorrelation(ceo.page);
    await ceo.page.goto(ALPHA_DOSSIER);
    await expect(ceo.page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: ACTION });
    await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expectFreshActionSuccess(ceo.page, firstPublishCorrelation);
    await expect(ceo.page.getByTestId("action-result-banner")).toContainText(/No change|already applied/i);
    await ceo.page.getByRole("button", { name: "Assemble dossier edition" }).click();
    await expect(ceo.page.getByText(/Status DRAFT/)).toBeVisible({ timeout: ACTION });
    await expect(ceo.page.getByTestId("focused-dossier-publication")).toContainText(published.slice(0, 24));
    await ceo.page.getByRole("button", { name: "Issue client dossier access" }).click();
    await expectActionOutcome(ceo.page);
    const tokenLine = ceo.page.getByTestId("issued-dossier-token");
    await expect(tokenLine).toBeVisible({ timeout: ACTION });
    const tokenPath = ((await tokenLine.innerText()).match(/\/client-dossier\/[A-Za-z0-9_-]{16,}/) ?? [""])[0] ?? "";
    const client = await browser.newContext();
    const clientPage = await client.newPage();
    await clientPage.goto(tokenPath);
    await expect(clientPage.getByTestId("client-dossier-session")).toBeVisible({ timeout: ACTION });
    await expect(clientPage.getByRole("navigation", { name: "Staff" })).toHaveCount(0);
    await clientPage.getByLabel("Message", { exact: true }).fill("S063 synthetic acknowledgement.");
    await clientPage.getByRole("button", { name: "Record client note" }).click();
    await client.close();
    const beforeRevoke = await readActionCorrelation(ceo.page);
    await ceo.page.getByRole("button", { name: "Revoke client access" }).click();
    await expectFreshActionSuccess(ceo.page, beforeRevoke);
    const revoked = await browser.newContext();
    const revokedPage = await revoked.newPage();
    await revokedPage.goto(tokenPath);
    await expect(revokedPage.getByTestId("client-dossier-denied")).toBeVisible({ timeout: ACTION });
    await revoked.close();
    await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
    await expect(ceo.page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: ACTION });
    await ceo.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});
