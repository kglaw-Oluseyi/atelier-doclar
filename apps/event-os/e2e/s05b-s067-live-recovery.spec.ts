import { expect, test } from "@playwright/test";
import { openStaffContext } from "./login";
import { ALPHA_PROTECTION, expectActionOutcome } from "./s060-helpers";

const S061_EXTRAS = [
  { ruleKey: "s061-public-liability-1789066731022", editionId: "00587236-fa20-4180-95c0-c0649eb728eb" },
  { ruleKey: "s061-public-liability-1789066767651", editionId: "cfc0b05a-8a74-4c74-a73a-71c03a99e2ab" },
  { ruleKey: "s061-public-liability-1789067404599", editionId: "6b9330b0-9563-4180-bf3a-bf2dcfb8b1f7" },
] as const;
const S061_KEEP = "s061-public-liability-1789066558518";
const S061_KEEP_EDITION = "64d4a54b-c833-4826-8756-76699ec794c2";
const S059 = "CLAUDE-S05B-S059-B-RULE";

test("S067 live governed withdrawal of the three obsolete S061 QA editions", async ({ browser }) => {
  test.skip(process.env.PLAYWRIGHT_LIVE !== "1", "live Railway governed recovery only");
  test.setTimeout(300_000);
  const reviewer = await openStaffContext(browser, "reviewer");
  const preview: Array<{ ruleKey: string; editionId: string; hashPrefix: string }> = [];
  for (const item of S061_EXTRAS) {
    await reviewer.page.goto(`/app/protection/authority/${item.editionId}`);
    const detail = reviewer.page.getByTestId("authority-detail");
    await expect(detail).toBeVisible({ timeout: 30_000 });
    const hash = ((await reviewer.page.getByTestId("authority-detail-hash").innerText()) ?? "").replace(/^Content hash\s+/i, "");
    preview.push({ ruleKey: item.ruleKey, editionId: item.editionId, hashPrefix: hash.slice(0, 12) });
  }
  expect(preview.map((item) => item.editionId).sort()).toEqual([...S061_EXTRAS].map((item) => item.editionId).sort());
  console.log("S067_LIVE_PREVIEW", JSON.stringify(preview));

  await reviewer.page.goto("/app/protection/authority");
  const batch = reviewer.page.getByTestId("authority-exact-s061-batch");
  await expect(batch).toBeVisible({ timeout: 30_000 });
  const previewCopy = reviewer.page.getByTestId("authority-exact-s061-preview");
  for (const item of S061_EXTRAS) {
    await expect(previewCopy).toContainText(item.editionId);
    await expect(previewCopy).toContainText(item.ruleKey);
  }
  await expect(previewCopy).not.toContainText(S061_KEEP_EDITION);
  await batch.getByRole("button", { name: "Withdraw exact previewed S061 QA authorities" }).click();
  await expectActionOutcome(reviewer.page);

  for (const item of S061_EXTRAS) {
    await reviewer.page.goto(`/app/protection/authority/${item.editionId}`);
    await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", "WITHDRAWN_NO_AUTHORITY", { timeout: 30_000 });
    await expect(reviewer.page.getByTestId("authority-detail-history")).toContainText(item.editionId);
  }
  await reviewer.page.goto(`/app/protection/authority/${S061_KEEP_EDITION}`);
  await expect(reviewer.page.getByTestId("authority-detail")).toHaveAttribute("data-authority-state", /CURRENT_APPROVED|STALE_APPROVED/, { timeout: 30_000 });
  await reviewer.context.close();

  const planner = await openStaffContext(browser, "planner");
  await planner.page.goto(ALPHA_PROTECTION);
  await expect(planner.page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 40_000 });
  await planner.page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expectActionOutcome(planner.page);
  const authorities = planner.page.getByTestId("protection-effective-authorities");
  await expect(authorities).toBeVisible({ timeout: 20_000 });
  for (const item of S061_EXTRAS) {
    await expect(authorities.locator("li", { hasText: item.ruleKey })).toContainText(/history only/i);
    await expect(authorities.locator("li", { hasText: item.ruleKey })).not.toContainText(/GOVERNING/i);
  }
  await expect(authorities.locator("li", { hasText: S061_KEEP })).toContainText(/GOVERNING/i);
  await expect(authorities.locator("li", { hasText: S059 })).toContainText(/history only/i);
  const gapCards = planner.page.locator(".protection-card h3");
  const publicLiabilityCount = await gapCards.filter({ hasText: /^PUBLIC_LIABILITY$/ }).count();
  expect(publicLiabilityCount).toBeLessThanOrEqual(1);
  await planner.page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expectActionOutcome(planner.page);
  for (const item of S061_EXTRAS) {
    await expect(authorities.locator("li", { hasText: item.ruleKey })).toContainText(/history only/i);
    await expect(authorities.locator("li", { hasText: item.ruleKey })).not.toContainText(/GOVERNING/i);
  }
  await expect(authorities.locator("li", { hasText: S061_KEEP })).toContainText(/GOVERNING/i);
  await planner.context.close();

  const ceo = await openStaffContext(browser, "ceo");
  await ceo.page.goto("/app/protection");
  await ceo.page.getByRole("link", { name: "Rules and Sources" }).click();
  const title = `S067 ${Date.now()} live source`;
  const sourceForm = ceo.page.getByTestId("protection-create-source");
  await sourceForm.getByLabel("Source title").fill(title);
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Fresh S067 live Reviewer approval source.");
  await sourceForm.getByLabel("Review again by").fill("2026-12-31");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expectActionOutcome(ceo.page);
  const ceoApprove = ceo.page.locator("li", { hasText: title }).getByRole("button", { name: "Approve source" });
  if (await ceoApprove.count()) {
    await ceo.page.locator("li", { hasText: title }).getByLabel("Review again by").fill("2026-12-31");
    await ceoApprove.click();
    await expect(ceo.page.getByTestId("action-result-banner")).toBeVisible({ timeout: 30_000 });
    await expect(ceo.page.getByTestId("action-result-banner")).not.toContainText(/Protection command applied/i);
  }
  await ceo.context.close();

  const reviewer2 = await openStaffContext(browser, "reviewer");
  await reviewer2.page.goto("/app/protection");
  await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
  const row = reviewer2.page.locator("li", { hasText: title });
  await row.getByLabel("Review again by").fill("2026-12-31");
  await row.getByRole("button", { name: "Approve source" }).click();
  await expectActionOutcome(reviewer2.page);
  await reviewer2.page.goto("/app/protection");
  await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
  await expect(reviewer2.page.locator("li", { hasText: title })).toContainText(/APPROVED/i);
  await reviewer2.context.close();
  console.log("S067_LIVE_RECOVERY", JSON.stringify({ extras: S061_EXTRAS.map((item) => item.editionId), keep: S061_KEEP_EDITION, publicLiabilityCount }));
});
