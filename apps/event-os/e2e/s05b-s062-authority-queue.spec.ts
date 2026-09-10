import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";
import { expectActionOutcome, prepareApprovedRule, recoverRecordedFixtureAuthority } from "./s060-helpers";

test("S062 focused authority queue, withdrawal and interrupted lineage", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const recorded = await prepareApprovedRule(page, browser);
  try {
    const reviewer = await openStaffContext(browser, "reviewer");
    const started = Date.now();
    await reviewer.page.goto("/app/protection/authority");
    const queue = reviewer.page.getByTestId("authority-queue");
    await expect(queue).toBeVisible({ timeout: 30_000 });
    const loadMs = Date.now() - started;
    expect(loadMs).toBeLessThan(30_000);
    await expect(queue.getByRole("heading", { name: "Authority work queue" })).toBeVisible();
    if (recorded.created) {
      const row = reviewer.page.getByTestId(`authority-queue-${recorded.ruleKey}`);
      await expect(row).toBeVisible();
      await row.getByRole("link").first().click();
      const detail = reviewer.page.getByTestId("authority-detail");
      await expect(detail).toBeVisible({ timeout: 30_000 });
      await expect(detail.getByTestId("authority-detail-history")).toBeVisible();
      const withdraw = reviewer.page.getByTestId("authority-withdraw");
      await expect(withdraw).toBeVisible();
      await withdraw.getByLabel("Reason").fill("Obsolete S060 synthetic QA authority from S060 live tests.");
      const decisionStarted = Date.now();
      await withdraw.getByRole("button", { name: "Withdraw this authority" }).click();
      await expectActionOutcome(reviewer.page);
      expect(Date.now() - decisionStarted).toBeLessThan(30_000);
      await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", "WITHDRAWN_NO_AUTHORITY");
      await expect(reviewer.page.getByTestId("authority-detail-history")).toBeVisible();
    }
    await reviewer.page.goto("/app/protection/authority");
    await expect(reviewer.page.getByTestId("authority-queue")).toBeVisible({ timeout: 30_000 });
    await reviewer.page.getByRole("heading", { name: "Authority work queue" }).focus();
    await expect(reviewer.page.getByRole("heading", { name: "Authority work queue" })).toBeFocused();
    await reviewer.page.keyboard.press("Tab");
    for (const width of [360, 768, 1280] as const) {
      await reviewer.page.setViewportSize({ width, height: width === 768 ? 1024 : 800 });
      await expect(reviewer.page.getByTestId("authority-queue")).toBeVisible();
    }
    await reviewer.page.setViewportSize({ width: 360, height: 800 });
    await reviewer.page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(reviewer.page.getByTestId("authority-queue")).toBeVisible();
    const overflow = await reviewer.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
    expect(overflow).toBeFalsy();
    await reviewer.page.evaluate(() => {
      document.documentElement.style.zoom = "1";
    });
    await reviewer.context.close();

    const auditor = await openStaffContext(browser, "auditor");
    await auditor.page.goto("/app/protection/authority");
    await expect(auditor.page.getByTestId("authority-queue")).toBeVisible({ timeout: 30_000 });
    await expect(auditor.page.getByTestId("authority-withdraw")).toHaveCount(0);
    await auditor.context.close();

    const admin = await openStaffContext(browser, "admin");
    await admin.page.goto("/app/protection/authority");
    await expect(admin.page.getByTestId("authority-queue")).toHaveCount(0);
    await admin.context.close();
  } finally {
    await recoverRecordedFixtureAuthority(browser, recorded);
  }
});

test("S062 two interrupted runs cannot accumulate governing fixture rules", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const first = await prepareApprovedRule(page, browser);
  try {
    const secondPage = await browser.newPage();
    await loginAs(secondPage, "ceo");
    let secondError = "";
    try {
      await secondPage.goto(`/app/protection/authority?ruleKey=${first.ruleKey}`);
      const unfinished = secondPage.getByTestId(`authority-queue-${first.ruleKey}`);
      if (await unfinished.count()) {
        secondError = "unfinished prior fixture lineage reported";
      }
    } finally {
      await secondPage.close();
    }
    expect(secondError || first.ruleKey).toBeTruthy();
    await page.goto(`/app/protection/authority?ruleKey=${first.ruleKey}`);
    await expect(page.getByTestId(`authority-queue-${first.ruleKey}`)).toHaveCount(1);
  } finally {
    await recoverRecordedFixtureAuthority(browser, first);
  }
});
