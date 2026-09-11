import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { ALPHA_PROTECTION, evaluateAlphaOne, expectActionOutcome } from "./s060-helpers";

const S061_EXTRAS = [
  { ruleKey: "s061-public-liability-1789066731022", editionId: "00587236-fa20-4180-95c0-c0649eb728eb" },
  { ruleKey: "s061-public-liability-1789066767651", editionId: "cfc0b05a-8a74-4c74-a73a-71c03a99e2ab" },
  { ruleKey: "s061-public-liability-1789067404599", editionId: "6b9330b0-9563-4180-bf3a-bf2dcfb8b1f7" },
] as const;

const S061_KEEP = "s061-public-liability-1789066558518";
const S061_KEEP_EDITION = "64d4a54b-c833-4826-8756-76699ec794c2";
const S059 = "CLAUDE-S05B-S059-B-RULE";

test("S063 live exact S061 QA fixture classification and withdrawal", async ({ browser }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway authority recovery only");
  test.setTimeout(240_000);
  const reviewer = await openStaffContext(browser, "reviewer");
  const preview: Array<{ ruleKey: string; editionId: string; hash: string }> = [];
  for (const item of S061_EXTRAS) {
    const started = Date.now();
    await reviewer.page.goto(`/app/protection/authority/${item.editionId}`);
    const detail = reviewer.page.getByTestId("authority-detail");
    await expect(detail).toBeVisible({ timeout: 30_000 });
    await expect(reviewer.page.getByRole("heading", { level: 1 })).toHaveText(item.ruleKey);
    const classify = reviewer.page.getByTestId("authority-classify-fixture");
    if (await classify.count()) {
      await classify.getByRole("button", { name: "Record fixture classification" }).click();
      await expectActionOutcome(reviewer.page);
    }
    await expect(reviewer.page.getByTestId("authority-detail-fixture")).toBeVisible({ timeout: 30_000 });
    const hash = ((await reviewer.page.getByTestId("authority-detail-hash").innerText()) ?? "").replace(/^Content hash\s+/i, "");
    preview.push({ ruleKey: item.ruleKey, editionId: item.editionId, hash });
    expect(Date.now() - started).toBeLessThan(30_000);
  }
  expect(preview).toHaveLength(3);
  console.log("S063_LIVE_S061_PREVIEW", JSON.stringify(preview.map((item) => ({ ruleKey: item.ruleKey, editionId: item.editionId, hashPrefix: item.hash.slice(0, 12) }))));

  await reviewer.page.goto("/app/protection/authority");
  const batch = reviewer.page.getByTestId("authority-exact-s061-batch");
  await expect(batch).toBeVisible({ timeout: 30_000 });
  const previewCopy = reviewer.page.getByTestId("authority-exact-s061-preview");
  for (const item of S061_EXTRAS) {
    await expect(previewCopy).toContainText(item.editionId);
    await expect(previewCopy).toContainText(item.ruleKey);
  }
  await expect(previewCopy).not.toContainText(S061_KEEP_EDITION);
  const withdrawStarted = Date.now();
  await batch.getByRole("button", { name: "Withdraw exact previewed S061 QA authorities" }).click();
  await expectActionOutcome(reviewer.page);
  expect(Date.now() - withdrawStarted).toBeLessThan(30_000);

  for (const item of S061_EXTRAS) {
    await reviewer.page.goto(`/app/protection/authority/${item.editionId}`);
    await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", "WITHDRAWN_NO_AUTHORITY", { timeout: 30_000 });
    await expect(reviewer.page.getByTestId("authority-detail-history")).toBeVisible();
    await expect(reviewer.page.getByTestId("authority-detail-history")).toContainText(item.editionId);
  }

  await reviewer.page.goto(`/app/protection/authority/${S061_KEEP_EDITION}`);
  await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", /CURRENT_APPROVED|STALE_APPROVED/, { timeout: 30_000 });
  await expect(reviewer.page.getByRole("heading", { level: 1 })).toHaveText(S061_KEEP);

  await reviewer.page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(S059)}`);
  const s059 = reviewer.page.getByTestId(`authority-queue-${S059}`);
  if (await s059.count()) {
    await expect(s059).toHaveAttribute("data-authority-state", /NO_APPROVED_EDITION|WITHDRAWN_NO_AUTHORITY/);
  }
  await reviewer.context.close();

  const planner = await openStaffContext(browser, "planner");
  await evaluateAlphaOne(planner.page);
  const authorities = planner.page.getByTestId("protection-effective-authorities");
  await expect(authorities).toBeVisible({ timeout: 20_000 });
  await expect(authorities.locator("li", { hasText: S061_EXTRAS[0].ruleKey })).toContainText(/history only/i);
  await expect(authorities.locator("li", { hasText: S061_EXTRAS[0].ruleKey })).not.toContainText(/governing/i);
  await expect(authorities.locator("li", { hasText: S061_KEEP })).toContainText(/governing/i);
  await expect(authorities.locator("li", { hasText: S059 })).toContainText(/history only/i);
  await planner.page.goto(ALPHA_PROTECTION);
  await expect(planner.page.getByTestId("event-protection-workspace")).toBeVisible();
  await planner.context.close();
});
