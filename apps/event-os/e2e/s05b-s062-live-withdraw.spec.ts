import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { ALPHA_PROTECTION, evaluateAlphaOne, expectActionOutcome } from "./s060-helpers";

const S060_KEYS = [
  "s060-public-liability-1789063488182",
  "s060-public-liability-1789063559605",
  "s060-public-liability-1789063730645",
  "s060-public-liability-1789063780841",
] as const;

test("S062 live exact S060 fixture classification and withdrawal", async ({ browser }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway authority recovery only");
  test.setTimeout(180_000);
  const reviewer = await openStaffContext(browser, "reviewer");
  const preview: Array<{ ruleKey: string; editionId: string; state: string; hash: string }> = [];
  for (const ruleKey of S060_KEYS) {
    const started = Date.now();
    await reviewer.page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(ruleKey)}`);
    const row = reviewer.page.getByTestId(`authority-queue-${ruleKey}`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const href = await row.getByRole("link").first().getAttribute("href");
    expect(href).toMatch(/\/app\/protection\/authority\/[0-9a-f-]{36}/i);
    await reviewer.page.goto(href!);
    const detail = reviewer.page.getByTestId("authority-detail");
    await expect(detail).toBeVisible({ timeout: 30_000 });
    const classify = reviewer.page.getByTestId("authority-classify-fixture");
    if (await classify.count()) {
      await classify.getByRole("button", { name: "Record fixture classification" }).click();
      await expectActionOutcome(reviewer.page);
    }
    await expect(reviewer.page.getByTestId("authority-detail-fixture")).toBeVisible();
    const hash = ((await reviewer.page.getByTestId("authority-detail-hash").innerText()) ?? "").replace(/^Content hash\s+/i, "");
    preview.push({
      ruleKey,
      editionId: href!.split("/").pop() ?? "",
      state: (await detail.getAttribute("data-authority-state")) ?? "",
      hash,
    });
    expect(Date.now() - started).toBeLessThan(30_000);
  }
  expect(preview).toHaveLength(4);
  console.log("S062_LIVE_PREVIEW", JSON.stringify(preview.map((item) => ({ ruleKey: item.ruleKey, editionId: item.editionId, state: item.state, hashPrefix: item.hash.slice(0, 12) }))));

  const stillGoverning = preview.filter((item) => item.state !== "WITHDRAWN_NO_AUTHORITY");
  if (stillGoverning.length) {
    await reviewer.page.goto("/app/protection/authority");
    const batch = reviewer.page.getByTestId("authority-exact-s060-batch");
    await expect(batch).toBeVisible({ timeout: 30_000 });
    await expect(reviewer.page.getByTestId("authority-exact-s060-preview")).toContainText(preview[0]!.editionId);
    const withdrawStarted = Date.now();
    await batch.getByRole("button", { name: "Withdraw exact previewed S060 authorities" }).click();
    await expectActionOutcome(reviewer.page);
    expect(Date.now() - withdrawStarted).toBeLessThan(30_000);
  }

  for (const item of preview) {
    await reviewer.page.goto(`/app/protection/authority/${item.editionId}`);
    await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", "WITHDRAWN_NO_AUTHORITY");
    await expect(reviewer.page.getByTestId("authority-detail-history")).toBeVisible();
    await expect(reviewer.page.getByTestId("authority-detail-history")).toContainText(item.editionId);
  }

  await reviewer.page.goto("/app/protection/authority?ruleKey=s061-public-liability-1789066558518");
  const s061 = reviewer.page.getByTestId("authority-queue-s061-public-liability-1789066558518");
  await expect(s061).toBeVisible();
  await expect(s061).toHaveAttribute("data-authority-state", /CURRENT_APPROVED|STALE_APPROVED/);

  await reviewer.page.goto("/app/protection/authority?ruleKey=CLAUDE-S05B-S059-B-RULE");
  const s059 = reviewer.page.getByTestId("authority-queue-CLAUDE-S05B-S059-B-RULE");
  if (await s059.count()) {
    await expect(s059).toHaveAttribute("data-authority-state", /NO_APPROVED_EDITION|WITHDRAWN_NO_AUTHORITY/);
  }
  await reviewer.context.close();

  const planner = await openStaffContext(browser, "planner");
  await evaluateAlphaOne(planner.page);
  const authorities = planner.page.getByTestId("protection-effective-authorities");
  await expect(authorities).toBeVisible({ timeout: 20_000 });
  await expect(authorities.locator("li", { hasText: "s060-public-liability-1789063488182" })).toContainText(/history only/i);
  await expect(authorities.locator("li", { hasText: "s060-public-liability-1789063488182" })).not.toContainText(/governing/i);
  await expect(authorities.locator("li", { hasText: "s061-public-liability-1789066558518" })).toContainText(/governing/i);
  await expect(authorities.locator("li", { hasText: "CLAUDE-S05B-S059-B-RULE" })).toContainText(/history only/i);
  await planner.page.goto(ALPHA_PROTECTION);
  await expect(planner.page.getByTestId("event-protection-workspace")).toBeVisible();
  await planner.context.close();
});
