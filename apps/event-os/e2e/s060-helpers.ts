import { expect, type Browser, type Page, type Request } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

export const ALPHA_PROTECTION = "/app/events/00000000-0000-4000-8000-000000000021/protection";
export const ALPHA_DOSSIER = `${ALPHA_PROTECTION}/dossier`;

export async function expectActionOutcome(page: Page) {
  await expect(page.getByTestId("action-result-banner")).toBeVisible({ timeout: 20_000 });
}

export async function expectFreshActionSuccess(page: Page, previousCorrelation = "") {
  const banner = page.getByTestId("action-result-banner");
  await expect(banner).toBeVisible({ timeout: 30_000 });
  if (previousCorrelation) {
    await expect(banner).not.toContainText(previousCorrelation, { timeout: 30_000 });
  }
  await expect(banner).toContainText(/Succeeded|The change was recorded|No change/i);
}

export async function readActionCorrelation(page: Page): Promise<string> {
  const text = (await page.getByTestId("action-result-banner").innerText().catch(() => "")) ?? "";
  return (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) ?? [""])[0] ?? "";
}

export async function assembleWorkingDraft(page: Page) {
  await page.goto(ALPHA_DOSSIER);
  await expect(page.getByTestId("focused-dossier-workspace")).toBeVisible({ timeout: 40_000 });
  const assemble = page.getByRole("button", { name: "Assemble dossier edition" });
  await expect(assemble).toBeVisible({ timeout: 20_000 });
  const previous = await readActionCorrelation(page);
  await assemble.evaluate((button) => {
    const form = button.closest("form");
    if (form instanceof HTMLFormElement) form.requestSubmit(button as HTMLButtonElement);
    else (button as HTMLButtonElement).click();
  });
  await expectFreshActionSuccess(page, previous);
  await expect(page.getByText(/Status DRAFT/)).toBeVisible({ timeout: 30_000 });
}

export async function refreshExpiredAuthorities(page: Page, reason: string) {
  await page.goto("/app/protection#protection-authority");
  const surface = page.getByTestId("protection-authority-review");
  await expect(surface).toBeVisible({ timeout: 30_000 });
  const seen = new Set<string>();
  for (let step = 0; step < 12; step += 1) {
    const stale = surface.locator("[data-authority-state='STALE_APPROVED']").first();
    if (!(await stale.count())) break;
    const testId = (await stale.getAttribute("data-testid")) ?? `stale-${step}`;
    const details = await stale.innerText();
    const citedSourceId = (details.match(/cited source ([0-9a-f-]{36})/i) ?? [])[1];
    const sourceForm = citedSourceId ? page.getByTestId(`source-record-review-${citedSourceId}`) : page.locator("none");
    const previous = await readActionCorrelation(page);
    if (citedSourceId && (await sourceForm.count()) && !seen.has(`source:${citedSourceId}`)) {
      seen.add(`source:${citedSourceId}`);
      await sourceForm.getByLabel("Review reason").fill(reason);
      await sourceForm.getByLabel("Review again by").fill("2026-12-31");
      await sourceForm.getByRole("button", { name: "Record current source review" }).click();
    } else {
      if (seen.has(testId)) {
        throw new Error(`stale authority ${testId} remained after governed review: ${details.slice(0, 300)}`);
      }
      seen.add(testId);
      const form = page.getByTestId(`authority-record-review-${testId.replace(/^authority-/, "")}`);
      await expect(form).toBeVisible();
      await form.getByLabel("Review reason").fill(reason);
      await form.getByLabel("Review again by").fill("2026-12-31");
      await form.getByRole("button", { name: "Record current review" }).click();
    }
    await expectFreshActionSuccess(page, previous);
    await expect(surface).toBeVisible({ timeout: 30_000 });
  }
  await expect(surface.locator("[data-authority-state='STALE_APPROVED']")).toHaveCount(0, { timeout: 10_000 });
}

export const S062_CANONICAL_RULE_KEY = "s062-canonical-public-liability";

export type RecordedFixtureAuthority = {
  ruleKey: string;
  editionId?: string;
  created: boolean;
};

export async function detectUnfinishedFixtureLineage(page: Page, ruleKey = S062_CANONICAL_RULE_KEY): Promise<boolean> {
  await page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(ruleKey)}`);
  const row = page.getByTestId(`authority-queue-${ruleKey}`);
  if (!(await row.count())) return false;
  const state = (await row.getAttribute("data-authority-state")) ?? "";
  return state === "CURRENT_APPROVED" || state === "STALE_APPROVED" || state === "AUTHORITY_CONFLICT";
}

export async function recoverRecordedFixtureAuthority(browser: Browser, recorded: RecordedFixtureAuthority) {
  if (!recorded.created && !recorded.editionId) return;
  const reviewer = await openStaffContext(browser, "reviewer");
  try {
    await reviewer.page.goto(`/app/protection/authority?ruleKey=${encodeURIComponent(recorded.ruleKey)}`);
    const row = reviewer.page.getByTestId(`authority-queue-${recorded.ruleKey}`);
    if (!(await row.count())) return;
    const href = await row.getByRole("link").first().getAttribute("href");
    if (!href) return;
    await reviewer.page.goto(href);
    const withdraw = reviewer.page.getByTestId("authority-withdraw");
    if (!(await withdraw.count())) return;
    await withdraw.getByLabel("Reason").fill("S062 fixture recovery helper withdrew the exact recorded synthetic authority.");
    await withdraw.getByRole("button", { name: "Withdraw this authority" }).click();
    await expectActionOutcome(reviewer.page);
  } finally {
    await reviewer.context.close();
  }
}

export async function prepareApprovedRule(page: Page, browser: Browser): Promise<RecordedFixtureAuthority> {
  const live = process.env.PLAYWRIGHT_LIVE === "1";
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  if (live) {
    const unfinished = await detectUnfinishedFixtureLineage(page);
    if (unfinished) {
      throw new Error(`unfinished prior fixture lineage ${S062_CANONICAL_RULE_KEY} is still governing; recover it instead of creating another rule`);
    }
    return { ruleKey: S062_CANONICAL_RULE_KEY, created: false };
  }
  await page.goto("/app/protection/authority");
  if (await detectUnfinishedFixtureLineage(page)) {
    const row = page.getByTestId(`authority-queue-${S062_CANONICAL_RULE_KEY}`);
    const href = await row.getByRole("link").first().getAttribute("href");
    return { ruleKey: S062_CANONICAL_RULE_KEY, editionId: href?.split("/").pop(), created: false };
  }
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const sourceForm = page.getByTestId("protection-create-source");
  const title = "S062 canonical fixture source";
  await sourceForm.getByLabel("Source title").fill(title);
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Canonical S062 fixture source. Not organisation-wide governing policy.");
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
  const ruleForm = page.locator("form").filter({ hasText: "Draft rule" });
  await ruleForm.getByLabel("Rule key").fill(S062_CANONICAL_RULE_KEY);
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
  const createdEditionId = new URL(page.url()).searchParams.get("subjectId") ?? "";
  const reviewer2 = await openStaffContext(browser, "reviewer");
  if (createdEditionId) {
    await reviewer2.page.goto(`/app/protection/authority/${createdEditionId}`);
    const approve = reviewer2.page.getByTestId("authority-approve-draft");
    if (await approve.count()) {
      await approve.getByRole("button", { name: "Approve this draft authority" }).click();
      await expectActionOutcome(reviewer2.page);
    }
  } else {
    await reviewer2.page.goto("/app/protection");
    await reviewer2.page.getByRole("link", { name: "Rules and Sources" }).click();
    const review = reviewer2.page.locator("li", { hasText: S062_CANONICAL_RULE_KEY }).last();
    if (await review.getByLabel("Review").count()) {
      await review.getByLabel("Review").selectOption("APPROVED");
      await review.getByRole("button", { name: "Record rule review" }).click();
      await expectActionOutcome(reviewer2.page);
    }
    await reviewer2.page.goto(`/app/protection/authority?ruleKey=${S062_CANONICAL_RULE_KEY}`);
    const queued = await reviewer2.page.getByTestId(`authority-queue-${S062_CANONICAL_RULE_KEY}`).getByRole("link").first().getAttribute("href");
    if (queued) await reviewer2.page.goto(queued);
  }
  const classify = reviewer2.page.getByTestId("authority-classify-fixture");
  if (await classify.count()) {
    await classify.getByRole("button", { name: "Record fixture classification" }).click();
    await expectActionOutcome(reviewer2.page);
  }
  const focusedHref = reviewer2.page.url();
  await reviewer2.context.close();
  return { ruleKey: S062_CANONICAL_RULE_KEY, editionId: createdEditionId || focusedHref.split("/").pop()?.split("?")[0], created: true };
}

export async function evaluateAlphaOne(page: Page) {
  await page.goto(ALPHA_PROTECTION);
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 40_000 });
  const workspace = page.getByTestId("event-protection-workspace");
  const hasJurisdiction = (await workspace.getByText(/jurisdiction:\s*NG/i).count()) > 0;
  const hasDates = (await workspace.getByText(/event_dates:\s*2026-12-01\/2026-12-02/i).count()) > 0;
  const fact = page.getByTestId("protection-record-fact");
  if (!hasJurisdiction) {
    await fact.getByLabel("Fact").selectOption("jurisdiction");
    await fact.getByLabel("Value").fill("NG");
    await fact.getByRole("button", { name: "Record event fact" }).click({ noWaitAfter: true });
    await expectActionOutcome(page);
  }
  if (!hasDates) {
    await fact.getByLabel("Fact").selectOption("event_dates");
    await fact.getByLabel("Value").fill("2026-12-01/2026-12-02");
    await fact.getByRole("button", { name: "Record event fact" }).click({ noWaitAfter: true });
    await expectActionOutcome(page);
  }
  await page.goto(ALPHA_PROTECTION);
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 40_000 });
  await page.getByRole("button", { name: "Evaluate protection now" }).click({ noWaitAfter: true });
  await expectActionOutcome(page);
  await expect(page.getByTestId("protection-effective-authorities")).toBeVisible({ timeout: 30_000 });
}

export async function captureNextAction(page: Page, trigger: () => Promise<void>): Promise<Request> {
  const pending = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await trigger();
  return pending;
}
