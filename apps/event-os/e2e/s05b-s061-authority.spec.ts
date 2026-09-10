import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { ALPHA_PROTECTION, assembleWorkingDraft, evaluateAlphaOne, expectActionOutcome, refreshExpiredAuthorities } from "./s060-helpers";

test("S061 governing authority, publication and client access", async ({ page, browser }) => {
  test.setTimeout(process.env.PLAYWRIGHT_LIVE === "1" ? 600_000 : 300_000);
  const label = `S061 ${Date.now()}`;
  const live = process.env.PLAYWRIGHT_LIVE === "1";
  if (!live) {
    await loginAs(page, "ceo");
    await page.goto("/app/protection");
    await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: "Rules and Sources" }).click();
    const sourceForm = page.getByTestId("protection-create-source");
    const title = `${label} source`;
    await sourceForm.getByLabel("Source title").fill(title);
    await sourceForm.getByLabel("Publisher").fill("NSITF");
    await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
    await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
    await sourceForm.getByLabel("Jurisdiction").fill("NG");
    await sourceForm.getByLabel("Summary").fill("Synthetic S061 retained-history source.");
    await sourceForm.getByLabel("Review again by").fill("2026-12-31");
    await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
    await expectActionOutcome(page);

    const reviewer = await openStaffContext(browser, "reviewer");
    await reviewer.page.goto("/app/protection");
    await reviewer.page.getByRole("link", { name: "Rules and Sources" }).click();
    const approve = reviewer.page.locator("li", { hasText: title }).getByRole("button", { name: "Approve source" });
    if (await approve.count()) {
      await approve.click();
      await expectActionOutcome(reviewer.page);
    }
    await reviewer.context.close();

    await page.goto("/app/protection");
    await page.getByRole("link", { name: "Rules and Sources" }).click();
    const ruleKey = `s061-public-liability-${Date.now()}`;
    const ruleForm = page.locator("form").filter({ hasText: "Draft rule" });
    await ruleForm.getByLabel("Rule key").fill(ruleKey);
    await ruleForm.getByLabel("Jurisdiction").fill("NG");
    await ruleForm.getByLabel("Cited proposition").fill("Public liability evidence may be required.");
    const sourceValue = await ruleForm.locator("#sourceEditionIds option", { hasText: title }).first().getAttribute("value");
    expect(sourceValue).toBeTruthy();
    await ruleForm.locator("#sourceEditionIds").selectOption(sourceValue!);
    await ruleForm.getByLabel("Requirement key").fill("PUBLIC_LIABILITY");
    await ruleForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
    await ruleForm.getByLabel("Mandatory").selectOption("false");
    await ruleForm.getByLabel("Review again by").fill("2026-12-31");
    await ruleForm.getByRole("button", { name: "Draft rule" }).click();
    await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });

    const reviewer2 = await openStaffContext(browser, "reviewer");
    await reviewer2.page.goto("/app/protection");
    await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
    const review = reviewer2.page.locator("li", { hasText: ruleKey }).last();
    if (await review.getByLabel("Review").count()) {
      await review.getByLabel("Review").selectOption("APPROVED");
      await review.getByRole("button", { name: "Record rule review" }).click();
      await expectActionOutcome(reviewer2.page);
    }
    await reviewer2.context.close();

    await page.goto("/app/protection");
    await page.getByRole("link", { name: "Rules and Sources" }).click();
    const draftForm = page.locator("form").filter({ hasText: "Draft rule" });
    await draftForm.getByLabel("Rule key").fill(ruleKey);
    await draftForm.getByLabel("Jurisdiction").fill("NG");
    await draftForm.getByLabel("Cited proposition").fill("Later discovery draft must remain history.");
    const draftSource = await draftForm.locator("#sourceEditionIds option", { hasText: title }).first().getAttribute("value");
    await draftForm.locator("#sourceEditionIds").selectOption(draftSource!);
    await draftForm.getByLabel("Requirement key").fill("PUBLIC_LIABILITY");
    await draftForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
    await draftForm.getByLabel("Mandatory").selectOption("false");
    await draftForm.getByLabel("Review again by").fill("2026-12-31");
    await draftForm.getByRole("button", { name: "Draft rule" }).click();
    await expectActionOutcome(page);

    await page.getByRole("link", { name: "Authority review" }).click();
    const authority = page.getByTestId("protection-authority-review");
    await expect(authority).toBeVisible();
    const governing = page.getByTestId(`authority-${ruleKey}`);
    await expect(governing).toBeVisible();
    await expect(governing).toContainText(/governing edition|current approved|stale approved/i);
    await expect(page.locator("li", { hasText: ruleKey }).filter({ hasText: "Later discovery draft must remain history." })).toContainText(/history/i);
  }

  const reviewer3 = await openStaffContext(browser, "reviewer");
  await refreshExpiredAuthorities(reviewer3.page, `${label} governed successor review.`);
  await reviewer3.context.close();

  const planner = await openStaffContext(browser, "planner");
  await evaluateAlphaOne(planner.page);
  await expect(planner.page.getByTestId("protection-effective-authorities")).toBeVisible();
  await expect(planner.page.getByTestId("protection-readiness-change")).toBeVisible();
  await assembleWorkingDraft(planner.page);
  await expect(planner.page.getByRole("button", { name: "Submit dossier" })).toBeVisible({ timeout: 20_000 });
  await planner.page.getByRole("button", { name: "Submit dossier" }).click();
  await expect(planner.page.getByRole("button", { name: "Submit dossier" })).toHaveCount(0, { timeout: 20_000 });
  await expect(planner.page.getByText(/Status SUBMITTED/)).toBeVisible({ timeout: 20_000 });
  await planner.context.close();

  const director = await openStaffContext(browser, "director");
  await director.page.goto(ALPHA_PROTECTION);
  await director.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(director.page.getByRole("button", { name: "Approve dossier" })).toBeVisible({ timeout: 20_000 });
  await director.page.getByRole("button", { name: "Approve dossier" }).click();
  await expectActionOutcome(director.page);
  await expect(director.page.getByText(/Status APPROVED/)).toBeVisible({ timeout: 20_000 });
  await director.context.close();

  const ceo = await openStaffContext(browser, "ceo");
  await ceo.page.goto(ALPHA_PROTECTION);
  await ceo.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await expect(ceo.page.getByRole("button", { name: "Publish dossier without sending" })).toBeVisible();
  await ceo.page.getByRole("button", { name: "Publish dossier without sending" }).click();
  await expectActionOutcome(ceo.page);
  await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
  await expect(ceo.page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: 20_000 });
  const publishedCopy = await ceo.page.getByTestId("client-protection-dossier").innerText();
  await ceo.page.goto(ALPHA_PROTECTION);
  await assembleWorkingDraft(ceo.page);
  await ceo.page.goto(`${ALPHA_PROTECTION}/client`);
  await expect(ceo.page.getByTestId("client-protection-dossier")).toContainText(/Evidence reviewed|known gaps|Publication/i);
  expect((await ceo.page.getByTestId("client-protection-dossier").innerText()).length).toBeGreaterThan(20);
  expect(publishedCopy.length).toBeGreaterThan(20);

  await ceo.page.goto(ALPHA_PROTECTION);
  await ceo.page.getByRole("link", { name: "Dossier", exact: true }).click();
  await ceo.page.getByRole("button", { name: "Issue client dossier access" }).click();
  await expectActionOutcome(ceo.page);
  const tokenLine = ceo.page.getByTestId("issued-dossier-token");
  await expect(tokenLine).toBeVisible({ timeout: 20_000 });
  const tokenPath = ((await tokenLine.innerText()).match(/\/client-dossier\/[A-Za-z0-9_-]+/) ?? [""])[0] ?? "";
  expect(tokenPath).toMatch(/\/client-dossier\//);
  await ceo.context.close();

  const client = await browser.newContext();
  const clientPage = await client.newPage();
  await clientPage.goto(tokenPath);
  await expect(clientPage.getByTestId("client-dossier-session")).toBeVisible({ timeout: 20_000 });
  await expect(clientPage.getByTestId("client-protection-dossier")).toBeVisible();
  await expect(clientPage.getByRole("navigation", { name: "Staff" })).toHaveCount(0);
  await client.close();

  await loginAs(page, "ceo");
  await page.goto(ALPHA_PROTECTION);
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await page.getByRole("button", { name: "Revoke client access" }).click();
  await expectActionOutcome(page);
  const revoked = await browser.newContext();
  const revokedPage = await revoked.newPage();
  await revokedPage.goto(tokenPath);
  await expect(revokedPage.getByTestId("client-dossier-denied")).toBeVisible({ timeout: 20_000 });
  await revoked.close();

  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Authority review" }).click();
  const surface = page.getByTestId("protection-authority-review");
  await expect(surface).toBeVisible();
  await page.keyboard.press("Tab");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(surface).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(surface).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(surface).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
  expect(overflow).toBeFalsy();
});
